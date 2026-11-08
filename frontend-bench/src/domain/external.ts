import { ValidationError } from "./validation.js";

/*
 * External published results: concurrency ladders and single points published by third parties, engine projects and
 * vendors (data/external-benchmarks.json, written by scripts/import-external.ts). Evidence class "external" is distinct
 * from "measured" (imported bench runs) and "reference" (catalog). External records never enter rank(), capacity(),
 * sustainable throughput, C_max, Δ vs best, ties, champions, frontier, variants or Compare deltas: nothing in this
 * module produces a Deployment, MetricRow, BenchmarkRun or Capacity, and no ranking module imports it
 * (tests/external.test.ts walks the import graph). Values keep the source's metric names and units; no SLO is applied.
 */

export const EXTERNAL_EVIDENCE = "external" as const;
export type ExternalEvidence = typeof EXTERNAL_EVIDENCE;
export const EXTERNAL_SCHEMA_VERSION = 1 as const;

/** Engine-version audit classes (release lists rechecked at import time; see the file's conventions). */
export const VERSION_CLASSES = ["stable", "prerelease", "nightly-or-commit", "custom-tag", "not-stated", "invalid"] as const;
export type VersionClass = (typeof VERSION_CLASSES)[number];
export const VERSION_CLASS_LABELS: Record<VersionClass, string> = {
  stable: "stable ✓", prerelease: "pre-release", "nightly-or-commit": "nightly / commit", "custom-tag": "custom build", "not-stated": "not stated", invalid: "invalid ✗",
};

/**
 * Short human labels for every record caveat flag (the file's conventions carry the long descriptions). The import
 * refuses a flag without a label here, so a new caveat cannot reach the UI unlabelled.
 */
export const FLAG_LABELS: Record<string, string> = {
  "agentic-trace-workload": "agentic trace replay",
  "artifact-or-revision-differs": "different checkpoint or revision",
  "batch-size-not-concurrency": "batch size, not concurrency",
  "cached-input-in-total": "cached input counted in total",
  "custom-image-tag": "custom image tag",
  "different-checkpoint": "different checkpoint",
  "engine-not-vllm-sglang": "engine is not vLLM or SGLang",
  "engine-version-not-stated": "engine version not stated",
  "from-prior-dataset": "regrouped from an earlier dataset",
  "gpu-type-unstated": "GPU type not stated",
  "hardware-mismatch": "not B300",
  "kv-offload": "KV cache offload",
  "kv-offload-host-dram": "KV cache offload to host memory",
  "low-provenance": "low provenance",
  "multi-node": "multi-node",
  "multi-replica": "multiple replicas",
  "nightly-build": "nightly build",
  "not-a-throughput-measurement": "not a throughput measurement",
  "orchestrated-by-dynamo": "behind NVIDIA Dynamo",
  "orchestrated-or-other-engine": "orchestrator or other engine",
  "other-hardware": "other GPU",
  "pd-disaggregated": "prefill/decode disaggregated",
  "per-level-config-varies": "configuration varies per level",
  "pre-release-engine-build": "pre-release engine build",
  "relative-only": "relative values only",
  "repeated-concurrency": "repeated concurrency rows",
  "request-failures": "request failures",
  "revision-not-pinned": "revision not pinned",
  "single-level": "single load level",
  "spec-decode": "speculative decoding",
  "superseded-run": "superseded run",
  "synthetic-acceptance": "simulated spec-decode acceptance",
  "throughput-includes-cached-input": "cached input counted in total",
  "unmerged-pr-build": "unmerged PR build",
  "unverified-extraction": "unverified extraction",
};
/** Flags that hide a record by default (with an invalid engine version): "Show weak records" reveals them. */
export const WEAK_FLAGS = ["unverified-extraction", "superseded-run"] as const;

export interface ExternalSource {
  id: string; url: string; title: string; publisher: string;
  /** As the source states it; null when not stated. */
  publishedOn: string | null;
  evidenceClass: string; retrievedOn: string | null;
  apiUrl: string | null; run: string | null; note: string | null; dateNote: string | null; aliases: string[];
}

export interface EngineVersionAudit {
  /** engineVersion as recorded from the source. */
  raw: string;
  class: VersionClass;
  /** Release tag (stable / pre-release), nightly/commit identity, or image tag (custom build); null when none. */
  canonical: string | null;
  /** GitHub release date of `canonical` (stable / pre-release); null otherwise. */
  releaseDate: string | null;
  /** Earliest public availability (GitHub release or PyPI upload), when known. */
  availableFrom: string | null;
  /** Project the version string identifies ("vllm", "sglang", "tensorrt-llm", "dynamo", …); null when not stated. */
  engineFamily: string | null;
  /** Stated base release of a custom build. */
  baseRelease: string | null;
  /** Audit checks, e.g. "version-after-publication", "commit-not-found-upstream:<sha>". */
  flags: string[];
  /** Source quote re-opened for ambiguous or invalid strings. */
  sourceText: string | null;
}

/** Metric families the selectors use. Anything not matched exactly is "other" and shown only by its published name. */
export type MetricKind = "output-per-gpu" | "total-per-gpu" | "output" | "total" | "per-user" | "ttft" | "tpot" | "itl" | "e2e" | "request-rate" | "other";

export interface ExternalMetric {
  /** Metric name as published (normalised wording from the extraction), e.g. "output throughput per GPU (derived)". */
  name: string; unit: string | null; perGpu: boolean; percentile: string | null;
  /** The source's own label or column, when recorded. */
  label: string | null;
  /** e.g. "derived: ÷ 8 GPUs". */
  note: string | null;
  /** Computed by the extraction (aggregate ÷ GPU count), not published as such. */
  derived: boolean;
  kind: MetricKind;
}

/** Extra facts of one published value besides the number. */
export interface ExternalValueDetail { range: [number, number] | null; valueMax: number | null; of: number | null; qualifier: string | null }

export interface ExternalLevel {
  /** Client concurrency; null when the source states a load point without one (see `label`). */
  concurrency: number | null;
  requestRate: number | null;
  /** Load-point wording as published when there is no numeric concurrency, e.g. "peak". */
  label: string | null;
  /** One entry per record metric (same order); null = not published at this level. */
  values: (number | null)[];
  /** Range / max / denominator / qualifier per metric index, when published. */
  details: Record<number, ExternalValueDetail>;
  /** Level-specific shape facts as published (shape, gpuCount, kvOffload, spec, workers, …). */
  extras: Record<string, unknown>;
}

export interface ExternalRecord {
  evidence: ExternalEvidence;
  id: string;
  /** "ladder": a concurrency (or batch / rate) sweep; "point": a single published operating point. */
  kind: "ladder" | "point";
  modelId: string;
  publishedModel: string; precision: string;
  /** GPU type as published ("B300", "GB300", "H200 NVL"); null when not stated. */
  gpuType: string | null;
  gpuCount: number | null;
  topology: string | null;
  /** Hardware description as published (points only). */
  hardware: string | null;
  /** Engine as published, e.g. "vLLM", "Dynamo + SGLang". */
  engine: string;
  engineVersion: string;
  audit: EngineVersionAudit;
  config: string;
  workload: { name: string; isl: number | null; osl: number | null };
  sourceId: string;
  /** The record's own date when stated, else null (use recordDate() for the source's). */
  publishedOn: string | null;
  /** The record's evidence class, else its source's. */
  evidenceClass: string;
  /** Exact catalog configuration the record measures, when one matches; never a ranking input. */
  catalogConfigurationId: string | null;
  /** Nearest catalog configuration (not a match); `mismatch` says how it differs. */
  closestCatalogConfigurationId: string | null;
  mismatch: string | null;
  flags: string[];
  notes: string | null;
  /** Verifier correction applied after extraction. */
  correction: { note: string; fields: string[] } | null;
  metrics: ExternalMetric[];
  levels: ExternalLevel[];
}

export interface ExternalDataset {
  schemaVersion: typeof EXTERNAL_SCHEMA_VERSION;
  retrievedOn: string;
  conventions: { flags: Record<string, string>; derived: string; kserve: string; versionClasses: Record<string, string> };
  releases: Record<string, { version: string; date: string | null; prerelease: boolean }[]>;
  sources: Record<string, ExternalSource>;
  records: ExternalRecord[];
}

/** Catalog ids the records may reference: models, and configurations with their model. */
export interface ExternalCatalogRefs { modelIds: ReadonlySet<string>; configurationModels: ReadonlyMap<string, string> }

/* ───────────────────────────── metric classification ───────────────────────────── */

const PER_GPU_SUFFIX = String.raw`(?: per GPU)?(?: \((?:derived|per GPU|derived per GPU)\))?`;
const OUTPUT_PER_GPU = new RegExp(String.raw`^(?:aggregate )?output throughput${PER_GPU_SUFFIX}$`, "i");
const TOTAL_PER_GPU = new RegExp(String.raw`^total throughput(?: per GPU)?(?: \((?:derived|per GPU|derived per GPU|incl\. prefix-cache-hit input|incl\. cached input)\))?$`, "i");
const OUTPUT = /^(?:aggregate )?output throughput(?: \((?:total|aggregate)\))?$/i;
const TOTAL = /^total throughput(?: \(incl\. prefix-cache-hit input\))?$/i;

/**
 * Metric family by exact published wording and unit. Per-GPU kinds require perGpu and the unit "tok/s/GPU" (a per-GPU
 * flag with a bare "tok/s" unit is ambiguous and stays "other"); per-decode-GPU, per-dataset subsets, ratios, bounds and
 * approximations stay "other".
 */
export function metricKind(metric: Pick<ExternalMetric, "name" | "unit" | "perGpu">): MetricKind {
  const name = metric.name.trim(), unit = (metric.unit ?? "").trim().toLowerCase();
  if (metric.perGpu && unit === "tok/s/gpu") {
    if (OUTPUT_PER_GPU.test(name)) return "output-per-gpu";
    if (TOTAL_PER_GPU.test(name)) return "total-per-gpu";
    return "other";
  }
  if (!metric.perGpu && unit === "tok/s" && OUTPUT.test(name)) return "output";
  if (!metric.perGpu && unit === "tok/s" && TOTAL.test(name)) return "total";
  if (!metric.perGpu && (unit === "tok/s/user" || (unit === "tok/s" && /^per-user output throughput/i.test(name))) && /^(per-user output throughput|interactivity|output speed|output speed per (stream|request)|user output throughput|output throughput per (user|request))\b/i.test(name)) return "per-user";
  if (unit === "ms" || unit === "s") {
    if (/^TTFT\b/.test(name)) return "ttft";
    if (/^TPOT\b/.test(name)) return "tpot";
    if (/^ITL\b/.test(name)) return "itl";
    if (/^(E2E latency|request latency)\b/i.test(name)) return "e2e";
  }
  if (unit === "req/s" && /^request throughput$/i.test(name)) return "request-rate";
  return "other";
}
/** A latency in ms from a published s or ms value; null for any other unit. */
export const latencyMs = (value: number | null, unit: string | null): number | null =>
  value === null ? null : unit === "ms" ? value : unit === "s" ? value * 1000 : null;

/* ───────────────────────────────── parsing ───────────────────────────────── */

type JsonObject = Record<string, unknown>;
const isObject = (value: unknown): value is JsonObject => typeof value === "object" && value !== null && !Array.isArray(value);
/** Local filesystem paths never ship (the dataset holds only public URLs and published facts). */
export const LOCAL_PATH = /(?:^|[\s("'=])(?:\/tmp\/|\/Users\/|\/home\/|\/var\/folders\/|\/private\/|[A-Z]:\\|file:\/\/|~\/)/;

function text(value: unknown, field: string): string {
  if (typeof value !== "string" || !value.trim()) throw new ValidationError(`${field} must be a non-empty string`);
  if (LOCAL_PATH.test(value)) throw new ValidationError(`${field} contains a local path`);
  return value;
}
function optionalText(value: unknown, field: string): string | null {
  return value === null || value === undefined ? null : text(value, field);
}
function finite(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) throw new ValidationError(`${field} must be a finite number`);
  return value;
}
const optionalNumber = (value: unknown, field: string): number | null => (value === null || value === undefined ? null : finite(value, field));
function strings(value: unknown, field: string): string[] {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) throw new ValidationError(`${field} must be an array of strings`);
  return value.map((item, index) => text(item, `${field}[${index}]`));
}
const isDate = (value: string | null): boolean => value === null || /^\d{4}-\d{2}-\d{2}$/.test(value) || value === "not stated";
const scanLocal = (value: unknown, field: string): void => {
  if (typeof value === "string") { if (LOCAL_PATH.test(value)) throw new ValidationError(`${field} contains a local path`); }
  else if (Array.isArray(value)) value.forEach((item, index) => scanLocal(item, `${field}[${index}]`));
  else if (isObject(value)) for (const [key, item] of Object.entries(value)) scanLocal(item, `${field}.${key}`);
};

function parseSource(id: string, input: unknown): ExternalSource {
  if (!isObject(input)) throw new ValidationError(`sources.${id} must be an object`);
  const url = text(input.url, `sources.${id}.url`);
  if (!/^https?:\/\/[^\s]+$/.test(url)) throw new ValidationError(`sources.${id}.url must be an absolute http(s) URL`);
  const publishedOn = optionalText(input.publishedOn, `sources.${id}.publishedOn`);
  return {
    id, url, title: text(input.title, `sources.${id}.title`), publisher: text(input.publisher, `sources.${id}.publisher`),
    publishedOn: publishedOn === "not stated" ? null : publishedOn, evidenceClass: text(input.evidenceClass, `sources.${id}.evidenceClass`),
    retrievedOn: optionalText(input.retrievedOn, `sources.${id}.retrievedOn`) === "not stated" ? null : optionalText(input.retrievedOn, `sources.${id}.retrievedOn`),
    apiUrl: optionalText(input.apiUrl, `sources.${id}.apiUrl`), run: optionalText(input.run, `sources.${id}.run`),
    note: optionalText(input.note, `sources.${id}.note`), dateNote: optionalText(input.dateNote, `sources.${id}.dateNote`), aliases: strings(input.aliases, `sources.${id}.aliases`),
  };
}

function parseAudit(input: unknown, raw: string, field: string): EngineVersionAudit {
  if (!isObject(input)) throw new ValidationError(`${field} must be an object`);
  const kind = input.class;
  if (!VERSION_CLASSES.includes(kind as VersionClass)) throw new ValidationError(`${field}.class must be one of ${VERSION_CLASSES.join(", ")}`);
  return {
    raw, class: kind as VersionClass, canonical: optionalText(input.canonical, `${field}.canonical`),
    releaseDate: optionalText(input.releaseDate, `${field}.releaseDate`), availableFrom: optionalText(input.availableFrom, `${field}.availableFrom`),
    engineFamily: optionalText(input.engineFamily, `${field}.engineFamily`), baseRelease: optionalText(input.baseRelease, `${field}.baseRelease`),
    flags: strings(input.flags, `${field}.flags`), sourceText: optionalText(input.sourceText, `${field}.sourceText`),
  };
}

/**
 * Link text for a source: its title, unless the title only repeats an identifier slug ("Fixstars: fixstars-deploying-
 * kimi-k3-…", "SGLang cookbook benchmark data: glm-5-3-benchmarks"); then the title's lead (or the publisher) and the
 * publication date. The full title stays available as the link's title.
 */
export function sourceLinkText(source: Pick<ExternalSource, "title" | "publisher" | "publishedOn">): string {
  const match = source.title.match(/^(.*?):\s*([a-z0-9][a-z0-9.]*(?:-[a-z0-9.]+)+)\s*$/);
  if (!match) return source.title;
  const date = source.publishedOn && /^\d{4}-\d{2}(-\d{2})?$/.test(source.publishedOn) ? source.publishedOn : null;
  return [match[1]?.trim() || source.publisher, date].filter(Boolean).join(" · ");
}

/**
 * Unit as displayed: every per-user rate reads "tok/s/user" (some sources state a bare "tok/s" for a per-user metric;
 * the record keeps the published unit). Other units are shown as published.
 */
export const displayUnit = (metric: Pick<ExternalMetric, "unit" | "kind">): string | null => (metric.kind === "per-user" ? "tok/s/user" : metric.unit);

/**
 * The derivation of a "derived" per-GPU value, stated once: "derived: aggregate ÷ 8 GPUs" (GPU count from the note
 * "derived: ÷ 8 GPUs", else the record's GPU count); null when the metric is not derived.
 */
export function derivationText(metric: Pick<ExternalMetric, "derived" | "note">, gpuCount: number | null): string | null {
  if (!metric.derived) return null;
  const count = metric.note?.match(/÷\s*(\d+)\s*GPU/i)?.[1] ?? (gpuCount ? String(gpuCount) : null);
  return `derived: aggregate ÷ ${count ? `${count} GPU${count === "1" ? "" : "s"}` : "GPU count"}`;
}

/** Metric name without a trailing "(derived)": the derivation is stated once, by derivationText. */
export const metricName = (metric: Pick<ExternalMetric, "name">): string => metric.name.replace(/\s*\(derived\)\s*$/i, "");

/** File form of a metric: [name, unit, perGpu, percentile, label?, note?] (compact, one per line in the file). */
function parseMetric(input: unknown, field: string): ExternalMetric {
  if (!Array.isArray(input) || input.length < 4 || input.length > 6) throw new ValidationError(`${field} must be [name, unit, perGpu, percentile, label?, note?]`);
  const [name, unit, perGpu, percentile, label, note] = input as unknown[];
  if (typeof perGpu !== "boolean") throw new ValidationError(`${field}[2] (perGpu) must be a boolean`);
  const metric = {
    name: text(name, `${field}.name`), unit: optionalText(unit, `${field}.unit`), perGpu,
    percentile: optionalText(percentile, `${field}.percentile`), label: optionalText(label, `${field}.label`), note: optionalText(note, `${field}.note`),
  };
  return { ...metric, derived: /\bderived\b/i.test(metric.name) || /^derived\b/i.test(metric.note ?? ""), kind: metricKind(metric) };
}

const LEVEL_KEYS = new Set(["concurrency", "requestRate", "label", "values"]);
function parseLevel(input: unknown, width: number, field: string): ExternalLevel {
  if (!isObject(input)) throw new ValidationError(`${field} must be an object`);
  const concurrency = optionalNumber(input.concurrency, `${field}.concurrency`);
  if (concurrency !== null && (!Number.isInteger(concurrency) || concurrency < 1)) throw new ValidationError(`${field}.concurrency must be a positive integer`);
  if (!Array.isArray(input.values) || input.values.length !== width) throw new ValidationError(`${field}.values must hold one entry per metric (${width})`);
  const details: Record<number, ExternalValueDetail> = {};
  const values = input.values.map((cell, index) => {
    if (cell === null || typeof cell === "number") return optionalNumber(cell, `${field}.values[${index}]`);
    if (!isObject(cell)) throw new ValidationError(`${field}.values[${index}] must be a number, null or an object`);
    const range = cell.range === undefined || cell.range === null ? null : cell.range;
    if (range !== null && !(Array.isArray(range) && range.length === 2 && range.every((item) => typeof item === "number" && Number.isFinite(item)))) throw new ValidationError(`${field}.values[${index}].range must be [low, high]`);
    details[index] = { range: range as [number, number] | null, valueMax: optionalNumber(cell.valueMax, `${field}.values[${index}].valueMax`), of: optionalNumber(cell.of, `${field}.values[${index}].of`), qualifier: optionalText(cell.qualifier, `${field}.values[${index}].qualifier`) };
    return optionalNumber(cell.value, `${field}.values[${index}].value`);
  });
  if (values.every((value, index) => value === null && !details[index]?.range)) throw new ValidationError(`${field} publishes no value`);
  const extras = Object.fromEntries(Object.entries(input).filter(([key, value]) => !LEVEL_KEYS.has(key) && value !== null && value !== undefined));
  scanLocal(extras, `${field}.extras`);
  return { concurrency, requestRate: optionalNumber(input.requestRate, `${field}.requestRate`), label: optionalText(input.label, `${field}.label`), values, details, extras };
}

function parseRecord(input: unknown, index: number, sources: Record<string, ExternalSource>, refs: ExternalCatalogRefs, flagDescriptions: Record<string, string>): ExternalRecord {
  const field = `records[${index}]`;
  if (!isObject(input)) throw new ValidationError(`${field} must be an object`);
  const id = text(input.id, `${field}.id`);
  const at = `records[${id}]`;
  if (input.kind !== "ladder" && input.kind !== "point") throw new ValidationError(`${at}.kind must be "ladder" or "point"`);
  const modelId = text(input.modelId, `${at}.modelId`);
  if (!refs.modelIds.has(modelId)) throw new ValidationError(`${at}.modelId ${modelId} is not a catalog model`);
  const configuration = (key: "catalogConfigurationId" | "closestCatalogConfigurationId"): string | null => {
    const value = optionalText(input[key], `${at}.${key}`);
    if (value === null) return null;
    const owner = refs.configurationModels.get(value);
    if (!owner) throw new ValidationError(`${at}.${key} ${value} is not a catalog configuration`);
    if (owner !== modelId) throw new ValidationError(`${at}.${key} ${value} belongs to ${owner}, not ${modelId}`);
    return value;
  };
  const sourceId = text(input.sourceId, `${at}.sourceId`);
  const source = sources[sourceId];
  if (!source) throw new ValidationError(`${at}.sourceId ${sourceId} is not in sources`);
  const flags = strings(input.flags, `${at}.flags`);
  for (const flag of flags) if (!FLAG_LABELS[flag] || !flagDescriptions[flag]) throw new ValidationError(`${at}.flags: ${flag} has no label or description`);
  if (!Array.isArray(input.metrics) || input.metrics.length === 0) throw new ValidationError(`${at}.metrics must be a non-empty array`);
  const metrics = input.metrics.map((metric, i) => parseMetric(metric, `${at}.metrics[${i}]`));
  if (!Array.isArray(input.levels) || input.levels.length === 0) throw new ValidationError(`${at}.levels must be a non-empty array`);
  const levels = input.levels.map((level, i) => parseLevel(level, metrics.length, `${at}.levels[${i}]`));
  const workload = isObject(input.workload) ? input.workload : null;
  if (!workload) throw new ValidationError(`${at}.workload must be an object`);
  const publishedOn = optionalText(input.publishedOn, `${at}.publishedOn`);
  if (!isDate(publishedOn)) throw new ValidationError(`${at}.publishedOn must be YYYY-MM-DD or "not stated"`);
  const correction = input.correction === undefined || input.correction === null ? null : isObject(input.correction)
    ? { note: text(input.correction.note, `${at}.correction.note`), fields: strings(input.correction.fields, `${at}.correction.fields`) }
    : (() => { throw new ValidationError(`${at}.correction must be an object`); })();
  const gpuCount = optionalNumber(input.gpuCount, `${at}.gpuCount`);
  if (gpuCount !== null && (!Number.isInteger(gpuCount) || gpuCount < 1)) throw new ValidationError(`${at}.gpuCount must be a positive integer`);
  const gpuType = optionalText(input.gpuType, `${at}.gpuType`);
  // An unknown GPU is not a mismatch: "not B300" needs a stated GPU type; the source's silence is "GPU type not stated".
  for (const flag of ["hardware-mismatch", "other-hardware"]) if (!gpuTypeStated(gpuType) && flags.includes(flag)) throw new ValidationError(`${at}.flags: ${flag} needs a stated gpuType (use gpu-type-unstated)`);
  return {
    evidence: EXTERNAL_EVIDENCE, id, kind: input.kind, modelId,
    publishedModel: text(input.publishedModel, `${at}.publishedModel`), precision: text(input.precision, `${at}.precision`),
    gpuType, gpuCount, topology: optionalText(input.topology, `${at}.topology`), hardware: optionalText(input.hardware, `${at}.hardware`),
    engine: text(input.engine, `${at}.engine`), engineVersion: text(input.engineVersion, `${at}.engineVersion`), audit: parseAudit(input.audit, text(input.engineVersion, `${at}.engineVersion`), `${at}.audit`),
    config: text(input.config, `${at}.config`),
    workload: { name: text(workload.name, `${at}.workload.name`), isl: optionalNumber(workload.isl, `${at}.workload.isl`), osl: optionalNumber(workload.osl, `${at}.workload.osl`) },
    sourceId, publishedOn: publishedOn === "not stated" ? null : publishedOn,
    evidenceClass: optionalText(input.evidenceClass, `${at}.evidenceClass`) ?? source.evidenceClass,
    catalogConfigurationId: configuration("catalogConfigurationId"), closestCatalogConfigurationId: configuration("closestCatalogConfigurationId"),
    mismatch: optionalText(input.mismatch, `${at}.mismatch`), flags, notes: optionalText(input.notes, `${at}.notes`), correction, metrics, levels,
  };
}

/**
 * Validate the committed dataset and expand it for the console: schema, unique record ids, every sourceId in the
 * source registry, model and configuration ids in the catalog (a configuration must belong to the record's model),
 * labelled flags, one value per metric per level, no local paths. Throws ValidationError on the first problem.
 */
export function parseExternalDataset(input: unknown, refs: ExternalCatalogRefs): ExternalDataset {
  if (!isObject(input)) throw new ValidationError("The external dataset must be an object");
  if (input.schemaVersion !== EXTERNAL_SCHEMA_VERSION) throw new ValidationError(`schemaVersion must be ${EXTERNAL_SCHEMA_VERSION}`);
  const retrievedOn = text(input.retrievedOn, "retrievedOn");
  const conventions = isObject(input.conventions) ? input.conventions : null;
  if (!conventions || !isObject(conventions.flags) || !isObject(conventions.versionClasses)) throw new ValidationError("conventions.flags and conventions.versionClasses must be objects");
  const flagDescriptions = Object.fromEntries(Object.entries(conventions.flags).map(([key, value]) => [key, text(value, `conventions.flags.${key}`)]));
  if (!isObject(input.sources)) throw new ValidationError("sources must be an object keyed by source id");
  const sources = Object.fromEntries(Object.entries(input.sources).map(([id, source]) => [id, parseSource(id, source)]));
  if (!Array.isArray(input.records)) throw new ValidationError("records must be an array");
  const seen = new Set<string>();
  const records = input.records.map((record, index) => {
    const parsed = parseRecord(record, index, sources, refs, flagDescriptions);
    if (seen.has(parsed.id)) throw new ValidationError(`records: duplicate id ${parsed.id}`);
    seen.add(parsed.id);
    return parsed;
  });
  const releases = isObject(input.releases) ? input.releases : {};
  return {
    schemaVersion: EXTERNAL_SCHEMA_VERSION, retrievedOn,
    conventions: {
      flags: flagDescriptions, derived: text(conventions.derived, "conventions.derived"), kserve: text(conventions.kserve, "conventions.kserve"),
      versionClasses: Object.fromEntries(Object.entries(conventions.versionClasses).map(([key, value]) => [key, text(value, `conventions.versionClasses.${key}`)])),
    },
    releases: Object.fromEntries(Object.entries(releases).map(([engine, list]) => [engine, (Array.isArray(list) ? list : []).map((item, i) => {
      if (!isObject(item)) throw new ValidationError(`releases.${engine}[${i}] must be an object`);
      return { version: text(item.version, `releases.${engine}[${i}].version`), date: optionalText(item.date, `releases.${engine}[${i}].date`), prerelease: item.prerelease === true };
    })])),
    sources, records,
  };
}

/* ───────────────────────────────── selectors ───────────────────────────────── */

/** Hardware classes in display order; "other" collects the rest (including "not stated"). */
export const HARDWARE_CLASSES = ["B300", "GB300", "B200", "GB200", "H200", "H100", "VR200", "other"] as const;
export type HardwareClass = (typeof HARDWARE_CLASSES)[number];
/** Leading GPU name of a published gpuType ("H200 NVL" → H200); the record keeps its full gpuType for display. */
export function hardwareClass(gpuType: string | null): HardwareClass {
  const match = /^(GB300|GB200|B300|B200|H200|H100|VR200)\b/i.exec(gpuType?.trim() ?? "");
  return match ? (match[1]!.toUpperCase() as HardwareClass) : "other";
}
/** True when the source names a GPU type ("not stated", "unknown" and blanks are no GPU type). */
export const gpuTypeStated = (gpuType: string | null): boolean => {
  const value = gpuType?.trim() ?? "";
  return value !== "" && !/^(not stated|unknown|n\/a|unspecified)$/i.test(value);
};
/**
 * Hardware against the console target: "target" (B300), "other" (a stated non-B300 GPU) or "unstated" (the source
 * names no GPU type: unknown, never shown as a mismatch).
 */
export type HardwareStatus = "target" | "other" | "unstated";
export function hardwareStatus(record: Pick<ExternalRecord, "gpuType">): HardwareStatus {
  if (!gpuTypeStated(record.gpuType)) return "unstated";
  return hardwareClass(record.gpuType) === "B300" ? "target" : "other";
}
/**
 * Flags to display next to a record: "engine version not stated" is dropped when the audit badge already reads "not
 * stated", and "not B300" / "other GPU" when the source states no GPU type (the hardware mark says so). Filters use `flags`.
 */
export function displayFlags(record: Pick<ExternalRecord, "flags" | "gpuType" | "audit">): string[] {
  return record.flags.filter((flag) => !(flag === "engine-version-not-stated" && record.audit.class === "not-stated") && !((flag === "hardware-mismatch" || flag === "other-hardware") && !gpuTypeStated(record.gpuType)));
}
/** Engine family the version identifies (audit), else null ("not stated"). */
export const engineFamily = (record: ExternalRecord): string | null => record.audit.engineFamily;
/** The record's date when stated, else its source's; null when neither states one. */
export const recordDate = (record: ExternalRecord, sources: Record<string, ExternalSource>): string | null => record.publishedOn ?? sources[record.sourceId]?.publishedOn ?? null;
/** Why a record is weak (hidden by default): an invalid engine version, an unverified extraction or a superseded run. */
export function weakReasons(record: ExternalRecord): string[] {
  return [...(record.audit.class === "invalid" ? ["invalid engine version"] : []), ...WEAK_FLAGS.filter((flag) => record.flags.includes(flag)).map((flag) => FLAG_LABELS[flag]!)];
}
export const isWeak = (record: ExternalRecord): boolean => weakReasons(record).length > 0;
/** Short labels of a record's flags, in record order. */
export const flagLabels = (record: ExternalRecord): string[] => displayFlags(record).map((flag) => FLAG_LABELS[flag] ?? flag);

export interface ExternalFilter {
  modelId?: string;
  hardware?: readonly HardwareClass[];
  /** Engine families ("vllm", "sglang", …); "not-stated" selects records whose engine family is unknown. */
  engines?: readonly string[];
  versionClasses?: readonly VersionClass[];
  evidenceClasses?: readonly string[];
  /** Records must carry every listed flag. */
  flags?: readonly string[];
  /** Records must carry none of the listed flags. */
  withoutFlags?: readonly string[];
  kind?: "ladder" | "point";
  /** Weak records (see weakReasons) are excluded unless true. */
  showWeak?: boolean;
}
/** Records matching every set criterion; weak records only with showWeak. Input order is kept. */
export function filterExternal(records: readonly ExternalRecord[], filter: ExternalFilter = {}): ExternalRecord[] {
  return records.filter((record) =>
    (filter.showWeak || !isWeak(record))
    && (!filter.modelId || record.modelId === filter.modelId)
    && (!filter.kind || record.kind === filter.kind)
    && (!filter.hardware?.length || filter.hardware.includes(hardwareClass(record.gpuType)))
    && (!filter.engines?.length || filter.engines.includes(engineFamily(record) ?? "not-stated"))
    && (!filter.versionClasses?.length || filter.versionClasses.includes(record.audit.class))
    && (!filter.evidenceClasses?.length || filter.evidenceClasses.includes(record.evidenceClass))
    && (!filter.flags?.length || filter.flags.every((flag) => record.flags.includes(flag)))
    && (!filter.withoutFlags?.length || !filter.withoutFlags.some((flag) => record.flags.includes(flag))));
}

export interface CoverageCell { modelId: string; hardware: HardwareClass; ladders: number; points: number }
/** Records per model × hardware class (for a coverage heatmap); only non-empty cells, models in first-seen order. */
export function externalCoverage(records: readonly ExternalRecord[]): CoverageCell[] {
  const cells = new Map<string, CoverageCell>();
  for (const record of records) {
    const hardware = hardwareClass(record.gpuType);
    const key = `${record.modelId}|${hardware}`;
    const cell = cells.get(key) ?? { modelId: record.modelId, hardware, ladders: 0, points: 0 };
    if (record.kind === "ladder") cell.ladders += 1; else cell.points += 1;
    cells.set(key, cell);
  }
  return [...cells.values()].sort((a, b) => HARDWARE_CLASSES.indexOf(a.hardware) - HARDWARE_CLASSES.indexOf(b.hardware));
}

/** Indexes of a record's metrics of one kind (published order). */
export const metricIndexes = (record: ExternalRecord, kind: MetricKind): number[] => record.metrics.flatMap((metric, index) => (metric.kind === kind ? [index] : []));

export interface SeriesPoint { concurrency: number; value: number }
/**
 * One published curve: x = concurrency (never time), y = the metric's value, levels without a numeric concurrency or
 * value skipped, ascending concurrency. Use the metric's own name and unit as the axis label.
 */
export function externalSeries(record: ExternalRecord, metricIndex: number): { metric: ExternalMetric; points: SeriesPoint[] } | null {
  const metric = record.metrics[metricIndex];
  if (!metric) return null;
  const points = record.levels.flatMap((level) => {
    const value = level.values[metricIndex];
    return level.concurrency !== null && value !== null && value !== undefined ? [{ concurrency: level.concurrency, value }] : [];
  }).sort((a, b) => a.concurrency - b.concurrency);
  return { metric, points };
}

export interface PublishedBest {
  hardware: HardwareClass;
  /** Engine family, null when not stated. */
  engine: string | null;
  record: ExternalRecord; level: ExternalLevel; metric: ExternalMetric; metricIndex: number;
  value: number;
}
/**
 * Highest published value of one metric kind (default output tok/s/GPU) per hardware class × engine family, over the
 * given records (filter weak records first). The value is the source's number at one published level, never a
 * sustainable rate; derived values keep metric.derived. Ordered by hardware class, then value descending.
 */
export function bestPublished(records: readonly ExternalRecord[], kind: MetricKind = "output-per-gpu"): PublishedBest[] {
  const best = new Map<string, PublishedBest>();
  for (const record of records) {
    const hardware = hardwareClass(record.gpuType), engine = engineFamily(record);
    for (const metricIndex of metricIndexes(record, kind)) {
      for (const level of record.levels) {
        const value = level.values[metricIndex];
        if (value === null || value === undefined || level.details[metricIndex]?.qualifier) continue;
        const key = `${hardware}|${engine}`;
        const current = best.get(key);
        if (!current || value > current.value) best.set(key, { hardware, engine, record, level, metric: record.metrics[metricIndex]!, metricIndex, value });
      }
    }
  }
  return [...best.values()].sort((a, b) => HARDWARE_CLASSES.indexOf(a.hardware) - HARDWARE_CLASSES.indexOf(b.hardware) || b.value - a.value);
}

/** Records that state an exact match to one catalog configuration (closest-configuration hints are not matches). */
export const publishedForConfiguration = (records: readonly ExternalRecord[], configurationId: string): ExternalRecord[] =>
  records.filter((record) => record.catalogConfigurationId === configurationId);

/** Sources referenced by the given records, sorted by publisher then title. */
export function sourcesOf(records: readonly ExternalRecord[], sources: Record<string, ExternalSource>): ExternalSource[] {
  const ids = new Set(records.map((record) => record.sourceId));
  return [...ids].map((id) => sources[id]!).filter(Boolean).sort((a, b) => a.publisher.localeCompare(b.publisher) || a.title.localeCompare(b.title));
}
