/**
 * Engine page data (src/client/components/app/engine-data.ts) against the TEST fixture (invented values, not
 * measurements): best configuration per engine, matched-pair verdicts and Δ vs the previous release.
 */
import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { Effect } from "effect";
import { applyRuns, createCatalogSnapshot } from "../src/domain/catalog.ts";
import { DEFAULT_SLO, SLO_PRESETS } from "../src/domain/metrics.ts";
import type { BenchmarkRun, Snapshot } from "../src/domain/types.ts";
import { controlDifferences, effectiveControls, recordedOverrides } from "../src/domain/run-config.ts";
import { loadRunsFile, memoryStore } from "../src/server/repository.ts";
import {
  bestPerEngine, compareVersions, engineDifferences, engineVerdict, everyMeasuredVersion, versionKey, type EngineScope,
} from "../src/client/components/app/engine-data.ts";

const SAMPLE_RUNS = join(import.meta.dir, "fixtures/sample-runs.json");
const runs = await loadRunsFile(SAMPLE_RUNS);
const snapshot: Snapshot = await Effect.runPromise(memoryStore(runs).snapshot());
const scope: EngineScope = { modelId: "qwen3.8-27b", gpus: 1, hardwareId: "b300" };
const VLLM = "qwen3.8-27b.fp8.vllm.baseline", SGLANG = "qwen3.8-27b.fp8.sglang.baseline";

describe("best configuration per engine", () => {
  test("single-turn-8k: the measured fp8 baselines; unmeasured configurations never win", () => {
    const best = bestPerEngine(snapshot.deployments, scope, "single-turn-8k", DEFAULT_SLO);
    expect(best.vLLM.deployment?.configurationId).toBe(VLLM);
    expect(best.SGLang.deployment?.configurationId).toBe(SGLANG);
    // Fixture: four vLLM configurations of qwen3.8-27b × 1 GPU are measured on single-turn-8k (FP8, BF16, NVFP4 baselines and FP8 FlashInfer FP8 KV).
    expect(best.vLLM.measured).toBe(4);
    expect(best.vLLM.capacity?.sustainableTpmPerGpu).not.toBeNull();
  });
  test("chat-8-turn: both engines measured with different max sequences, so no verdict; a dataset with no run has no best", () => {
    const chat = bestPerEngine(snapshot.deployments, scope, "chat-8-turn", DEFAULT_SLO);
    expect(chat.vLLM.deployment?.id).toBe(`${VLLM}@chat-8-turn`);
    expect(chat.SGLang.deployment?.id).toBe(`${SGLANG}@chat-8-turn`);
    const verdict = engineVerdict(chat);
    expect(verdict.kind).toBe("different");
    if (verdict.kind !== "different") return;
    // Fixture: vLLM recorded max_num_seqs 256, SGLang max_running_requests 128; every other control matches.
    expect(verdict.differences).toEqual(["Max sequences"]);
    expect(verdict.controls.map((c) => [c.key, c.a.value, c.a.source, c.b.value, c.b.source])).toEqual([["max_num_seqs", "256", "recorded", "128", "recorded"]]);
    expect(engineVerdict(bestPerEngine(snapshot.deployments, scope, "coding-agent-48-turn", DEFAULT_SLO))).toEqual({ kind: "none" });
  });
  test("offline catalog: nothing measured, no verdict", () => {
    const catalog = createCatalogSnapshot();
    const best = bestPerEngine(catalog.deployments, scope, "single-turn-8k", DEFAULT_SLO);
    expect(best.vLLM.deployment).toBeNull();
    expect(engineVerdict(best).kind).toBe("none");
  });
});

describe("engine verdict", () => {
  test("matched fp8 pair on single-turn-8k: vLLM leads outside the ±3% band (Classic SLO)", () => {
    const best = bestPerEngine(snapshot.deployments, scope, "single-turn-8k", DEFAULT_SLO);
    const va = best.vLLM.capacity!.sustainableTpmPerGpu!, vb = best.SGLang.capacity!.sustainableTpmPerGpu!;
    const verdict = engineVerdict(best);
    expect(verdict.kind).toBe("lead");
    if (verdict.kind !== "lead") return;
    expect(verdict.engine).toBe("vLLM");
    expect(verdict.fraction).toBeCloseTo((va - vb) / vb, 10);
    expect(verdict.fraction).toBeGreaterThan(0.03);
  });
  test("a band wide enough reads as a tie", () => {
    const best = bestPerEngine(snapshot.deployments, scope, "single-turn-8k", DEFAULT_SLO);
    expect(engineVerdict(best, 0.1).kind).toBe("tie");
  });
  test("different knob, artifact or run GPUs: no verdict", () => {
    const a = snapshot.deployments.find((d) => d.id === VLLM)!;
    const b = snapshot.deployments.find((d) => d.id === SGLANG)!;
    expect(engineDifferences(a, b)).toEqual([]);
    expect(engineDifferences(a, { ...b, knob: "MTP" })).toContain("Configuration knob");
    expect(engineDifferences(a, { ...b, artifactId: "qwen3.8-27b.nvfp4" })).toContain("Model artifact");
    expect(engineDifferences(a, { ...b, runGpus: 2 })).toContain("GPUs in run");
    const best = bestPerEngine(snapshot.deployments, scope, "single-turn-8k", DEFAULT_SLO);
    const mismatched = { ...best, SGLang: { ...best.SGLang, deployment: { ...best.SGLang.deployment!, knob: "MTP" } } };
    expect(engineVerdict(mismatched)).toEqual({ kind: "different", differences: ["Configuration knob"], controls: [] });
  });
  test("a matched pair where one engine has no passing level names the engine that passes", () => {
    const strict = { ...SLO_PRESETS["low-latency"], itlP95Ms: 9.5 };
    // The fp8 pair alone (the first five fixture runs): the later invented runs add other artifacts to the scope.
    const pair = applyRuns(createCatalogSnapshot(), runs.slice(0, 5));
    const best = bestPerEngine(pair.deployments, scope, "single-turn-8k", strict);
    // ITL p95 ≤ 9.5 ms: SGLang passes at c=1 (9.22 ms) only; vLLM never (9.84 ms at c=1).
    expect(best.vLLM.capacity?.sustainableTpmPerGpu ?? null).toBeNull();
    expect(engineVerdict(best)).toEqual({ kind: "no-passing", passing: "SGLang" });
  });
});

describe("runtime controls (recorded runtime_config, else configured command)", () => {
  const best = () => bestPerEngine(snapshot.deployments, scope, "single-turn-8k", DEFAULT_SLO);
  test("engine-equivalent keys normalise: fp8 ≈ fp8_e4m3, max_num_seqs ≈ max_running_requests, prefix cache off ≈ disable_radix_cache", () => {
    const { vLLM, SGLang } = best();
    const a = effectiveControls(vLLM.deployment!), b = effectiveControls(SGLang.deployment!);
    const value = (list: typeof a, key: string) => list.find((c) => c.key === key)!;
    expect(value(a, "kv_cache_dtype")).toMatchObject({ value: "fp8", source: "recorded", raw: "fp8" });
    expect(value(b, "kv_cache_dtype")).toMatchObject({ value: "fp8", source: "recorded", raw: "fp8_e4m3" });
    expect(value(b, "max_num_seqs")).toMatchObject({ value: "256", field: "max_running_requests" });
    expect(value(b, "prefix_caching").value).toBe("off");
    // vLLM's run does not record the memory fraction: the configured --gpu-memory-utilization 0.85 applies.
    expect(value(a, "memory_fraction")).toMatchObject({ value: "0.85", source: "configured", field: "--gpu-memory-utilization" });
    expect(controlDifferences(vLLM.deployment!, SGLang.deployment!)).toEqual([]);
  });
  test("configs that differ in max sequences, KV dtype or memory fraction give 'different', never a lead", () => {
    const { vLLM, SGLang } = best();
    const sglang = SGLang.deployment!;
    const unrecorded = { ...sglang, runConfig: { kv_cache_dtype: "fp8_e4m3", disable_radix_cache: true } };
    // SGLang without a recorded cap falls back to its configured --max-running-requests 32 and --mem-fraction-static 0.82.
    const verdict = engineVerdict({ ...best(), SGLang: { ...SGLang, deployment: unrecorded } });
    expect(verdict.kind).toBe("different");
    if (verdict.kind !== "different") return;
    expect(verdict.differences).toEqual(["Max sequences", "Memory fraction"]);
    expect(verdict.controls.map((c) => `${c.key} ${c.a.raw} ${c.a.source} / ${c.b.raw} ${c.b.source}`)).toEqual([
      "max_num_seqs 256 recorded / 32 configured", "memory_fraction 0.85 configured / 0.82 configured",
    ]);
    const kv = { ...sglang, runConfig: { ...sglang.runConfig, kv_cache_dtype: "bfloat16" } };
    expect(engineDifferences(vLLM.deployment!, kv)).toEqual(["KV dtype"]);
  });
  test("recorded values that contradict the configured command are listed; unset command controls are not", () => {
    const { vLLM } = best();
    // Catalog: --kv-cache-dtype auto, --max-num-seqs 32, --gpu-memory-utilization 0.85; run: kv fp8, seqs 256, prefix off.
    expect(recordedOverrides(vLLM.deployment!).map(({ recorded, configured }) => `${recorded.field} ${recorded.raw} (was ${configured.field} ${configured.raw})`))
      .toEqual(["kv_cache_dtype fp8 (was --kv-cache-dtype auto)", "max_num_seqs 256 (was --max-num-seqs 32)"]);
    expect(recordedOverrides({ ...vLLM.deployment!, runConfig: null })).toEqual([]);
  });
});

describe("every measured version", () => {
  test("versions parse and order; a release candidate precedes its release", () => {
    expect(versionKey("vllm-v0.33.0")!.slice(0, 3)).toEqual([0, 33, 0]);
    expect(versionKey("sglang (source snapshot)")).toBeNull();
    expect(compareVersions(versionKey("vllm-v0.33.0")!, versionKey("vllm-v0.32.1")!)).toBeGreaterThan(0);
    expect(compareVersions(versionKey("vllm-v0.33.0rc1")!, versionKey("vllm-v0.33.0")!)).toBeLessThan(0);
  });
  test("fixture: one row per run on the dataset, newest first; Δ prev only against an older release", () => {
    const rows = everyMeasuredVersion(snapshot, scope, "single-turn-8k", DEFAULT_SLO);
    expect(rows.map((row) => row.run.identity.runtimeVersion)).toEqual([
      "sglang-v0.5.23", "vllm-v0.33.0", "vllm-v0.33.0", "sglang-v0.5.23", "vllm-v0.33.0", "sglang-v0.5.23", "vllm-v0.33.0", "vllm-v0.31.0", "vllm-v0.32.0", "vllm-v0.32.0",
    ]);
    const latest = rows[1]!, older = rows[9]!;
    expect(latest.run.configurationId).toBe(VLLM);
    expect(latest.previous).toBe(older);
    expect(latest.delta).toBeCloseTo((latest.capacity.sustainableTpmPerGpu! - older.capacity.sustainableTpmPerGpu!) / older.capacity.sustainableTpmPerGpu!, 10);
    expect(older.delta).toBeNull();
    expect(rows[0]!.delta).toBeNull();
    // Same configuration, other recorded runtime_config (prefix cache on, 512 sequences): no Δ against the v0.32.0 run.
    const prefixOn = rows.find((row) => row.run.configurationId === VLLM && row.run.identity.runtimeConfig.enable_prefix_caching === true)!;
    expect(prefixOn.previous).toBeNull();
    expect(prefixOn.delta).toBeNull();
    // NVFP4: v0.33.0 compares with the v0.32.0 run of the same runtime config (a regression in the fixture).
    const nvfp4 = rows.find((row) => row.run.configurationId === "qwen3.8-27b.nvfp4.vllm.baseline" && row.run.identity.runtimeVersion === "vllm-v0.33.0")!;
    expect(nvfp4.previous?.run.identity.runtimeVersion).toBe("vllm-v0.32.0");
    expect(nvfp4.delta!).toBeLessThan(0);
    expect(everyMeasuredVersion(snapshot, scope, "chat-8-turn", DEFAULT_SLO)).toHaveLength(2);
  });
  test("Δ prev uses the highest older release of the same engine and configuration, not the most recent run", () => {
    const base = runs.find((run) => run.configurationId === VLLM && run.identity.runtimeVersion === "vllm-v0.33.0" && run.identity.dataset === "single-turn-8k")!;
    // Invented older release run more recently than v0.32.0 (scaled copy of the fixture levels).
    const scaled: BenchmarkRun = {
      ...base, id: "old-31", runDate: "2026-10-25T09:00:00Z", identity: { ...base.identity, runtimeVersion: "vllm-v0.31.0" },
      metrics: base.metrics.map((m) => ({ ...m, inputTps: m.inputTps * 0.5, outputTps: m.outputTps * 0.5, totalTps: m.totalTps * 0.5, requestsPerSecond: m.requestsPerSecond * 0.5 })),
    };
    const extended = applyRuns(createCatalogSnapshot(), [...runs, scaled]);
    const rows = everyMeasuredVersion(extended, scope, "single-turn-8k", DEFAULT_SLO);
    const fp8 = rows.filter((row) => row.run.configurationId === VLLM || row.run.configurationId === SGLANG).filter((row) => row.run.identity.runtimeConfig.enable_prefix_caching !== true);
    expect(fp8.map((row) => row.run.identity.runtimeVersion)).toEqual(["sglang-v0.5.23", "vllm-v0.33.0", "vllm-v0.31.0", "vllm-v0.32.0"]);
    const byVersion = (v: string) => fp8.find((row) => row.run.identity.runtimeVersion === v)!;
    expect(byVersion("vllm-v0.33.0").previous?.run.identity.runtimeVersion).toBe("vllm-v0.32.0");
    expect(byVersion("vllm-v0.32.0").previous?.run.identity.runtimeVersion).toBe("vllm-v0.31.0");
    expect(byVersion("vllm-v0.31.0").delta).toBeNull();
    // SGLang never compares with a vLLM release.
    expect(byVersion("sglang-v0.5.23").previous).toBeNull();
  });
});

/*
 * Published (external) curves for the Throughput overlay and the Engine small multiples, over the committed external
 * dataset (published records, not measurements). Selection only: these functions never produce a capacity, verdict
 * or ranking input (tests/external.test.ts covers the import graph and ranking invariance).
 */
describe("published curves (external evidence) for Throughput and Engine", async () => {
  const { externalDataset } = await import("../src/client/lib/external.ts");
  const { hardwareClass, isWeak, engineFamily, recordDate, HARDWARE_CLASSES } = await import("../src/domain/external.ts");
  const { MIN_CURVE_LEVELS, publishedCurves } = await import("../src/client/components/app/throughput-external-data.ts");
  const { PUBLISHED_PER_ENGINE, publishedEngineCharts } = await import("../src/client/components/app/engine-published-data.ts");
  const data = externalDataset();
  const base = { modelId: "qwen3.8-27b", hardware: "B300" as const, showWeak: false, overlayKind: "total-per-gpu" as const };

  test("default scope is the same GPU class and engine family; curves are ladders with at least two levels", () => {
    const curves = publishedCurves(data, { ...base, engine: "vllm", scope: "same" });
    expect(curves.length).toBeGreaterThan(0);
    for (const curve of curves) {
      expect(curve.record.evidence).toBe("external");
      expect(curve.record.kind).toBe("ladder");
      expect(hardwareClass(curve.record.gpuType)).toBe("B300");
      expect(engineFamily(curve.record)).toBe("vllm");
      expect(isWeak(curve.record)).toBe(false);
      expect(curve.points.length).toBeGreaterThanOrEqual(MIN_CURVE_LEVELS);
      expect(curve.points.map((point) => point.concurrency)).toEqual([...curve.points.map((point) => point.concurrency)].sort((a, b) => a - b));
    }
    expect(curves.map((curve) => curve.tag)).toEqual(curves.map((_, index) => `P${index + 1}`));
  });

  test("overlay only when the plotted metric is the chart's (total tok/s per GPU); otherwise an own-axis chart", () => {
    const curves = publishedCurves(data, { ...base, engine: "sglang", scope: "engine" });
    const overlay = curves.filter((curve) => curve.overlay);
    expect(overlay.length).toBeGreaterThan(0);
    for (const curve of overlay) { expect(curve.metric.kind).toBe("total-per-gpu"); expect(curve.metric.unit).toBe("tok/s/GPU"); expect(curve.metric.perGpu).toBe(true); }
    for (const curve of curves.filter((item) => !item.overlay)) expect(curve.metric.kind).not.toBe("total-per-gpu");
    // Without a host metric nothing is an overlay.
    expect(publishedCurves(data, { ...base, engine: "sglang", scope: "engine", overlayKind: null }).some((curve) => curve.overlay)).toBe(false);
    // Newest first by the record's (else the source's) date.
    const dates = curves.map((curve) => recordDate(curve.record, data.sources) ?? "");
    expect(dates).toEqual([...dates].sort().reverse());
  });

  test("weak records (invalid version, unverified extraction, superseded run) appear only with showWeak", () => {
    const hidden = publishedCurves(data, { ...base, modelId: "kimi-k3", engine: "vllm", scope: "all" });
    const shown = publishedCurves(data, { ...base, modelId: "kimi-k3", engine: "vllm", scope: "all", showWeak: true });
    expect(hidden.some((curve) => isWeak(curve.record))).toBe(false);
    expect(shown.some((curve) => isWeak(curve.record))).toBe(true);
    expect(shown.length).toBeGreaterThan(hidden.length);
  });

  test("Engine: one chart per GPU class, one metric per chart, vLLM and SGLang only, newest ladders per engine", () => {
    for (const modelId of ["qwen3.8-27b", "kimi-k3", "glm-5.3"]) {
      const charts = publishedEngineCharts(data, modelId, false);
      expect(charts.length).toBeGreaterThan(0);
      expect(charts.map((chart) => chart.hardware)).toEqual(HARDWARE_CLASSES.filter((hardware) => charts.some((chart) => chart.hardware === hardware)));
      for (const chart of charts) {
        expect(new Set(chart.curves.map((curve) => curve.metric.kind))).toEqual(new Set([chart.kind]));
        for (const curve of chart.curves) {
          expect(hardwareClass(curve.record.gpuType)).toBe(chart.hardware);
          expect(engineFamily(curve.record)).toBe(curve.family);
          expect(isWeak(curve.record)).toBe(false);
          expect(curve.record.modelId).toBe(modelId);
        }
        for (const family of ["vllm", "sglang"]) expect(chart.curves.filter((curve) => curve.family === family).length).toBeLessThanOrEqual(PUBLISHED_PER_ENGINE);
        expect(chart.engines.length).toBeGreaterThan(0);
      }
    }
    // Kimi K3 on B300: both engines published per-GPU output throughput, so that metric wins over latency.
    const b300 = publishedEngineCharts(data, "kimi-k3", false).find((chart) => chart.hardware === "B300")!;
    expect(b300.kind).toBe("output-per-gpu");
    expect(b300.engines).toEqual(["vllm", "sglang"]);
  });
});
