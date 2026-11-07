---
name: benchmark-integrity
description: Check benchmark validity, metric definitions, precision provenance, baseline eligibility, and regression tests.
---

# Benchmark Integrity

Read src/domain/types.ts, metrics.ts, validation.ts, ADR 0006 (current metric definitions) and the surviving metric rules of ADR 0002 (no interpolation, no zero-filling, matched cohorts). For each displayed number, trace artifact, workload, suite revision, runtime, hardware, observation unit, and source. Verify null-versus-zero behavior, weighted score coverage, GPU-count normalization, SLO percentile interpretation, failure denominators, and baseline matching. Check that the evidence class and catalog date (`catalogAsOf`) survive exports (no repository commit id in any export or UI), that the AA index is shown as model level and never transferred to a third-party export, and that no configuration without an imported run shows a throughput or latency value. Add a failing test before repairing a metric. Run bun test tests/domain.test.ts and bun run quality. Report the exact invariant and evidence; never bless a real-world claim from TEST fixtures (tests/fixtures/sample-runs.json).
