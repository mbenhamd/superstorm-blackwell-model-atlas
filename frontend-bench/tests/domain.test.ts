import { describe, expect, test } from "bun:test";
import { applyRuns, ATLAS, createCatalogSnapshot, launchCommand, matchConfiguration, parseIdentity, parseMetricRow, splitRuntime } from "../src/domain/catalog.js";
import { capacity, comparability, composite, DEFAULT_SLO, frontier, measurePoint, nominalTtftCeilingMs, percentile, rank, relativeDelta, safeCsv, SLO_PRESETS, tieBand, ttftCeilingMs } from "../src/domain/metrics.js";
import { configChips } from "../src/domain/config-chips.js";
import { deltaVsBest, groupSetups, setupStandings, sortSetups } from "../src/domain/setups.js";
import { ConflictError, migrateExperiment, parseExperiment, transitionExperiment, ValidationError } from "../src/domain/validation.js";
import type { BenchmarkRun, Deployment, MetricRow, SloPolicy } from "../src/domain/types.js";
import { configurationIdOf } from "../src/client/state.js";

/*
 * Metric rows below are hand-written inputs for the arithmetic under test, not measurements. The shipped
 * catalog snapshot contains no sweep points at all; that is asserted first.
 */
const snapshot = createCatalogSnapshot();
const stats = (p50: number | null, p95: number | null) => ({ mean: null, p50, p95, p99: null });
const row = (concurrency: number, o: Partial<MetricRow> & { ttft95?: number | null; itl95?: number | null } = {}): MetricRow => ({
  concurrency, ttftMs: stats(400, o.ttft95 === undefined ? 1000 : o.ttft95), itlMs: stats(15, o.itl95 === undefined ? 20 : o.itl95), requestLatencyMs: stats(null, null),
  requestsPerSecond: 1, inputTps: 8000, outputTps: 1000 * concurrency, totalTps: 9000 * concurrency, outputTpsPerUserP50: 60,
  successful: 100, errored: 0, incomplete: 0, durationSeconds: 60, ...o,
});
const base = (id = "qwen3.8-27b.fp8.vllm.baseline"): Deployment => {
  const found = snapshot.deployments.find((item) => item.id === id);
  if (!found) throw new Error(`Catalog configuration ${id} is missing`);
  return structuredClone(found);
};
const run = (configurationId: string | null, metrics: MetricRow[], dataset = "single-turn-8k", runDate = "2026-11-01T00:00:00Z"): BenchmarkRun => ({
  id: `run-${configurationId}-${dataset}-${runDate}`, configurationId, benchmarkTool: "unit-test", runDate, metrics,
  identity: { modelName: "qwen3.8-27b-fp8", gpuType: "B300", numGpus: 1, maxSystemReplicas: 1, runtimeVersion: "vllm-v0.33.0", dataset, runtimeConfig: {} },
});

describe("catalog snapshot", () => {
  test("configured build is engine_release; the latest recheck stays separate and untested", () => {
    const d = snapshot.deployments.find((item) => item.id === "qwen3.8-27b.fp8.vllm.v031.fi-fp8-kv")!;
    expect(d.runtimeVersion).toBe("v0.31.0");
    expect(d.reviewedOn).toBe("2026-10-17");
    expect(d.recheck?.engineRelease).toBe("v0.33.0");
    expect(d.recheck?.testedOnTarget).toBe(false);
    expect(d.recheck?.argumentStatus).toContain("not full CLI or runtime validation");
    expect(d.recheck?.reconciliation.length).toBeGreaterThan(0);
    expect(d.priorRechecks.map((item) => item.engineRelease)).toEqual(["v0.32.0"]);
    // A configuration with only a source snapshot keeps "not recorded"; the recheck release is never substituted.
    const snapshotOnly = snapshot.deployments.find((item) => item.id === "kimi-k3.native.sglang.baseline")!;
    expect(snapshotOnly.runtimeVersion).toBe("not recorded");
    expect(snapshotOnly.recheck?.engineRelease).toBe("v0.5.23");
    expect(snapshot.deployments.every((item) => item.runtimeVersion === (ATLAS.configurations.find((c) => c.id === item.id)?.engineRelease ?? "not recorded"))).toBe(true);
  });

  test("is pinned from the atlas with no measurements", () => {
    expect(snapshot.atlasCommit).toBe(ATLAS.atlas.commit);
    expect(snapshot.models.length).toBe(ATLAS.models.length);
    expect(snapshot.deployments.length).toBe(ATLAS.configurations.length);
    expect(snapshot.deployments.every((d) => d.points.length === 0 && d.evidence === "reference" && d.measuredAt === null)).toBe(true);
  });
  test("every configuration references a known model and export", () => {
    const exports = new Set(ATLAS.artifacts.map((a) => a.id));
    expect(snapshot.deployments.every((d) => snapshot.models.some((m) => m.id === d.modelId) && exports.has(d.artifactId))).toBe(true);
  });
  test("export slugs (run identity model_name) are unique", () => {
    const slugs = ATLAS.artifacts.map((a) => a.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });
  test("missing parameter counts stay null rather than borrowed", () => {
    expect(snapshot.models.find((m) => m.id === "deepseek-v4-flash-0731")?.parametersB).toBeNull();
  });
  test("serve command keeps every engine argument, one flag per line", () => {
    const d = base("glm-5.3.fp8.vllm.mtp");
    const lines = d.command.split("\n");
    expect(lines[0]).toBe("vllm serve zai-org/GLM-5.3 \\");
    expect(lines.every((line, i) => i === lines.length - 1 || line.endsWith(" \\"))).toBe(true);
    expect(d.command).toContain(`--speculative-config '{"method": "mtp", "num_speculative_tokens": 5}' \\`);
    const flags = d.engineArgs.filter((a) => a.startsWith("--"));
    expect(lines.length - 1).toBe(flags.length);
  });
  test("SGLang commands put the model path on its own line", () => {
    expect(launchCommand("SGLang", "org/model", ["--tp-size", "2"]).split("\n")).toEqual(["python -m sglang.launch_server \\", "  --model-path org/model \\", "  --tp-size 2"]);
  });
});

describe("SLO semantics", () => {
  test("presets: Classic, Low-latency, Frontier with ×0.8 margin", () => {
    expect([SLO_PRESETS.classic.prefillTps, SLO_PRESETS.classic.itlP95Ms]).toEqual([1300, 26]);
    expect([SLO_PRESETS["low-latency"].prefillTps, SLO_PRESETS["low-latency"].itlP95Ms]).toEqual([2600, 19]);
    expect([SLO_PRESETS.frontier.prefillTps, SLO_PRESETS.frontier.itlP95Ms]).toEqual([1000, 50]);
    expect(DEFAULT_SLO.margin).toBe(0.8);
  });
  test("TTFT ceiling is prompt tokens ÷ prefill speed", () => {
    expect(ttftCeilingMs(8000, DEFAULT_SLO)).toBeCloseTo(6153.85, 1);
    expect(ttftCeilingMs(null, DEFAULT_SLO)).toBeNull();
  });
  test("prompt tokens per level come from input tok/s ÷ requests/s", () => {
    const p = measurePoint(row(4, { inputTps: 4096, requestsPerSecond: 2 }), DEFAULT_SLO);
    expect(p.promptTokens).toBe(2048);
    expect(p.ttftCeilingMs).toBeCloseTo((2048 / 1300) * 1000, 6);
  });
  test("failures name the gates that failed; zero requests mean unknown success, not 0", () => {
    expect(measurePoint(row(1, { itl95: 40 }), DEFAULT_SLO).failures).toEqual(["ITL"]);
    const empty = measurePoint(row(1, { successful: 0, errored: 0, incomplete: 0 }), DEFAULT_SLO);
    expect(empty.successRate).toBeNull();
    expect(empty.failures).toContain("Success");
  });
  test("nominal TTFT ceiling: input budget ÷ prefill speed; none for multi-turn or shared-prefix workloads", () => {
    expect(nominalTtftCeilingMs({ inputTokens: 8000, turns: 1, sharedPrefixes: null }, DEFAULT_SLO)).toBeCloseTo(8000 / 1300 * 1000, 6);
    expect(nominalTtftCeilingMs({ inputTokens: 8000, turns: 4, sharedPrefixes: null }, DEFAULT_SLO)).toBeNull();
    expect(nominalTtftCeilingMs({ inputTokens: 8000, turns: 1, sharedPrefixes: "16 × 4k" }, DEFAULT_SLO)).toBeNull();
    expect(nominalTtftCeilingMs({ inputTokens: null, turns: 1, sharedPrefixes: null }, DEFAULT_SLO)).toBeNull();
    expect(nominalTtftCeilingMs(null, DEFAULT_SLO)).toBeNull();
  });
  test("a missing p95 never passes", () => {
    expect(measurePoint(row(1, { ttft95: null }), DEFAULT_SLO).passes).toBe(false);
    expect(measurePoint(row(1, { itl95: null }), DEFAULT_SLO).passes).toBe(false);
  });
  test("failed and incomplete requests stay in the success denominator", () => {
    const p = measurePoint(row(1, { successful: 98, errored: 1, incomplete: 1 }), DEFAULT_SLO);
    expect(p.successRate).toBe(0.98);
    expect(p.passes).toBe(false);
  });
  test("invalid policies are rejected", () => {
    expect(() => measurePoint(row(1), { ...DEFAULT_SLO, prefillTps: 0 })).toThrow(RangeError);
    expect(() => capacity({ ...base(), points: [row(1)] }, { ...DEFAULT_SLO, margin: 0 })).toThrow(RangeError);
    expect(() => capacity({ ...base(), gpus: 0, points: [row(1)] })).toThrow(RangeError);
  });
});

describe("C_max and sustainable throughput", () => {
  test("C_max is the last passing level; throughput = output tok/s there × margin ÷ GPUs", () => {
    const d = { ...base(), gpus: 2, points: [row(1), row(2), row(4), row(8, { itl95: 40 })] };
    const c = capacity(d, DEFAULT_SLO);
    expect(c.highestPassingConcurrency).toBe(4);
    expect(c.capacityTpsPerGpu).toBe(4000 * 0.8 / 2);
    expect([c.passingLevels, c.totalLevels]).toEqual([3, 4]);
  });
  test("sustainable = total (input + output) tok/s at C_max × margin × 60 ÷ run GPUs", () => {
    const d = { ...base(), gpus: 8, runGpus: 2, points: [row(1), row(2), row(4), row(8, { itl95: 40 })] };
    const c = capacity(d, DEFAULT_SLO);
    // Fixture row: totalTps = 9000 × concurrency (input 8000 tok/s + output 1000 × concurrency is NOT the sum here,
    // so the total is read from totalTps, never re-derived).
    expect(c.observedTotalTpsPerGpu).toBe(36000 / 2);
    expect(c.sustainableTpmPerGpu).toBe(36000 * 0.8 * 60 / 2);
    expect(c.sustainableOutputTpmPerGpu).toBe(4000 * 0.8 * 60 / 2);
    expect(c.deploymentWideTpm).toBe(36000 * 0.8 * 60);
    expect(c.deploymentInputTpm).toBe(8000 * 0.8 * 60);
    expect(c.deploymentOutputTpm).toBe(4000 * 0.8 * 60);
    expect(c.capacityTpsPerGpu).toBe(4000 * 0.8 / 2);
    expect(c.incomplete).toBe(0);
  });
  test("no measured level means null capacity, never zero", () => {
    const c = capacity(base(), DEFAULT_SLO);
    expect(c.sustainableTpmPerGpu).toBeNull();
    expect(c.rawPeakTpsPerGpu).toBeNull();
    expect(c.incomplete).toBeNull();
    expect(c.errored).toBeNull();
    expect(c.capacityTpsPerGpu).toBeNull();
    expect(c.highestPassingConcurrency).toBeNull();
    expect(c.totalLevels).toBe(0);
  });
  test("a stricter preset can only lower C_max", () => {
    const d = { ...base(), points: [row(1, { itl95: 18 }), row(2, { itl95: 22 }), row(4, { itl95: 30 })] };
    expect(capacity(d, SLO_PRESETS.frontier as SloPolicy).highestPassingConcurrency).toBe(4);
    expect(capacity(d, SLO_PRESETS.classic as SloPolicy).highestPassingConcurrency).toBe(2);
    expect(capacity(d, SLO_PRESETS["low-latency"] as SloPolicy).highestPassingConcurrency).toBe(1);
  });
  test("nearest rank uses observations, not interpolation", () => {
    expect(percentile([1, 2, 3, 4], 0.5)).toBe(2);
    expect(percentile([], 0.95)).toBeNull();
    expect(() => percentile([1], 2)).toThrow(RangeError);
  });
});

describe("runs and ranking", () => {
  test("identity validation rejects malformed runtime versions", () => {
    expect(() => parseIdentity({ modelName: "x1", gpuType: "B300", numGpus: 1, maxSystemReplicas: 1, runtimeVersion: "vllm-0.33", dataset: "single-turn-8k", runtimeConfig: {} })).toThrow(ValidationError);
    expect(() => parseIdentity({ modelName: "x1", gpuType: "B300", numGpus: 1, maxSystemReplicas: 1, runtimeVersion: "tgi-v1.0.0", dataset: "single-turn-8k", runtimeConfig: {} })).toThrow(ValidationError);
  });
  test("runtime_version accepts <engine>[-<distribution>]-v<version>[-<flavor>]", () => {
    expect(splitRuntime("sglang-v0.5.22-cu130")).toEqual({ engine: "SGLang", distribution: null, version: "v0.5.22", flavor: "cu130" });
    expect(splitRuntime("vllm-openai-v0.33.0-cu130")).toEqual({ engine: "vLLM", distribution: "openai", version: "v0.33.0", flavor: "cu130" });
    expect(splitRuntime("vllm-v0.33.0")).toEqual({ engine: "vLLM", distribution: null, version: "v0.33.0", flavor: null });
    const identity = parseIdentity({ modelName: "x1", gpuType: "B300", numGpus: 1, maxSystemReplicas: 1, runtimeVersion: "vllm-openai-v0.33.0-cu130", dataset: "single-turn-8k", runtimeConfig: {} });
    expect(identity.runtimeVersion).toBe("vllm-openai-v0.33.0-cu130");
  });
  test("metric rows reject zero duration and keep missing latency as null", () => {
    expect(() => parseMetricRow({ ...row(1), durationSeconds: 0 })).toThrow(ValidationError);
    expect(parseMetricRow({ ...row(1), itlMs: undefined }).itlMs.p95).toBeNull();
  });
  test("an explicit configuration id wins; unknown ids stay unmatched", () => {
    const identity = run(null, []).identity;
    expect(matchConfiguration(identity, snapshot, "qwen3.8-27b.fp8.vllm.baseline")).toBe("qwen3.8-27b.fp8.vllm.baseline");
    expect(matchConfiguration(identity, snapshot, "does-not-exist")).toBeNull();
  });
  test("applyRuns keeps every matched run (all runtime versions) for version comparisons", () => {
    const older = { ...run("qwen3.8-27b.fp8.vllm.baseline", [row(1)], "single-turn-8k", "2026-11-01T00:00:00Z") };
    const newer = { ...run("qwen3.8-27b.fp8.vllm.baseline", [row(1), row(2)], "single-turn-8k", "2026-11-02T00:00:00Z") };
    older.identity = { ...older.identity, runtimeVersion: "vllm-v0.32.0" };
    const merged = applyRuns(snapshot, [newer, older]);
    expect(merged.runs?.map((item) => item.identity.runtimeVersion)).toEqual(["vllm-v0.32.0", newer.identity.runtimeVersion]);
    expect(merged.deployments.find((d) => d.id === "qwen3.8-27b.fp8.vllm.baseline")?.points).toHaveLength(2);
  });

  test("applyRuns measures the default dataset in place and adds a sibling for another dataset", () => {
    const merged = applyRuns(snapshot, [run("qwen3.8-27b.fp8.vllm.baseline", [row(1)]), run("qwen3.8-27b.fp8.vllm.baseline", [row(1)], "chat-8-turn")]);
    expect(merged.deployments.find((d) => d.id === "qwen3.8-27b.fp8.vllm.baseline")?.evidence).toBe("measured");
    expect(merged.deployments.some((d) => d.id === "qwen3.8-27b.fp8.vllm.baseline@chat-8-turn")).toBe(true);
    expect(snapshot.deployments.every((d) => d.evidence === "reference")).toBe(true);
  });
  test("the newest run per configuration and dataset wins", () => {
    const merged = applyRuns(snapshot, [run("qwen3.8-27b.fp8.vllm.baseline", [row(1)], "single-turn-8k", "2026-11-02T00:00:00Z"), run("qwen3.8-27b.fp8.vllm.baseline", [row(1), row(2)], "single-turn-8k", "2026-11-01T00:00:00Z")]);
    expect(merged.deployments.find((d) => d.id === "qwen3.8-27b.fp8.vllm.baseline")?.points.length).toBe(1);
  });
  test("rank returns one row per catalog configuration on any dataset", () => {
    expect(rank(snapshot, "coding-agent-48-turn").length).toBe(ATLAS.configurations.length);
    expect(rank(snapshot, "coding-agent-48-turn").every((r) => r.capacity.capacityTpsPerGpu === null)).toBe(true);
  });
  test("a published score supplied per configuration is used as-is; null stays unranked", () => {
    const rows = rank(snapshot, "single-turn-8k", DEFAULT_SLO, (d) => d.modelId === "qwen3.8-27b" ? 20 : null);
    expect(rows.filter((r) => r.quality === 20).length).toBe(snapshot.deployments.filter((d) => d.modelId === "qwen3.8-27b").length);
    expect(frontier(rows)).toEqual([]);
  });
  test("frontier contains only non-dominated measured rows", () => {
    const merged = applyRuns(snapshot, [run("qwen3.8-27b.fp8.vllm.baseline", [row(1), row(2)]), run("qwen3.8-27b.bf16.vllm.baseline", [row(1)])]);
    const rows = rank(merged, "single-turn-8k", DEFAULT_SLO, () => 20);
    expect(frontier(rows).map((r) => r.deployment.id)).toEqual(["qwen3.8-27b.fp8.vllm.baseline"]);
  });
});

describe("comparability and formatting", () => {
  test("tie band: within ±3% of the larger value is a tie; missing is null", () => {
    expect(tieBand(100, 98)).toBe("tie");
    expect(tieBand(100, 96)).toBe("a");
    expect(tieBand(90, 100)).toBe("b");
    expect(tieBand(100, 95, 0.06)).toBe("tie");
    expect(tieBand(null, 100)).toBeNull();
  });
  test("config chips read catalog arguments: primary knobs first", () => {
    const chips = configChips({ runConfig: null, engineArgs: ["--kv-cache-dtype", "fp8", "--speculative-config", '{"method":"mtp","num_speculative_tokens":5}', "--max-model-len", "65536", "--max-num-seqs", "256"] });
    expect(chips).toEqual(["kv fp8", "mtp ×5", "ctx 65536", "seqs 256"]);
    expect(configChips({ runConfig: null, engineArgs: ["--speculative-algorithm", "EAGLE3", "--speculative-num-steps", "3", "--kv-cache-dtype", "auto"] })).toEqual(["eagle3 ×3"]);
  });
  test("config chips prefer the run's recorded runtime_config and keep every remaining key", () => {
    const chips = configChips({ runConfig: { kv_cache_dtype: "fp8", enable_prefix_caching: false, max_num_seqs: 128, fixture: "TEST" }, engineArgs: ["--kv-cache-dtype", "auto"] });
    expect(chips).toEqual(["kv fp8", "seqs 128", "prefix cache off", "fixture=TEST"]);
  });
  test("engine comparison requires the same export and knob", () => {
    expect(comparability(base("qwen3.8-27b.fp8.vllm.baseline"), base("qwen3.8-27b.fp8.sglang.baseline"), "runtime")).toEqual([]);
    expect(comparability(base("qwen3.8-27b.fp8.vllm.baseline"), base("qwen3.8-27b.nvfp4.sglang.baseline"), "runtime")).toContain("Model artifact");
  });
  test("different datasets are flagged", () => {
    expect(comparability(base(), { ...base(), workloadId: "coding-agent-48-turn" })).toContain("Workload");
  });
  test("missing quality never becomes zero", () => expect(composite(null)).toEqual({ score: null, coverage: 0 }));
  test("zero baseline is not a percentage gain", () => expect(relativeDelta(10, 0)).toBeNull());
  test("CSV strings cannot become spreadsheet formulas", () => {
    expect(safeCsv([["=1+1", "@x", 3, null]])).toBe(`"'=1+1","'@x","3",""`);
  });
});

describe("experiment integrity", () => {
  const input = { name: "Qwen FP8 sweep", deploymentId: "qwen3.8-27b.fp8.vllm.baseline", priority: "Normal", scheduledDate: "2026-11-20", notes: "" };
  test("input is trimmed and validated", () => expect(parseExperiment({ ...input, name: "  Qwen FP8 sweep  " }, snapshot).name).toBe("Qwen FP8 sweep"));
  test("nonexistent calendar dates are rejected", () => expect(() => parseExperiment({ ...input, scheduledDate: "2026-02-30" }, snapshot)).toThrow(ValidationError));
  test("unknown configurations are rejected", () => expect(() => parseExperiment({ ...input, deploymentId: "unknown" }, snapshot)).toThrow(ValidationError));
  test("oversized notes are rejected", () => expect(() => parseExperiment({ ...input, notes: "x".repeat(1001) }, snapshot)).toThrow(ValidationError));
  const experiment = { id: "exp-1", ...parseExperiment(input, snapshot), status: "Backlog" as const, owner: "test", version: 1, createdAt: "2026-11-07T00:00:00Z" };
  test("legal transitions increment the version", () => expect(transitionExperiment(experiment, "Scheduled", 1).version).toBe(2));
  test("stale writers cannot overwrite newer state", () => expect(() => transitionExperiment(experiment, "Scheduled", 0)).toThrow(ConflictError));
  test("datasets default to the configuration's dataset when omitted", () => expect(parseExperiment(input, snapshot).datasets).toEqual([snapshot.deployments.find((d) => d.id === input.deploymentId)!.workloadId]));
  test("datasets are validated: known, unique, 1–6", () => {
    expect(parseExperiment({ ...input, datasets: ["chat-8-turn", "single-turn-8k"] }, snapshot).datasets).toEqual(["single-turn-8k", "chat-8-turn"]);
    expect(() => parseExperiment({ ...input, datasets: [] }, snapshot)).toThrow(ValidationError);
    expect(() => parseExperiment({ ...input, datasets: ["single-turn-8k", "single-turn-8k"] }, snapshot)).toThrow(ValidationError);
    expect(() => parseExperiment({ ...input, datasets: ["not-a-dataset"] }, snapshot)).toThrow(ValidationError);
    expect(() => parseExperiment({ ...input, datasets: "single-turn-8k" }, snapshot)).toThrow(ValidationError);
  });
  test("blocked reason is trimmed, optional and bounded", () => {
    expect(parseExperiment({ ...input, blockedReason: "  GPU budget " }, snapshot).blockedReason).toBe("GPU budget");
    expect(parseExperiment({ ...input, blockedReason: "  " }, snapshot).blockedReason).toBeNull();
    expect(() => parseExperiment({ ...input, blockedReason: "x".repeat(201) }, snapshot)).toThrow(ValidationError);
  });
  test("old stored cards migrate: datasets default, blockedReason null, unknown configurations dropped", () => {
    const old = { id: "exp-old", name: "Old card", deploymentId: input.deploymentId, status: "Scheduled", priority: "Normal", scheduledDate: "2026-11-20", owner: "x", notes: "", version: 3, createdAt: "2026-11-01T00:00:00Z" };
    const migrated = migrateExperiment(old, snapshot)!;
    expect(migrated.datasets).toEqual([snapshot.deployments.find((d) => d.id === input.deploymentId)!.workloadId]);
    expect(migrated.blockedReason).toBeNull();
    expect(migrated.version).toBe(3);
    expect(migrateExperiment({ ...old, deploymentId: "n4-fp8" }, snapshot)).toBeNull();
    expect(migrateExperiment({ ...old, status: "Done" }, snapshot)).toBeNull();
  });
});

describe("stored selections use base configuration ids", () => {
  test("a measured sibling on another dataset maps back to its configuration id", () => {
    const merged = applyRuns(snapshot, [run("qwen3.8-27b.fp8.vllm.baseline", [row(1)], "chat-8-turn")]);
    const sibling = rank(merged, "chat-8-turn").find((item) => item.deployment.configurationId === "qwen3.8-27b.fp8.vllm.baseline")!.deployment;
    expect(sibling.id).toBe("qwen3.8-27b.fp8.vllm.baseline@chat-8-turn");
    expect(configurationIdOf(sibling.id, merged)).toBe("qwen3.8-27b.fp8.vllm.baseline");
    expect(configurationIdOf("qwen3.8-27b.fp8.vllm.baseline", merged)).toBe("qwen3.8-27b.fp8.vllm.baseline");
    expect(configurationIdOf("unknown-id", merged)).toBe("unknown-id");
  });
  test("workloads carry no unpinned dataset revision or sampling text", () => {
    for (const workload of snapshot.workloads) { expect(workload.datasetRevision).toBeNull(); expect(workload.sampling).toBeNull(); }
  });
});

describe("setup standings (TL;DR): Δ vs best, ±3% tie band, measured before unmeasured", () => {
  // Hand-written inputs: sustainable = total tok/s at C_max × 0.8 × 60 ÷ 1 GPU.
  const measuredSnapshot = applyRuns(snapshot, [
    run("qwen3.8-27b.fp8.vllm.baseline", [row(1), row(2), row(4)]),
    run("qwen3.8-27b.fp8.sglang.baseline", [row(1), row(2), row(4, { totalTps: 9000 * 4 * 0.98 })]),
    run("qwen3.8-27b.bf16.vllm.baseline", [row(1), row(2), row(4, { itl95: 100 })]),
    run("qwen3.8-27b.nvfp4.vllm.baseline", [row(1, { itl95: 100 })]),
  ]);
  const rows = rank(measuredSnapshot, "single-turn-8k").filter((item) => item.model.id === "qwen3.8-27b");
  const entries = setupStandings([...rows].reverse());
  const byId = (id: string) => entries.find((entry) => entry.row.deployment.configurationId === id)!;

  test("deltaVsBest is null unless both values exist; ties use the same band as tieBand", () => {
    expect(deltaVsBest(null, 100)).toBeNull();
    expect(deltaVsBest(100, null)).toBeNull();
    expect(deltaVsBest(97, 100)).toEqual({ fraction: -0.03, absolute: -3, tie: true });
    expect(deltaVsBest(96, 100)!.tie).toBe(false);
    expect(deltaVsBest(96, 100)!.fraction).toBeCloseTo(-0.04, 10);
  });
  test("best, tie, behind, no passing level and unmeasured, with competition positions", () => {
    expect(byId("qwen3.8-27b.fp8.vllm.baseline").standing).toEqual({ kind: "best" });
    expect(byId("qwen3.8-27b.fp8.vllm.baseline").position).toBe(1);
    const tie = byId("qwen3.8-27b.fp8.sglang.baseline").standing;
    expect(tie.kind).toBe("tie");
    if (tie.kind === "tie") { expect(tie.fraction).toBeCloseTo(-0.02, 10); expect(tie.absolute).toBeCloseTo(-9000 * 4 * 0.02 * 0.8 * 60, 6); }
    const behind = byId("qwen3.8-27b.bf16.vllm.baseline").standing;
    expect(behind.kind).toBe("behind");
    if (behind.kind === "behind") expect(behind.fraction).toBeCloseTo(-0.5, 10);
    expect(byId("qwen3.8-27b.bf16.vllm.baseline").position).toBe(3);
    expect(byId("qwen3.8-27b.nvfp4.vllm.baseline").standing).toEqual({ kind: "no-passing" });
    expect(byId("qwen3.8-27b.nvfp4.vllm.baseline").position).toBeNull();
    expect(entries.filter((entry) => entry.standing.kind === "unmeasured").length).toBe(rows.length - 4);
    // Order: measured with a value (descending), measured without a passing level, then unmeasured.
    expect(entries.slice(0, 4).map((entry) => entry.standing.kind)).toEqual(["best", "tie", "behind", "no-passing"]);
    expect(entries.slice(4).every((entry) => entry.standing.kind === "unmeasured")).toBe(true);
  });
  test("no Δ without a measured best: every unmeasured row stays unmeasured, never zero", () => {
    const plain = setupStandings(rank(snapshot, "single-turn-8k").filter((item) => item.model.id === "qwen3.8-27b"));
    expect(plain.every((entry) => entry.standing.kind === "unmeasured" && entry.position === null)).toBe(true);
  });
  test("equal values share a position", () => {
    const tied = applyRuns(snapshot, [run("qwen3.8-27b.fp8.vllm.baseline", [row(2)]), run("qwen3.8-27b.fp8.sglang.baseline", [row(2)]), run("qwen3.8-27b.bf16.vllm.baseline", [row(1)])]);
    const result = setupStandings(rank(tied, "single-turn-8k").filter((item) => item.model.id === "qwen3.8-27b"));
    expect(result.slice(0, 3).map((entry) => entry.position)).toEqual([1, 1, 3]);
    expect(result[1]!.standing).toEqual({ kind: "tie", fraction: 0, absolute: 0 });
  });
  test("sorts keep measured rows first; C_max and name orders; groups follow first appearance", () => {
    const name = (item: (typeof rows)[number]) => item.deployment.id;
    const byName = sortSetups(entries, "name", name);
    expect(byName.slice(0, 3).map((entry) => entry.row.deployment.configurationId)).toEqual(["qwen3.8-27b.bf16.vllm.baseline", "qwen3.8-27b.fp8.sglang.baseline", "qwen3.8-27b.fp8.vllm.baseline"]);
    expect(byName[3]!.standing.kind).toBe("no-passing");
    expect(byName.slice(4).every((entry) => entry.standing.kind === "unmeasured")).toBe(true);
    const byCmax = sortSetups(entries, "cmax", name);
    // fp8 vLLM and SGLang both reach C_max 4: sustainable breaks the tie; BF16 passes only up to 2.
    expect(byCmax.slice(0, 3).map((entry) => entry.row.capacity.highestPassingConcurrency)).toEqual([4, 4, 2]);
    expect(byCmax[0]!.standing.kind).toBe("best");
    const groups = groupSetups(sortSetups(entries, "sustainable", name), (entry) => entry.row.deployment.artifactId);
    expect(groups[0]!.key).toBe("qwen3.8-27b.fp8");
    expect(groups.reduce((total, group) => total + group.items.length, 0)).toBe(entries.length);
  });
});
