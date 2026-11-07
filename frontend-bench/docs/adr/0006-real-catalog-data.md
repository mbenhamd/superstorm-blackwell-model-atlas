# ADR 0006: Real catalog data, no mock measurements

Status: accepted (2026-11-07). Supersedes the synthetic fixtures and the synthetic quality index described in ADR 0002; the metric rules of ADR 0002 (no interpolation, no zero-filling, matched cohorts only) remain in force.

## Context

The console previously rendered invented models ("Nimbus", "Corvus") and generated sweeps. Generated numbers looked like evidence even with labels, and they could not be traced to a model revision, engine build or hardware.

## Decision

- The catalog is a pinned snapshot of the research atlas (`src/data/atlas.json`, written by `scripts/import-atlas.ts`, `--check` verifies it): models, exports pinned to Hugging Face revisions, B300 configurations with exact engine arguments, engine release and commit, status, reconciliation notes and source IDs.
- Intelligence is the Artificial Analysis Intelligence Index v5.0.1, model level, by effort variant and component. It enters the serving frontier only for the publisher's own export (`artifact.publisher === null`). Third-party quantized exports show the model-level score labelled "AA (model)" and are not ranked on it.
- Hugging Face card tables are shown verbatim as publisher or exporter claims with their settings; a Δ is computed only when the card names a baseline column.
- Bench results are not connected. Every throughput and latency field renders "—" and the evidence class reads "Reference". Results arrive only through `bun run import:runs` (bench export → run identity match → `applyRuns`) or the PostgreSQL bench schema (`db/002_bench_schema.sql`). `tests/fixtures/sample-runs.json` is TEST data for automated tests only.
- Naming: display name `Model · Export · Engine · TPn[ · DPm][ · Knob]`; stable ID is the atlas configuration ID; the run identity is the seven-column upsert key of `experiments` with a unique export slug as `model_name`.
- Engine build: the configured `engine_release` (or "source snapshot" / "unreleased build"); the `latest_release_recheck` release is a separate, untested applicability review with its `argument_array_status` and `required_reconciliation` list, never substituted for the build.
- The UI shows the catalog date, not the source repository name or commit.
- Serve commands are generated from the atlas engine arguments, one flag per line, with a copy button; KServe runs them as the container command.

## Consequences

Pages lead with catalog, HF and AA facts and leave performance panels empty until runs are imported. Views that need measurements (sweep charts, the serving frontier, measured columns) appear only when at least one run exists, so the UI does not repeat a per-dataset "no data" notice. The bundle grows by the snapshot size. Refreshing data is an explicit `import:atlas` step tied to an atlas commit.

## Addendum (7 November 2026): performance metric definitions

- **Sustainable throughput** is total (input + output) tok/s at C_max × margin × 60 ÷ run GPUs, in tok/min/GPU. This is the console's definition; the rate statistic, window, treatment of incomplete requests and success floor are assumptions that have not been confirmed at source. The previous output-only per-second figure is retained as `capacityTpsPerGpu` for compatibility and is no longer the ranking key.
- **Topology** comes from the run: `num_gpus` divides, `max_system_replicas` (KServe system replicas, never in-engine DP) labels the hardware as `<replicas>x<GPUs><gpu_type>`. Reading `num_gpus` as GPUs per replica is an assumption; runs with more than one replica are flagged "GPU divisor unconfirmed". The configured engine build (`runtimeVersion`) is no longer overwritten by the run; the run's `runtime_version` is kept verbatim as `runtimeTag`. Migration `db/004_runtime_version_distribution.sql` widens the `runtime_version` check to `<engine>[-<distribution>]-v<version>[-<flavor>]` and adds the generated `engine_distribution` column.
- **TEST fixtures** (`"_test"` entries) set `snapshot.testData`; the UI shows a non-dismissible banner and `import:runs` rejects them before any write.
- **Missing stays missing:** a level with no requests has `successRate: null`; capacity fields with no measured level (`rawPeakTpsPerGpu`, `incomplete`, `errored`, all sustainable and deployment-wide figures) are null, never 0.
