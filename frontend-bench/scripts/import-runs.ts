import { Pool } from "pg";
import { createCatalogSnapshot } from "../src/domain/catalog.js";
import { ValidationError } from "../src/domain/validation.js";
import { loadDatasetMap } from "../src/server/repository.js";
import { describeMatch, METRIC_COLUMNS, metricParams, parseRunsFile, summarizeIdentity, type DatasetMap } from "../src/server/runs.js";

/**
 * Import measured benchmark runs exported by the execution repository.
 *
 *   bun scripts/import-runs.ts <file.json> [--dry-run] [--replace-older] [--dataset-map=<map.json>]
 *
 * --dataset-map renames datasets before matching (a local JSON object of old → new names, e.g. for exports from
 * a bench that uses other dataset names); the map file is not part of this repository.
 *
 * The whole file is validated before anything is written, then imported in ONE transaction: each run upserts
 * its `experiments` row on the seven-column identity and replaces that row's `metrics` (DELETE, then INSERT).
 * The upsert takes the experiment row lock, so concurrent imports of the same cell serialize. A run older than
 * the stored run for the same cell is skipped unless --replace-older is given.
 */
const args = process.argv.slice(2);
const flags = new Set(args.filter((arg) => arg.startsWith("--")));
const files = args.filter((arg) => !arg.startsWith("--"));
const unknown = [...flags].filter((flag) => flag !== "--dry-run" && flag !== "--replace-older" && !flag.startsWith("--dataset-map="));
if (files.length !== 1 || unknown.length) {
  console.error("Usage: bun scripts/import-runs.ts <file.json> [--dry-run] [--replace-older] [--dataset-map=<map.json>]");
  process.exit(2);
}
const dryRun = flags.has("--dry-run");
const replaceOlder = flags.has("--replace-older");
const mapPath = [...flags].find((flag) => flag.startsWith("--dataset-map="))?.slice("--dataset-map=".length);

const file = Bun.file(files[0]!);
if (!await file.exists()) { console.error(`File not found: ${files[0]}`); process.exit(2); }
let runs;
try {
  const datasetMap: DatasetMap = mapPath ? await loadDatasetMap(mapPath) : {};
  runs = parseRunsFile(JSON.parse(await file.text()), datasetMap);
} catch (error) {
  console.error(`Rejected ${files[0]}: ${error instanceof ValidationError || error instanceof SyntaxError ? error.message : String(error)}`);
  process.exit(1);
}

const catalog = createCatalogSnapshot();
for (const run of runs) {
  const match = describeMatch(run.identity, run.configurationId, catalog);
  console.log(`${match.status === "matched" ? "matched  " : "unmatched"}  ${summarizeIdentity(run.identity)} · ${run.metrics.length} levels → ${match.status === "matched" ? match.configurationId : match.reason}`);
}
if (dryRun) { console.log(`Dry run: ${runs.length} run(s) validated, nothing written.`); process.exit(0); }
// Fixture entries ("_test") hold invented values: they may be validated, never written to the bench store.
if (runs.some((run) => run.test)) { console.error(`Rejected ${files[0]}: entries labelled "_test" are TEST fixtures and are never imported into PostgreSQL.`); process.exit(1); }
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required (or pass --dry-run)");

const pool = new Pool({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 5000 });
const client = await pool.connect();
const tally = { inserted: 0, replaced: 0, skipped: 0 };
try {
  await client.query("BEGIN");
  for (const run of runs) {
    const { identity: id } = run;
    // ON CONFLICT ... WHERE: a stale run returns no row and leaves the stored cell untouched.
    const upsert = await client.query<{ id: string; inserted: boolean }>(
      `INSERT INTO experiments AS e (model_name, gpu_type, num_gpus, max_system_replicas, runtime_version, dataset, runtime_config,
         configuration_id, benchmark_tool, run_date, system_config, dataset_config, raw_results)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       ON CONFLICT ON CONSTRAINT experiments_identity_key DO UPDATE SET
         configuration_id = EXCLUDED.configuration_id, benchmark_tool = EXCLUDED.benchmark_tool, run_date = EXCLUDED.run_date,
         system_config = EXCLUDED.system_config, dataset_config = EXCLUDED.dataset_config, raw_results = EXCLUDED.raw_results,
         updated_at = NOW()
       WHERE $14::boolean OR e.run_date <= EXCLUDED.run_date
       RETURNING id::text AS id, (xmax = 0) AS inserted`,
      [id.modelName, id.gpuType, id.numGpus, id.maxSystemReplicas, id.runtimeVersion, id.dataset, JSON.stringify(id.runtimeConfig),
        run.configurationId, run.benchmarkTool, run.runDate, JSON.stringify(run.systemConfig), JSON.stringify(run.datasetConfig),
        run.rawResults === null ? null : JSON.stringify(run.rawResults), replaceOlder]);
    const row = upsert.rows[0];
    if (!row) {
      tally.skipped++;
      console.log(`skipped    ${summarizeIdentity(id)}: the stored run is newer than ${run.runDate} (use --replace-older)`);
      continue;
    }
    const removed = await client.query("DELETE FROM metrics WHERE experiment_id = $1", [row.id]);
    const width = METRIC_COLUMNS.length + 1;
    const values = run.metrics.map((_, index) => `(${Array.from({ length: width }, (_, column) => `$${index * width + column + 1}`).join(", ")})`).join(", ");
    await client.query(`INSERT INTO metrics (experiment_id, ${METRIC_COLUMNS.join(", ")}) VALUES ${values}`, run.metrics.flatMap((metric) => [row.id, ...metricParams(metric)]));
    await client.query("INSERT INTO audit_event (entity_id, action, after_state) VALUES ($1, $2, $3)", [row.id, row.inserted ? "run.imported" : "run.replaced",
      JSON.stringify({ identity: id, configurationId: run.configurationId, benchmarkTool: run.benchmarkTool, runDate: run.runDate, levels: run.metrics.map((m) => m.row.concurrency), replacedLevels: removed.rowCount ?? 0 })]);
    if (row.inserted) tally.inserted++; else tally.replaced++;
  }
  await client.query("COMMIT");
  console.log(`Imported ${files[0]}: ${tally.inserted} new, ${tally.replaced} replaced, ${tally.skipped} skipped (newer stored run).`);
} catch (error) {
  await client.query("ROLLBACK").catch(() => undefined);
  throw error;
} finally { client.release(); await pool.end(); }
