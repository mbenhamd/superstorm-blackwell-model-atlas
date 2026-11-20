import { afterAll, describe, expect, test } from "bun:test";
import { Effect } from "effect";
import { join } from "node:path";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { Pool } from "pg";
import { ATLAS } from "../src/domain/catalog.js";
import { postgresStore } from "../src/server/repository.js";

/**
 * Explicit opt-in only: set TEST_DATABASE_URL to an ISOLATED database on which `db:migrate` and `db:seed` have
 * run. The tests write rows (cleaned up afterwards); the importer must reject the labelled demo. A separate integration case
 * exercises the CLI and SQL round trip using test-only rows in this isolated database.
 */
const url = process.env.TEST_DATABASE_URL;
const suite = url ? describe : describe.skip;
const root = join(import.meta.dir, "..");
const CONFIG = "qwen3.8-27b.fp8.vllm.baseline";

suite("PostgreSQL store", () => {
  const pool = new Pool({ connectionString: url, max: 3 });
  const fixtureModel = "qwen3.8-27b-fp8";
  afterAll(async () => { await pool.end(); });

  const importRuns = async (file: string, ...flags: string[]) => {
    const child = Bun.spawn([process.execPath, "scripts/import-runs.ts", file, ...flags], { cwd: root, env: { ...process.env, DATABASE_URL: url }, stdout: "pipe", stderr: "pipe" });
    const [code, stdout, stderr] = await Promise.all([child.exited, new Response(child.stdout).text(), new Response(child.stderr).text()]);
    return { code, stdout, stderr };
  };

  test("seed recorded the bundled atlas and its model cards", async () => {
    const status = await Effect.runPromise(postgresStore(pool).atlas());
    expect(status.seeded?.commit).toBe(ATLAS.atlas.commit);
    expect(status.inSync).toBe(true);
    const models = await pool.query<{ count: number }>("SELECT COUNT(*)::int AS count FROM models WHERE atlas_commit = $1", [ATLAS.atlas.commit]);
    expect(models.rows[0]?.count).toBe(ATLAS.models.length);
  });

  test("board writes, row locking, version checks and audit records", async () => {
    let id: string | undefined;
    try {
      const store = postgresStore(pool);
      const item = await Effect.runPromise(store.create({ name: "Integration check", deploymentId: CONFIG, priority: "Normal", scheduledDate: "2026-11-09", notes: "Temporary test record", datasets: ["single-turn-8k", "chat-8-turn"], blockedReason: null })); id = item.id;
      const row = await pool.query<{ configuration_id: string; datasets: string[]; slug: string }>("SELECT configuration_id, datasets, slug FROM scheduled_experiments WHERE id = $1", [id]);
      expect(row.rows[0]).toMatchObject({ configuration_id: CONFIG, datasets: ["single-turn-8k", "chat-8-turn"] });
      const result = await Promise.all(["Scheduled", "Scheduled"].map(() => Effect.runPromise(store.move(item.id, "Scheduled", 1).pipe(Effect.map(() => "success"), Effect.catch((e) => Effect.succeed(e._tag))))));
      expect(result.sort()).toEqual(["ConflictError", "success"]);
      const audit = await pool.query<{ count: string }>("SELECT COUNT(*)::text AS count FROM audit_event WHERE entity_id = $1", [id]);
      expect(audit.rows[0]?.count).toBe("2");
      expect((await Effect.runPromise(store.snapshot())).experiments.find((e) => e.id === id)?.version).toBe(2);
      const missing = await Effect.runPromise(store.move("not-a-uuid", "Scheduled", 1).pipe(Effect.map(() => "success"), Effect.catch((e) => Effect.succeed(e._tag))));
      expect(missing).toBe("NotFoundError");
    } finally {
      if (id) { await pool.query("DELETE FROM audit_event WHERE entity_id = $1", [id]); await pool.query("DELETE FROM scheduled_experiments WHERE id = $1", [id]); }
    }
  });

  test("the importer refuses the labelled demo fixture", async () => {
    const result = await importRuns("tests/fixtures/sample-runs.json");
    expect(result.code).toBe(1);
    expect(result.stderr).toContain("TEST fixtures");
  });

  test("imports round-trip through PostgreSQL and conflicting catalog identities stay out of measurements", async () => {
    const dir = await mkdtemp(join(tmpdir(), "bench-pg-import-"));
    const file = join(dir, "integration.json");
    const testId = crypto.randomUUID();
    const entry = {
      identity: { modelName: fixtureModel, gpuType: "B300", numGpus: 1, maxSystemReplicas: 2, runtimeVersion: "vllm-v0.34.0", dataset: "single-turn-8k", runtimeConfig: { integration_test: testId } },
      configurationId: CONFIG, benchmarkTool: "test-fixture-postgres", runDate: "2026-11-19T12:00:00Z", systemConfig: { measuredDeploymentGpus: 2 },
      metrics: [1, 2].map((concurrency) => ({ concurrency, successful: 1, incomplete: 0, errored: 0, totalTps: 2, inputTps: 1, outputTps: 1, requestsPerSecond: 1, durationSeconds: 1 })),
    };
    const other = { ...entry, identity: { ...entry.identity, runtimeVersion: "sglang-v0.5.23" } };
    const read = () => Effect.runPromise(postgresStore(pool).snapshot());
    try {
      await Bun.write(file, JSON.stringify([entry, other]));
      const first = await importRuns(file);
      expect(first.code).toBe(0);
      expect(first.stdout).toContain("2 new, 0 replaced");
      const snapshot = await read();
      const valid = snapshot.runs?.filter((run) => run.identity.runtimeConfig.integration_test === testId);
      expect(valid).toHaveLength(1);
      expect(valid?.[0]).toMatchObject({ configurationId: CONFIG, measuredDeploymentGpus: 2 });
      expect(valid?.[0]?.metrics.map((m) => m.concurrency)).toEqual([1, 2]);
      const records = await pool.query<{ engine: string; engine_version: string }>(
        "SELECT engine, engine_version FROM experiments WHERE runtime_config->>'integration_test' = $1 ORDER BY engine", [testId]);
      expect(records.rows).toEqual([{ engine: "sglang", engine_version: "0.5.23" }, { engine: "vllm", engine_version: "0.34.0" }]);
      expect((await importRuns(file)).stdout).toContain("0 new, 2 replaced");
      await Bun.write(file, JSON.stringify([{ ...entry, runDate: "2026-11-18T00:00:00Z" }]));
      expect((await importRuns(file)).stdout).toContain("1 skipped");
      await Bun.write(file, JSON.stringify([{ ...entry, runDate: "2026-11-20T00:00:00Z", metrics: entry.metrics.slice(0, 1) }]));
      expect((await importRuns(file)).stdout).toContain("0 new, 1 replaced");
      const latest = (await read()).runs?.find((run) => run.id === valid?.[0]?.id);
      expect(latest?.metrics.map((m) => m.concurrency)).toEqual([1]);
    } finally {
      await pool.query("DELETE FROM experiments WHERE runtime_config->>'integration_test' = $1", [testId]);
      await rm(dir, { recursive: true, force: true });
    }
  });

  test("schema CHECKs reject invalid rows", async () => {
    const insert = (runtimeVersion: string, numGpus: number) => pool.query(
      "INSERT INTO experiments (model_name, gpu_type, num_gpus, max_system_replicas, runtime_version, dataset, runtime_config, benchmark_tool, run_date) VALUES ('test-fixture-check', 'B300', $1, 1, $2, 'single-turn-8k', '{}', 'test-fixture', NOW())",
      [numGpus, runtimeVersion]);
    await expect(insert("trtllm-v1.0.0", 1)).rejects.toThrow("check constraint");
    await expect(insert("VLLM-v0.33.0", 1)).rejects.toThrow("check constraint");
    await expect(insert("vllm-v0.33.0", 0)).rejects.toThrow("check constraint");
    const stats = await pool.query<{ ok: boolean; missing: boolean; negative: boolean }>(
      `SELECT bench_latency_stats_valid('{"mean":1,"p50":null,"p95":2,"p99":3}') AS ok,
              bench_latency_stats_valid('{"mean":1,"p50":1,"p95":2}') AS missing,
              bench_latency_stats_valid('{"mean":-1,"p50":1,"p95":2,"p99":3}') AS negative`);
    expect(stats.rows[0]).toEqual({ ok: true, missing: false, negative: false });
  });
});
