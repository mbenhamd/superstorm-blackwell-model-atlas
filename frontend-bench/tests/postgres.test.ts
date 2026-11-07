import { afterAll, describe, expect, test } from "bun:test";
import { Effect } from "effect";
import { join } from "node:path";
import { Pool } from "pg";
import { ATLAS } from "../src/domain/catalog.js";
import { postgresStore } from "../src/server/repository.js";

/**
 * Explicit opt-in only: set TEST_DATABASE_URL to an ISOLATED database on which `db:migrate` and `db:seed` have
 * run. The tests write rows (cleaned up afterwards); the import test runs scripts/import-runs.ts against it with
 * the TEST fixture tests/fixtures/sample-runs.json and deletes those experiments at the end.
 */
const url = process.env.TEST_DATABASE_URL;
const suite = url ? describe : describe.skip;
const root = join(import.meta.dir, "..");
const CONFIG = "qwen3.8-27b.fp8.vllm.baseline";

suite("PostgreSQL store", () => {
  const pool = new Pool({ connectionString: url, max: 3 });
  const fixtureModel = "qwen3.8-27b-fp8";
  const cleanupRuns = () => pool.query("DELETE FROM experiments WHERE benchmark_tool LIKE 'test-fixture%' AND model_name = $1", [fixtureModel]);
  afterAll(async () => { await cleanupRuns(); await pool.end(); });

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
      expect(row.rows[0]).toMatchObject({ configuration_id: CONFIG, datasets: ["single-turn-8k"] });
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

  test("import upserts on identity, replaces metrics, and the snapshot shows measured runs", async () => {
    await cleanupRuns();
    const first = await importRuns("tests/fixtures/sample-runs.json");
    expect(first.code).toBe(0);
    expect(first.stdout).toContain("3 new, 0 replaced");
    expect(first.stdout).toContain(`matched    qwen3.8-27b-fp8 · sglang-v0.5.23`);
    const ids = await pool.query<{ id: string; engine: string; engine_version: string; engine_flavor: string | null }>("SELECT id::text, engine, engine_version, engine_flavor FROM experiments WHERE model_name = $1 AND benchmark_tool LIKE 'test-fixture%' ORDER BY run_date", [fixtureModel]);
    expect(ids.rows.map((r) => [r.engine, r.engine_version, r.engine_flavor])).toEqual([["vllm", "0.33.0", null], ["sglang", "0.5.23", null], ["vllm", "0.33.0", null]]);

    const snapshot = await Effect.runPromise(postgresStore(pool).snapshot());
    const measured = snapshot.deployments.find((d) => d.id === CONFIG)!;
    expect(measured.evidence).toBe("measured");
    expect(measured.points.map((p) => p.concurrency)).toEqual([1, 2, 4, 8, 16, 32, 64, 128]);
    expect(measured.points[0]!.ttftMs.p99).toBeNull();
    expect(snapshot.deployments.some((d) => d.id === `${CONFIG}@chat-8-turn`)).toBe(true);

    // Re-import of the same file: same cells, metrics replaced, ids kept.
    const again = await importRuns("tests/fixtures/sample-runs.json");
    expect(again.stdout).toContain("0 new, 3 replaced");
    const after = await pool.query<{ id: string }>("SELECT id::text FROM experiments WHERE model_name = $1 AND benchmark_tool LIKE 'test-fixture%' ORDER BY run_date", [fixtureModel]);
    expect(after.rows.map((r) => r.id)).toEqual(ids.rows.map((r) => r.id));
    const levels = await pool.query<{ count: number }>("SELECT COUNT(*)::int AS count FROM metrics WHERE experiment_id = ANY($1::uuid[])", [ids.rows.map((r) => r.id)]);
    expect(levels.rows[0]?.count).toBe(8 + 7 + 6);

    // An older run for an existing cell is skipped; a newer one with fewer levels replaces the set.
    const sample = await Bun.file(join(root, "tests/fixtures/sample-runs.json")).json() as { runs: Record<string, unknown>[] };
    const scratch = join(root, "tests/fixtures/.tmp-postgres-runs.json");
    try {
      await Bun.write(scratch, JSON.stringify([{ ...sample.runs[0], runDate: "2026-10-01T00:00:00Z" }]));
      expect((await importRuns(scratch)).stdout).toContain("1 skipped");
      const newer = sample.runs[0] as { metrics: unknown[] };
      await Bun.write(scratch, JSON.stringify([{ ...sample.runs[0], runDate: "2026-11-05T00:00:00Z", metrics: newer.metrics.slice(0, 2) }]));
      expect((await importRuns(scratch)).stdout).toContain("0 new, 1 replaced");
      const vllm = (await Effect.runPromise(postgresStore(pool).snapshot())).deployments.find((d) => d.id === CONFIG)!;
      expect(vllm.points.map((p) => p.concurrency)).toEqual([1, 2]);
    } finally { await Bun.file(scratch).delete().catch(() => undefined); }
    await pool.query("DELETE FROM audit_event WHERE entity_id = ANY($1::text[])", [ids.rows.map((r) => r.id)]);
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
