-- runtime_version gains an optional distribution segment:
-- "<engine>[-<distribution>]-v<major>.<minor>.<patch>[rcN][-<flavor>]", e.g. "vllm-openai-v0.33.0-cu130".
-- The pattern mirrors RUNTIME_VERSION in src/domain/catalog.ts. The stored splits are recomputed so the
-- engine, version and flavor of distribution-qualified tags are not NULL.
ALTER TABLE experiments DROP CONSTRAINT IF EXISTS experiments_runtime_version_check;
ALTER TABLE experiments ADD CONSTRAINT experiments_runtime_version_check
  CHECK (runtime_version ~ '^(vllm|sglang)(-[a-z]+)?-v[0-9]+\.[0-9]+\.[0-9]+(rc[0-9]+)?(-[a-z0-9._-]+)?$');

ALTER TABLE experiments DROP COLUMN engine, DROP COLUMN engine_version, DROP COLUMN engine_flavor;
ALTER TABLE experiments
  ADD COLUMN engine TEXT GENERATED ALWAYS AS ((regexp_match(runtime_version, '^(vllm|sglang)(?:-[a-z]+)?-v'))[1]) STORED,
  ADD COLUMN engine_distribution TEXT GENERATED ALWAYS AS ((regexp_match(runtime_version, '^(?:vllm|sglang)-([a-z]+)-v'))[1]) STORED,
  ADD COLUMN engine_version TEXT GENERATED ALWAYS AS
    ((regexp_match(runtime_version, '^[a-z]+(?:-[a-z]+)?-v([0-9]+\.[0-9]+\.[0-9]+(?:rc[0-9]+)?)'))[1]) STORED,
  ADD COLUMN engine_flavor TEXT GENERATED ALWAYS AS
    ((regexp_match(runtime_version, '^[a-z]+(?:-[a-z]+)?-v[0-9]+\.[0-9]+\.[0-9]+(?:rc[0-9]+)?-(.+)$'))[1]) STORED;
