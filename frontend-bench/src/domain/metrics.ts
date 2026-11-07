import type { Capacity, Deployment, Evaluation, MetricRow, PointMetrics, RankedDeployment, SloPolicy, Snapshot, Workload } from "./types.js";

/** SLO presets: prefill speed (tok/s per request) and ITL p95 ceiling, ×0.8 safety margin. */
export const SLO_PRESETS = {
  classic: { preset: "classic", prefillTps: 1300, itlP95Ms: 26, minSuccessRate: 0.99, margin: 0.8 },
  "low-latency": { preset: "low-latency", prefillTps: 2600, itlP95Ms: 19, minSuccessRate: 0.99, margin: 0.8 },
  frontier: { preset: "frontier", prefillTps: 1000, itlP95Ms: 50, minSuccessRate: 0.99, margin: 0.8 },
} as const satisfies Record<string, SloPolicy>;
export const DEFAULT_SLO: SloPolicy = { ...SLO_PRESETS.classic };
/** Nearest-rank percentile. No interpolation across requests or missing observations. */
export function percentile(values: readonly number[], p: number): number | null {
  if (p < 0 || p > 1 || !Number.isFinite(p)) throw new RangeError("Percentile must be between 0 and 1");
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  if (sorted.some((value) => !Number.isFinite(value))) throw new RangeError("Measurements must be finite");
  return sorted[Math.max(0, Math.ceil(p * sorted.length) - 1)] ?? null;
}
export function composite(evaluation: Evaluation | null): { score: number | null; coverage: number } {
  if (!evaluation) return { score: null, coverage: 0 };
  let weighted = 0; let available = 0; let total = 0;
  for (const dimension of Object.keys(evaluation.weights) as (keyof Evaluation["weights"])[]) {
    const weight = evaluation.weights[dimension] ?? NaN;
    if (!Number.isFinite(weight) || weight < 0) throw new RangeError("Weights must be finite and nonnegative");
    total += weight;
    const value = evaluation.dimensions[dimension] ?? null;
    if (value !== null && Number.isFinite(value)) { available += weight; weighted += weight * value; }
  }
  // Do not rank incomplete scores against full-coverage scores.
  const coverage = total === 0 ? 0 : available / total;
  return { score: coverage === 1 ? Math.round(weighted / total * 10) / 10 : null, coverage };
}
/** TTFT ceiling in ms for a prompt of `promptTokens` at the SLO prefill speed. */
export const ttftCeilingMs = (promptTokens: number | null, slo: SloPolicy): number | null =>
  promptTokens === null || !(promptTokens > 0) ? null : (promptTokens / slo.prefillTps) * 1000;

/**
 * Nominal TTFT ceiling from a workload's per-turn input budget, before any measurement (callers label it
 * "nominal, computed"). Null for multi-turn or shared-prefix workloads: their prompt grows per turn, so only
 * the measured prompt length per level can set the ceiling.
 */
export function nominalTtftCeilingMs(workload: Pick<Workload, "inputTokens" | "turns" | "sharedPrefixes"> | null | undefined, slo: SloPolicy): number | null {
  if (!workload || workload.turns > 1 || workload.sharedPrefixes) return null;
  return ttftCeilingMs(workload.inputTokens, slo);
}

/**
 * Verdict for one measured concurrency level. Prompt tokens per request are derived from the raw rates
 * (input tok/s ÷ requests/s). A missing p95 never passes; a level with no requests has no success rate.
 */
export function measurePoint(row: MetricRow, slo: SloPolicy): PointMetrics {
  if (!Number.isInteger(row.concurrency) || row.concurrency < 1) throw new RangeError("Concurrency must be a positive integer");
  if (![row.outputTps, row.inputTps, row.requestsPerSecond].every((value) => Number.isFinite(value) && value >= 0)) throw new RangeError("Rates must be finite and nonnegative");
  if (![slo.prefillTps, slo.itlP95Ms, slo.minSuccessRate, slo.margin].every(Number.isFinite) || slo.prefillTps <= 0 || slo.itlP95Ms <= 0 || slo.minSuccessRate < 0 || slo.minSuccessRate > 1) throw new RangeError("Invalid service-level objective");
  const count = row.successful + row.errored + row.incomplete;
  const successRate = count ? row.successful / count : null;
  const promptTokens = row.requestsPerSecond > 0 ? row.inputTps / row.requestsPerSecond : null;
  const ceiling = ttftCeilingMs(promptTokens, slo);
  const ttft = row.ttftMs.p95, itl = row.itlMs.p95;
  const failures: string[] = [];
  if (ttft === null || ceiling === null || ttft > ceiling) failures.push("TTFT");
  if (itl === null || itl > slo.itlP95Ms) failures.push("ITL");
  if (successRate === null || successRate < slo.minSuccessRate) failures.push("Success");
  return {
    concurrency: row.concurrency, outputTps: row.outputTps, inputTps: row.inputTps, totalTps: row.totalTps, requestsPerSecond: row.requestsPerSecond,
    ttftP50Ms: row.ttftMs.p50, ttftP95Ms: ttft, ttftCeilingMs: ceiling,
    itlP50Ms: row.itlMs.p50, itlP95Ms: itl, outputTpsPerUser: row.outputTpsPerUserP50, successRate, requestCount: count, promptTokens,
    successful: row.successful, errored: row.errored, incomplete: row.incomplete,
    failures, passes: failures.length === 0,
  };
}
/**
 * C_max is the highest passing level. Sustainable throughput (headline) = observed TOTAL tok/s there × margin
 * × 60 ÷ GPUs, in tok/min/GPU (console definition, assumed and not confirmed at source; see Capacity). The
 * output-only lens is kept alongside, never under the same label.
 */
export function capacity(deployment: Deployment, slo: SloPolicy = DEFAULT_SLO): Capacity {
  // The measured run's topology wins over the catalog shape: throughput is divided by the GPUs that produced it.
  const gpus = deployment.runGpus ?? deployment.gpus;
  if (!Number.isInteger(gpus) || gpus <= 0) throw new RangeError("GPU count must be a positive integer");
  if (!Number.isFinite(slo.margin) || slo.margin <= 0 || slo.margin > 1) throw new RangeError("Margin must be in (0, 1]");
  const points = deployment.points.map((point) => measurePoint(point, slo)).sort((a, b) => a.concurrency - b.concurrency);
  const passing = points.filter((point) => point.passes);
  const p = passing.at(-1) ?? null;
  const perMinute = (tps: number) => tps * slo.margin * 60;
  const sum = (key: "incomplete" | "errored") => points.length ? points.reduce((total, point) => total + point[key], 0) : null;
  return {
    highestPassingConcurrency: p?.concurrency ?? null,
    capacityTpsPerGpu: p ? p.outputTps * slo.margin / gpus : null,
    observedTotalTpsPerGpu: p ? p.totalTps / gpus : null,
    sustainableTpmPerGpu: p ? perMinute(p.totalTps) / gpus : null,
    sustainableOutputTpmPerGpu: p ? perMinute(p.outputTps) / gpus : null,
    deploymentWideTpm: p ? perMinute(p.totalTps) : null,
    deploymentInputTpm: p ? perMinute(p.inputTps) : null,
    deploymentOutputTpm: p ? perMinute(p.outputTps) : null,
    rawPeakTpsPerGpu: points.length ? Math.max(...points.map((point) => point.outputTps / gpus)) : null,
    incomplete: sum("incomplete"), errored: sum("errored"),
    selectedPoint: p, points, passingLevels: passing.length, totalLevels: points.length,
  };
}
/**
 * Champion-vs-challenger reading under an assumed single-run noise band (±3%; unverified,
 * a policy, not a measured interval). Returns "tie" when |a − b| ÷ max(a, b) ≤ band.
 */
export function tieBand(a: number | null, b: number | null, band = 0.03): "tie" | "a" | "b" | null {
  if (a === null || b === null || !Number.isFinite(a) || !Number.isFinite(b)) return null;
  const top = Math.max(Math.abs(a), Math.abs(b));
  if (top === 0 || Math.abs(a - b) / top <= band) return "tie";
  return a > b ? "a" : "b";
}
/**
 * One row per catalog configuration for the given dataset. The measured run on that dataset supplies the
 * sweep; without one the row keeps the reference configuration with no points (capacity null, never zero).
 * `qualityOf` supplies an externally published score; when omitted, only a revision-matched evaluation counts.
 */
export function rank(snapshot: Snapshot, workloadId = snapshot.workloads[0]?.id ?? "", slo: SloPolicy = DEFAULT_SLO, qualityOf?: (deployment: Deployment) => number | null): RankedDeployment[] {
  const bases = snapshot.deployments.filter((deployment) => deployment.id === deployment.configurationId);
  return bases.map((base) => {
    const measured = snapshot.deployments.find((d) => d.configurationId === base.configurationId && d.workloadId === workloadId && d.evidence === "measured");
    const deployment: Deployment = measured ?? (base.workloadId === workloadId ? base : { ...base, workloadId, points: [], evidence: "reference", measuredAt: null, runId: null, runtimeTag: null, replicas: null, runConfig: null, runGpus: null, topologyMismatch: false, gpuType: hardwareName(snapshot, base.hardwareId) });
    const model = snapshot.models.find((item) => item.id === deployment.modelId);
    const hardware = snapshot.hardware.find((item) => item.id === deployment.hardwareId);
    if (!model || !hardware) throw new Error(`Invalid catalog reference: ${deployment.id}`);
    const evaluation = qualityOf ? { score: qualityOf(deployment), coverage: 1 } : composite(deployment.evaluation?.artifactRevision === deployment.artifactRevision ? deployment.evaluation : null);
    return { deployment, model, hardware, capacity: capacity(deployment, slo), quality: evaluation.score, coverage: evaluation.score === null ? 0 : evaluation.coverage };
  }).sort((a, b) => (b.capacity.sustainableTpmPerGpu ?? -Infinity) - (a.capacity.sustainableTpmPerGpu ?? -Infinity) || (b.quality ?? -Infinity) - (a.quality ?? -Infinity));
}
/** gpu_type as the bench identity spells it ("B300"), from the catalog hardware name. */
const hardwareName = (snapshot: Snapshot, id: string) => (snapshot.hardware.find((item) => item.id === id)?.name ?? id).replace(/^NVIDIA\s+/i, "");
/** Missing quality/capacity and non-matching evaluation suites never enter a frontier. */
export function frontier(rows: RankedDeployment[]): RankedDeployment[] {
  const candidates = rows.filter((row) => row.quality !== null && row.capacity.sustainableTpmPerGpu !== null);
  const cohorts = new Set(candidates.map((row) => `${row.deployment.workloadId}|${row.deployment.evaluation?.suiteId}|${row.deployment.evaluation?.revision}`));
  if (cohorts.size > 1) throw new Error("Pareto frontier requires a single workload and evaluation revision");
  return candidates.filter((a) => !candidates.some((b) => {
    const ax = a.capacity.sustainableTpmPerGpu ?? 0, bx = b.capacity.sustainableTpmPerGpu ?? 0;
    const ay = a.quality ?? 0, by = b.quality ?? 0;
    return bx >= ax && by >= ay && (bx > ax || by > ay);
  })).sort((a, b) => (a.capacity.sustainableTpmPerGpu ?? 0) - (b.capacity.sustainableTpmPerGpu ?? 0));
}
export function comparability(a: Deployment, b: Deployment, mode: "general" | "runtime" | "quantization" = "general"): string[] {
  const differences: string[] = [];
  if (a.workloadId !== b.workloadId) differences.push("Workload");
  if (a.evaluation && b.evaluation && (a.evaluation.suiteId !== b.evaluation.suiteId || a.evaluation.revision !== b.evaluation.revision)) differences.push("Evaluation suite");
  if (mode !== "general") {
    if (a.modelId !== b.modelId) differences.push("Base model");
    if (a.hardwareId !== b.hardwareId || a.gpus !== b.gpus || a.tensorParallel !== b.tensorParallel) differences.push("Hardware / topology");
    if (a.speculativeDecoding !== b.speculativeDecoding) differences.push("Speculative decoding");
  }
  if (mode === "runtime" && (a.artifactId !== b.artifactId || a.artifactRevision !== b.artifactRevision)) differences.push("Model artifact");
  if (mode === "runtime" && a.knob !== b.knob) differences.push("Configuration knob");
  if (mode === "quantization" && (a.runtime !== b.runtime || a.runtimeVersion !== b.runtimeVersion)) differences.push("Runtime version");
  return differences;
}
export function relativeDelta(value: number | null, baseline: number | null): number | null {
  if (value === null || baseline === null || baseline === 0) return null;
  return (value - baseline) / baseline;
}
export function safeCsv(rows: (string | number | null)[][]): string {
  return rows.map((row) => row.map((value) => {
    const text = value === null ? "" : String(value);
    // Spreadsheet formula injection protection for user-controlled text.
    const safe = typeof value === "string" && /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
    return `"${safe.replaceAll('"', '""')}"`;
  }).join(",")).join("\r\n");
}
