import { Pool } from "pg";
import { ATLAS, createCatalogSnapshot } from "../src/domain/catalog.js";

/**
 * Catalog seed: UPSERT the pinned models from the vendored src/data/atlas.json into `models` and record the
 * atlas commit in `atlas_snapshot`. Idempotent; a re-pinned atlas overwrites stale catalog rows (DO UPDATE),
 * and models no longer in the atlas are removed (experiments have no FK to models, so measured runs are
 * untouched). No experiments, runs or board cards are seeded; measurements come only from import:runs.
 */
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
const { atlas, models, artifacts, configurations } = ATLAS;
const schemaVersion = createCatalogSnapshot().schemaVersion;
const pool = new Pool({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 5000 });
const client = await pool.connect();
try {
  await client.query("BEGIN");
  await client.query(
    `INSERT INTO atlas_snapshot (atlas_commit, as_of, schema_version, imported_from, model_count, artifact_count, configuration_count)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (atlas_commit) DO UPDATE SET as_of = EXCLUDED.as_of, schema_version = EXCLUDED.schema_version,
       imported_from = EXCLUDED.imported_from, model_count = EXCLUDED.model_count, artifact_count = EXCLUDED.artifact_count,
       configuration_count = EXCLUDED.configuration_count, seeded_at = NOW()`,
    [atlas.commit, atlas.asOf, schemaVersion, atlas.importedFrom, models.length, artifacts.length, configurations.length]);
  let inserted = 0; let changed = 0;
  for (const m of models) {
    const result = await client.query<{ inserted: boolean; changed: boolean }>(
      `INSERT INTO models AS t (key, company, name, hf_id, revision, license, layout, architecture, context_tokens, total_params_b,
         active_params_b, baseline_tp, document, as_of, schema_version, atlas_commit)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
       ON CONFLICT (key) DO UPDATE SET company = EXCLUDED.company, name = EXCLUDED.name, hf_id = EXCLUDED.hf_id,
         revision = EXCLUDED.revision, license = EXCLUDED.license, layout = EXCLUDED.layout, architecture = EXCLUDED.architecture,
         context_tokens = EXCLUDED.context_tokens, total_params_b = EXCLUDED.total_params_b, active_params_b = EXCLUDED.active_params_b,
         baseline_tp = EXCLUDED.baseline_tp, document = EXCLUDED.document, as_of = EXCLUDED.as_of,
         schema_version = EXCLUDED.schema_version, atlas_commit = EXCLUDED.atlas_commit,
         updated_at = CASE WHEN t.document IS DISTINCT FROM EXCLUDED.document THEN NOW() ELSE t.updated_at END
       RETURNING (xmax = 0) AS inserted, (updated_at = NOW()) AS changed`,
      [m.id, m.company, m.name, m.hfId, m.revision, m.license, m.layout, m.architecture, m.contextTokens, m.totalParamsB,
        m.activeParamsB, m.baselineTp, JSON.stringify(m), atlas.asOf, schemaVersion, atlas.commit]);
    if (result.rows[0]?.inserted) inserted++; else if (result.rows[0]?.changed) changed++;
  }
  const removed = await client.query("DELETE FROM models WHERE NOT (key = ANY($1::text[]))", [models.map((m) => m.id)]);
  await client.query("COMMIT");
  console.log(`Seeded atlas ${atlas.commit.slice(0, 12)} (as of ${atlas.asOf}): ${models.length} models — ${inserted} inserted, ${changed} updated, ${models.length - inserted - changed} unchanged, ${removed.rowCount ?? 0} removed. No runs or experiments seeded.`);
} catch (error) { await client.query("ROLLBACK").catch(() => undefined); throw error; }
finally { client.release(); await pool.end(); }
