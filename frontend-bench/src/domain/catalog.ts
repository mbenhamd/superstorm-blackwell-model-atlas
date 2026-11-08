import atlas from "../data/atlas.json";
import type { BenchmarkRun, ConfigurationStatus, Deployment, Experiment, Hardware, LatencyStats, MetricRow, Model, Precision, RunIdentity, Snapshot, Workload } from "./types.js";
import { ValidationError } from "./validation.js";

/**
 * The catalog snapshot is built from src/data/atlas.json, pinned from the research atlas by
 * scripts/import-atlas.ts. It contains no measurements: every configuration starts with no sweep points
 * until a measured run from the execution repository is merged with applyRuns().
 */

export const ATLAS = atlas;
export const DEFAULT_WORKLOAD = atlas.workloads[0]!.id;

// Neutral, distinguishable identity colors for model chips; not tied to any vendor branding.
const palette = ["#5e6ad2", "#e5793a", "#26a68e", "#b38600", "#d6457a", "#3b8fd9", "#8a63d2", "#2f9e5b", "#c2553a", "#6b7f99", "#a1764b", "#4aa3a3"];

const artifactById = new Map(atlas.artifacts.map((artifact) => [artifact.id, artifact]));

function shellArg(arg: string): string {
  return /^[\w@%+=:,./-]+$/.test(arg) ? arg : `'${arg.replaceAll("'", `'\\''`)}'`;
}

/**
 * Serve command with the atlas's exact engine arguments, formatted for reading and copy-paste: the entry
 * point on the first line, then one flag (with its value) per line, joined with POSIX `\` continuations.
 * Values are shell-quoted only when needed (JSON configs). Nothing is added to or removed from the arguments.
 * KServe runs this as the InferenceService container command.
 */
export function launchCommand(engine: "vLLM" | "SGLang", hfId: string, args: string[]): string {
  const lines: string[][] = engine === "vLLM" ? [["vllm", "serve", hfId]] : [["python", "-m", "sglang.launch_server"], ["--model-path", hfId]];
  for (const arg of args) {
    if (arg.startsWith("-") || !lines.at(-1)?.[0]?.startsWith("-")) lines.push([arg]);
    else lines.at(-1)!.push(arg);
  }
  return lines.map((tokens, index) => `${index ? "  " : ""}${tokens.map(shellArg).join(" ")}`).join(" \\\n");
}

export const models: Model[] = atlas.models.map((model, index) => ({
  id: model.id, name: model.name, family: model.company, company: model.company, hfId: model.hfId, revision: model.revision,
  parametersB: model.totalParamsB, activeParamsB: model.activeParamsB, description: model.headline, color: palette[index % palette.length]!,
  contextTokens: model.contextTokens, architecture: model.architecture as Model["architecture"], layout: model.layout,
  license: model.license, recommended: model.recommended,
}));

export const hardware: Hardware[] = atlas.hardware.map(({ id, name, memoryGb, interconnect }, index) => ({ id, name, memoryGb, interconnect, color: palette[index]! }));

export const workloads: Workload[] = atlas.workloads.map((workload) => ({ ...workload, cache: workload.cache as Workload["cache"] }));

/** gpu_type as the bench identity spells it ("B300"); the catalog covers one GPU type. */
const GPU_TYPE = atlas.hardware[0]!.name.replace(/^NVIDIA\s+/i, "");

export const deployments: Deployment[] = atlas.configurations.map((config) => {
  const artifact = artifactById.get(config.artifactId);
  if (!artifact) throw new Error(`Unknown export ${config.artifactId}`);
  return {
    id: config.id, configurationId: config.id, modelId: config.modelId, artifactId: config.artifactId, hardwareId: "b300",
    gpus: config.gpus, tensorParallel: config.tensorParallel, dataParallel: config.dataParallel,
    runtime: config.engine as Deployment["runtime"],
    // Configured build only. The latest recheck release is a separate fact (recheck), never substituted here.
    runtimeVersion: config.engineRelease ?? "not recorded", runtimeCommit: config.sourceCommit ?? "not recorded",
    precision: artifact.precision as Precision, exportLabel: artifact.label, exportHfId: artifact.hfId,
    quantMethod: artifact.precisionDetail, artifactRevision: artifact.revision ?? "not recorded",
    knob: config.knob, status: config.status as ConfigurationStatus, reason: config.reason, contextCap: config.contextCap,
    speculativeDecoding: Boolean(config.draftHfId) || /mtp|dspark|dflash|eagle/i.test(config.id) || config.engineArgs.some((arg) => arg.startsWith("--speculative")),
    draftHfId: config.draftHfId, testedOnTarget: config.testedOnTarget,
    engineArgs: config.engineArgs, command: launchCommand(config.engine as Deployment["runtime"], artifact.hfId, config.engineArgs),
    notes: config.notes, sourceIds: config.sourceIds,
    reviewedOn: config.reviewedOn, referenceScope: config.referenceScope, recheck: config.recheck, priorRechecks: config.priorRechecks,
    workloadId: DEFAULT_WORKLOAD, evaluation: null, points: [], peakMemoryGb: null, evidence: "reference", measuredAt: null, runId: null,
    runtimeTag: null, gpuType: GPU_TYPE, replicas: null, runConfig: null, runGpus: null, topologyMismatch: false,
  };
});

export function createCatalogSnapshot(experiments: Experiment[] = []): Snapshot {
  return structuredClone({ schemaVersion: 2 as const, atlasCommit: atlas.atlas.commit, models, hardware, workloads, deployments, experiments });
}

const artifactBySlug = new Map(atlas.artifacts.map((artifact) => [artifact.slug, artifact]));
/**
 * runtime_version format: "<engine>[-<distribution>]-v<version>[-<flavor>]", e.g. "sglang-v0.5.23",
 * "vllm-v0.33.0-cu130", "vllm-openai-v0.33.0-cu130" (distribution "openai", flavor "cu130"). Mirrors the
 * experiments.runtime_version CHECK (db/004).
 */
export const RUNTIME_VERSION = /^(vllm|sglang)(?:-([a-z]+))?-v(\d+\.\d+\.\d+(?:rc\d+)?)(?:-([a-z0-9._-]+))?$/i;
/** Engine, distribution, version and flavor of a runtime_version; all null when it does not parse. */
export function splitRuntime(runtimeVersion: string): { engine: "vLLM" | "SGLang" | null; distribution: string | null; version: string | null; flavor: string | null } {
  const match = RUNTIME_VERSION.exec(runtimeVersion);
  if (!match) return { engine: null, distribution: null, version: null, flavor: null };
  return { engine: match[1]!.toLowerCase() === "vllm" ? "vLLM" : "SGLang", distribution: match[2]?.toLowerCase() ?? null, version: `v${match[3]}`, flavor: match[4] ?? null };
}

const finite = (value: unknown, field: string, min = 0): number => {
  if (typeof value !== "number" || !Number.isFinite(value) || value < min) throw new ValidationError(`${field} must be a finite number ≥ ${min}`);
  return value;
};
const optional = (value: unknown, field: string): number | null => value === null || value === undefined ? null : finite(value, field);
const stats = (value: unknown, field: string): LatencyStats => {
  const v = (value ?? {}) as Record<string, unknown>;
  return { mean: optional(v.mean, `${field}.mean`), p50: optional(v.p50, `${field}.p50`), p95: optional(v.p95, `${field}.p95`), p99: optional(v.p99, `${field}.p99`) };
};

/** Largest accepted gap between totalTps and inputTps + outputTps: 1 % of the total, or 1 tok/s for tiny totals. */
export const TOTAL_TPS_TOLERANCE = 0.01;

/**
 * Validate one metrics row exactly as stored; nothing is defaulted except absent latency statistics (null).
 * totalTps must equal inputTps + outputTps within TOTAL_TPS_TOLERANCE: the sustainable value reads totalTps while the
 * token-mix chart stacks input and output, so a row where they disagree would show two different totals.
 */
export function parseMetricRow(input: unknown, index = 0): MetricRow {
  const r = (input ?? {}) as Record<string, unknown>;
  if (!Number.isInteger(r.concurrency) || (r.concurrency as number) < 1) throw new ValidationError(`metrics[${index}].concurrency must be a positive integer`);
  const row = parseMetricFields(r, index);
  const sum = row.inputTps + row.outputTps;
  if (Math.abs(row.totalTps - sum) > Math.max(1, TOTAL_TPS_TOLERANCE * row.totalTps)) {
    throw new ValidationError(`metrics[${index}].totalTps (${row.totalTps}) must equal inputTps + outputTps (${sum}) within 1 %`);
  }
  return row;
}

function parseMetricFields(r: Record<string, unknown>, index: number): MetricRow {
  return {
    concurrency: r.concurrency as number,
    ttftMs: stats(r.ttftMs, `metrics[${index}].ttftMs`), itlMs: stats(r.itlMs, `metrics[${index}].itlMs`), requestLatencyMs: stats(r.requestLatencyMs, `metrics[${index}].requestLatencyMs`),
    requestsPerSecond: finite(r.requestsPerSecond, `metrics[${index}].requestsPerSecond`), inputTps: finite(r.inputTps, `metrics[${index}].inputTps`),
    outputTps: finite(r.outputTps, `metrics[${index}].outputTps`), totalTps: finite(r.totalTps, `metrics[${index}].totalTps`),
    outputTpsPerUserP50: optional(r.outputTpsPerUserP50, `metrics[${index}].outputTpsPerUserP50`),
    successful: finite(r.successful, `metrics[${index}].successful`), errored: finite(r.errored, `metrics[${index}].errored`), incomplete: finite(r.incomplete, `metrics[${index}].incomplete`),
    durationSeconds: finite(r.durationSeconds, `metrics[${index}].durationSeconds`, Number.MIN_VALUE),
  };
}

export function parseIdentity(input: unknown): RunIdentity {
  const v = (input ?? {}) as Record<string, unknown>;
  const text = (key: string, pattern: RegExp) => {
    if (typeof v[key] !== "string" || !pattern.test(v[key] as string)) throw new ValidationError(`identity.${key} is missing or invalid`);
    return v[key] as string;
  };
  const runtimeConfig = v.runtimeConfig;
  if (!runtimeConfig || typeof runtimeConfig !== "object" || Array.isArray(runtimeConfig)) throw new ValidationError("identity.runtimeConfig must be an object");
  const identity: RunIdentity = {
    modelName: text("modelName", /^[a-z0-9][a-z0-9._-]{1,120}$/), gpuType: text("gpuType", /^[A-Za-z0-9 ._-]{2,40}$/),
    numGpus: finite(v.numGpus, "identity.numGpus", 1), maxSystemReplicas: finite(v.maxSystemReplicas, "identity.maxSystemReplicas", 1),
    runtimeVersion: text("runtimeVersion", RUNTIME_VERSION), dataset: text("dataset", /^[a-z0-9][a-z0-9._-]{1,80}$/),
    runtimeConfig: runtimeConfig as Record<string, unknown>,
  };
  if (!Number.isInteger(identity.numGpus) || !Number.isInteger(identity.maxSystemReplicas)) throw new ValidationError("GPU and replica counts must be integers");
  return identity;
}

/**
 * Resolve the atlas configuration a run measures: an explicit configurationId wins; otherwise the unique
 * configuration with the same weights artifact, engine and GPU count. Ambiguous or unknown runs stay unmatched.
 */
export function matchConfiguration(identity: RunIdentity, snapshot: Snapshot, explicit?: string | null): string | null {
  if (explicit) return snapshot.deployments.some((d) => d.configurationId === explicit) ? explicit : null;
  const artifact = artifactBySlug.get(identity.modelName);
  const { engine } = splitRuntime(identity.runtimeVersion);
  const matches = snapshot.deployments.filter((d) => d.id === d.configurationId && artifact && d.artifactId === artifact.id && d.runtime === engine && d.gpus === identity.numGpus);
  return matches.length === 1 ? matches[0]!.configurationId : null;
}

/**
 * The measured view of one catalog configuration under one run: the catalog row keeps its reference identity and
 * configured build (runtimeVersion = engine_release); the run supplies metrics, date, runtime tag, topology and its
 * recorded runtime_config. A run on the catalog's default workload keeps the base id, other datasets use
 * `<configuration>@<dataset>`.
 */
export function measuredDeployment(base: Deployment, run: BenchmarkRun): Deployment {
  // runtimeVersion stays the configured build (engine_release); the run's full runtime_version is runtimeTag.
  const { identity } = run;
  return {
    ...base, id: identity.dataset === base.workloadId ? base.id : `${base.configurationId}@${identity.dataset}`, workloadId: identity.dataset,
    points: run.metrics, measuredAt: run.runDate, evidence: "measured", runId: run.id,
    runtimeTag: identity.runtimeVersion, gpuType: identity.gpuType, replicas: identity.maxSystemReplicas, runConfig: identity.runtimeConfig,
    runGpus: identity.numGpus, topologyMismatch: identity.numGpus !== base.gpus,
  };
}

/**
 * Merge measured runs: the newest run per configuration and dataset supplies metrics. The catalog row keeps its
 * reference identity; a run on the catalog's default workload measures it in place, other datasets add a sibling
 * deployment `<configuration>@<dataset>`.
 */
export function applyRuns(snapshot: Snapshot, runs: BenchmarkRun[]): Snapshot {
  const latest = new Map<string, BenchmarkRun>();
  for (const run of runs) {
    if (!run.configurationId) continue;
    const key = `${run.configurationId}|${run.identity.dataset}`;
    const current = latest.get(key);
    if (!current || Date.parse(run.runDate) > Date.parse(current.runDate)) latest.set(key, run);
  }
  const deployments = [...snapshot.deployments];
  for (const run of latest.values()) {
    const base = snapshot.deployments.find((d) => d.id === run.configurationId);
    if (!base) continue;
    const measured = measuredDeployment(base, run);
    const index = deployments.findIndex((d) => d.id === measured.id);
    if (index >= 0) deployments[index] = measured; else deployments.push(measured);
  }
  const matched = runs.filter((run) => run.configurationId && snapshot.deployments.some((d) => d.id === run.configurationId))
    .sort((a, b) => Date.parse(a.runDate) - Date.parse(b.runDate));
  return { ...snapshot, deployments, runs: matched, ...(runs.some((run) => run.test) ? { testData: true } : {}) };
}
