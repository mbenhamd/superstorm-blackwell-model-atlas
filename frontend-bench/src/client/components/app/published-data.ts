import {
  FLAG_LABELS, HARDWARE_CLASSES, VERSION_CLASSES, displayUnit, engineFamily, metricName, filterExternal, hardwareClass, isWeak, metricIndexes,
  type ExternalFilter, type ExternalLevel, type ExternalMetric, type ExternalRecord, type HardwareClass, type MetricKind, type VersionClass,
} from "../../../domain/external.js";

/*
 * View state and pure helpers of the Published explorer (no React, no DOM): filter state ⇄ URL parameters, facet
 * counts, the per-record headline value and the default ladder metric. External records stay evidence class
 * "external": nothing here produces a ranking, a sustainable rate or an SLO verdict.
 */

export interface PublishedFilters {
  /** Catalog model id; "" = all models. */
  model: string;
  hardware: HardwareClass[];
  /** Engine families ("vllm", "sglang", …; "not-stated" for an unknown family). */
  engines: string[];
  versions: VersionClass[];
  evidence: string[];
  /** Records must carry every listed flag. */
  flags: string[];
  /** Records must carry none of the listed flags. */
  without: string[];
  kind: "" | "ladder" | "point";
  /** Show weak records (invalid engine version, unverified extraction, superseded run). */
  weak: boolean;
}
export const EMPTY_FILTERS: PublishedFilters = { model: "", hardware: [], engines: [], versions: [], evidence: [], flags: [], without: [], kind: "", weak: false };

export const ENGINE_LABELS: Record<string, string> = {
  vllm: "vLLM", sglang: "SGLang", "tensorrt-llm": "TensorRT-LLM", dynamo: "Dynamo", tokenspeed: "TokenSpeed", "not-stated": "Not stated",
};
export const engineKey = (record: ExternalRecord): string => engineFamily(record) ?? "not-stated";
export const engineLabel = (key: string): string => ENGINE_LABELS[key] ?? key;
export const hardwareLabel = (value: HardwareClass): string => (value === "other" ? "Other / not stated" : value);

/** URL keys (repeated keys hold several values, since evidence classes contain commas). */
const KEYS = { model: "model", hardware: "hw", engines: "engine", versions: "version", evidence: "evidence", flags: "flag", without: "noflag", kind: "kind", weak: "weak" } as const;

/** Filters from URL parameters; unknown values (not in the dataset) are dropped. */
export function parseFilters(params: URLSearchParams, records: readonly ExternalRecord[], modelIds: ReadonlySet<string>): PublishedFilters {
  const engines = new Set(records.map(engineKey)), evidence = new Set(records.map((record) => record.evidenceClass)), flags = new Set(records.flatMap((record) => record.flags));
  const all = (key: string, keep: (value: string) => boolean) => [...new Set(params.getAll(key).flatMap((value) => value.split("|")).filter(keep))];
  const model = params.get(KEYS.model) ?? "";
  const kind = params.get(KEYS.kind);
  return {
    model: modelIds.has(model) ? model : "",
    hardware: all(KEYS.hardware, (value) => (HARDWARE_CLASSES as readonly string[]).includes(value)) as HardwareClass[],
    engines: all(KEYS.engines, (value) => engines.has(value)),
    versions: all(KEYS.versions, (value) => (VERSION_CLASSES as readonly string[]).includes(value)) as VersionClass[],
    evidence: params.getAll(KEYS.evidence).filter((value, index, list) => evidence.has(value) && list.indexOf(value) === index),
    flags: all(KEYS.flags, (value) => flags.has(value)),
    without: all(KEYS.without, (value) => flags.has(value)),
    kind: kind === "ladder" || kind === "point" ? kind : "",
    weak: params.get(KEYS.weak) === "1",
  };
}

/** URL parameters for the filters (empty filters write nothing). */
export function filterParams(filters: PublishedFilters): [string, string][] {
  const out: [string, string][] = [];
  if (filters.model) out.push([KEYS.model, filters.model]);
  for (const key of ["hardware", "engines", "versions", "evidence", "flags", "without"] as const) for (const value of filters[key]) out.push([KEYS[key], value]);
  if (filters.kind) out.push([KEYS.kind, filters.kind]);
  if (filters.weak) out.push([KEYS.weak, "1"]);
  return out;
}

export const isFiltered = (filters: PublishedFilters): boolean => filterParams({ ...filters, weak: false }).length > 0;

export function toExternalFilter(filters: PublishedFilters): ExternalFilter {
  return {
    modelId: filters.model || undefined, hardware: filters.hardware, engines: filters.engines, versionClasses: filters.versions,
    evidenceClasses: filters.evidence, flags: filters.flags, withoutFlags: filters.without, kind: filters.kind || undefined, showWeak: filters.weak,
  };
}

export const applyFilters = (records: readonly ExternalRecord[], filters: PublishedFilters): ExternalRecord[] => filterExternal(records, toExternalFilter(filters));

export type Facet = "model" | "hardware" | "engines" | "versions" | "evidence" | "flags" | "without" | "kind";
const CLEARED: Record<Facet, Partial<PublishedFilters>> = {
  model: { model: "" }, hardware: { hardware: [] }, engines: { engines: [] }, versions: { versions: [] }, evidence: { evidence: [] },
  flags: { flags: [] }, without: { without: [] }, kind: { kind: "" },
};
const facetValues = (record: ExternalRecord, facet: Facet): string[] => {
  switch (facet) {
    case "model": return [record.modelId];
    case "hardware": return [hardwareClass(record.gpuType)];
    case "engines": return [engineKey(record)];
    case "versions": return [record.audit.class];
    case "evidence": return [record.evidenceClass];
    case "kind": return [record.kind];
    case "flags": case "without": return record.flags;
  }
};
/**
 * Records per value of one facet under every other active filter (the facet's own selection is ignored, so a chosen
 * value never hides its siblings). Weak records count only when they are shown.
 */
export function facetCounts(records: readonly ExternalRecord[], filters: PublishedFilters, facet: Facet): Map<string, number> {
  const counts = new Map<string, number>();
  // A flag facet keeps the other flag facet active: "has X" counts within the records that pass "without Y".
  for (const record of applyFilters(records, { ...filters, ...CLEARED[facet] })) {
    for (const value of facetValues(record, facet)) counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return counts;
}

/** Weak records the current filters would show with "Show weak records" on. */
export const hiddenWeak = (records: readonly ExternalRecord[], filters: PublishedFilters): number =>
  filters.weak ? 0 : applyFilters(records, { ...filters, weak: true }).filter(isWeak).length;

/** Flag options: every flag in the dataset with its short label, most frequent first. */
export function flagOptions(records: readonly ExternalRecord[]): string[] {
  const counts = new Map<string, number>();
  for (const record of records) for (const flag of record.flags) counts.set(flag, (counts.get(flag) ?? 0) + 1);
  return [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([flag]) => flag);
}
export const flagLabel = (flag: string): string => FLAG_LABELS[flag] ?? flag;

/* ─────────────────────────────── values and ladders ─────────────────────────────── */

export interface Headline { metricIndex: number; metric: ExternalMetric; level: ExternalLevel; value: number }
/**
 * Highest published output tok/s/GPU of one record (one published level, values with a qualifier skipped), or null
 * when the record publishes no output tok/s/GPU. A source's number, never a sustainable rate; `metric.derived` says
 * when the extraction divided an aggregate by the GPU count.
 */
export function headline(record: ExternalRecord): Headline | null {
  let best: Headline | null = null;
  for (const metricIndex of metricIndexes(record, "output-per-gpu")) {
    for (const level of record.levels) {
      const value = level.values[metricIndex];
      if (value === null || value === undefined || level.details[metricIndex]?.qualifier) continue;
      if (!best || value > best.value) best = { metricIndex, metric: record.metrics[metricIndex]!, level, value };
    }
  }
  return best;
}

/** Metric indexes that can be drawn against concurrency: at least two levels with a numeric concurrency and value. */
export function ladderMetrics(record: ExternalRecord): number[] {
  return record.metrics.flatMap((_, index) => (record.levels.filter((level) => level.concurrency !== null && level.values[index] !== null && level.values[index] !== undefined).length >= 2 ? [index] : []));
}
const KIND_ORDER: MetricKind[] = ["output-per-gpu", "total-per-gpu", "output", "total", "per-user", "tpot", "itl", "ttft", "e2e", "request-rate", "other"];
/** Default chart metric: throughput per GPU first, then aggregate throughput, per-user speed and latencies; null when none can be drawn. */
export function defaultLadderMetric(record: ExternalRecord): number | null {
  const drawable = ladderMetrics(record);
  if (!drawable.length) return null;
  return [...drawable].sort((a, b) => KIND_ORDER.indexOf(record.metrics[a]!.kind) - KIND_ORDER.indexOf(record.metrics[b]!.kind) || a - b)[0]!;
}

/** "output throughput per GPU (derived) · tok/s/GPU · p50": the metric as published. */
export function metricTitle(metric: ExternalMetric): string {
  return [metricName(metric), displayUnit(metric), metric.percentile].filter(Boolean).join(" · ");
}

/** Concurrency span of a record ("c1–c256"), or null when no level states a concurrency. */
export function concurrencySpan(record: ExternalRecord): string | null {
  const levels = record.levels.flatMap((level) => (level.concurrency === null ? [] : [level.concurrency]));
  if (!levels.length) return null;
  const lo = Math.min(...levels), hi = Math.max(...levels);
  return lo === hi ? `c${lo}` : `c${lo}–c${hi}`;
}

/** A published value with up to three significant decimals below 100 (latencies in s, per-user rates). */
export function formatValue(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  const abs = Math.abs(value);
  const digits = abs >= 100 || Number.isInteger(value) ? 0 : abs >= 10 ? 1 : abs >= 1 ? 2 : 3;
  return new Intl.NumberFormat("en-GB", { maximumFractionDigits: digits }).format(value);
}
