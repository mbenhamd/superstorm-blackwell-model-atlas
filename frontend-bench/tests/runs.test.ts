import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { createCatalogSnapshot } from "../src/domain/catalog.js";
import type { BenchmarkRun, MetricRow } from "../src/domain/types.js";
import {
  canonicalIdentity, describeMatch, identityKey, METRIC_COLUMNS, metricFromDb, metricParams, parseDatasetMap, parseRunImport, parseRunsFile,
  runIdFor, runsFromFile, toBenchmarkRun, upsertRun,
} from "../src/server/runs.js";

// All values below are TEST data. Configuration ids are real entries of src/data/atlas.json.
const catalog = createCatalogSnapshot();
const sample = await Bun.file(join(import.meta.dir, "fixtures/sample-runs.json")).json();
const metric = (concurrency: number, extra: Record<string, unknown> = {}) => ({
  concurrency,
  ttftMs: { mean: 400, p50: 380, p95: 600, p99: null }, itlMs: { mean: 8, p50: 7.5, p95: 10, p99: 12 }, requestLatencyMs: { mean: 4400, p50: 4200, p95: 5600 },
  requestsPerSecond: 1.5, inputTps: 12000, outputTps: 750, totalTps: 12750, outputTpsPerUserP50: null,
  successful: 180, errored: 0, incomplete: 0, durationSeconds: 120, ...extra,
});
const identity = (overrides: Record<string, unknown> = {}) => ({
  modelName: "qwen3.8-27b-fp8", gpuType: "B300", numGpus: 1, maxSystemReplicas: 1, runtimeVersion: "vllm-v0.33.0", dataset: "single-turn-8k",
  runtimeConfig: { kv_cache_dtype: "fp8", max_num_seqs: 256 }, ...overrides,
});
const entry = (overrides: Record<string, unknown> = {}) => ({
  identity: identity(), benchmarkTool: "test-tool", runDate: "2026-11-01T09:00:00Z", metrics: [metric(1), metric(8)], ...overrides,
});

describe("parse", () => {
  test("accepts the TEST fixture file in its { runs } wrapper and as a bare array", () => {
    expect(parseRunsFile(sample)).toHaveLength(3);
    expect(parseRunsFile(sample.runs)).toHaveLength(3);
  });
  test("\"_test\" entries are flagged as TEST fixtures; real entries are not", () => {
    expect(parseRunsFile(sample).every((run) => run.test)).toBe(true);
    expect(parseRunImport(entry()).test).toBe(false);
    expect(parseRunImport(entry({ identity: identity({ runtimeVersion: "vllm-openai-v0.33.0-cu130" }) })).identity.runtimeVersion).toBe("vllm-openai-v0.33.0-cu130");
  });
  test("normalizes runDate to UTC and sorts metrics by concurrency", () => {
    const run = parseRunImport(entry({ runDate: "2026-11-01T10:00:00+01:00", metrics: [metric(8), metric(1)] }));
    expect(run.runDate).toBe("2026-11-01T09:00:00.000Z");
    expect(run.metrics.map((m) => m.row.concurrency)).toEqual([1, 8]);
    expect(parseRunImport(entry({ runDate: "2026-11-01" })).runDate).toBe("2026-11-01T00:00:00.000Z");
  });
  test("missing latency statistics stay null and optional fields default explicitly", () => {
    const run = parseRunImport(entry());
    expect(run.metrics[0]!.row.ttftMs.p99).toBeNull();
    expect(run.metrics[0]!.row.requestLatencyMs.p99).toBeNull();
    expect(run.metrics[0]!.row.outputTpsPerUserP50).toBeNull();
    expect(run.metrics[0]!.goodput).toBeNull();
    expect(run).toMatchObject({ configurationId: null, systemConfig: {}, datasetConfig: {}, rawResults: null });
  });
  test.each([
    ["a local timestamp without offset", { runDate: "2026-11-01T09:00:00" }, "runDate"],
    ["an impossible calendar date", { runDate: "2026-02-30" }, "calendar"],
    ["an empty metrics array", { metrics: [] }, "non-empty"],
    ["a repeated concurrency level", { metrics: [metric(4), metric(4)] }, "more than once"],
    ["a fractional request count", { metrics: [metric(1, { successful: 1.5 })] }, "integer count"],
    ["a negative goodput", { metrics: [metric(1, { goodput: -1 })] }, "goodput"],
    ["a missing throughput (never defaulted to 0)", { metrics: [metric(1, { outputTps: undefined })] }, "outputTps"],
    ["an unknown engine", { identity: identity({ runtimeVersion: "trtllm-v1.0.0" }) }, "runtimeVersion"],
    ["a malformed configurationId", { configurationId: "Not An Id" }, "configurationId"],
    ["a non-object systemConfig", { systemConfig: [1] }, "systemConfig"],
    ["an empty benchmark tool", { benchmarkTool: " " }, "benchmarkTool"],
  ])("rejects %s", (_label, overrides, message) => {
    expect(() => parseRunImport(entry(overrides))).toThrow(message);
  });
  test("file errors name the offending entry and reject duplicate identities", () => {
    expect(() => parseRunsFile([entry(), entry({ metrics: [] })])).toThrow("runs[1]:");
    expect(() => parseRunsFile([entry(), entry({ runDate: "2026-11-05T00:00:00Z" })])).toThrow("runs[1] repeats the identity of runs[0]");
    expect(() => parseRunsFile([])).toThrow("no runs");
    expect(() => parseRunsFile({ runs: "x" })).toThrow("Expected an array");
  });
});

describe("identity", () => {
  test("runtime_config key order does not change the identity (jsonb semantics)", () => {
    const a = identityKey(parseRunImport(entry()).identity);
    const b = identityKey(parseRunImport(entry({ identity: identity({ runtimeConfig: { max_num_seqs: 256, kv_cache_dtype: "fp8" } }) })).identity);
    expect(a).toBe(b);
    expect(runIdFor(identity())).toBe(runIdFor(identity({ runtimeConfig: { max_num_seqs: 256, kv_cache_dtype: "fp8" } })));
    expect(runIdFor(identity())).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-8[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });
  test("each of the seven columns separates cells", () => {
    const base = identityKey(identity());
    for (const change of [{ modelName: "qwen3.8-27b-nvfp4" }, { gpuType: "B200" }, { numGpus: 2 }, { maxSystemReplicas: 2 }, { runtimeVersion: "vllm-v0.33.1" }, { dataset: "chat-8-turn" }, { runtimeConfig: { kv_cache_dtype: "auto", max_num_seqs: 256 } }]) {
      expect(identityKey(identity(change))).not.toBe(base);
    }
  });
  test("runtime_version is stored lowercase, matching the database CHECK", () => {
    expect(canonicalIdentity(identity({ runtimeVersion: "vLLM-v0.33.0-CU130" })).runtimeVersion).toBe("vllm-v0.33.0-cu130");
    expect(identityKey(identity({ runtimeVersion: "VLLM-v0.33.0" }))).toBe(identityKey(identity()));
  });
});

describe("match", () => {
  test("an explicit configurationId wins", () => {
    expect(describeMatch(parseRunImport(entry()).identity, "qwen3.8-27b.fp8.vllm.baseline", catalog)).toEqual({ status: "matched", configurationId: "qwen3.8-27b.fp8.vllm.baseline" });
  });
  test("identity matching resolves a unique artifact × engine × GPU count", () => {
    const run = parseRunImport(entry({ identity: identity({ runtimeVersion: "sglang-v0.5.23" }) }));
    expect(describeMatch(run.identity, null, catalog)).toEqual({ status: "matched", configurationId: "qwen3.8-27b.fp8.sglang.baseline" });
  });
  test("ambiguous identity (vLLM baseline and knob variants) stays unmatched", () => {
    const result = describeMatch(parseRunImport(entry()).identity, null, catalog);
    expect(result.status).toBe("unmatched");
    if (result.status === "unmatched") expect(result.reason).toContain("pass configurationId");
  });
  test("unknown explicit ids and GPU counts outside the catalog stay unmatched", () => {
    expect(describeMatch(parseRunImport(entry()).identity, "qwen3.8-27b.fp8.vllm.nonexistent", catalog).status).toBe("unmatched");
    expect(describeMatch(parseRunImport(entry({ identity: identity({ runtimeVersion: "sglang-v0.5.23", numGpus: 2 }) })).identity, null, catalog).status).toBe("unmatched");
  });
  test("toBenchmarkRun keeps unmatched runs with a null configurationId", () => {
    const run = toBenchmarkRun(parseRunImport(entry()), "id-1", catalog);
    expect(run.configurationId).toBeNull();
    expect(run.metrics.map((m) => m.concurrency)).toEqual([1, 8]);
  });
});

describe("upsert-replace", () => {
  const build = (overrides: Record<string, unknown>, id: string): BenchmarkRun => toBenchmarkRun(parseRunImport(entry({ configurationId: "qwen3.8-27b.fp8.vllm.baseline", ...overrides })), id, catalog);
  test("a new identity inserts", () => {
    const result = upsertRun([], build({}, "a"));
    expect(result).toMatchObject({ outcome: "inserted", id: "a" });
    expect(result.runs).toHaveLength(1);
  });
  test("the same identity replaces the whole metric set and keeps the cell id", () => {
    const first = upsertRun([], build({ metrics: [metric(1), metric(8), metric(64)] }, "a")).runs;
    const result = upsertRun(first, build({ runDate: "2026-11-02T09:00:00Z", metrics: [metric(2), metric(8)] }, "b"));
    expect(result).toMatchObject({ outcome: "replaced", id: "a" });
    expect(result.runs).toHaveLength(1);
    // Level 64 from the earlier run is gone, not merged.
    expect(result.runs[0]!.metrics.map((m) => m.concurrency)).toEqual([2, 8]);
    expect(result.runs[0]!.runDate).toBe("2026-11-02T09:00:00.000Z");
    expect(first[0]!.metrics).toHaveLength(3);
  });
  test("an equal runDate replaces (idempotent re-import); an older one is ignored unless forced", () => {
    const first = upsertRun([], build({}, "a")).runs;
    expect(upsertRun(first, build({ metrics: [metric(4)] }, "b")).outcome).toBe("replaced");
    const stale = upsertRun(first, build({ runDate: "2026-10-01T00:00:00Z", metrics: [metric(4)] }, "b"));
    expect(stale.outcome).toBe("kept-newer");
    expect(stale.runs[0]!.metrics.map((m) => m.concurrency)).toEqual([1, 8]);
    const forced = upsertRun(first, build({ runDate: "2026-10-01T00:00:00Z", metrics: [metric(4)] }, "b"), { replaceOlder: true });
    expect(forced.runs[0]!.metrics.map((m) => m.concurrency)).toEqual([4]);
  });
  test("a changed runtime_config is a new cell", () => {
    const first = upsertRun([], build({}, "a")).runs;
    const result = upsertRun(first, build({ identity: identity({ runtimeConfig: { kv_cache_dtype: "auto", max_num_seqs: 256 } }) }, "b"));
    expect(result.outcome).toBe("inserted");
    expect(result.runs).toHaveLength(2);
  });
  test("runsFromFile assigns deterministic ids", () => {
    const a = runsFromFile(sample, catalog); const b = runsFromFile(sample, catalog);
    expect(a.map((r) => r.id)).toEqual(b.map((r) => r.id));
    expect(new Set(a.map((r) => r.id)).size).toBe(3);
  });
});

describe("database row mapping", () => {
  test("metric params follow the column list and keep nulls", () => {
    const parsed = parseRunImport(entry({ metrics: [metric(1, { goodput: 1.2, rawResults: { tool: "test" } })] })).metrics[0]!;
    const params = metricParams(parsed);
    expect(params).toHaveLength(METRIC_COLUMNS.length);
    const byColumn = Object.fromEntries(METRIC_COLUMNS.map((column, index) => [column, params[index]]));
    expect(JSON.parse(byColumn.ttft_ms as string)).toEqual({ mean: 400, p50: 380, p95: 600, p99: null });
    expect(byColumn.output_tokens_per_second_per_user_p50).toBeNull();
    expect(byColumn.goodput).toBe(1.2);
    expect(JSON.parse(byColumn.raw_results as string)).toEqual({ tool: "test" });
  });
  test("a stored row maps back to the same MetricRow", () => {
    const row: MetricRow = parseRunImport(entry()).metrics[0]!.row;
    const back = metricFromDb({
      concurrency: row.concurrency, ttft_ms: row.ttftMs, itl_ms: row.itlMs, request_latency_ms: row.requestLatencyMs,
      requests_per_second: row.requestsPerSecond, input_tokens_per_second: row.inputTps, output_tokens_per_second: row.outputTps,
      total_tokens_per_second: row.totalTps, output_tokens_per_second_per_user_p50: row.outputTpsPerUserP50,
      successful: row.successful, errored: row.errored, incomplete: row.incomplete, duration_seconds: row.durationSeconds,
    });
    expect(back).toEqual(row);
  });
});

describe("dataset map", () => {
  test("renames datasets before identity checks and matching; unmapped names pass through", () => {
    const map = parseDatasetMap({ "other-bench-prompts": "single-turn-8k" });
    const runs = parseRunsFile([entry({ identity: identity({ dataset: "other-bench-prompts" }) }), entry({ identity: identity({ dataset: "chat-8-turn" }) })], map);
    expect(runs.map((run) => run.identity.dataset)).toEqual(["single-turn-8k", "chat-8-turn"]);
  });
  test("two old names mapped onto one new name collide as a repeated identity", () => {
    const map = parseDatasetMap({ a1: "single-turn-8k", b1: "single-turn-8k" });
    expect(() => parseRunsFile([entry({ identity: identity({ dataset: "a1" }) }), entry({ identity: identity({ dataset: "b1" }) })], map)).toThrow(/repeats the identity/);
  });
  test("rejects malformed maps and ignores prototype keys", () => {
    expect(() => parseDatasetMap(["x"])).toThrow();
    expect(() => parseDatasetMap({ old: "Not A Name" })).toThrow();
    expect(parseRunsFile([entry({ identity: identity({ dataset: "constructor" }) })], {}).at(0)!.identity.dataset).toBe("constructor");
  });
});
