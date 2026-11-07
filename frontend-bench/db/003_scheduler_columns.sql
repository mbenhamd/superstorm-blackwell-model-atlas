-- 003: extend scheduled_experiments with the scheduler's planning and execution columns.
--
-- The scheduler row carries planning state (board status/position, datasets, GPU footprint, target start,
-- blocked) and execution state (manifest, execution_state, deploy/bench/finish timestamps, scheduler run id,
-- code commit, error note, cancel request). Results are never stored here: they live in `experiments`
-- (one row per seven-column run identity) and `metrics`.
--
-- Ownership: the console writes only the planning columns (gpu_footprint, blocked, blocked_reason, plus
-- the columns from 002). The scheduler owns every execution column; the console never writes them, so a
-- NULL execution column means "not reported by the scheduler", never "did not happen" or "succeeded".
-- All new columns are nullable or defaulted so existing rows remain valid without a backfill.

ALTER TABLE scheduled_experiments
  -- Path of the run manifest the scheduler deploys from. NULL until the scheduler materializes one.
  ADD COLUMN manifest_path TEXT UNIQUE CHECK (manifest_path IS NULL OR length(manifest_path) BETWEEN 1 AND 512),
  -- GPUs reserved per dataset run: the configuration's TP × in-engine DP (the atlas GPU count).
  ADD COLUMN gpu_footprint INTEGER CHECK (gpu_footprint IS NULL OR gpu_footprint > 0),
  -- Scheduler lifecycle detail beneath the board status (free text owned by the scheduler).
  ADD COLUMN execution_state TEXT CHECK (execution_state IS NULL OR length(execution_state) BETWEEN 1 AND 80),
  ADD COLUMN deploy_started_at TIMESTAMPTZ,
  ADD COLUMN bench_started_at TIMESTAMPTZ,
  ADD COLUMN finished_at TIMESTAMPTZ,
  ADD COLUMN scheduler_run_id TEXT CHECK (scheduler_run_id IS NULL OR length(scheduler_run_id) BETWEEN 1 AND 120),
  ADD COLUMN code_commit TEXT CHECK (code_commit IS NULL OR code_commit ~ '^[0-9a-f]{7,40}$'),
  ADD COLUMN error_note TEXT CHECK (error_note IS NULL OR length(error_note) <= 4000),
  -- Planning: a blocked card stays on the board with its reason (e.g. GPU budget).
  ADD COLUMN blocked BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN blocked_reason TEXT CHECK (blocked_reason IS NULL OR length(blocked_reason) BETWEEN 1 AND 200),
  ADD COLUMN cancel_requested BOOLEAN NOT NULL DEFAULT FALSE,
  ADD CONSTRAINT scheduled_experiments_blocked_reason_chk CHECK (blocked = (blocked_reason IS NOT NULL)),
  ADD CONSTRAINT scheduled_experiments_timeline_chk CHECK (
    (bench_started_at IS NULL OR deploy_started_at IS NULL OR bench_started_at >= deploy_started_at)
    AND (finished_at IS NULL OR bench_started_at IS NULL OR finished_at >= bench_started_at)
  ),
  -- A card plans at least one dataset; 002 allowed an empty array.
  ADD CONSTRAINT scheduled_experiments_datasets_nonempty_chk CHECK (cardinality(datasets) BETWEEN 1 AND 6) NOT VALID;

-- NOT VALID above keeps the migration safe on databases that already hold an empty-datasets row;
-- validate it explicitly once such rows (if any) are corrected.
COMMENT ON TABLE scheduled_experiments IS
  'Kanban card per planned run: planning columns written by the console, execution columns written only by the scheduler. Not results.';
