import { measuredDeployment } from "../../../domain/catalog.js";
import { capacity, comparability, relativeDelta, tieBand } from "../../../domain/metrics.js";
import { controlDifferences, type ControlDifference } from "../../../domain/run-config.js";
import { configKeyOf } from "../../../domain/variants.js";
import type { BenchmarkRun, Capacity, Deployment, SloPolicy, Snapshot } from "../../../domain/types.js";

/*
 * Engine page data: the scope (one model × GPU count × hardware), the best measured configuration per engine on a
 * dataset, the verdict between the two, and every measured runtime version. Pure functions over the snapshot; values
 * come from `capacity()`; nothing here formats or reads UI state. A verdict or Δ exists only between two real
 * measurements, and an engine verdict additionally needs a matched configuration (runtime isolation).
 */

export type Engine = "vLLM" | "SGLang";
export const ENGINES: readonly Engine[] = ["vLLM", "SGLang"];
/** Assumed single-run noise band (±3%): a policy, not a measured interval. */
export const ENGINE_TIE_BAND = 0.03;

/** Scope of the engine comparison: one base model on one GPU count of one hardware type. */
export interface EngineScope { modelId: string; gpus: number; hardwareId: string }

const measuredLevels = (d: Deployment): boolean => d.evidence === "measured" && d.points.length > 0;

/** Base catalog configurations of the scope (one per configuration id). */
export function scopeBases(deployments: readonly Deployment[], scope: EngineScope): Deployment[] {
  return deployments.filter((d) => d.id === d.configurationId && d.modelId === scope.modelId && d.gpus === scope.gpus && d.hardwareId === scope.hardwareId);
}

/** The snapshot's measured counterpart of a configuration on a dataset (its newest run), or null. */
export function measuredOn(deployments: readonly Deployment[], configurationId: string, workloadId: string): Deployment | null {
  return deployments.find((d) => d.configurationId === configurationId && d.workloadId === workloadId && measuredLevels(d)) ?? null;
}

/**
 * The configuration measured by its best run on a dataset, the rule the TL;DR uses: the run with the highest sustainable
 * tok/min/GPU under the SLO, newest first among equal values and when no run passes. Every runtime version and recorded
 * runtime_config of the configuration competes; the returned deployment carries that run's levels and recorded identity
 * (same id as the snapshot's measured row). Without imported runs, the snapshot's measured row (newest run) is used.
 */
export function bestMeasured(snapshot: Pick<Snapshot, "deployments" | "runs">, configurationId: string, workloadId: string, slo: SloPolicy): Deployment | null {
  const base = snapshot.deployments.find((d) => d.id === configurationId);
  const runs = (snapshot.runs ?? []).filter((run) => run.configurationId === configurationId && run.identity.dataset === workloadId && run.metrics.length > 0);
  if (!base || !runs.length) return measuredOn(snapshot.deployments, configurationId, workloadId);
  let best: { d: Deployment; value: number; time: number } | null = null;
  for (const run of runs) {
    const d = measuredDeployment(base, run);
    const value = capacity(d, slo).sustainableTpmPerGpu ?? -Infinity, time = Date.parse(run.runDate);
    if (!best || value > best.value || (value === best.value && time > best.time)) best = { d, value, time };
  }
  return best!.d;
}

/** Number of imported runs of a configuration on a dataset (the "best of N runs" count); 1 when only the snapshot row exists. */
export function runCountOn(snapshot: Pick<Snapshot, "deployments" | "runs">, configurationId: string, workloadId: string): number {
  const n = (snapshot.runs ?? []).filter((run) => run.configurationId === configurationId && run.identity.dataset === workloadId).length;
  return n || (measuredOn(snapshot.deployments, configurationId, workloadId) ? 1 : 0);
}

export interface EngineBest {
  engine: Engine;
  /** Best measured configuration of this engine on the dataset; null when none of its configurations is measured. */
  deployment: Deployment | null;
  capacity: Capacity | null;
  /** Measured configurations of this engine on the dataset. */
  measured: number;
  /** Imported runs of this engine's configurations on the dataset (every one competed for `deployment`). */
  runs: number;
}

/**
 * Best measured configuration per engine on one dataset, each configuration read from its best run (bestMeasured(),
 * the TL;DR rule): the highest sustainable tok/min/GPU; a measured configuration without a passing level is used only
 * when no configuration of that engine passes. Catalog order breaks exact ties.
 */
export function bestPerEngine(snapshot: Pick<Snapshot, "deployments" | "runs">, scope: EngineScope, workloadId: string, slo: SloPolicy): Record<Engine, EngineBest> {
  const bases = scopeBases(snapshot.deployments, scope);
  const out = {} as Record<Engine, EngineBest>;
  for (const engine of ENGINES) {
    const own = bases.filter((b) => b.runtime === engine);
    const rows = own
      .map((b) => bestMeasured(snapshot, b.configurationId, workloadId, slo))
      .filter((d): d is Deployment => d !== null)
      .map((d) => ({ d, c: capacity(d, slo) }));
    let best: (typeof rows)[number] | null = null;
    for (const row of rows) {
      const value = row.c.sustainableTpmPerGpu, top = best?.c.sustainableTpmPerGpu ?? null;
      if (!best || (value !== null && (top === null || value > top))) best = row;
    }
    const runs = own.reduce((sum, b) => sum + runCountOn(snapshot, b.configurationId, workloadId), 0);
    out[engine] = { engine, deployment: best?.d ?? null, capacity: best?.c ?? null, measured: rows.length, runs };
  }
  return out;
}

/**
 * Variables that differ between two configurations and would confound an engine comparison: the runtime
 * comparability rules (artifact, revision, base model, hardware/topology, speculative decoding, knob), data
 * parallelism, the GPUs and replicas the runs recorded, and the engine-equivalent runtime controls (KV dtype, max
 * sequences, memory fraction, prefix cache, context length; recorded runtime_config, else the configured command,
 * see domain/run-config.ts).
 */
export function engineDifferences(a: Deployment, b: Deployment): string[] {
  const differences = comparability(a, b, "runtime");
  if (a.dataParallel !== b.dataParallel && !differences.includes("Hardware / topology")) differences.push("Hardware / topology");
  if ((a.runGpus ?? a.gpus) !== (b.runGpus ?? b.gpus)) differences.push("GPUs in run");
  if (a.replicas !== null && b.replicas !== null && a.replicas !== b.replicas) differences.push("System replicas");
  for (const control of controlDifferences(a, b)) differences.push(control.label);
  return differences;
}

export type EngineVerdict =
  /** Neither engine has a measured configuration on the dataset. */
  | { kind: "none" }
  /** Only one engine is measured. */
  | { kind: "one-sided"; engine: Engine }
  /** Both measured, but the configurations differ in a controlled variable: no verdict. `controls` holds the runtime-control values (vLLM = a). */
  | { kind: "different"; differences: string[]; controls: ControlDifference[] }
  /** Matched pair, but at least one engine has no level inside the SLO. */
  | { kind: "no-passing"; passing: Engine | null }
  /** Matched pair, both inside the SLO, |Δ| within the band. */
  | { kind: "tie"; fraction: number }
  /** Matched pair, `engine` leads by `fraction` = (leader − other) ÷ other. */
  | { kind: "lead"; engine: Engine; fraction: number };

export function engineVerdict(best: Record<Engine, EngineBest>, band = ENGINE_TIE_BAND): EngineVerdict {
  const a = best.vLLM, b = best.SGLang;
  if (!a.deployment && !b.deployment) return { kind: "none" };
  if (!a.deployment || !b.deployment) return { kind: "one-sided", engine: a.deployment ? "vLLM" : "SGLang" };
  const differences = engineDifferences(a.deployment, b.deployment);
  if (differences.length) return { kind: "different", differences, controls: controlDifferences(a.deployment, b.deployment) };
  const va = a.capacity?.sustainableTpmPerGpu ?? null, vb = b.capacity?.sustainableTpmPerGpu ?? null;
  if (va === null || vb === null) return { kind: "no-passing", passing: va !== null ? "vLLM" : vb !== null ? "SGLang" : null };
  const reading = tieBand(va, vb, band);
  if (reading === "tie") return { kind: "tie", fraction: relativeDelta(vb, va) ?? 0 };
  return reading === "a" ? { kind: "lead", engine: "vLLM", fraction: relativeDelta(va, vb) ?? 0 } : { kind: "lead", engine: "SGLang", fraction: relativeDelta(vb, va) ?? 0 };
}

/* ── Every measured version ─────────────────────────────────────────────────────────────── */

/** "0.33.0" / "0.5.23" / "0.6.0rc1" → comparable tuple; null when the tag carries no release number. */
export function versionKey(runtimeVersion: string): number[] | null {
  const match = /v(\d+)\.(\d+)\.(\d+)(?:rc(\d+))?/i.exec(runtimeVersion);
  if (!match) return null;
  // A release candidate sorts before its release: rcN → N, release → +∞ (encoded as a large number).
  return [Number(match[1]), Number(match[2]), Number(match[3]), match[4] === undefined ? Number.MAX_SAFE_INTEGER : Number(match[4])];
}
export function compareVersions(a: number[], b: number[]): number {
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const d = (a[i] ?? 0) - (b[i] ?? 0);
    if (d) return d;
  }
  return 0;
}

export interface VersionRow {
  run: BenchmarkRun;
  base: Deployment;
  /** The base configuration carrying this run's levels and recorded identity. */
  deployment: Deployment;
  engine: Engine;
  capacity: Capacity;
  /** Row of the next older release of the same engine and configuration, when one is measured. */
  previous: VersionRow | null;
  /** (this − previous) ÷ previous sustainable tok/min/GPU; null unless both are measured with a passing level. */
  delta: number | null;
}

/** One deployment per run: the base configuration with the run's levels and recorded identity (GPUs, replicas, tag). */
export function runDeployment(base: Deployment, run: BenchmarkRun): Deployment {
  const { identity } = run;
  return {
    ...base, id: `${base.id}#${run.id}`, points: run.metrics, evidence: "measured", measuredAt: run.runDate, runId: run.id,
    workloadId: identity.dataset, runtimeTag: identity.runtimeVersion, runConfig: identity.runtimeConfig, gpuType: identity.gpuType,
    replicas: identity.maxSystemReplicas, runGpus: identity.numGpus, topologyMismatch: identity.numGpus !== base.gpus,
  };
}

/**
 * Every imported run of the scope on one dataset, newest run first. Δ prev compares a row with the highest older
 * release of the same engine, the same catalog configuration and the same recorded runtime_config (the same measured
 * variant, domain/variants.ts) on the same dataset — never across configurations, runtime configs, datasets or GPU
 * counts, so the Δ isolates the engine release; rows whose tag has no release number get no Δ.
 */
export function everyMeasuredVersion(snapshot: Pick<Snapshot, "deployments" | "runs">, scope: EngineScope, workloadId: string, slo: SloPolicy): VersionRow[] {
  const bases = scopeBases(snapshot.deployments, scope);
  const rows: VersionRow[] = [];
  for (const run of snapshot.runs ?? []) {
    if (run.identity.dataset !== workloadId) continue;
    const base = bases.find((b) => b.configurationId === run.configurationId);
    if (!base) continue;
    const deployment = runDeployment(base, run);
    rows.push({ run, base, deployment, engine: base.runtime, capacity: capacity(deployment, slo), previous: null, delta: null });
  }
  for (const row of rows) {
    const own = versionKey(row.run.identity.runtimeVersion);
    if (!own) continue;
    let previous: VersionRow | null = null, previousKey: number[] | null = null;
    for (const other of rows) {
      if (other === row || other.engine !== row.engine || other.base.configurationId !== row.base.configurationId) continue;
      if ((other.run.identity.numGpus) !== row.run.identity.numGpus) continue;
      if (configKeyOf(other.run.identity.runtimeConfig) !== configKeyOf(row.run.identity.runtimeConfig)) continue;
      const key = versionKey(other.run.identity.runtimeVersion);
      if (!key || compareVersions(key, own) >= 0) continue;
      const order = previousKey ? compareVersions(key, previousKey) : 1;
      if (order > 0 || (order === 0 && previous && Date.parse(other.run.runDate) > Date.parse(previous.run.runDate))) { previous = other; previousKey = key; }
    }
    row.previous = previous;
    row.delta = previous ? relativeDelta(row.capacity.sustainableTpmPerGpu, previous.capacity.sustainableTpmPerGpu) : null;
  }
  return rows.sort((x, y) => Date.parse(y.run.runDate) - Date.parse(x.run.runDate) || x.engine.localeCompare(y.engine));
}
