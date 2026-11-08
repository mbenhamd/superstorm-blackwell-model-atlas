/**
 * TL;DR helpers against the TEST fixture (invented values, not measurements): variant facets used by the ladder
 * filters and the export × engine matrix, sibling-variant labels, standings over variant rows (Δ vs best never
 * re-elected by filters), and the published (external) headline, which never enters a ranking.
 */
import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { Effect } from "effect";
import { DEFAULT_SLO } from "../src/domain/metrics.ts";
import { setupStandings } from "../src/domain/setups.ts";
import { variantRows } from "../src/domain/variants.ts";
import type { Snapshot } from "../src/domain/types.ts";
import { loadRunsFile, memoryStore } from "../src/server/repository.ts";
import { distinctChips, knobString, specDecodeOf, variantName } from "../src/client/components/app/tldr-data.ts";
import { headline } from "../src/client/components/app/tldr-published.tsx";
import { externalDataset } from "../src/client/lib/external.ts";

const runs = await loadRunsFile(join(import.meta.dir, "fixtures/sample-runs.json"));
const snapshot: Snapshot = await Effect.runPromise(memoryStore(runs).snapshot());
const rows = variantRows(snapshot, "single-turn-8k", DEFAULT_SLO, { modelId: "qwen3.8-27b", runs: runs.filter((run) => run.identity.dataset === "single-turn-8k") });
const FP8_VLLM = "qwen3.8-27b.fp8.vllm.baseline";

describe("TL;DR variant rows (TEST fixture)", () => {
  test("8 measured variants and 6 planning rows; two variants of the FP8 vLLM baseline are told apart by their knobs", () => {
    expect(rows.filter((row) => row.variant)).toHaveLength(8);
    expect(rows.filter((row) => !row.variant)).toHaveLength(6);
    const fp8 = rows.filter((row) => row.deployment.id === FP8_VLLM);
    expect(fp8).toHaveLength(2);
    const prefix = fp8.find((row) => row.variant!.runtimeConfig.enable_prefix_caching === true)!;
    expect(distinctChips(prefix, rows)).toEqual(["seqs 512", "prefix cache on"]);
    expect(variantName(prefix, rows)).toBe("FP8 · Baseline · vLLM · seqs 512 · prefix cache on");
    // A configuration with one row keeps its plain setup name.
    const sglang = rows.find((row) => row.deployment.id === "qwen3.8-27b.fp8.sglang.baseline")!;
    expect(distinctChips(sglang, rows)).toEqual([]);
    expect(knobString(prefix)).toBe("kv fp8 · seqs 512 · prefix cache on · fixture=TEST");
  });

  test("speculative decoding is read from the recorded runtime_config (measured) or the configured arguments (planning)", () => {
    const mtp = rows.find((row) => row.deployment.id === "qwen3.8-27b.nvfp4.sglang.mtp")!;
    expect(mtp.variant).not.toBeNull();
    expect(specDecodeOf(mtp.deployment)).toBe(true);
    expect(specDecodeOf(rows.find((row) => row.deployment.id === FP8_VLLM)!.deployment)).toBe(false);
    for (const row of rows.filter((item) => !item.variant)) expect(row.deployment.runConfig).toBeNull();
  });

  test("standings rank every setup by sustainable tok/min/GPU, highest first, with Δ vs the best", () => {
    const entries = setupStandings(rows);
    expect(entries[0]!.standing.kind).toBe("best");
    expect(entries[0]!.row.deployment.id).toBe(FP8_VLLM);
    const values = entries.filter((entry) => entry.position !== null).map((entry) => entry.row.capacity.sustainableTpmPerGpu!);
    expect(values).toEqual([...values].sort((a, b) => b - a));
    const fp8 = entries.find((entry) => entry.row.deployment.id === "qwen3.8-27b.fp8.sglang.baseline")!;
    expect(fp8.standing.kind).toBe("behind");
    expect(fp8.standing.kind === "behind" && fp8.standing.fraction).toBeCloseTo(-0.0385, 3);
    // Unmeasured planning rows come last.
    const firstUnmeasured = entries.findIndex((entry) => entry.standing.kind === "unmeasured");
    expect(entries.slice(firstUnmeasured).every((entry) => entry.standing.kind === "unmeasured")).toBe(true);
  });
});

describe("TL;DR published headline (external, never ranked)", () => {
  test("headline prefers per-GPU output, keeps the source's metric name, and returns null without a rate", () => {
    const records = externalDataset().records;
    const withOutput = records.find((record) => record.metrics.some((metric) => metric.kind === "output-per-gpu"))!;
    const top = headline(withOutput)!;
    expect(top.metric.kind).toBe("output-per-gpu");
    const index = withOutput.metrics.indexOf(top.metric);
    const values = withOutput.levels.filter((level) => !level.details[index]?.qualifier).map((level) => level.values[index]).filter((value): value is number => typeof value === "number");
    expect(top.value).toBe(Math.max(...values));
    const latencyOnly = records.find((record) => record.metrics.every((metric) => ["ttft", "tpot", "itl", "e2e", "other"].includes(metric.kind)));
    if (latencyOnly) expect(headline(latencyOnly)).toBeNull();
    // Exact catalog matches feed only the published sub-rows; no variant row carries external evidence.
    expect(rows.some((row) => (row.deployment.evidence as string) === "external")).toBe(false);
  });
});
