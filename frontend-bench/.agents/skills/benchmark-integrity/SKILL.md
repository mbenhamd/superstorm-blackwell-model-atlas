---
name: benchmark-integrity
description: Check benchmark validity, metric definitions, precision provenance, baseline eligibility, external-evidence isolation, and regression tests.
---

# Benchmark Integrity

Read `src/domain/types.ts`, `metrics.ts` (`capacity`/`sweepCapacity`, `tieBand`, `rank`, `frontier`, `comparability`), `setups.ts` (standings, `SETUP_TIE_BAND`), `variants.ts` (best run per variant), `run-config.ts` (normalised engine controls), `external.ts`, `catalog.ts`, `validation.ts`, `src/client/components/app/engine-data.ts` (matched-pair engine verdict, `ENGINE_TIE_BAND`), ADR 0006 (current metric definitions) and the surviving rules of ADR 0002 (no interpolation, no zero-filling, matched cohorts).

For each displayed number, trace artifact, workload, suite revision, runtime, hardware, observation unit and source. Verify:

- Sustainable = observed total (input + output) tok/s at C_max × margin × 60 ÷ run GPUs (`runGpus ?? gpus`). The margin is the SLO policy value (0.8 in every preset, adjustable 0.50–1.00 in the SLO popover), not a constant.
- Null versus zero: a missing value renders "—", never 0; a ring for a missing value is empty and labelled.
- Ties: |Δ| ≤ 3% reads as a tie (`SETUP_TIE_BAND` and `ENGINE_TIE_BAND` are separate constants and must stay equal). An engine Δ or verdict exists only for a matched pair; otherwise "Different configs — no verdict".
- Setup standings order: measured with a value, then measured with no passing level, then unmeasured.
- GPU-count normalisation, SLO percentile interpretation (TTFT ceiling = prompt tokens ÷ prefill speed), failure denominators and baseline matching.
- Rings and load curves carry only bounded or ordered quantities (share of best, levels passing, latency budget used; tok/s per GPU by tested concurrency), never a time trend.
- External isolation: published (external) values never feed `rank()`, `capacity()`, standings, variants, C_max, the sustainable line, SLO verdicts, Compare deltas or CSV measured columns (`tests/external.test.ts` walks the import graph). They are ordered only among themselves and always labelled "external".
- No configuration without an imported run shows a measured throughput or latency value.
- The AA index is model level: third-party exports may display it only as "AA (model)" / "base model, published", never as their own score, and are never ranked or placed on the frontier with it (only `artifact.publisher === null` exports are ranked).
- Exports keep provenance: CSV (Evidence column, "Catalog as of", TEST DATA label), configuration and experiment-plan JSON (`catalogAsOf`). The chart PNG footer carries only "Bench Console · capture date" (known gap: no catalog date or evidence class). No repository commit in rendered UI or downloads; `atlas.commit` is present in the bundle and in `/health`.
- TEST DATA: `snapshot.testData` raises the banner; `import:runs` rejects `"_test"` entries.

Add a failing test before repairing a metric. Run `bun run test:unit` (all ten unit files), `bun run typecheck` and `bun run build` (or `bun run quality`, which runs those three). Report the exact invariant and evidence; never bless a real-world claim from TEST fixtures (`tests/fixtures/sample-runs.json`).
