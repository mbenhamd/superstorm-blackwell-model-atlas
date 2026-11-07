-- POC schema: relational identifiers + immutable JSONB benchmark documents.
-- The application has no tenant/auth boundary. Do not expose it publicly.
CREATE TABLE IF NOT EXISTS model_family (
  id TEXT PRIMARY KEY,
  document JSONB NOT NULL CHECK (jsonb_typeof(document) = 'object' AND document->>'id' = id)
);
CREATE TABLE IF NOT EXISTS hardware_profile (
  id TEXT PRIMARY KEY,
  document JSONB NOT NULL CHECK (jsonb_typeof(document) = 'object' AND document->>'id' = id)
);
CREATE TABLE IF NOT EXISTS workload (
  id TEXT PRIMARY KEY,
  document JSONB NOT NULL CHECK (jsonb_typeof(document) = 'object' AND document->>'id' = id)
);
CREATE TABLE IF NOT EXISTS deployment (
  id TEXT PRIMARY KEY,
  model_id TEXT NOT NULL REFERENCES model_family(id),
  hardware_id TEXT NOT NULL REFERENCES hardware_profile(id),
  workload_id TEXT NOT NULL REFERENCES workload(id),
  document JSONB NOT NULL CHECK (
    jsonb_typeof(document) = 'object' AND document->>'id' = id
    AND document->>'modelId' = model_id AND document->>'hardwareId' = hardware_id
    AND document->>'workloadId' = workload_id
  )
);
CREATE INDEX IF NOT EXISTS deployment_cohort_idx ON deployment(workload_id, model_id, hardware_id);
CREATE TABLE IF NOT EXISTS experiment (
  id TEXT PRIMARY KEY,
  deployment_id TEXT NOT NULL REFERENCES deployment(id),
  status TEXT NOT NULL CHECK (status IN ('Backlog','Scheduled','Running','Complete','Failed')),
  version INTEGER NOT NULL CHECK (version >= 1),
  document JSONB NOT NULL CHECK (
    jsonb_typeof(document) = 'object' AND document->>'id' = id
    AND document->>'deploymentId' = deployment_id AND document->>'status' = status
    AND (document->>'version')::integer = version
  ),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS experiment_status_idx ON experiment(status, created_at DESC);
CREATE TABLE IF NOT EXISTS audit_event (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  entity_id TEXT NOT NULL,
  action TEXT NOT NULL,
  before_state JSONB,
  after_state JSONB,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- These audit records are an application log, not tamper-proof compliance evidence.
