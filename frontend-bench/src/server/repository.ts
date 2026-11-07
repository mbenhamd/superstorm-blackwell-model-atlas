import { Context, Effect, Layer } from "effect";
import { Pool, type PoolClient } from "pg";
import { applyRuns, ATLAS, createCatalogSnapshot, matchConfiguration } from "../domain/catalog.js";
import type { BenchmarkRun, Experiment, ExperimentInput, ExperimentStatus, RunIdentity, Snapshot } from "../domain/types.js";
import { ConflictError, gpuFootprint, migrateExperiment, parseExperiment, transitionExperiment, ValidationError } from "../domain/validation.js";
import { metricFromDb, parseDatasetMap, runsFromFile, type DatasetMap, type MetricDbRow } from "./runs.js";

export class RepositoryError extends Error {
  readonly _tag = "RepositoryError";
  constructor(readonly cause: unknown) { super("The benchmark store is unavailable"); }
}
export class NotFoundError extends Error { readonly _tag = "NotFoundError"; }
export type StoreError = RepositoryError | NotFoundError | ValidationError | ConflictError;

/** Bundled atlas versus the atlas the database catalog was seeded from (`atlas_snapshot`). */
export interface AtlasStatus {
  bundled: { commit: string; asOf: string };
  seeded: { commit: string; asOf: string; seededAt: string; models: number } | null;
  /** null when there is no database to compare with (memory mode). */
  inSync: boolean | null;
}
export interface BenchmarkStore {
  readonly snapshot: () => Effect.Effect<Snapshot, StoreError>;
  readonly create: (input: ExperimentInput) => Effect.Effect<Experiment, StoreError>;
  readonly move: (id: string, status: ExperimentStatus, version: number) => Effect.Effect<Experiment, StoreError>;
  readonly atlas: () => Effect.Effect<AtlasStatus, StoreError>;
}
/** Effect v4 service; no v3 Context.Tag or obsolete Effect.Service helpers. */
export class Repository extends Context.Service<Repository, BenchmarkStore>()("BenchConsole/Repository") {}
const storeError = (cause: unknown): StoreError => cause instanceof ValidationError || cause instanceof ConflictError || cause instanceof NotFoundError ? cause : new RepositoryError(cause);
const tryStore = <A>(operation: () => Promise<A>): Effect.Effect<A, StoreError> => Effect.tryPromise({ try: operation, catch: storeError });
const bundled = { commit: ATLAS.atlas.commit, asOf: ATLAS.atlas.asOf };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function record(input: ExperimentInput): Experiment {
  return { ...input, id: crypto.randomUUID(), status: "Backlog", owner: "AI Engineering", version: 1, createdAt: new Date().toISOString() };
}

/** Relational columns of a `scheduled_experiments` row derived from the board document. */
export function boardRow(experiment: Experiment, snapshot: Snapshot): { slug: string; configurationId: string; datasets: string[]; scheduledStartAt: string; gpuFootprint: number | null; blocked: boolean; blockedReason: string | null } {
  const deployment = snapshot.deployments.find((d) => d.id === experiment.deploymentId);
  const configurationId = deployment?.configurationId ?? experiment.deploymentId.split("@")[0]!;
  const base = experiment.name.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60).replace(/-+$/, "");
  return {
    // Readable and unique: name slug plus the first 8 hex digits of the random id.
    slug: `${base || "experiment"}-${experiment.id.replaceAll("-", "").slice(0, 8).toLowerCase()}`,
    configurationId,
    datasets: experiment.datasets?.length ? [...experiment.datasets] : [deployment?.workloadId ?? experiment.deploymentId.split("@")[1] ?? snapshot.workloads[0]!.id],
    // The board records a calendar date; it is stored as 00:00 UTC of that date.
    scheduledStartAt: `${experiment.scheduledDate}T00:00:00Z`,
    // GPUs reserved per dataset run (TP × in-engine DP); null only when the configuration is unknown.
    gpuFootprint: deployment ? gpuFootprint(deployment) : null,
    blocked: Boolean(experiment.blockedReason),
    blockedReason: experiment.blockedReason ?? null,
  };
}

/**
 * Process-local store. The catalog comes from the bundled atlas; measurements only from `runs`
 * (validated runs, e.g. from RUNS_FILE). Board edits live until the process exits.
 */
export function memoryStore(runs: readonly BenchmarkRun[] = [], initial: Snapshot = createCatalogSnapshot()): BenchmarkStore {
  const state = structuredClone(initial);
  const measured = structuredClone([...runs]);
  const view = (): Snapshot => structuredClone(applyRuns(state, measured));
  return {
    snapshot: () => Effect.sync(view),
    create: (input) => Effect.try({ try: () => {
      const item = record(parseExperiment(input, view()));
      state.experiments.unshift(item);
      return structuredClone(item);
    }, catch: storeError }),
    move: (id, status, version) => Effect.try({ try: () => {
      const index = state.experiments.findIndex((item) => item.id === id);
      const previous = state.experiments[index];
      if (!previous) throw new NotFoundError("Experiment not found");
      const updated = transitionExperiment(previous, status, version);
      // A moved card goes to the top of its new column, as in the Postgres store.
      state.experiments.splice(index, 1);
      state.experiments.unshift(updated);
      return structuredClone(updated);
    }, catch: storeError }),
    atlas: () => Effect.succeed({ bundled, seeded: null, inSync: null }),
  };
}

/** Read and validate a runs file (same format as scripts/import-runs.ts) for the memory store. */
export async function loadRunsFile(path: string, catalog: Snapshot = createCatalogSnapshot(), datasetMapPath = process.env.DATASET_MAP || undefined): Promise<BenchmarkRun[]> {
  const file = Bun.file(path);
  if (!await file.exists()) throw new ValidationError(`RUNS_FILE not found: ${path}`);
  let parsed: unknown;
  try { parsed = JSON.parse(await file.text()); } catch (error) { throw new ValidationError(`RUNS_FILE is not valid JSON: ${(error as Error).message}`); }
  return runsFromFile(parsed, catalog, datasetMapPath ? await loadDatasetMap(datasetMapPath) : {});
}

/** Read a local old → new dataset name map (DATASET_MAP or --dataset-map). */
export async function loadDatasetMap(path: string): Promise<DatasetMap> {
  const file = Bun.file(path);
  if (!await file.exists()) throw new ValidationError(`Dataset map not found: ${path}`);
  try { return parseDatasetMap(JSON.parse(await file.text())); } catch (error) {
    if (error instanceof ValidationError) throw error;
    throw new ValidationError(`Dataset map is not valid JSON: ${(error as Error).message}`);
  }
}

async function transaction<A>(pool: Pool, operation: (client: PoolClient) => Promise<A>, readOnly = false): Promise<A> {
  const client = await pool.connect();
  try {
    await client.query(readOnly ? "BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY" : "BEGIN");
    const result = await operation(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally { client.release(); }
}

interface ExperimentDbRow {
  id: string; model_name: string; gpu_type: string; num_gpus: number; max_system_replicas: number; runtime_version: string;
  dataset: string; runtime_config: Record<string, unknown>; configuration_id: string | null; benchmark_tool: string; run_date: Date;
}
/** Measured runs: experiments + metrics (raw_results columns are never read here). */
async function readRuns(client: PoolClient, catalog: Snapshot): Promise<BenchmarkRun[]> {
  const experiments = await client.query<ExperimentDbRow>(
    "SELECT id::text AS id, model_name, gpu_type, num_gpus, max_system_replicas, runtime_version, dataset, runtime_config, configuration_id, benchmark_tool, run_date FROM experiments ORDER BY run_date DESC, id");
  const metrics = await client.query<MetricDbRow & { experiment_id: string }>(
    "SELECT experiment_id::text AS experiment_id, concurrency, ttft_ms, itl_ms, request_latency_ms, requests_per_second, input_tokens_per_second, output_tokens_per_second, total_tokens_per_second, output_tokens_per_second_per_user_p50, successful, errored, incomplete, duration_seconds FROM metrics ORDER BY experiment_id, concurrency");
  const byExperiment = new Map<string, MetricDbRow[]>();
  for (const row of metrics.rows) {
    const list = byExperiment.get(row.experiment_id) ?? [];
    list.push(row);
    byExperiment.set(row.experiment_id, list);
  }
  return experiments.rows.map((row) => {
    const identity: RunIdentity = {
      modelName: row.model_name, gpuType: row.gpu_type, numGpus: row.num_gpus, maxSystemReplicas: row.max_system_replicas,
      runtimeVersion: row.runtime_version, dataset: row.dataset, runtimeConfig: row.runtime_config,
    };
    return {
      id: row.id, identity, configurationId: matchConfiguration(identity, catalog, row.configuration_id),
      benchmarkTool: row.benchmark_tool, runDate: row.run_date.toISOString(), metrics: (byExperiment.get(row.id) ?? []).map(metricFromDb),
    };
  });
}

async function readSnapshot(client: PoolClient): Promise<Snapshot> {
  // Table names are static. All user-supplied values are parameterized in the writers below.
  const experiments = await client.query<{ document: Experiment }>("SELECT document FROM scheduled_experiments ORDER BY position DESC, created_at DESC, id");
  // Documents written before datasets/blockedReason existed are upgraded on read (the row is not rewritten).
  const catalog = createCatalogSnapshot();
  catalog.experiments = experiments.rows.map((row) => migrateExperiment(row.document, catalog) ?? row.document);
  return applyRuns(catalog, await readRuns(client, catalog));
}

const NEXT_POSITION = "(SELECT COALESCE(MAX(position) + 1, 0) FROM scheduled_experiments WHERE status = $3)";
export function postgresStore(pool: Pool): BenchmarkStore {
  return {
    snapshot: () => tryStore(() => transaction(pool, readSnapshot, true)),
    create: (input) => tryStore(() => transaction(pool, async (client) => {
      const state = await readSnapshot(client);
      const item = record(parseExperiment(input, state));
      const row = boardRow(item, state);
      await client.query(
        // Planning columns only. Execution columns from 003 (execution_state, timestamps, scheduler_run_id,
        // code_commit, error_note, cancel_requested, manifest_path) belong to the scheduler and stay NULL/default.
        `INSERT INTO scheduled_experiments (id, slug, status, position, configuration_id, datasets, scheduled_start_at, gpu_footprint, blocked, blocked_reason, version, document, created_at, updated_at)
         VALUES ($1, $2, $3, ${NEXT_POSITION}, $4, $5, $6, $10, $11, $12, $7, $8, $9, $9)`,
        [item.id, row.slug, item.status, row.configurationId, row.datasets, row.scheduledStartAt, item.version, JSON.stringify(item), item.createdAt, row.gpuFootprint, row.blocked, row.blockedReason]);
      await client.query("INSERT INTO audit_event (entity_id, action, after_state) VALUES ($1, $2, $3)", [item.id, "experiment.created", JSON.stringify(item)]);
      return item;
    })),
    move: (id, status, version) => tryStore(() => transaction(pool, async (client) => {
      if (!UUID.test(id)) throw new NotFoundError("Experiment not found");
      const result = await client.query<{ document: Experiment }>("SELECT document FROM scheduled_experiments WHERE id = $1 FOR UPDATE", [id]);
      const stored = result.rows[0]?.document;
      if (!stored) throw new NotFoundError("Experiment not found");
      const previous = migrateExperiment(stored, createCatalogSnapshot()) ?? stored;
      const updated = transitionExperiment(previous, status, version);
      const update = await client.query(
        `UPDATE scheduled_experiments SET status = $3, version = $4, document = $5, position = ${NEXT_POSITION}, updated_at = NOW() WHERE id = $1 AND version = $2`,
        [id, version, status, updated.version, JSON.stringify(updated)]);
      if (update.rowCount !== 1) throw new ConflictError("The experiment was changed by another writer");
      await client.query("INSERT INTO audit_event (entity_id, action, before_state, after_state) VALUES ($1, $2, $3, $4)", [id, "experiment.moved", JSON.stringify(previous), JSON.stringify(updated)]);
      return updated;
    })),
    atlas: () => tryStore(async () => {
      const result = await pool.query<{ atlas_commit: string; as_of: string; seeded_at: Date; model_count: number }>(
        "SELECT atlas_commit, as_of::text AS as_of, seeded_at, model_count FROM atlas_snapshot ORDER BY seeded_at DESC LIMIT 1");
      const row = result.rows[0];
      const seeded = row ? { commit: row.atlas_commit, asOf: row.as_of, seededAt: row.seeded_at.toISOString(), models: row.model_count } : null;
      return { bundled, seeded, inSync: seeded ? seeded.commit === bundled.commit : false };
    }),
  };
}

/** Where measurements come from: none (catalog only), a validated RUNS_FILE, or PostgreSQL. */
export type DataKind = "catalog-only" | "runs-file" | "postgres";
export function makeRepository(databaseUrl: string | undefined, runs?: readonly BenchmarkRun[]): { layer: Layer.Layer<Repository>; mode: "memory" | "postgres"; kind: DataKind; close: () => Promise<void> } {
  if (!databaseUrl) return { layer: Layer.succeed(Repository, memoryStore(runs ?? [])), mode: "memory", kind: runs ? "runs-file" : "catalog-only", close: async () => undefined };
  if (runs) throw new Error("RUNS_FILE is for memory mode; with DATABASE_URL import runs with bun run import:runs");
  const pool = new Pool({ connectionString: databaseUrl, max: 6, connectionTimeoutMillis: 5000, idleTimeoutMillis: 30000, query_timeout: 10000, application_name: "bench-console" });
  pool.on("error", (error) => console.error("PostgreSQL pool error", error));
  return { layer: Layer.succeed(Repository, postgresStore(pool)), mode: "postgres", kind: "postgres", close: () => pool.end() };
}
