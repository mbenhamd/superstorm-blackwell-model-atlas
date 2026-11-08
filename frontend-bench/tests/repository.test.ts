import { describe, expect, test } from "bun:test";
import { Effect } from "effect";
import { join } from "node:path";
import { ATLAS, createCatalogSnapshot } from "../src/domain/catalog.js";
import { boardRow, loadRunsFile, makeRepository, memoryStore } from "../src/server/repository.js";

// Real catalog configuration from src/data/atlas.json. The runs file is a labelled TEST fixture.
const CONFIG = "qwen3.8-27b.fp8.vllm.baseline";
const SAMPLE_RUNS = join(import.meta.dir, "fixtures/sample-runs.json");
const input = { name: "Repository test", deploymentId: CONFIG, datasets: ["single-turn-8k"], scheduledDate: "2026-11-09", priority: "Normal" as const, notes: "", blockedReason: null };
const tagOf = <A, E extends { _tag: string }>(effect: Effect.Effect<A, E>) => Effect.runPromise(effect.pipe(Effect.map(() => "unexpected-success"), Effect.catch((e) => Effect.succeed(e._tag))));

describe("memory store without runs (catalog only)", () => {
  test("serves the pinned catalog with no measurements and no board cards", async () => {
    const snapshot = await Effect.runPromise(memoryStore().snapshot());
    expect(snapshot.schemaVersion).toBe(2);
    expect(snapshot.atlasCommit).toBe(ATLAS.atlas.commit);
    expect(snapshot.models).toHaveLength(ATLAS.models.length);
    expect(snapshot.deployments).toHaveLength(ATLAS.configurations.length);
    expect(snapshot.deployments.every((d) => d.points.length === 0 && d.evidence === "reference" && d.runId === null)).toBe(true);
    expect(snapshot.experiments).toEqual([]);
  });
  test("snapshots are detached from storage", async () => {
    const store = memoryStore();
    await Effect.runPromise(store.create(input));
    const first = await Effect.runPromise(store.snapshot());
    first.experiments.length = 0;
    first.deployments[0]!.points.push({} as never);
    const second = await Effect.runPromise(store.snapshot());
    expect(second.experiments).toHaveLength(1);
    expect(second.deployments[0]!.points).toHaveLength(0);
  });
  test("create and legal transition persist; a moved card goes to the top", async () => {
    const store = memoryStore();
    const item = await Effect.runPromise(store.create(input));
    const other = await Effect.runPromise(store.create({ ...input, name: "Second card" }));
    expect(item.status).toBe("Backlog");
    const updated = await Effect.runPromise(store.move(item.id, "Scheduled", item.version));
    expect(updated.version).toBe(2);
    const experiments = (await Effect.runPromise(store.snapshot())).experiments;
    expect(experiments.map((e) => e.id)).toEqual([item.id, other.id]);
    expect(experiments[0]!.status).toBe("Scheduled");
  });
  test("an unknown configuration is a validation error", async () => {
    expect(await tagOf(memoryStore().create({ ...input, deploymentId: "n4-fp8" }))).toBe("ValidationError");
  });
  test("conflict is a typed error rather than a successful write", async () => {
    const store = memoryStore(); const item = await Effect.runPromise(store.create(input));
    await Effect.runPromise(store.move(item.id, "Scheduled", item.version));
    expect(await tagOf(store.move(item.id, "Running", item.version))).toBe("ConflictError");
  });
  test("unknown records produce NotFoundError", async () => {
    expect(await tagOf(memoryStore().move("missing", "Scheduled", 1))).toBe("NotFoundError");
  });
  test("atlas status reports the bundled atlas and no database", async () => {
    const status = await Effect.runPromise(memoryStore().atlas());
    expect(status).toEqual({ bundled: { commit: ATLAS.atlas.commit, asOf: ATLAS.atlas.asOf }, seeded: null, inSync: null });
  });
});

describe("memory store with runs (TEST fixture)", () => {
  test("RUNS_FILE loader validates and resolves configurations", async () => {
    const runs = await loadRunsFile(SAMPLE_RUNS);
    // Fourth entry: SGLang on chat-8-turn with a different recorded max_running_requests (matched by artifact, engine
    // and GPUs). Fifth: an older runtime_version (vllm-v0.32.0) of the same configuration and dataset; the newest run still measures the row.
    // Sixth to twelfth: invented variants on single-turn-8k (a second runtime config of CONFIG, other exports and engines);
    // the last one has no explicit id and is matched by artifact, engine and GPUs.
    expect(runs).toHaveLength(12);
    expect(runs.map((r) => r.configurationId)).toEqual([
      CONFIG, "qwen3.8-27b.fp8.sglang.baseline", CONFIG, "qwen3.8-27b.fp8.sglang.baseline", CONFIG,
      CONFIG, "qwen3.8-27b.bf16.vllm.baseline", "qwen3.8-27b.nvfp4.vllm.baseline", "qwen3.8-27b.nvfp4.vllm.baseline",
      "qwen3.8-27b.nvfp4.sglang.mtp", "qwen3.8-27b.fp8.vllm.v031.fi-fp8-kv", "qwen3.8-27b.bf16.sglang.baseline",
    ]);
    expect(runs.every((r) => r.benchmarkTool.startsWith("test-fixture"))).toBe(true);
  });
  test("measured runs fill the catalog row in place and add a sibling for another dataset", async () => {
    const snapshot = await Effect.runPromise(memoryStore(await loadRunsFile(SAMPLE_RUNS)).snapshot());
    const vllm = snapshot.deployments.find((d) => d.id === CONFIG)!;
    expect(vllm.evidence).toBe("measured");
    expect(vllm.workloadId).toBe("single-turn-8k");
    expect(vllm.points.map((p) => p.concurrency)).toEqual([1, 2, 4, 8, 16, 32, 64, 128]);
    // Missing stays missing: the fixture omits TTFT p99 at concurrency 1.
    expect(vllm.points[0]!.ttftMs.p99).toBeNull();
    // runtime_version is the run's tag; the configured build stays the catalog's engine_release.
    expect(vllm.runtimeTag).toBe("vllm-v0.33.0");
    expect(vllm.runGpus).toBe(1);
    expect(vllm.replicas).toBe(1);
    expect(vllm.topologyMismatch).toBe(vllm.gpus !== 1);
    expect(snapshot.testData).toBe(true);
    const sglang = snapshot.deployments.find((d) => d.id === "qwen3.8-27b.fp8.sglang.baseline")!;
    expect(sglang.points).toHaveLength(7);
    const sibling = snapshot.deployments.find((d) => d.id === `${CONFIG}@chat-8-turn`)!;
    expect(sibling.configurationId).toBe(CONFIG);
    expect(sibling.workloadId).toBe("chat-8-turn");
    // Two siblings on chat-8-turn: the vLLM and SGLang fp8 baselines.
    expect(snapshot.deployments).toHaveLength(ATLAS.configurations.length + 2);
    // Seven configurations measured in place on single-turn-8k plus the two chat-8-turn siblings; others stay reference-only.
    expect(snapshot.deployments.filter((d) => d.evidence === "measured")).toHaveLength(9);
  });
  test("a measured sibling plans its base configuration on the sibling's dataset", async () => {
    const store = memoryStore(await loadRunsFile(SAMPLE_RUNS));
    const { datasets: _omitted, ...withoutDatasets } = input;
    const item = await Effect.runPromise(store.create({ ...withoutDatasets, deploymentId: `${CONFIG}@chat-8-turn` } as typeof input));
    expect(item.deploymentId).toBe(CONFIG);
    expect(item.datasets).toEqual(["chat-8-turn"]);
  });
  test("an invalid runs file is rejected, not partially loaded", async () => {
    const path = join(import.meta.dir, "fixtures/does-not-exist.json");
    await expect(loadRunsFile(path)).rejects.toThrow("RUNS_FILE not found");
  });
  test("makeRepository reports mode and data kind", () => {
    expect(makeRepository(undefined)).toMatchObject({ mode: "memory", kind: "catalog-only" });
    expect(makeRepository(undefined, [])).toMatchObject({ mode: "memory", kind: "runs-file" });
    expect(() => makeRepository("postgres://unused", [])).toThrow("RUNS_FILE is for memory mode");
  });
});

describe("board row mapping (scheduled_experiments)", () => {
  const experiment = { id: "0f8a1c2e-1111-4222-8333-444455556666", name: "Qwen FP8 — vLLM sweep (été)", deploymentId: CONFIG, datasets: ["single-turn-8k", "coding-agent-48-turn"], status: "Backlog" as const, priority: "High" as const, scheduledDate: "2026-11-09", owner: "AI Engineering", notes: "", blockedReason: null, version: 1, createdAt: "2026-11-07T00:00:00.000Z" };
  test("derives configuration, datasets, slug, start time and planning columns", () => {
    const snapshot = createCatalogSnapshot();
    expect(boardRow(experiment, snapshot)).toEqual({ slug: "qwen-fp8-vllm-sweep-ete-0f8a1c2e", configurationId: CONFIG, datasets: ["single-turn-8k", "coding-agent-48-turn"], scheduledStartAt: "2026-11-09T00:00:00Z", gpuFootprint: 1, blocked: false, blockedReason: null });
  });
  test("gpu_footprint is the configuration's GPU count, not GPUs × in-engine DP", () => {
    const snapshot = createCatalogSnapshot();
    const ep8 = snapshot.deployments.find((d) => d.id === "deepseek-v4-flash-0731.native.vllm.ep8")!;
    expect(ep8.dataParallel).toBe(8);
    expect(boardRow({ ...experiment, deploymentId: ep8.id }, snapshot).gpuFootprint).toBe(8);
  });
  test("a blocked card writes blocked = true with its reason", () => {
    const row = boardRow({ ...experiment, blockedReason: "GPU budget" }, createCatalogSnapshot());
    expect([row.blocked, row.blockedReason]).toEqual([true, "GPU budget"]);
  });
  test("memory store keeps the requested datasets in bench order", async () => {
    const store = memoryStore();
    const item = await Effect.runPromise(store.create({ ...input, datasets: ["coding-agent-48-turn", "single-turn-8k"] }));
    expect(item.datasets).toEqual(["single-turn-8k", "coding-agent-48-turn"]);
    expect(item.deploymentId).toBe(CONFIG);
  });
});
