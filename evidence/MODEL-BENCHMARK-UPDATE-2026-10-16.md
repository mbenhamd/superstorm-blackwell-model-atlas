# Model benchmark planning improvements · October 16, 2026

The title uses Europe/Paris time; retrieval receipts use UTC. This task starts from `09dbb4686e718bbba2ee8031c916d856b4d564f8`. The request was to identify instructions and explanations still needing improvement, justify the changes, and make the benchmark work specific to the atlas's models.

## What changed and why

The earlier engine roadmap described mechanisms and sweeps. The family validation pages mostly listed settings without a complete quality-evaluation contract. The new [model benchmark guide](../benchmarks/MODEL-BENCHMARKS.md) supplies a purpose for each benchmark, a family priority matrix, comparison controls, scoring provenance and promotion rules. All eight family validation plans now connect architecture/export uncertainties to staged experiments and named quality tasks.

| Finding | Improvement | Evidence boundary |
| --- | --- | --- |
| A coherent answer or valid stream could be mistaken for quality evidence | Separate protocol completion, task success, latency compliance and episode completion | The existing probe discards generated text/tools and accepts `length`/`content_filter` endings as protocol-complete. Documentation now explains the need for a separate answer-retaining evaluator. |
| Aggregate quality and load throughput could be combined without scoring the same requests | Define same-request quality-adjusted goodput and separate quality-qualified service goodput | No quality/goodput evaluator was implemented or run. |
| Profile pairs change several settings together | Explain matched controls and label complete-configuration comparisons | Examples include GLM weight/KV changes and Flash Next MTP/EP/autotuning differences. Existing profile statuses and launch gates remain applicable. |
| A benchmark name did not fix the evaluation | Add dataset/item/scorer/adapter/processor/budget/calibration fields and required output artifacts to the manual template | The template remains non-executable and has no semantic-completeness validator. |
| Public benchmark defaults and task versions can change | Pin the selected RULER route and dependencies, verify LiveCodeBench's actually loaded items, report BFCL coverage, and identify the MMMU variant/split | The inspected LiveCodeBench full loader ignores the nominal release/date selection. Fresh source inspection supports the control; it does not qualify model adapters. |
| Evaluator report reuse can hide a changed candidate | Give SWE-bench candidates and independent attempts distinct run/cache namespaces and verify reports against their patches | The inspected official evaluator can return a pre-existing report. No evaluator was run here. |
| Stored checkpoint tensors can be confused with resident target-only tensors | Audit the full stored artifact, record intentional loader omissions, and require draft tensors during speculative qualification | A legitimate target-only loader can omit MTP; that omission alone is not an artifact failure. |
| Long context and speculation were mostly throughput sweeps | Add evidence-position, cache-boundary, rollback, cancellation, per-task quality and reasoning-budget checks | These are proposed measurements; native context limits and published acceptance figures are not local results. |
| A single headline score obscures regressions | Require per-stratum thresholds, paired uncertainty and an explicit inconclusive outcome | Thresholds and actual application distributions remain operator inputs. |

## New observations and work still needed

Fresh checks retain the same stable engine versions: vLLM 0.31.0, SGLang 0.5.21 and KServe 0.21.0. The [upstream receipt](updates/2026-10-16-model-benchmarks/upstream-recheck.json) separately records SGLang's later main reference and vLLM's newer nightly index entry. [Nightly readiness](../reports/nightly-readiness.md) preserves the earlier inspections and explains why metadata movement does not establish a binary improvement.

The benchmark program still needs the actual node inventory, selected image/wheel, verified weights, application workload, quality/latency thresholds, evaluator environment and validated endpoint adapters. Planning cannot select those values from a publisher card. A benchmark score is not reproduced until its own manifests, raw outputs, scorer results and environment are retained.

| Next work | Why it is justified / evidence needed |
| --- | --- |
| Prepare a pinned answer-retaining evaluator and validate each endpoint adapter | Bind expected item IDs, actual payloads, raw answers, tool traces, timings and scores. The current streaming probe supplies protocol/timing evidence only. |
| Qualify the small-model reference, then run export and state correctness gates | Qwen 27B BF16 is the proposed initial service; the other families keep their own model-specific gates. A passing small-model result cannot certify a large MoE. |
| Audit the exact NVIDIA DeepSeek 0731 NVFP4 export | [The family plan](../companies/deepseek/deepseek-v4-flash-0731/validation.md) identifies its immutable revision and distinguishes it from the preview export. The publisher preserved DSpark tensors but did not exercise speculation in release validation; full artifact/loader and target-only quality work precedes a speculative arm. |
| Qualify Mistral's publisher EAGLE drafter | [The Mistral plan](../companies/mistral-ai/mistral-medium-3.5/validation.md) pins its native-layout metadata and documents target/draft context gates. Exact target/build pairing and image-conditioned generation remain untested. |
| Resolve Flash's P/D connector and thinking controls | [The Flash plan](../companies/z-ai/glm-5.3-flash/validation.md) records cookbook inconsistencies and requires checking the selected implementation and effective serialized prompt. A recipe's prose alone does not settle the behavior. |
| Add extended-context, video, agent and service lifecycle campaigns only where required | Each needs its own capacity, correctness, scoring and environment contract. Start from the family plans and engine roadmap after the simpler baseline passes. |

The two newly observed model/drafter candidates are recorded separately in the upstream lock. Neither has been added to the catalog or given an executable launch profile by this update.

## Research and review scope

Three Astra max researchers owned disjoint family validation pages; a separate Astra max advisor critiqued shared methodology and inspected official benchmark contracts. Another Astra max agent refreshed stable/main/nightly metadata. Research receipts and subsequent independent reviews are stored in [the update directory](updates/2026-10-16-model-benchmarks/). Source entries preserve original retrieval identities and attach fresh rechecks separately.

| Reviewed scope | Research | Independent review |
| --- | --- | --- |
| Qwen 27B, Gemma and Mistral | [Dense-family receipt](updates/2026-10-16-model-benchmarks/dense-research.json) | [Dense-family cross-review](updates/2026-10-16-model-benchmarks/dense-review.json) |
| GLM 5.3, GLM Flash and Qwen Flash Next | [Hybrid/MoE receipt](updates/2026-10-16-model-benchmarks/hybrid-research.json) | [Cross-review](updates/2026-10-16-model-benchmarks/hybrid-review.json) |
| Kimi and DeepSeek 0731 | [Large-MoE receipt](updates/2026-10-16-model-benchmarks/moe-research.json) | [Cross-review](updates/2026-10-16-model-benchmarks/moe-review.json) |
| Shared methodology and run record | [Benchmark contracts](updates/2026-10-16-model-benchmarks/methodology-research.json) | [Shared review](updates/2026-10-16-model-benchmarks/shared-review.json) |

These reviews have no unresolved material findings in their stated scopes. Corrections include target-only MTP residency, the Flash P/D backend control, node-wide admission and per-group batching controls, evaluator cache reuse and loaded benchmark-item verification. Lower-priority follow-ups also made Kimi's unaudited DFLASH route explicit and separated DeepSeek compressed-state dtype from KV/indexer precision. All remain plans or source observations, not executed model results.

The coordinator integrated the shared guide, manual record, protocol, navigation and evidence. Final local checks are reported in [VALIDATION](../VALIDATION.md) and [local-validation.json](local-validation.json); review records identify their actual scope. Local static checks do not certify benchmark design, model quality or runtime support.

The source register adds **43 records**, reaching **304**, alongside dated rechecks of existing sources. These counts describe records, including distinct observations of some shared sources; they do not count independent reproductions. The [shared methodology review](updates/2026-10-16-model-benchmarks/shared-review.json) records the evaluator and probe-description findings and their resolutions.

The [integration review](updates/2026-10-16-model-benchmarks/integration-review.json) checked all 43 additions and 75 rechecks against their receipt identities, the source-index entries, ledger windows, navigation and candidate boundaries. It found no actionable mismatch in that scope; it excludes the subsequent final test/build run and family-review completion statements, which are supported by their separate records above.

No weights were downloaded, no inference engine or evaluator was installed or run, and no GPU or Kubernetes experiment was executed. Public scores remain publisher claims. Every proposed benchmark remains work to do.
