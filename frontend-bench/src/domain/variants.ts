import { ATLAS, measuredDeployment, splitRuntime } from "./catalog.js";
import { configChips } from "./config-chips.js";
import { DEFAULT_SLO, referenceDeployment, sweepCapacity } from "./metrics.js";
import type { BenchmarkRun, Capacity, Deployment, RankedDeployment, SloPolicy, Snapshot } from "./types.js";

/*
 * Measured variants. A variant is one distinct measured setup: catalog configuration (or, for a run without one, the
 * weights export slug × engine family) × GPU shape (gpu_type, num_gpus, max_system_replicas) × canonical recorded
 * runtime_config × dataset. Engine versions vary inside a variant; the variant is fronted by its best run, the run
 * with the highest sustainable tok/min/GPU under the given SLO (newest run first among equal values; when no run has
 * a passing level, the newest run fronts it and its sustainable value stays null).
 *
 * Datasets and SLO presets are never mixed: the dataset is part of the key and every capacity is computed under one
 * SLO. Catalog configurations without any run on the dataset stay as planning rows (reference evidence, no points).
 * applyRuns()/rank() keep their "newest run per configuration × dataset" semantics; this module adds a view, it does
 * not change them.
 */

/** One run of a variant with its own capacity lens (its metric rows ÷ its num_gpus, under the SLO). */
export interface VariantRun {
  run: BenchmarkRun;
  capacity: Capacity;
}

export interface Variant {
  /** Stable key: configuration (or export|engine), dataset, shape, canonical runtime_config. */
  key: string;
  /** Catalog configuration the runs measure; null for a run the catalog could not match. */
  configurationId: string | null;
  /** Catalog model; null when neither the configuration nor the export slug resolves. */
  modelId: string | null;
  /** identity.modelName: the weights export slug ("qwen3.8-27b-fp8"). */
  artifactSlug: string;
  engine: "vLLM" | "SGLang" | null;
  dataset: string;
  gpuType: string; numGpus: number; maxSystemReplicas: number;
  /** Recorded runtime_config with keys sorted recursively (identical across the variant's runs). */
  runtimeConfig: Record<string, unknown>;
  /** Canonical JSON of runtimeConfig, the variant's knob identity. */
  configKey: string;
  /** Knob chips of the recorded runtime_config, every key kept (configChips order); join with " · " for the full string. */
  chips: string[];
  /** Every run of the variant, newest first. */
  runs: VariantRun[];
  /** The run that fronts the variant (see module comment). */
  best: VariantRun;
  /** Distinct runtime_version tags measured (lower-cased), in the order of `runs`: "best of N runtimes" is their count. */
  runtimeVersions: string[];
  runCount: number;
  runtimeCount: number;
  /** runDate of the newest run (ISO-8601). */
  latestRunDate: string;
}

/** Recursively key-sorted JSON (jsonb-style key-order-independent equality); arrays keep their order. */
export function canonicalConfig(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalConfig);
  if (value && typeof value === "object") return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalConfig((value as Record<string, unknown>)[key])]));
  return value;
}
export const configKeyOf = (config: Record<string, unknown>): string => JSON.stringify(canonicalConfig(config));

const artifactModel = new Map(ATLAS.artifacts.map((artifact) => [artifact.slug, artifact.modelId]));
const time = (run: BenchmarkRun): number => Date.parse(run.runDate);

/** The variant key of one run (see Variant.key). */
export function variantKey(run: BenchmarkRun): string {
  const { identity } = run;
  const owner = run.configurationId ?? `${identity.modelName}|${splitRuntime(identity.runtimeVersion).engine ?? "unknown"}`;
  return JSON.stringify([owner, identity.dataset, identity.gpuType, identity.numGpus, identity.maxSystemReplicas, configKeyOf(identity.runtimeConfig)]);
}

/** Best of a variant's runs: highest sustainable tok/min/GPU, newest first among equal values (and when none passes). */
function bestRun(runs: readonly VariantRun[]): VariantRun {
  const newestFirst = [...runs].sort((a, b) => time(b.run) - time(a.run) || a.run.id.localeCompare(b.run.id));
  return newestFirst.reduce((best, item) => (item.capacity.sustainableTpmPerGpu ?? -Infinity) > (best.capacity.sustainableTpmPerGpu ?? -Infinity) ? item : best);
}

/**
 * Group runs into variants under one SLO. `runs` defaults to the snapshot's matched runs. Order: sustainable
 * tok/min/GPU of the best run descending (variants without a passing level after), then key.
 */
export function groupVariants(snapshot: Snapshot, slo: SloPolicy = DEFAULT_SLO, runs: readonly BenchmarkRun[] = snapshot.runs ?? []): Variant[] {
  const groups = new Map<string, BenchmarkRun[]>();
  for (const run of runs) {
    const key = variantKey(run);
    const members = groups.get(key);
    if (members) members.push(run); else groups.set(key, [run]);
  }
  const variants = [...groups].map(([key, members]): Variant => {
    const scored = members.map((run) => ({ run, capacity: sweepCapacity(run.metrics, run.identity.numGpus, slo) }))
      .sort((a, b) => time(b.run) - time(a.run) || a.run.id.localeCompare(b.run.id));
    const first = scored[0]!.run;
    const { identity } = first;
    const configurationId = first.configurationId && snapshot.deployments.some((d) => d.id === first.configurationId) ? first.configurationId : null;
    const modelId = (configurationId ? snapshot.deployments.find((d) => d.id === configurationId)?.modelId : undefined) ?? artifactModel.get(identity.modelName) ?? null;
    const runtimeConfig = canonicalConfig(identity.runtimeConfig) as Record<string, unknown>;
    const runtimeVersions = [...new Set(scored.map((item) => item.run.identity.runtimeVersion.toLowerCase()))];
    return {
      key, configurationId, modelId, artifactSlug: identity.modelName, engine: splitRuntime(identity.runtimeVersion).engine, dataset: identity.dataset,
      gpuType: identity.gpuType, numGpus: identity.numGpus, maxSystemReplicas: identity.maxSystemReplicas,
      runtimeConfig, configKey: JSON.stringify(runtimeConfig), chips: configChips({ runConfig: runtimeConfig, engineArgs: [] }),
      runs: scored, best: bestRun(scored), runtimeVersions, runCount: scored.length, runtimeCount: runtimeVersions.length, latestRunDate: first.runDate,
    };
  });
  const value = (variant: Variant) => variant.best.capacity.sustainableTpmPerGpu ?? -Infinity;
  return variants.sort((a, b) => value(b) - value(a) || a.key.localeCompare(b.key));
}

/** Variants of one catalog configuration, optionally on one dataset (e.g. Throughput's runtime-config picker). */
export const variantsOfConfiguration = (variants: readonly Variant[], configurationId: string, dataset?: string): Variant[] =>
  variants.filter((variant) => variant.configurationId === configurationId && (dataset === undefined || variant.dataset === dataset));

/**
 * One ladder row: a measured variant (deployment = its catalog configuration measured by the variant's best run) or a
 * planning row (a catalog configuration without any run on the dataset: reference evidence, no points, capacity null).
 * Rows are RankedDeployment-compatible, so setupStandings()/sortSetups()/groupSetups() apply unchanged.
 * Several variants share one catalog configuration, so `deployment.id` is not unique across rows: key rows by `key`.
 */
export interface VariantRow extends RankedDeployment {
  key: string;
  variant: Variant | null;
}

export interface VariantRowOptions {
  /** Restrict to one catalog model. */
  modelId?: string;
  /** Published quality per configuration, as rank()'s qualityOf; omitted → null quality. */
  qualityOf?: (deployment: Deployment) => number | null;
  /** Runs to group; defaults to the snapshot's matched runs. */
  runs?: readonly BenchmarkRun[];
}

/**
 * Every measured variant on `dataset` plus every catalog configuration without a run there, under one SLO. Variants
 * whose run matched no catalog configuration are not listed (no catalog row to attach them to); groupVariants() keeps
 * them. Order: measured variants by sustainable tok/min/GPU (no passing level after), then planning rows in catalog order.
 */
export function variantRows(snapshot: Snapshot, dataset: string, slo: SloPolicy = DEFAULT_SLO, options: VariantRowOptions = {}): VariantRow[] {
  const bases = snapshot.deployments.filter((d) => d.id === d.configurationId && (!options.modelId || d.modelId === options.modelId));
  const byId = new Map(bases.map((base) => [base.configurationId, base]));
  const variants = groupVariants(snapshot, slo, options.runs).filter((variant) => variant.dataset === dataset && variant.configurationId !== null && byId.has(variant.configurationId));
  const row = (deployment: Deployment, capacity: Capacity, key: string, variant: Variant | null): VariantRow => {
    const model = snapshot.models.find((item) => item.id === deployment.modelId);
    const hardware = snapshot.hardware.find((item) => item.id === deployment.hardwareId);
    if (!model || !hardware) throw new Error(`Invalid catalog reference: ${deployment.id}`);
    const quality = options.qualityOf ? options.qualityOf(deployment) : null;
    return { deployment, model, hardware, capacity, quality, coverage: quality === null ? 0 : 1, key, variant };
  };
  const measured = variants.map((variant) => {
    const deployment = measuredDeployment(byId.get(variant.configurationId!)!, variant.best.run);
    return row(deployment, variant.best.capacity, variant.key, variant);
  });
  const covered = new Set(variants.map((variant) => variant.configurationId));
  const planning = bases.filter((base) => !covered.has(base.configurationId)).map((base) => {
    const deployment = referenceDeployment(snapshot, base, dataset);
    return row(deployment, sweepCapacity([], deployment.runGpus ?? deployment.gpus, slo), `planning|${base.configurationId}|${dataset}`, null);
  });
  return [...measured, ...planning];
}
