# Stable, main and nightly: what the differences mean

**Fresh observations: October 16, 2026 UTC.** These identify released source, selected development source and advertised artifacts. No wheel or container was downloaded or run. Exact identities and retrieval dates are retained in the [upstream lock](../evidence/upstreams.lock.json).

## Release and development snapshots

| Project | Latest stable observed | Selected source inspected in this review | Development artifact observation |
| --- | --- | --- | --- |
| vLLM | **0.31.0**, October 5; `db9527a46873454610df6dbedf79a36d6bf1a7f6` | `07f3857fb93772fed64e06642cdb0b8c03e0b249` for attention/quantization; earlier cache review at `fa75d345…` | CUDA 13 wheel index advertises `0.32.0rc1.dev284+gfa75d3456` |
| SGLang | **0.5.21**, October 2; `e00930c5489053f26d86b179cee0d087f846acbb` | `56a3c4fa16765f591c9eb5dbf10761f31111dfa2` | CUDA 13 wheel index advertises `0.5.23.dev20261016+gf9df33494a` |
| KServe | **0.21.0**, September 25; `d1482554fc4f66dd41aee70e01f5174e24f265bd` | Current master metadata/template checks at `0f3f1b0e8c88f78e2966e5e73be70224bb7c20dd`; broader comparison retains October 15 source | Development controller publishing uses `latest`; a separate qualified nightly stack is not established |

[vLLM release](https://github.com/vllm-project/vllm/releases/tag/v0.31.0), [SGLang release](https://github.com/sgl-project/sglang/releases/tag/v0.5.21), [KServe release](https://github.com/kserve/kserve/releases/tag/v0.21.0), [vLLM wheel index](https://wheels.vllm.ai/nightly/cu130/vllm/), [SGLang wheel index](https://sgl-project.github.io/whl/cu130/sglang/).

The submitted report's SGLang 0.5.20 baseline is stale: 0.5.21 predates its October 16 cutoff. Its vLLM and SGLang main SHAs were real snapshots; later movement does not make the earlier observations false. The table identifies selected inspected source, not an assertion that a moving branch still points there.

The retained [configuration references](configuration-reference.md) preserve earlier source-inspection commits. New observations do not silently requalify those arguments against a different binary.

A fresh attention/precision review beginning 09:29 UTC confirmed the same three stable releases and advertised wheel versions. It observed vLLM main at `07f3857fb93772fed64e06642cdb0b8c03e0b249` and SGLang main at `42eb556e66f1d5f288ee8b232a8a545431a25226`. The selected SGLang cache review remains at `56a3c4…`, with attention factory/cache-dtype definitions checked at release 0.5.21. The lock separates these scopes and earlier observations. [ATTR-V-HEAD](https://api.github.com/repos/vllm-project/vllm/commits/main), [ATTR-S-HEAD](https://api.github.com/repos/sgl-project/sglang/commits/main).

## A concrete main-versus-nightly gap

SGLang commit `fad7d95a7f1a942e039f74eb2d319da29311b8cb` addresses draft sliding-window state in a **DeepSeek V4.1 DSpark** path. The source review traced its model/backend/cache applicability. The advertised October 16 wheel's source reference does **not** contain it. A date in a wheel name therefore does not establish inclusion of every fix merged that day. It also does not establish a bug or fix in DeepSeek V4 Flash **0731**. [DSpark fix](https://github.com/sgl-project/sglang/commit/fad7d95a7f1a942e039f74eb2d319da29311b8cb), [SGLang source review](../frameworks/sglang/SOURCE_REVIEW.md)

KServe's current tip changes port handling in the v1beta1 InferenceService reconciler. It is not evidence for LLMInferenceService SGLang readiness. The SGLang runtime template on master is a separate feature absent from the inspected 0.21.0 release. [KServe source review](../frameworks/kserve/ARCHITECTURE.md)

## Changes with a plausible optimization consequence

| Area | Why the implementation matters | Applicability boundary |
| --- | --- | --- |
| Speculative sampling and stop accounting | Acceptance, rollback and stop trimming affect correctness and wasted work | Exact draft method and target implementation; no generic transfer from DSpark to MTP or EAGLE |
| Hybrid state and prefix caching | Reuse needs recurrent snapshots as well as token KV | Cache backend, state dtype, model architecture and cancellation path |
| Quantized target/draft loading | Mixed exports can use different scales and operator paths in the draft | Exporter and module map, not the NVFP4 label alone |
| CUDA graphs and scheduling | Reduce host overhead or improve replay paths | Graph shape, backend, model and speculative path; source existence does not establish end-to-end speedup |
| Sparse attention and MoE communication | Indexer/layout/routing changes can alter memory traffic and rank balance | Exact sparse architecture, GPU target and topology |
| KServe routing and state transfer | Controller configuration selects the engine, gateway, scheduler and connector | Release-matched composition; healthy pods do not prove cache-aware routing or working P/D |

The [vLLM](../frameworks/vllm/SOURCE_REVIEW.md) and [SGLang](../frameworks/sglang/SOURCE_REVIEW.md) pages retain specific PRs, source links, relevant functions and exclusions. They explain why each change might matter without assigning an unmeasured speedup.

## Attention-specific stable/main differences

The [vLLM attention section](../frameworks/vllm/SOURCE_REVIEW.md) distinguishes released FA4 integration from newer sparse-MLA and NVFP4-cache paths. An ordinary dense FA4 option does not select every newer sparse implementation. The [attention explanation](attention-and-fa4.md) also separates the FA4 paper, later low-precision research and the engine's packaged implementation. The advertised vLLM wheel still identifies `fa75d3456`, so the newer main snapshot is not established by that wheel name alone.

## What makes an upgrade justified

Choose a development build for an identified capability or correction relevant to the exact model/export/workload. Establish that the published artifact contains it and matches the host CPU architecture, CUDA/driver requirements and kernel dependencies. A main SHA, container tag and wheel source label can all differ on the same day.

Then compare the effective configuration and quality in the execution repository. Keep stable when the required path already works and the newer build adds no demonstrated value. A merged PR can be absent from a release branch; a model-specific container can carry patches absent from generic main. Inspect inclusion and the call path instead of assuming chronology establishes support.
