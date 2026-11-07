import { Pool } from "pg";
import { readdir } from "node:fs/promises";
import { join } from "node:path";

/**
 * Applies every db/NNN_<name>.sql in numeric order, once, in a single transaction under a transaction-scoped
 * advisory lock (concurrent runners serialize). Each applied file's SHA-256 is recorded; an applied file whose
 * contents changed, or that disappeared, stops the run: migrations are append-only.
 */
const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is required. Copy .env.example to .env first.");
const directory = join(import.meta.dir, "../db");
const pattern = /^(\d{3})_[a-z0-9_]+\.sql$/;
const names = (await readdir(directory)).filter((name) => pattern.test(name)).sort();
const numbers = names.map((name) => name.slice(0, 3));
const duplicate = numbers.find((number, index) => numbers.indexOf(number) !== index);
if (duplicate) throw new Error(`Two migrations share number ${duplicate}; renumber the newer one.`);

const pool = new Pool({ connectionString, connectionTimeoutMillis: 5000 });
const client = await pool.connect();
try {
  await client.query("BEGIN");
  await client.query("SELECT pg_advisory_xact_lock(62181001)");
  await client.query("CREATE TABLE IF NOT EXISTS schema_migration (name TEXT PRIMARY KEY, checksum TEXT NOT NULL, applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW())");
  const applied = new Map((await client.query<{ name: string; checksum: string }>("SELECT name, checksum FROM schema_migration")).rows.map((row) => [row.name, row.checksum]));
  const missing = [...applied.keys()].filter((name) => !names.includes(name));
  if (missing.length) throw new Error(`Applied migrations are missing from db/: ${missing.join(", ")}`);
  for (const name of names) {
    const sql = await Bun.file(join(directory, name)).text();
    const checksum = new Bun.CryptoHasher("sha256").update(sql).digest("hex");
    const recorded = applied.get(name);
    if (recorded !== undefined) {
      if (recorded !== checksum) throw new Error(`Applied migration ${name} changed; create a new migration instead of editing it.`);
      console.log(`${name} already applied`);
      continue;
    }
    await client.query(sql);
    await client.query("INSERT INTO schema_migration (name, checksum) VALUES ($1, $2)", [name, checksum]);
    console.log(`Applied ${name}`);
  }
  await client.query("COMMIT");
} catch (error) {
  await client.query("ROLLBACK").catch(() => undefined);
  throw error;
} finally { client.release(); await pool.end(); }
