import { createHash } from "node:crypto";
import { matchConfiguration, parseIdentity, parseMetricRow, splitRuntime } from "../domain/catalog.js";
import type { BenchmarkRun, LatencyStats, MetricRow, RunIdentity, Snapshot } from "../domain/types.js";
import { ValidationError } from "../domain/validation.js";

/**
 * Benchmark-run ingestion semantics, free of I/O so they are testable without PostgreSQL:
 * validation of an import file, the seven-column identity key, catalog matching, the in-memory
 * upsert-replace that mirrors the SQL importer, and the row mappings used by the Postgres store.
 */

type JsonObject = Record<string, unknown>;
const INT_MAX = 2_147_483_647;

/** One measured concurrency level plus fields the console does not render but the database keeps. */
export interface ImportedMetric { row: MetricRow; goodput: number | null; rawResults: JsonObject | unknown[] | null }
/** One validated entry of an import file (experiments row + its metrics rows). */
export interface RunImport {
  identity: RunIdentity;
  /** Explicit atlas configuration id from the file; resolved against the catalog at read time. */
  configurationId: string | null;
  benchmarkTool: string;
  /** Normalized ISO-8601 UTC timestamp. */
  runDate: string;
  systemConfig: JsonObject; datasetConfig: JsonObject;
  metrics: ImportedMetric[];
  rawResults: JsonObject | unknown[] | null;
  /** True when the entry carries a "_test" label: invented fixture values, never a measurement. */
  test: boolean;
}

const isObject = (value: unknown): value is JsonObject => typeof value === "object" && value !== null && !Array.isArray(value);

/** Recursively sort object keys: the JS equivalent of jsonb's key-order-independent equality. */
export function canonicalJson(value: unknown, path = "value"): unknown {
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new ValidationError(`${path} must be a finite number`);
    return value;
  }
  if (Array.isArray(value)) return value.map((item, index) => canonicalJson(item, `${path}[${index}]`));
  if (isObject(value)) return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalJson(value[key], `${path}.${key}`)]));
  throw new ValidationError(`${path} is not JSON`);
}

/**
 * Storage form of an identity: runtime_version lowercased (the database CHECK is lowercase; splitRuntime is
 * case-insensitive, so the engine and version are unchanged) and runtime_config with sorted keys.
 */
export function canonicalIdentity(identity: RunIdentity): RunIdentity {
  return { ...identity, runtimeVersion: identity.runtimeVersion.toLowerCase(), runtimeConfig: canonicalJson(identity.runtimeConfig, "identity.runtimeConfig") as JsonObject };
}

/** The UNIQUE key of `experiments`, as a string. Equal keys ⇔ the same benchmark cell. */
export function identityKey(identity: RunIdentity): string {
  const c = canonicalIdentity(identity);
  return JSON.stringify([c.modelName, c.gpuType, c.numGpus, c.maxSystemReplicas, c.runtimeVersion, c.dataset, c.runtimeConfig]);
}

/** Deterministic UUID-shaped id for a run held in memory (Postgres assigns its own on first insert). */
export function runIdFor(identity: RunIdentity): string {
  const hex = createHash("sha256").update(identityKey(identity)).digest("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-8${hex.slice(13, 16)}-${((parseInt(hex[16]!, 16) & 0x3) | 0x8).toString(16)}${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

function count(value: number, field: string): number {
  if (!Number.isInteger(value) || value > INT_MAX) throw new ValidationError(`${field} must be an integer count`);
  return value;
}

function parseRunDate(value: unknown): string {
  // A timestamp must carry its offset; a bare date is taken as 00:00 UTC. Local-time strings are ambiguous.
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2}(\.\d{1,9})?)?(Z|[+-]\d{2}:\d{2}))?$/.test(value)) throw new ValidationError("runDate must be an ISO-8601 date or a timestamp with a time-zone offset");
  const time = Date.parse(value);
  if (!Number.isFinite(time)) throw new ValidationError("runDate is not a valid date");
  const iso = new Date(time).toISOString();
  if (value.length === 10 && iso.slice(0, 10) !== value) throw new ValidationError("runDate is not a valid calendar date");
  return iso;
}

function optionalObject(value: unknown, field: string): JsonObject {
  if (value === undefined || value === null) return {};
  if (!isObject(value)) throw new ValidationError(`${field} must be an object`);
  return canonicalJson(value, field) as JsonObject;
}

function optionalRaw(value: unknown, field: string): JsonObject | unknown[] | null {
  if (value === undefined || value === null) return null;
  if (!isObject(value) && !Array.isArray(value)) throw new ValidationError(`${field} must be an object or an array`);
  return canonicalJson(value, field) as JsonObject | unknown[];
}

function parseMetric(input: unknown, index: number): ImportedMetric {
  const row = parseMetricRow(input, index);
  if (row.concurrency > INT_MAX) throw new ValidationError(`metrics[${index}].concurrency is too large`);
  for (const field of ["successful", "errored", "incomplete"] as const) count(row[field], `metrics[${index}].${field}`);
  const raw = (input ?? {}) as JsonObject;
  let goodput: number | null = null;
  if (raw.goodput !== undefined && raw.goodput !== null) {
    if (typeof raw.goodput !== "number" || !Number.isFinite(raw.goodput) || raw.goodput < 0) throw new ValidationError(`metrics[${index}].goodput must be a finite number ≥ 0`);
    goodput = raw.goodput;
  }
  return { row, goodput, rawResults: optionalRaw(raw.rawResults, `metrics[${index}].rawResults`) };
}

/** Validate one import entry. A "_test" label marks invented fixture values (test: true); other unknown fields are ignored. */
export function parseRunImport(input: unknown): RunImport {
  if (!isObject(input)) throw new ValidationError("A run must be an object");
  const identity = canonicalIdentity(parseIdentity(input.identity));
  if (identity.numGpus > INT_MAX || identity.maxSystemReplicas > INT_MAX) throw new ValidationError("GPU and replica counts are too large");
  let configurationId: string | null = null;
  if (input.configurationId !== undefined && input.configurationId !== null) {
    if (typeof input.configurationId !== "string" || !/^[a-z0-9][a-z0-9._@-]{1,200}$/.test(input.configurationId)) throw new ValidationError("configurationId must be an atlas configuration id");
    configurationId = input.configurationId;
  }
  const benchmarkTool = typeof input.benchmarkTool === "string" ? input.benchmarkTool.trim() : "";
  if (benchmarkTool.length < 1 || benchmarkTool.length > 120) throw new ValidationError("benchmarkTool must contain 1–120 characters");
  if (!Array.isArray(input.metrics) || input.metrics.length === 0) throw new ValidationError("metrics must be a non-empty array of concurrency levels");
  const metrics = input.metrics.map(parseMetric).sort((a, b) => a.row.concurrency - b.row.concurrency);
  const repeated = metrics.find((metric, index) => index > 0 && metrics[index - 1]!.row.concurrency === metric.row.concurrency);
  if (repeated) throw new ValidationError(`concurrency ${repeated.row.concurrency} appears more than once; one metrics row per level`);
  return {
    identity, configurationId, benchmarkTool, runDate: parseRunDate(input.runDate),
    systemConfig: optionalObject(input.systemConfig, "systemConfig"), datasetConfig: optionalObject(input.datasetConfig, "datasetConfig"),
    metrics, rawResults: optionalRaw(input.rawResults, "rawResults"), test: input._test !== undefined,
  };
}

/**
 * Old → new dataset names, applied to identity.dataset before identity checks and catalog matching. Lets run
 * exports that use another bench's dataset names be imported without those names living in this repository:
 * keep the map file local (e.g. `{ "old-name": "single-turn-8k" }`).
 */
export type DatasetMap = Readonly<Record<string, string>>;
const DATASET_NAME = /^[a-z0-9][a-z0-9._-]{1,80}$/;

export function parseDatasetMap(input: unknown): DatasetMap {
  if (!isObject(input)) throw new ValidationError("A dataset map must be a JSON object of old → new dataset names");
  const map: Record<string, string> = {};
  for (const [from, to] of Object.entries(input)) {
    if (typeof to !== "string" || !DATASET_NAME.test(to)) throw new ValidationError(`dataset map: "${from}" must map to a dataset name (lowercase letters, digits, . _ -)`);
    map[from] = to;
  }
  return map;
}

function renameDataset(run: RunImport, datasetMap: DatasetMap): RunImport {
  const to = Object.hasOwn(datasetMap, run.identity.dataset) ? datasetMap[run.identity.dataset] : undefined;
  return to && to !== run.identity.dataset ? { ...run, identity: { ...run.identity, dataset: to } } : run;
}

/**
 * Validate a whole import file: an array of runs, or `{ "runs": [...] }` so a file can carry a top-level
 * comment. Every entry is checked before anything is written. Two entries with the same identity are rejected:
 * which one should win is a decision for the execution repository, not the importer.
 */
export function parseRunsFile(input: unknown, datasetMap: DatasetMap = {}): RunImport[] {
  const list = Array.isArray(input) ? input : isObject(input) && Array.isArray(input.runs) ? input.runs : null;
  if (!list) throw new ValidationError("Expected an array of runs (or an object with a runs array)");
  if (list.length === 0) throw new ValidationError("The file contains no runs");
  const runs = list.map((entry, index) => {
    try { return renameDataset(parseRunImport(entry), datasetMap); } catch (error) {
      if (error instanceof ValidationError) throw new ValidationError(`runs[${index}]: ${error.message}`);
      throw error;
    }
  });
  const seen = new Map<string, number>();
  runs.forEach((run, index) => {
    const key = identityKey(run.identity);
    const first = seen.get(key);
    if (first !== undefined) throw new ValidationError(`runs[${index}] repeats the identity of runs[${first}]`);
    seen.set(key, index);
  });
  return runs;
}

export type MatchResult = { status: "matched"; configurationId: string } | { status: "unmatched"; reason: string };

/** Catalog resolution for one run, with a reason when it stays unmatched (applyRuns ignores unmatched runs). */
export function describeMatch(identity: RunIdentity, configurationId: string | null, catalog: Snapshot): MatchResult {
  const matched = matchConfiguration(identity, catalog, configurationId);
  if (matched) return { status: "matched", configurationId: matched };
  if (configurationId) return { status: "unmatched", reason: `configurationId "${configurationId}" is not in the pinned atlas catalog` };
  const { engine } = splitRuntime(identity.runtimeVersion);
  return { status: "unmatched", reason: `no unique catalog configuration for ${identity.modelName} · ${engine ?? "unknown engine"} · ${identity.numGpus} GPU; pass configurationId` };
}

export function summarizeIdentity(identity: RunIdentity): string {
  return `${identity.modelName} · ${identity.runtimeVersion} · ${identity.numGpus}×${identity.gpuType} · ${identity.maxSystemReplicas} replica(s) · ${identity.dataset}`;
}

export function toBenchmarkRun(run: RunImport, id: string, catalog: Snapshot): BenchmarkRun {
  return {
    id, identity: run.identity, configurationId: matchConfiguration(run.identity, catalog, run.configurationId),
    benchmarkTool: run.benchmarkTool, runDate: run.runDate, metrics: run.metrics.map((metric) => metric.row),
    ...(run.test ? { test: true } : {}),
  };
}

export type UpsertOutcome = "inserted" | "replaced" | "kept-newer";
/**
 * In-memory twin of the SQL importer: the same identity is one cell. A re-run replaces the cell's metrics
 * wholesale (levels absent from the new run disappear) and keeps the cell id; a run older than the stored one
 * is ignored unless replaceOlder is set, so re-importing an old file cannot roll a cell back.
 */
export function upsertRun(runs: readonly BenchmarkRun[], incoming: BenchmarkRun, options: { replaceOlder?: boolean } = {}): { runs: BenchmarkRun[]; outcome: UpsertOutcome; id: string } {
  const key = identityKey(incoming.identity);
  const index = runs.findIndex((run) => identityKey(run.identity) === key);
  const existing = runs[index];
  if (!existing) return { runs: [...runs, incoming], outcome: "inserted", id: incoming.id };
  if (!options.replaceOlder && Date.parse(incoming.runDate) < Date.parse(existing.runDate)) return { runs: [...runs], outcome: "kept-newer", id: existing.id };
  const next = [...runs];
  next[index] = { ...incoming, id: existing.id };
  return { runs: next, outcome: "replaced", id: existing.id };
}

/** Validate a parsed runs file into BenchmarkRun records resolved against the catalog (memory store, RUNS_FILE). */
export function runsFromFile(input: unknown, catalog: Snapshot, datasetMap: DatasetMap = {}): BenchmarkRun[] {
  return parseRunsFile(input, datasetMap).reduce<BenchmarkRun[]>((runs, run) => upsertRun(runs, toBenchmarkRun(run, runIdFor(run.identity), catalog)).runs, []);
}

// ----- Postgres row mappings -----------------------------------------------------------------------------

/** Column order of the metrics INSERT in scripts/import-runs.ts. */
export const METRIC_COLUMNS = [
  "concurrency", "ttft_ms", "itl_ms", "request_latency_ms", "goodput", "requests_per_second",
  "input_tokens_per_second", "output_tokens_per_second", "total_tokens_per_second", "output_tokens_per_second_per_user_p50",
  "successful", "errored", "incomplete", "duration_seconds", "raw_results",
] as const;

/** Parameter values for one metrics row. JSONB values are serialized here; nulls stay null. */
export function metricParams(metric: ImportedMetric): unknown[] {
  const r = metric.row;
  return [
    r.concurrency, JSON.stringify(r.ttftMs), JSON.stringify(r.itlMs), JSON.stringify(r.requestLatencyMs), metric.goodput, r.requestsPerSecond,
    r.inputTps, r.outputTps, r.totalTps, r.outputTpsPerUserP50, r.successful, r.errored, r.incomplete, r.durationSeconds,
    metric.rawResults === null ? null : JSON.stringify(metric.rawResults),
  ];
}

export interface MetricDbRow {
  concurrency: number; ttft_ms: LatencyStats; itl_ms: LatencyStats; request_latency_ms: LatencyStats;
  requests_per_second: number; input_tokens_per_second: number; output_tokens_per_second: number; total_tokens_per_second: number;
  output_tokens_per_second_per_user_p50: number | null; successful: number; errored: number; incomplete: number; duration_seconds: number;
}
const latency = (stats: LatencyStats): LatencyStats => ({ mean: stats.mean ?? null, p50: stats.p50 ?? null, p95: stats.p95 ?? null, p99: stats.p99 ?? null });
/** Database row → domain MetricRow. Missing values stay null; nothing is defaulted to zero. */
export function metricFromDb(row: MetricDbRow): MetricRow {
  return {
    concurrency: row.concurrency, ttftMs: latency(row.ttft_ms), itlMs: latency(row.itl_ms), requestLatencyMs: latency(row.request_latency_ms),
    requestsPerSecond: row.requests_per_second, inputTps: row.input_tokens_per_second, outputTps: row.output_tokens_per_second, totalTps: row.total_tokens_per_second,
    outputTpsPerUserP50: row.output_tokens_per_second_per_user_p50, successful: row.successful, errored: row.errored, incomplete: row.incomplete,
    durationSeconds: row.duration_seconds,
  };
}
