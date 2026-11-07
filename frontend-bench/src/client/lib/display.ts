import { rank, frontier } from "../../domain/metrics.js";
import type { Deployment, Hardware, Model, RankedDeployment } from "../../domain/types.js";
import { appState } from "../state.js";
import { aaHeadline, artifact } from "./atlas.js";

/** Missing or non-finite values render as an em dash, never as zero. */
export const num = (value: number | null | undefined, digits = 0): string =>
  value === null || value === undefined || !Number.isFinite(value) ? "—"
    : new Intl.NumberFormat("en-GB", { maximumFractionDigits: digits, minimumFractionDigits: digits }).format(value);
export const compactNum = (value: number | null | undefined): string =>
  value === null || value === undefined || !Number.isFinite(value) ? "—"
    : new Intl.NumberFormat("en-GB", { notation: "compact", maximumFractionDigits: 1 }).format(value);
export const pct = (fraction: number | null | undefined, digits = 1): string =>
  fraction === null || fraction === undefined || !Number.isFinite(fraction) ? "—" : `${num(fraction * 100, digits)}%`;
export const signedPct = (fraction: number | null): string =>
  fraction === null || !Number.isFinite(fraction) ? "—" : `${fraction > 0 ? "+" : fraction < 0 ? "−" : "±"}${Math.abs(fraction * 100).toFixed(1)}%`;
export const signedPp = (value: number | null): string =>
  value === null || !Number.isFinite(value) ? "—" : `${value > 0 ? "+" : value < 0 ? "−" : "±"}${Math.abs(value).toFixed(1)} pp`;

/** Display order of weight precisions, highest to lowest bit width (catalog values). */
export const PRECISION_ORDER = ["BF16", "FP8", "FP4/FP8", "MXFP4", "NVFP4"] as const;
/** Sort index of a precision; unknown values sort last. */
export const precisionIndex = (precision: string): number => {
  const index = (PRECISION_ORDER as readonly string[]).indexOf(precision);
  return index < 0 ? PRECISION_ORDER.length : index;
};

export const modelOf = (deployment: Deployment): Model | undefined => appState.snapshot.models.find((item) => item.id === deployment.modelId);
export const hardwareOf = (deployment: Deployment): Hardware | undefined => appState.snapshot.hardware.find((item) => item.id === deployment.hardwareId);
export const shortHardware = (hardware: Hardware | undefined): string => hardware?.name.replace("NVIDIA ", "") ?? "Unknown";
/** Engine release tag; configurations that need an unreleased build say so briefly (full note in the evidence sheet). */
/**
 * Configured engine build: the release the argument array was authored for. A configuration recorded only against
 * a source snapshot reads "source snapshot"; "none (…)" releases read "unreleased build". The latest recheck release
 * is never shown here (see recheckNote).
 */
export const engineVersion = (deployment: Deployment): string =>
  /^v\d/.test(deployment.runtimeVersion) ? deployment.runtimeVersion
  : /^none/i.test(deployment.runtimeVersion) ? "unreleased build"
  : deployment.runtimeCommit !== "not recorded" ? "source snapshot" : "build not recorded";
/** Full configured-build description for titles and detail views. */
export const engineBuildDetail = (deployment: Deployment): string =>
  /^v\d/.test(deployment.runtimeVersion) ? `${deployment.runtime} ${deployment.runtimeVersion}`
  : /^none/i.test(deployment.runtimeVersion) ? `${deployment.runtime}: ${deployment.runtimeVersion}`
  : `${deployment.runtime} source snapshot (no release recorded)`;
/** The latest release recheck, stated as a review, not a validation; null without a recheck. */
export const recheckNote = (deployment: Deployment): string | null =>
  deployment.recheck ? `Rechecked ${/^v\d/.test(deployment.recheck.engineRelease) ? deployment.recheck.engineRelease : "for an unreleased build"} · arguments not revalidated` : null;
export const testedLabel = (tested: boolean): string => tested ? "Tested on B300" : "Not tested on B300";
/**
 * Bench runtime_version. A measured row shows the run's recorded tag verbatim (e.g. "vllm-openai-v0.33.0-cu130");
 * a reference row derives "<engine>-<release>" from the configured build, and no tag is invented for an untagged build.
 */
export const runtimeTag = (deployment: Deployment): string => {
  if (deployment.runtimeTag) return deployment.runtimeTag;
  const engine = deployment.runtime.toLowerCase();
  return /^v\d/.test(deployment.runtimeVersion) ? `${engine}-${deployment.runtimeVersion}` : `${engine} (${engineVersion(deployment)}, no release tag)`;
};
/** GPUs that produced (or will produce) the numbers: the run's num_gpus when measured, else the catalog shape. */
export const gpusOf = (deployment: Deployment): number => deployment.runGpus ?? deployment.gpus;
/**
 * True when a measured run used more than one KServe system replica. Whether its num_gpus counts GPUs per replica
 * or in total is unconfirmed; if per replica and throughput is aggregated over replicas, tok/min/GPU is overstated
 * by the replica factor. The formula is unchanged; the value is flagged.
 */
export const gpuDivisorUnconfirmed = (deployment: Deployment): boolean => deployment.replicas !== null && deployment.replicas > 1;
export const topology = (deployment: Deployment): string => `${gpusOf(deployment)}× ${deployment.gpuType}`;
/**
 * Hardware label "<replicas>x<num_gpus><gpu_type>" ("1xB300", "1x2B300", "2x8B300") when the run recorded its
 * KServe system replicas; otherwise the per-replica shape ("8× B300"). Never uses in-engine DP. Reading num_gpus
 * as GPUs per replica is an ASSUMPTION (unconfirmed at source); with replicas > 1 the GPU divisor of the
 * sustainable figure is flagged as unconfirmed (see gpuDivisorUnconfirmed).
 */
export const hardwareShape = (deployment: Deployment): string =>
  deployment.replicas === null ? topology(deployment) : `${deployment.replicas}x${gpusOf(deployment) === 1 ? "" : gpusOf(deployment)}${deployment.gpuType}`;
/** "1 GPU per replica · 1 GPU total" when replicas are known; "8 GPUs per replica" otherwise. */
export const gpuTotals = (deployment: Deployment): string => {
  const per = gpusOf(deployment), plural = (n: number) => `${n} GPU${n === 1 ? "" : "s"}`;
  return deployment.replicas === null ? `${plural(per)} per replica` : `${plural(per)} per replica · ${plural(per * deployment.replicas)} total`;
};
/**
 * Naming convention for a benchmarked configuration:
 *   <Model> · <Export> · <Engine> · <Shape>[ · <Knob>]     e.g. "GLM 5.3 · NVFP4 · RedHatAI · vLLM · TP8 · MTP"
 * Export = precision class, "Native" for the publisher's own quantized release, plus the third-party publisher.
 * Shape  = TPn, with "· DPm" when data-parallel replicas > 1. Knob = the catalog configuration's variant knob.
 * The stable identifier is the atlas configuration ID, e.g. glm-5.3.nvfp4.vllm.baseline.
 */
export const shape = (deployment: Deployment): string => `TP${deployment.tensorParallel}${deployment.dataParallel > 1 ? ` · DP${deployment.dataParallel}` : ""}`;
/** "GLM 5.3 · NVFP4 · RedHatAI" */
export const configName = (deployment: Deployment): string => `${modelOf(deployment)?.name ?? deployment.modelId} · ${deployment.exportLabel}`;
/** "vLLM · TP8 · 8× B300 · MTP" */
export const configDetail = (deployment: Deployment): string => [deployment.runtime, shape(deployment), topology(deployment), deployment.knob].filter(Boolean).join(" · ");
/** Full display name following the convention above. */
export const configLabel = (deployment: Deployment): string => [configName(deployment), deployment.runtime, shape(deployment), deployment.knob].filter(Boolean).join(" · ");
export const statusLabel = (deployment: Deployment): string => deployment.status === "candidate" ? "Candidate" : "Compatibility probe";
/** Benchmark results are not connected yet: the console carries atlas, Hugging Face and Artificial Analysis data only. */
export const NOT_CONNECTED = "Bench results not connected";
export const isMeasured = (deployment: Deployment): boolean => deployment.evidence === "measured" && deployment.points.length > 0;
export const workloadOf = (id: string) => appState.snapshot.workloads.find((item) => item.id === id);
export const workloadBudget = (workload: { inputTokens: number | null; outputTokens: number | null; turns: number }): string =>
  `${workload.inputTokens === null || workload.outputTokens === null ? "variable lengths" : `${compactNum(workload.inputTokens)} → ${compactNum(workload.outputTokens)} tok`}${workload.turns > 1 ? ` · ${workload.turns} turns` : ""}`;
export const workloadLabel = (id: string): string => {
  const workload = workloadOf(id);
  return workload ? `${workload.name} · ${workloadBudget(workload)}` : id;
};

/**
 * Published AA index of the base model, only where the configuration serves the publisher's own release.
 * Third-party quantized exports get null: the AA composite does not transfer to them (atlas rule).
 */
export const publisherQuality = (deployment: Deployment): number | null =>
  artifact(deployment.artifactId)?.publisher ? null : aaHeadline(deployment.modelId)?.index ?? null;
/** Model-level AA index for display beside any configuration, always labelled as model-level. */
export const modelQuality = (modelId: string): number | null => aaHeadline(modelId)?.index ?? null;
/** Ranked rows for the active workload and SLO: one per catalog configuration. */
export const rankedRows = (): RankedDeployment[] => rank(appState.snapshot, appState.workload, appState.slo, publisherQuality);
/** Frontier rows; an invalid cohort yields an empty frontier instead of a crash. */
export function safeFrontier(rows: RankedDeployment[]): RankedDeployment[] {
  try { return frontier(rows); } catch { return []; }
}
export function filteredRows(): RankedDeployment[] {
  const search = appState.query.trim().toLowerCase();
  return rankedRows().filter((row) =>
    (!search || `${configLabel(row.deployment)} ${row.model.company} ${row.hardware.name} ${row.deployment.id}`.toLowerCase().includes(search))
    && (appState.gpu.length === 0 || appState.gpu.includes(row.hardware.id))
    && (appState.runtime.length === 0 || appState.runtime.includes(row.deployment.runtime))
    && (appState.precision.length === 0 || appState.precision.includes(row.deployment.precision))
    && (appState.model === "all" || row.model.id === appState.model));
}
export const sloSummary = (): string =>
  `Prefill ≥ ${num(appState.slo.prefillTps)} tok/s · ITL p95 ≤ ${num(appState.slo.itlP95Ms)} ms · ×${num(appState.slo.margin, 2)} margin`;
