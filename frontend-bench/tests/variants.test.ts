/**
 * Measured variants (src/domain/variants.ts) against the TEST fixture (invented values, not measurements):
 * grouping by configuration × shape × canonical runtime_config × dataset, best run across engine versions,
 * run/runtime counts, planning rows, and the unchanged applyRuns()/rank() semantics.
 */
import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { Effect } from "effect";
import { applyRuns, createCatalogSnapshot } from "../src/domain/catalog.ts";
import { DEFAULT_SLO, rank, SLO_PRESETS } from "../src/domain/metrics.ts";
import { setupStandings } from "../src/domain/setups.ts";
import { canonicalConfig, configKeyOf, groupVariants, variantKey, variantRows, variantsOfConfiguration, type Variant } from "../src/domain/variants.ts";
import type { BenchmarkRun, Snapshot } from "../src/domain/types.ts";
import { loadRunsFile, memoryStore } from "../src/server/repository.ts";

const runs = await loadRunsFile(join(import.meta.dir, "fixtures/sample-runs.json"));
const snapshot: Snapshot = await Effect.runPromise(memoryStore(runs).snapshot());
const MODEL = "qwen3.8-27b", DATASET = "single-turn-8k";
const FP8_VLLM = "qwen3.8-27b.fp8.vllm.baseline", NVFP4_VLLM = "qwen3.8-27b.nvfp4.vllm.baseline";
const variants = groupVariants(snapshot, DEFAULT_SLO);
const onDataset = (dataset: string) => variants.filter((variant) => variant.modelId === MODEL && variant.dataset === dataset);
const rounded = (variant: Variant) => Math.round(variant.best.capacity.sustainableTpmPerGpu ?? NaN);

describe("variant grouping (TEST fixture)", () => {
  test("12 fixture runs form 8 variants of qwen3.8-27b on single-turn-8k and 2 on chat-8-turn", () => {
    expect(runs).toHaveLength(12);
    expect(onDataset(DATASET)).toHaveLength(8);
    expect(onDataset("chat-8-turn")).toHaveLength(2);
    expect(variants).toHaveLength(10);
    expect(new Set(variants.map((variant) => variant.key)).size).toBe(variants.length);
    expect(variants.reduce((total, variant) => total + variant.runCount, 0)).toBe(runs.length);
  });
  test("one runtime config on two engine versions: one variant, best of 2 runtimes, fronted by the faster run", () => {
    const fp8 = variantsOfConfiguration(variants, FP8_VLLM, DATASET).find((variant) => variant.runtimeConfig.enable_prefix_caching === false)!;
    expect(fp8.runCount).toBe(2);
    expect(fp8.runtimeCount).toBe(2);
    expect(fp8.runtimeVersions).toEqual(["vllm-v0.33.0", "vllm-v0.32.0"]);
    expect(fp8.best.run.identity.runtimeVersion).toBe("vllm-v0.33.0");
    expect(rounded(fp8)).toBe(2882918);
    // NVFP4: the newer release (v0.33.0, newest run) is slower, so the older v0.32.0 run fronts the variant.
    const [nvfp4] = variantsOfConfiguration(variants, NVFP4_VLLM, DATASET);
    expect(variantsOfConfiguration(variants, NVFP4_VLLM, DATASET)).toHaveLength(1);
    expect(nvfp4!.runtimeCount).toBe(2);
    expect(nvfp4!.runs[0]!.run.identity.runtimeVersion).toBe("vllm-v0.33.0");
    expect(nvfp4!.best.run.identity.runtimeVersion).toBe("vllm-v0.32.0");
    expect(rounded(nvfp4!)).toBe(2248675);
    expect(nvfp4!.latestRunDate).toBe("2026-10-30T09:00:00.000Z");
  });
  test("two runtime configs of one catalog configuration stay two variants", () => {
    const fp8 = variantsOfConfiguration(variants, FP8_VLLM, DATASET);
    expect(fp8).toHaveLength(2);
    expect(fp8.map((variant) => variant.runtimeConfig.enable_prefix_caching).sort()).toEqual([false, true]);
    const prefix = fp8.find((variant) => variant.runtimeConfig.enable_prefix_caching === true)!;
    expect(prefix.runtimeCount).toBe(1);
    expect(prefix.chips).toEqual(["kv fp8", "seqs 512", "prefix cache on", "fixture=TEST"]);
    expect(rounded(prefix)).toBe(2479310);
    // Across datasets the configuration has three variants; the dataset is never mixed.
    expect(variantsOfConfiguration(variants, FP8_VLLM)).toHaveLength(3);
  });
  test("a variant without a passing level keeps a null sustainable value (never 0) and sorts after passing variants", () => {
    const bf16 = variantsOfConfiguration(variants, "qwen3.8-27b.bf16.sglang.baseline", DATASET)[0]!;
    expect(bf16.best.capacity.sustainableTpmPerGpu).toBeNull();
    expect(bf16.best.capacity.highestPassingConcurrency).toBeNull();
    expect(onDataset(DATASET).at(-1)!.key).toBe(bf16.key);
  });
  test("keys ignore runtime_config key order and engine version, and separate shape and dataset", () => {
    const base = runs[0]!;
    const reordered: BenchmarkRun = { ...base, id: "reordered", identity: { ...base.identity, runtimeVersion: "vllm-v0.31.0", runtimeConfig: Object.fromEntries(Object.entries(base.identity.runtimeConfig).reverse()) } };
    expect(variantKey(reordered)).toBe(variantKey(base));
    expect(variantKey({ ...base, identity: { ...base.identity, numGpus: 2 } })).not.toBe(variantKey(base));
    expect(variantKey({ ...base, identity: { ...base.identity, dataset: "chat-8-turn" } })).not.toBe(variantKey(base));
    expect(configKeyOf({ b: { y: 1, x: 2 }, a: [2, 1] })).toBe('{"a":[2,1],"b":{"x":2,"y":1}}');
    expect(canonicalConfig(null)).toBeNull();
  });
  test("each variant capacity uses one SLO: Low-latency changes values, not grouping", () => {
    const low = groupVariants(snapshot, SLO_PRESETS["low-latency"]);
    expect(low.map((variant) => variant.key).sort()).toEqual(variants.map((variant) => variant.key).sort());
    const fp8 = variantsOfConfiguration(low, FP8_VLLM, DATASET).find((variant) => variant.runtimeConfig.enable_prefix_caching === false)!;
    expect(rounded(fp8)).toBe(2017968);
  });
});

describe("variant rows: measured variants plus planning rows", () => {
  const rows = variantRows(snapshot, DATASET, DEFAULT_SLO, { modelId: MODEL });
  test("8 measured variants, then the 6 catalog configurations without a run as planning rows", () => {
    expect(rows).toHaveLength(14);
    expect(new Set(rows.map((row) => row.key)).size).toBe(rows.length);
    const planning = rows.filter((row) => row.variant === null);
    expect(planning.map((row) => row.deployment.configurationId).sort()).toEqual([
      "qwen3.8-27b.bf16.vllm.v031.fi-bf16-kv", "qwen3.8-27b.fp8.vllm.v031.fi-bf16-kv", "qwen3.8-27b.nvfp4.sglang.baseline",
      "qwen3.8-27b.nvfp4.vllm.v031.fa4-bf16-kv", "qwen3.8-27b.nvfp4.vllm.v031.fi-bf16-kv", "qwen3.8-27b.nvfp4.vllm.v031.fi-fp8-kv",
    ]);
    expect(planning.every((row) => row.deployment.evidence === "reference" && row.deployment.points.length === 0 && row.capacity.sustainableTpmPerGpu === null)).toBe(true);
    expect(rows.slice(8).every((row) => row.variant === null)).toBe(true);
  });
  test("measured rows carry the best run's identity on their catalog configuration", () => {
    const nvfp4 = rows.find((row) => row.deployment.configurationId === NVFP4_VLLM)!;
    expect(nvfp4.deployment.evidence).toBe("measured");
    expect(nvfp4.deployment.runtimeTag).toBe("vllm-v0.32.0");
    expect(nvfp4.deployment.runId).toBe(nvfp4.variant!.best.run.id);
    expect(nvfp4.deployment.measuredAt).toBe("2026-10-22T09:00:00.000Z");
    expect(Math.round(nvfp4.capacity.sustainableTpmPerGpu!)).toBe(2248675);
  });
  test("setupStandings reads variant rows: best, Δ vs best, no passing level, planning last", () => {
    const entries = setupStandings(rows);
    expect(entries[0]!.standing).toEqual({ kind: "best" });
    expect(entries[0]!.row.variant!.runtimeCount).toBe(2);
    expect(entries.map((entry) => entry.standing.kind)).toEqual(["best", "behind", "behind", "behind", "behind", "behind", "behind", "no-passing", ...Array(6).fill("unmeasured")]);
    const prefix = entries.find((entry) => entry.row.variant?.runtimeConfig.enable_prefix_caching === true)!;
    expect(prefix.standing.kind === "behind" && prefix.standing.fraction).toBeCloseTo(2479310 / 2882918 - 1, 5);
  });
  test("applyRuns and rank keep one row per configuration from the newest run", () => {
    const ranked = rank(snapshot, DATASET).filter((row) => row.model.id === MODEL);
    expect(ranked).toHaveLength(13);
    expect(ranked.find((row) => row.deployment.configurationId === FP8_VLLM)!.deployment.measuredAt).toBe("2026-11-01T09:00:00.000Z");
    // NVFP4: rank fronts the newest run (v0.33.0); the variant view fronts the best (v0.32.0).
    expect(ranked.find((row) => row.deployment.configurationId === NVFP4_VLLM)!.deployment.runtimeTag).toBe("vllm-v0.33.0");
    expect(applyRuns(createCatalogSnapshot(), runs).deployments.filter((d) => d.evidence === "measured")).toHaveLength(9);
  });
  test("no runs: every catalog configuration of the model is a planning row", () => {
    const plain = variantRows(createCatalogSnapshot(), DATASET, DEFAULT_SLO, { modelId: MODEL });
    expect(plain).toHaveLength(13);
    expect(plain.every((row) => row.variant === null)).toBe(true);
  });
});
