# ADR 0002 — Evidence before ranking

Status: Accepted; partially superseded by [ADR 0006](0006-real-catalog-data.md) (synthetic quality index and synthetic fixtures retired; capacity unit is now total tok/min/GPU).

Separate model families, exact artifacts, hardware, runtime/version/topology, workloads, artifact evaluations, sweep observations, and experiment plans. A benchmark result belongs to an exact configuration, not merely a model label.

Historical (superseded by ADR 0006): the synthetic quality index was a fully covered weighted mean of four equally weighted task dimensions; quality is now the model-level Artificial Analysis index, ranked only for the publisher's own export. Missing or artifact-mismatched quality is unranked. A frontier is valid only within one workload and one evaluation-suite revision. Runtime-isolation comparisons additionally match artifact and topology; quantization comparisons match model/runtime/topology/workload.

SLO-qualified capacity is the highest observed passing throughput, reduced by an explicit planning margin and normalized by the count of participating GPUs (unit changed by ADR 0006: total input + output tok/s × margin × 60 ÷ GPUs, in tok/min/GPU). Highest passing concurrency is separate. Do not call the planning number measured token goodput, or claim an unobserved concurrency level is safe. Joint request-level SLO compliance keeps failures in the denominator. No real statistical uncertainty estimate exists in these fixtures; do not display an invented confidence interval.

Consequences: fewer convenient but misleading rankings; clear explanations for missing scores and unmatched cohorts; domain-level tests for every calculation. A production import must add repeated-run provenance and rigorous versioned schema validation before real data can replace fixtures.
