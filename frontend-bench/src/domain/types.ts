/**
 * Domain records are independent of UI, storage and runtime.
 * Catalog records (models, exports, configurations) are pinned from the research atlas and carry
 * evidence "reference": they describe what to run, not a result. Only imported benchmark runs carry
 * evidence "measured". Nothing in the shipped snapshot is synthetic.
 */
export type Evidence = "reference" | "measured";
export type Precision = "BF16" | "FP8" | "NVFP4" | "MXFP4" | "FP4/FP8";
export type ExperimentStatus = "Backlog" | "Scheduled" | "Running" | "Complete" | "Failed";
export type Dimension = string;
export type ConfigurationStatus = "candidate" | "compatibility-probe";
export interface Model {
  id: string; name: string; family: string; company: string; hfId: string; revision: string;
  /** Total and active parameters in billions; null when the atlas has not established them. */
  parametersB: number | null; activeParamsB: number | null;
  description: string; color: string; contextTokens: number; architecture: "Dense" | "MoE";
  layout: string; license: string; recommended: string;
}
export interface Hardware {
  id: string; name: string; memoryGb: number; interconnect: string; color: string;
}
export interface Workload {
  /** Benchmark dataset. Token budgets are per turn: input → output. */
  id: string; name: string; inputTokens: number | null; outputTokens: number | null; turns: number; multiplier: number;
  sharedPrefixes: string | null; conversations: number | null; tags: string[]; cache: "cold" | "warm";
  /** Not pinned yet: null renders "—". */
  sampling: string | null; datasetRevision: string | null; description: string;
}
export interface Evaluation {
  id: string; suiteId: string; revision: string; dimensions: Record<Dimension, number | null>;
  weights: Record<Dimension, number>; sampleCount: number; evidence: Evidence; artifactRevision: string;
}
/** Latency distribution as GuideLLM reports it; any statistic may be missing. */
export interface LatencyStats { mean: number | null; p50: number | null; p95: number | null; p99: number | null }
/**
 * One measured concurrency level of one experiment (Postgres `metrics`: one row per experiment × concurrency).
 * Raw values only; SLO verdicts and sustainable throughput are computed lenses (src/domain/metrics.ts).
 */
export interface MetricRow {
  concurrency: number;
  ttftMs: LatencyStats; itlMs: LatencyStats; requestLatencyMs: LatencyStats;
  requestsPerSecond: number; inputTps: number; outputTps: number; totalTps: number;
  /** Per-user decode speed (output tok/s per request), when reported. */
  outputTpsPerUserP50: number | null;
  successful: number; errored: number; incomplete: number;
  durationSeconds: number;
}
/** Seven-axis run identity (Postgres `experiments` UNIQUE key). The same identity re-run replaces its metrics. */
export interface RunIdentity {
  /** Canonical slug of the weights artifact with its quantization suffix, e.g. "glm-5.3-nvfp4"; never engine, hardware or knobs. */
  modelName: string;
  gpuType: string; numGpus: number; maxSystemReplicas: number;
  /** "<engine>-v<version>[-<flavor>]", e.g. "sglang-v0.5.23" or "vllm-v0.33.0-cu130". */
  runtimeVersion: string;
  dataset: string;
  /** KV dtype, speculative decoding, caching, attention backend, batching, context, memory, scheduling, request-body amendments. */
  runtimeConfig: Record<string, unknown>;
}
/**
 * One serving configuration: model export × engine × GPU shape × knob, on one workload.
 * `points`, `peakMemoryGb`, `measuredAt` and `evaluation` stay empty until a measured run is imported.
 */
/** Latest engine-release applicability recheck of a configuration: release notes and source only, not a CLI or runtime validation. */
export interface ReleaseRecheck {
  checkedOn: string; engineRelease: string; engineCommit: string | null; argumentStatus: string | null;
  reconciliation: string[]; sourceIds: string[]; testedOnTarget: boolean;
}
export interface Deployment {
  id: string; configurationId: string; modelId: string; artifactId: string; hardwareId: string;
  gpus: number; tensorParallel: number; dataParallel: number; runtime: "vLLM" | "SGLang";
  /** Engine release the atlas reviewed this configuration against (not a pinned image). */
  runtimeVersion: string; runtimeCommit: string;
  precision: Precision; exportLabel: string; exportHfId: string; quantMethod: string; artifactRevision: string;
  knob: string | null; status: ConfigurationStatus; reason: string; contextCap: number | null;
  speculativeDecoding: boolean; draftHfId: string | null; testedOnTarget: boolean;
  engineArgs: string[]; command: string; notes: string; sourceIds: string[];
  /** runtimeVersion is the configured release (engine_release) or "not recorded"; runtimeCommit is the reviewed source commit. */
  reviewedOn: string | null; referenceScope: string | null; recheck: ReleaseRecheck | null; priorRechecks: { checkedOn: string; engineRelease: string }[];
  workloadId: string; evaluation: Evaluation | null; points: MetricRow[]; peakMemoryGb: number | null;
  evidence: Evidence; measuredAt: string | null; runId: string | null;
  /**
   * Run topology and build, from the applied run's identity; null on reference rows. runtimeTag is the full
   * runtime_version string ("vllm-openai-v0.33.0-cu130"); runtimeVersion above stays the configured build.
   * replicas is max_system_replicas (KServe system replicas), never the engine's in-process data parallelism.
   */
  runtimeTag: string | null; gpuType: string; replicas: number | null;
  /** Recorded runtime_config of the applied run (KV dtype, speculative, context, …); null on reference rows. */
  runConfig: Record<string, unknown> | null;
  /** num_gpus of the applied run (null on reference rows); capacity divides by it when present. */
  runGpus: number | null;
  /** True when runGpus differs from the catalog GPU count (the catalog shape and the measured run disagree). */
  topologyMismatch: boolean;
}
/** A measured benchmark run (Postgres `experiments` row plus its `metrics` rows). */
export interface BenchmarkRun {
  id: string; identity: RunIdentity; configurationId: string | null;
  benchmarkTool: string; runDate: string; metrics: MetricRow[];
  /** Invented fixture values (import entry labelled "_test"); the UI then shows a persistent TEST DATA banner. */
  test?: boolean;
}
/**
 * One planning card, stored as a `scheduled_experiments` row (db/002, db/003): one base configuration,
 * the datasets to bench it on, a target date and a board status. Planning state only; results live in
 * `experiments` (one row per seven-column run identity) and are never implied by a card.
 */
export interface Experiment {
  id: string; name: string;
  /** Base atlas configuration id (never a measured "<configuration>@<dataset>" id). */
  deploymentId: string;
  /** Dataset ids; one run identity per dataset. */
  datasets: string[];
  status: ExperimentStatus; priority: "Normal" | "High";
  scheduledDate: string; owner: string; notes: string;
  /** Planner-entered reason the card cannot be scheduled (e.g. GPU budget); null when not blocked. */
  blockedReason: string | null;
  version: number; createdAt: string;
}
export interface ExperimentInput {
  name: string; deploymentId: string; datasets: string[]; priority: "Normal" | "High"; scheduledDate: string; notes: string;
  blockedReason: string | null;
}
export interface Snapshot {
  schemaVersion: 2; atlasCommit: string; models: Model[]; hardware: Hardware[]; workloads: Workload[];
  deployments: Deployment[]; experiments: Experiment[];
  /** Every matched run (all runtime versions), oldest first; deployments carry only the newest per configuration × dataset. */
  runs?: BenchmarkRun[];
  /** True when the runs come from a file marked `_test` (invented fixture values); the UI shows a persistent TEST DATA banner. */
  testData?: boolean;
}
/**
 * Service-level objective. TTFT ceiling = prompt tokens ÷ prefill speed; sustainable throughput counts only
 * concurrency levels where the TTFT ceiling, the ITL p95 ceiling and the success floor all hold, then applies
 * the safety margin (a multiplier, e.g. ×0.8).
 */
export interface SloPolicy {
  preset: "classic" | "low-latency" | "frontier" | "custom";
  prefillTps: number; itlP95Ms: number; minSuccessRate: number; margin: number;
}
export interface PointMetrics {
  concurrency: number; outputTps: number; inputTps: number; totalTps: number; requestsPerSecond: number;
  ttftP50Ms: number | null; ttftP95Ms: number | null; ttftCeilingMs: number | null;
  itlP50Ms: number | null; itlP95Ms: number | null; outputTpsPerUser: number | null;
  /** successful ÷ (successful + errored + incomplete); null when the level recorded no requests. */
  successRate: number | null; passes: boolean; requestCount: number; promptTokens: number | null;
  successful: number; errored: number; incomplete: number;
  /** Failed checks of this level, e.g. ["TTFT", "ITL"]; empty when it passes. */
  failures: string[];
}
/**
 * Capacity lens of one measured sweep (computed from measured rows; never measured itself).
 * Sustainable throughput (console definition; assumed, not confirmed at source): TOTAL tokens (input + output)
 * at C_max × margin × 60 ÷ GPUs.
 */
export interface Capacity {
  highestPassingConcurrency: number | null;
  /** Legacy output-only lens: output tok/s at C_max × margin ÷ GPUs. Kept for comparisons with earlier exports. */
  capacityTpsPerGpu: number | null;
  /** Observed total (input + output) tok/s per GPU at C_max, before the margin. */
  observedTotalTpsPerGpu: number | null;
  /** Headline: total tok/min per GPU at C_max × margin. */
  sustainableTpmPerGpu: number | null;
  /** Output-only tok/min per GPU at C_max × margin. */
  sustainableOutputTpmPerGpu: number | null;
  /** Per replica (all GPUs of one serving replica), × margin, tok/min: total, input and output from the C_max row. */
  deploymentWideTpm: number | null; deploymentInputTpm: number | null; deploymentOutputTpm: number | null;
  /** Highest observed output tok/s per GPU over all levels (no SLO); null without levels. */
  rawPeakTpsPerGpu: number | null;
  /** Requests summed over all levels; null without levels. */
  incomplete: number | null; errored: number | null;
  selectedPoint: PointMetrics | null; points: PointMetrics[];
  passingLevels: number; totalLevels: number;
}
export interface RankedDeployment {
  deployment: Deployment; model: Model; hardware: Hardware; capacity: Capacity;
  quality: number | null; coverage: number;
}
