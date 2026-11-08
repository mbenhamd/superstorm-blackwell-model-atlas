import {
  displayUnit, engineFamily, externalSeries, filterExternal, metricName, hardwareClass, recordDate,
  type ExternalDataset, type ExternalMetric, type ExternalRecord, type HardwareClass, type MetricKind, type SeriesPoint,
} from "../../../domain/external.js";
import type { Deployment, Workload } from "../../../domain/types.js";

/*
 * Published (external) curve selection for the Throughput and Engine pages: pure functions over the external dataset
 * (no React, no UI state). External evidence only: nothing here produces a Deployment, run or capacity, and no ranking
 * module imports this file (tests/external.test.ts walks the ranking import graph).
 */

export type PublishedScope = "same" | "engine" | "all";
export const SCOPE_LABELS: Record<PublishedScope, string> = { same: "Same GPU + engine", engine: "Same engine", all: "All ladders" };

/** Metric families plotted on a published chart of their own, in preference order (per-GPU throughput first). */
const PLOT_ORDER: readonly MetricKind[] = ["output-per-gpu", "total-per-gpu", "total", "output", "per-user", "tpot", "itl", "ttft", "e2e", "request-rate"];

export interface PublishedCurve {
  record: ExternalRecord;
  /** "P1", "P2"… in list order: the tag drawn at the curve's last level and in the legend. */
  tag: string;
  metricIndex: number;
  metric: ExternalMetric;
  points: SeriesPoint[];
  /** True when the plotted metric is the host chart's own metric (overlay); false → a chart of its own. */
  overlay: boolean;
}

/** Engine family of a deployment as the audit names it ("vllm", "sglang"). */
export const deploymentEngine = (d: Pick<Deployment, "runtime">): string => d.runtime.toLowerCase();

/** A curve needs two published concurrency levels; a single level is a point, listed in the explorer, not drawn. */
export const MIN_CURVE_LEVELS = 2;

/**
 * The metric a record is drawn with: `prefer` when it has a concurrency ladder (at least MIN_CURVE_LEVELS numeric
 * levels), else the first family of PLOT_ORDER that has one (the metric with the most levels within a family).
 */
export function plottedMetric(record: ExternalRecord, prefer: MetricKind | null): { metricIndex: number; metric: ExternalMetric; points: SeriesPoint[] } | null {
  const series = record.metrics.map((metric, index) => ({ metricIndex: index, metric, points: externalSeries(record, index)?.points ?? [] })).filter((item) => item.points.length >= MIN_CURVE_LEVELS);
  if (prefer) { const own = series.find((item) => item.metric.kind === prefer); if (own) return own; }
  for (const kind of PLOT_ORDER) {
    const candidates = series.filter((item) => item.metric.kind === kind).sort((a, b) => b.points.length - a.points.length);
    if (candidates[0]) return candidates[0];
  }
  return null;
}

/**
 * Published concurrency ladders of a model in one scope, newest first: same GPU class and engine family (default),
 * same engine family on any GPU, or every ladder. `overlayKind` is the host chart's metric family; a record carrying
 * it is an overlay curve, any other record is drawn on its own chart. Records without a numeric concurrency level are
 * skipped (request-rate sweeps and points have no place on a concurrency axis).
 */
export function publishedCurves(dataset: ExternalDataset, options: { modelId: string; hardware: HardwareClass; engine: string; scope: PublishedScope; showWeak: boolean; overlayKind: MetricKind | null }): PublishedCurve[] {
  const records = filterExternal(dataset.records, { modelId: options.modelId, kind: "ladder", showWeak: options.showWeak })
    .filter((record) => (options.scope === "all" || engineFamily(record) === options.engine) && (options.scope !== "same" || hardwareClass(record.gpuType) === options.hardware))
    .sort((a, b) => (recordDate(b, dataset.sources) ?? "").localeCompare(recordDate(a, dataset.sources) ?? "") || a.id.localeCompare(b.id));
  const curves: PublishedCurve[] = [];
  for (const record of records) {
    const plotted = plottedMetric(record, options.overlayKind);
    if (!plotted) continue;
    curves.push({ record, tag: `P${curves.length + 1}`, ...plotted, overlay: options.overlayKind !== null && plotted.metric.kind === options.overlayKind });
  }
  return curves;
}

/** "TTFT (median), ms" / "output throughput, tok/s/GPU": the source's own metric wording. */
export const metricTitle = (metric: ExternalMetric): string =>
  `${metricName(metric)}${metric.percentile ? ` (${metric.percentile})` : ""}, ${displayUnit(metric) ?? "unit not stated"}`;

const count = (value: number) => value.toLocaleString("en-US");

/** "ISL 1,024 / OSL 256" when the source states both lengths, else "workload not stated" (never guessed). */
export const recordWorkload = (record: Pick<ExternalRecord, "workload">): string =>
  record.workload.isl !== null && record.workload.osl !== null ? `ISL ${count(record.workload.isl)} / OSL ${count(record.workload.osl)}` : "workload not stated";

/**
 * Whether a published ladder ran the measured workload's shape: same input and output lengths (exact). A source that
 * does not state them, or a variable-length workload, counts as different: there is no evidence they match.
 */
export const sameWorkload = (record: Pick<ExternalRecord, "workload">, workload: Pick<Workload, "inputTokens" | "outputTokens"> | null | undefined): boolean =>
  !!workload && workload.inputTokens !== null && workload.outputTokens !== null && record.workload.isl === workload.inputTokens && record.workload.osl === workload.outputTokens;

/** Distinct workloads of a set of curves (stated ISL/OSL, or "workload not stated"), with the tags drawn at each. */
export function curveWorkloads(curves: readonly Pick<PublishedCurve, "record" | "tag">[]): { label: string; tags: string[] }[] {
  const groups = new Map<string, string[]>();
  for (const curve of curves) { const label = recordWorkload(curve.record); groups.set(label, [...(groups.get(label) ?? []), curve.tag]); }
  return [...groups].map(([label, tags]) => ({ label, tags }));
}
