-- 002: benchmark storage (experiments × metrics, one experiments row per seven-column run identity), the pinned
-- model catalog (models + atlas_snapshot) and the planning board (scheduled_experiments).
--
-- Tables from 001 (model_family, hardware_profile, workload, deployment, experiment) are LEFT IN PLACE AND
-- UNUSED. Their rows are synthetic fixtures whose deployment ids (e.g. "n4-fp8") do not exist in the pinned
-- atlas catalog, so copying `experiment` rows into scheduled_experiments would create board cards that point
-- at configurations the console cannot resolve. They are not dropped because migrations are append-only and a
-- drop is irreversible; a later migration may drop them once no deployment depends on them.
-- audit_event from 001 is kept and reused for board transitions and run imports.
--
-- Naming: 002 uses plural `experiments`; 001's singular `experiment` is a different, retired table.

-- ---------------------------------------------------------------------------------------------------------
-- Shared validators. CHECK constraints may only call IMMUTABLE functions; both functions are pure.
-- ---------------------------------------------------------------------------------------------------------

-- A latency distribution as stored in metrics: exactly the keys mean/p50/p95/p99, each a nonnegative number
-- or JSON null. All four keys are required so "missing" is an explicit null and never an absent key that a
-- reader could default to 0. CASE guards the numeric cast because SQL does not guarantee AND evaluation order.
CREATE FUNCTION bench_latency_stats_valid(stats JSONB) RETURNS BOOLEAN
LANGUAGE sql IMMUTABLE STRICT PARALLEL SAFE AS $$
  SELECT jsonb_typeof(stats) = 'object'
    AND stats ?& ARRAY['mean', 'p50', 'p95', 'p99']
    AND (stats - ARRAY['mean', 'p50', 'p95', 'p99']) = '{}'::jsonb
    AND bool_and(
      CASE jsonb_typeof(stats -> key)
        WHEN 'null' THEN TRUE
        WHEN 'number' THEN (stats ->> key)::double precision >= 0
        ELSE FALSE
      END)
  FROM unnest(ARRAY['mean', 'p50', 'p95', 'p99']) AS key
$$;

-- ---------------------------------------------------------------------------------------------------------
-- Catalog: which atlas the database was seeded from, and one row per pinned model card.
-- ---------------------------------------------------------------------------------------------------------

-- One row per atlas commit ever seeded; the most recent seeded_at is the current catalog. Keeping history
-- (instead of a singleton row) shows when the catalog was re-pinned relative to imported runs.
CREATE TABLE atlas_snapshot (
  atlas_commit TEXT PRIMARY KEY CHECK (atlas_commit ~ '^[0-9a-f]{40}$'),
  as_of DATE NOT NULL,
  -- Console catalog record format (Snapshot.schemaVersion), so a reader can reject documents it cannot parse.
  schema_version INTEGER NOT NULL CHECK (schema_version > 0),
  imported_from TEXT NOT NULL,
  model_count INTEGER NOT NULL CHECK (model_count >= 0),
  artifact_count INTEGER NOT NULL CHECK (artifact_count >= 0),
  configuration_count INTEGER NOT NULL CHECK (configuration_count >= 0),
  seeded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX atlas_snapshot_seeded_idx ON atlas_snapshot (seeded_at DESC);

-- Loaded only from the vendored src/data/atlas.json by scripts/seed.ts, never from Hugging Face at runtime.
-- experiments has no FK here: a run is valid evidence even when its weights are not (yet) in the catalog, and
-- re-pinning the atlas must not cascade into measured data. The card is a display/catalog join.
CREATE TABLE models (
  key TEXT PRIMARY KEY CHECK (key ~ '^[a-z0-9][a-z0-9._-]*$'),
  company TEXT NOT NULL CHECK (company <> ''),
  name TEXT NOT NULL CHECK (name <> ''),
  hf_id TEXT NOT NULL CHECK (hf_id ~ '^[A-Za-z0-9._-]+/[A-Za-z0-9._-]+$'),
  -- Immutable Hugging Face commit; a branch name such as "main" is not a pin.
  revision TEXT NOT NULL CHECK (revision ~ '^[0-9a-f]{40}$'),
  license TEXT NOT NULL,
  layout TEXT NOT NULL,
  architecture TEXT NOT NULL CHECK (architecture IN ('Dense', 'MoE')),
  context_tokens INTEGER NOT NULL CHECK (context_tokens > 0),
  -- Billions of parameters. NULL when the atlas has not established the count (never borrowed from a sibling).
  total_params_b DOUBLE PRECISION CHECK (total_params_b > 0),
  active_params_b DOUBLE PRECISION CHECK (active_params_b > 0 AND (total_params_b IS NULL OR active_params_b <= total_params_b)),
  baseline_tp INTEGER NOT NULL CHECK (baseline_tp > 0),
  -- Full atlas model record, so new atlas fields reach the console without a migration.
  document JSONB NOT NULL CHECK (jsonb_typeof(document) = 'object' AND document ->> 'id' = key),
  as_of DATE NOT NULL,
  schema_version INTEGER NOT NULL CHECK (schema_version > 0),
  atlas_commit TEXT NOT NULL REFERENCES atlas_snapshot (atlas_commit),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------------------------------------
-- Measured runs: one experiments row per seven-column identity, one metrics row per concurrency level.
-- ---------------------------------------------------------------------------------------------------------

CREATE TABLE experiments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Seven-column identity (RunIdentity). Patterns mirror parseIdentity in src/domain/catalog.ts.
  model_name TEXT NOT NULL CHECK (model_name ~ '^[a-z0-9][a-z0-9._-]{1,120}$'),
  gpu_type TEXT NOT NULL CHECK (gpu_type ~ '^[A-Za-z0-9 ._-]{2,40}$'),
  num_gpus INTEGER NOT NULL CHECK (num_gpus > 0),
  max_system_replicas INTEGER NOT NULL CHECK (max_system_replicas > 0),
  -- "<engine>-v<major>.<minor>.<patch>[rcN][-<flavor>]", lowercase. The importer lowercases before writing,
  -- so "vLLM-v0.33.0" and "vllm-v0.33.0" cannot become two identities for one build.
  runtime_version TEXT NOT NULL
    CHECK (runtime_version ~ '^(vllm|sglang)-v[0-9]+\.[0-9]+\.[0-9]+(rc[0-9]+)?(-[a-z0-9._-]+)?$'),
  -- Stored split of runtime_version for filtering and grouping without re-parsing in every query.
  engine TEXT GENERATED ALWAYS AS ((regexp_match(runtime_version, '^(vllm|sglang)-v'))[1]) STORED,
  engine_version TEXT GENERATED ALWAYS AS
    ((regexp_match(runtime_version, '^[a-z]+-v([0-9]+\.[0-9]+\.[0-9]+(?:rc[0-9]+)?)'))[1]) STORED,
  engine_flavor TEXT GENERATED ALWAYS AS
    ((regexp_match(runtime_version, '^[a-z]+-v[0-9]+\.[0-9]+\.[0-9]+(?:rc[0-9]+)?-(.+)$'))[1]) STORED,
  dataset TEXT NOT NULL CHECK (dataset ~ '^[a-z0-9][a-z0-9._-]{1,80}$'),
  -- Canonicalization: jsonb stores objects with deduplicated, sorted keys, so jsonb equality (and therefore
  -- the identity) is independent of key order and whitespace in the source file. Caveat: jsonb compares
  -- numbers by value (1.0 = 1) while the hash below hashes the stored text form ("1.0" ≠ "1"); the importer
  -- writes JSON.stringify output, which always prints the shortest form, so imported rows hash consistently.
  runtime_config JSONB NOT NULL CHECK (jsonb_typeof(runtime_config) = 'object'),
  -- Needed for the UNIQUE index: a B-tree entry is limited to ~2.7 kB, and a runtime_config carrying engine
  -- arguments plus request-body amendments can exceed it, which would make INSERT fail on index build rather
  -- than on validation. A 32-byte SHA-256 of the binary jsonb form keeps the key small. sha256(jsonb_send())
  -- is IMMUTABLE (md5 is avoided because FIPS-mode builds reject it).
  runtime_config_hash BYTEA GENERATED ALWAYS AS (sha256(jsonb_send(runtime_config))) STORED,
  -- Explicit atlas configuration id supplied at import. Not part of the identity, not a FK (the catalog lives
  -- in the bundled atlas). NULL means the console resolves the configuration by identity matching at read time.
  configuration_id TEXT CHECK (configuration_id ~ '^[a-z0-9][a-z0-9._@-]{1,200}$'),
  benchmark_tool TEXT NOT NULL CHECK (length(benchmark_tool) BETWEEN 1 AND 120),
  run_date TIMESTAMPTZ NOT NULL,
  system_config JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(system_config) = 'object'),
  dataset_config JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(dataset_config) = 'object'),
  -- Run-level tool report (e.g. the whole GuideLLM output). Kept at run level so a report that
  -- is not per-concurrency is not duplicated into every metrics row. Never read by the snapshot query.
  raw_results JSONB CHECK (jsonb_typeof(raw_results) IN ('object', 'array')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT experiments_identity_key UNIQUE
    (model_name, gpu_type, num_gpus, max_system_replicas, runtime_version, dataset, runtime_config_hash)
);
-- Per-model/dataset listing, newest first (run pages, "latest run for this cell").
CREATE INDEX experiments_model_dataset_date_idx ON experiments (model_name, dataset, run_date DESC);

CREATE TABLE metrics (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  -- Re-importing an identity deletes its metrics and inserts the new set in one transaction; deleting the
  -- experiment removes its metrics.
  experiment_id UUID NOT NULL REFERENCES experiments (id) ON DELETE CASCADE,
  concurrency INTEGER NOT NULL CHECK (concurrency > 0),
  ttft_ms JSONB NOT NULL CHECK (bench_latency_stats_valid(ttft_ms)),
  itl_ms JSONB NOT NULL CHECK (bench_latency_stats_valid(itl_ms)),
  request_latency_ms JSONB NOT NULL CHECK (bench_latency_stats_valid(request_latency_ms)),
  -- Tool-reported goodput when present. The console computes SLO verdicts itself (src/domain/metrics.ts), so
  -- this column is stored for provenance and is NULL when the tool did not report it.
  goodput DOUBLE PRECISION CHECK (goodput >= 0),
  requests_per_second DOUBLE PRECISION NOT NULL CHECK (requests_per_second >= 0),
  input_tokens_per_second DOUBLE PRECISION NOT NULL CHECK (input_tokens_per_second >= 0),
  output_tokens_per_second DOUBLE PRECISION NOT NULL CHECK (output_tokens_per_second >= 0),
  total_tokens_per_second DOUBLE PRECISION NOT NULL CHECK (total_tokens_per_second >= 0),
  -- Per-user decode speed; NULL = not reported (never 0).
  output_tokens_per_second_per_user_p50 DOUBLE PRECISION CHECK (output_tokens_per_second_per_user_p50 >= 0),
  successful INTEGER NOT NULL CHECK (successful >= 0),
  errored INTEGER NOT NULL CHECK (errored >= 0),
  incomplete INTEGER NOT NULL CHECK (incomplete >= 0),
  duration_seconds DOUBLE PRECISION NOT NULL CHECK (duration_seconds > 0),
  -- Per-level raw tool output. Never read by the snapshot query.
  raw_results JSONB CHECK (jsonb_typeof(raw_results) IN ('object', 'array')),
  -- This B-tree has experiment_id as its leading column, so it already serves "metrics WHERE experiment_id = ?"
  -- and the snapshot's ORDER BY experiment_id, concurrency. A separate metrics(experiment_id) index would be
  -- a redundant copy that every import has to maintain, so none is created.
  CONSTRAINT metrics_experiment_concurrency_key UNIQUE (experiment_id, concurrency)
);

-- ---------------------------------------------------------------------------------------------------------
-- Planning board (kanban). Scheduler state only; results live in experiments/metrics.
-- ---------------------------------------------------------------------------------------------------------

CREATE TABLE scheduled_experiments (
  id UUID PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9][a-z0-9-]{0,80}$'),
  status TEXT NOT NULL CHECK (status IN ('Backlog', 'Scheduled', 'Running', 'Complete', 'Failed')),
  -- Order within a status column; higher = nearer the top. Created and moved cards go to the top
  -- (MAX + 1 of the target column). No UNIQUE(status, position): concurrent writers may tie, and ties are
  -- broken by created_at rather than failing a planning write.
  position INTEGER NOT NULL CHECK (position >= 0),
  -- Atlas configuration id (the base of the console deployment id "<configuration>[@<dataset>]").
  configuration_id TEXT NOT NULL CHECK (configuration_id ~ '^[a-z0-9][a-z0-9._-]{1,200}$'),
  datasets TEXT[] NOT NULL DEFAULT '{}' CHECK (array_position(datasets, NULL) IS NULL),
  scheduled_start_at TIMESTAMPTZ,
  -- Optimistic locking: writers compare-and-set on version; the document mirrors it.
  version INTEGER NOT NULL CHECK (version >= 1),
  document JSONB NOT NULL CHECK (
    jsonb_typeof(document) = 'object' AND document ->> 'id' = id::text
    AND document ->> 'status' = status AND (document ->> 'version')::integer = version
    AND split_part(document ->> 'deploymentId', '@', 1) = configuration_id
  ),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- Serves the per-column MAX(position) lookup on create/move and column-ordered reads.
CREATE INDEX scheduled_experiments_board_idx ON scheduled_experiments (status, position DESC, created_at DESC);
