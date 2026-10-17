# Stable, main and nightly: what the differences mean

**Latest scoped refresh: October 17, 2026 UTC; earlier comparisons below retain their October 16 scope.** These identify released source, selected development source and advertised artifacts. No wheel or container was downloaded or run. Exact identities and retrieval dates are retained in the [upstream lock](../evidence/upstreams.lock.json).

## October 17: v0.31 remains the release baseline

Fresh release APIs still identify vLLM **0.31.0**, SGLang **0.5.21** and KServe **0.21.0**. The latest observed branch heads were vLLM `026f6ab2689397e64c1f53a5ac57d37c4dc46b67`, SGLang `a126e8d640c707f855e8da31f906035883f4ff70` and KServe `5d738906d22e003166d09ae28733366420e30d8d` around 09:46 UTC. These are timestamped metadata observations, not whole-tree reviews. [TOPR-V-RELEASE](https://api.github.com/repos/vllm-project/vllm/releases/latest) [TOPR-S-RELEASE](https://api.github.com/repos/sgl-project/sglang/releases/latest) [TOPR-K-RELEASE](https://api.github.com/repos/kserve/kserve/releases/latest) [TOPR-V-HEAD](https://api.github.com/repos/vllm-project/vllm/commits/main) [TOPR-S-HEAD](https://api.github.com/repos/sgl-project/sglang/commits/main) [TOPR-K-HEAD](https://api.github.com/repos/kserve/kserve/commits/master)

The CUDA13 indexes advertised vLLM `0.32.0rc1.dev341+g2067297b2` and SGLang `0.5.23.dev20261017+g2d3dd3168d`. Neither identity equals the observed branch tip; no wheel was downloaded or executed. The lock preserves earlier observations. [TOPR-V-WHEELS](https://wheels.vllm.ai/nightly/cu130/vllm/) [TOPR-S-WHEELS](https://sgl-project.github.io/whl/cu130/sglang/)

The new [Qwen27 review](../companies/alibaba-qwen/qwen3.8-27b/serving.md) is explicitly against vLLM **0.31.0**. NVIDIA's mutable nightly example does not itself require abandoning this release: selected stable source contains its mixed loader and native MTP path. Main's GDN mid-prefill checkpoint addition is a separate optimization lead, while the hd256 FA4/FP8 restriction remains. A selected source path is still not an image qualification. [Q31-M-GDN](https://raw.githubusercontent.com/vllm-project/vllm/026f6ab2689397e64c1f53a5ac57d37c4dc46b67/vllm/model_executor/layers/mamba/gdn/qwen_gdn_linear_attn.py) [Q31-M-FA-UTIL](https://raw.githubusercontent.com/vllm-project/vllm/026f6ab2689397e64c1f53a5ac57d37c4dc46b67/vllm/v1/attention/backends/fa_utils.py)

## October 16 release and development snapshots

| Project | Latest stable observed | Selected source inspected in this review | Development artifact observation |
| --- | --- | --- | --- |
| vLLM | **0.31.0**, October 5; `db9527a46873454610df6dbedf79a36d6bf1a7f6` | `07f3857fb93772fed64e06642cdb0b8c03e0b249` for attention/quantization; earlier cache review at `fa75d345…` | CUDA 13 wheel index now advertises `0.32.0rc1.dev285+g07f3857fb` |
| SGLang | **0.5.21**, October 2; `e00930c5489053f26d86b179cee0d087f846acbb` | `baf451fcd6f54962c7db7dc30c636cb534ba1f2a` for FP8/FA4; earlier cache review at `56a3c4…` | CUDA 13 wheel index advertises `0.5.23.dev20261016+gf9df33494a` |
| KServe | **0.21.0**, September 25; `d1482554fc4f66dd41aee70e01f5174e24f265bd` | Current master metadata/template checks at `0f3f1b0e8c88f78e2966e5e73be70224bb7c20dd`; broader comparison retains October 15 source | Development controller publishing uses `latest`; a separate qualified nightly stack is not established |

[vLLM release](https://github.com/vllm-project/vllm/releases/tag/v0.31.0), [SGLang release](https://github.com/sgl-project/sglang/releases/tag/v0.5.21), [KServe release](https://github.com/kserve/kserve/releases/tag/v0.21.0), [vLLM wheel index](https://wheels.vllm.ai/nightly/cu130/vllm/), [SGLang wheel index](https://sgl-project.github.io/whl/cu130/sglang/).

The submitted report's SGLang 0.5.20 baseline is stale: 0.5.21 predates its October 16 cutoff. Its vLLM and SGLang main SHAs were real snapshots; later movement does not make the earlier observations false. The table identifies selected inspected source, not an assertion that a moving branch still points there.

The retained [configuration references](configuration-reference.md) preserve earlier source-inspection commits. New observations do not silently requalify those arguments against a different binary.

The FP8/FA4 recheck at **09:47 UTC** confirmed the same three stable releases and advertised wheel versions. vLLM main remained at `07f3857fb93772fed64e06642cdb0b8c03e0b249`; SGLang main advanced to `baf451fcd6f54962c7db7dc30c636cb534ba1f2a`. The selected SGLang cache review remains at `56a3c4…`; the newer FP8/FA4 review compares release 0.5.21 with `baf451…`. The lock preserves earlier observations and their narrower review scopes. [FP8R-V-HEAD](https://api.github.com/repos/vllm-project/vllm/commits/main), [FP8R-S-HEAD](https://api.github.com/repos/sgl-project/sglang/commits/main), [FP8R-K-HEAD](https://api.github.com/repos/kserve/kserve/commits/master).

The model/topology recheck at **10:02 UTC** again found the same stable releases. It observed vLLM main `9a16d43ef0413b0a2a222e7f5baa4498c291ae5b`, SGLang main `2adc76ad61a9c036304716a4548093b1b27b10fb`, and unchanged KServe master. The vLLM wheel index advanced to `0.32.0rc1.dev285+g07f3857fb`; SGLang's advertised wheel remained `0.5.23.dev20261016+gf9df33494a`. Selected model-source additions name their own revisions; this observation does not requalify earlier attention results against these newer main commits. [TOPR-V-HEAD](https://api.github.com/repos/vllm-project/vllm/commits/main), [TOPR-S-HEAD](https://api.github.com/repos/sgl-project/sglang/commits/main), [TOPR-K-HEAD](https://api.github.com/repos/kserve/kserve/commits/master), [TOPR-V-WHEELS](https://wheels.vllm.ai/nightly/cu130/vllm/), [TOPR-S-WHEELS](https://sgl-project.github.io/whl/cu130/sglang/).

## A concrete main-versus-nightly gap

SGLang commit `fad7d95a7f1a942e039f74eb2d319da29311b8cb` addresses draft sliding-window state in a **DeepSeek V4.1 DSpark** path. The source review traced its model/backend/cache applicability. The advertised October 16 wheel's source reference does **not** contain it. A date in a wheel name therefore does not establish inclusion of every fix merged that day. It also does not establish a bug or fix in DeepSeek V4 Flash **0731**. [DSpark fix](https://github.com/sgl-project/sglang/commit/fad7d95a7f1a942e039f74eb2d319da29311b8cb), [SGLang source review](../frameworks/sglang/SOURCE_REVIEW.md)

The October 16 KServe tip changes port handling in the v1beta1 InferenceService reconciler. It is not evidence for LLMInferenceService SGLang readiness. The SGLang runtime template on master is a separate feature absent from the inspected 0.21.0 release. [KServe source review](../frameworks/kserve/ARCHITECTURE.md)

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

The [vLLM attention section](../frameworks/vllm/SOURCE_REVIEW.md) distinguishes released FA4 integration from newer sparse-MLA and NVFP4-cache paths. An ordinary dense FA4 option does not select every newer sparse implementation. The [attention explanation](attention-and-fa4.md) also separates the FA4 paper, later low-precision research and the engine's packaged implementation. The newly advertised vLLM wheel identifies `07f3857fb`, matching the earlier attention-source snapshot by source label; its contents and dependencies were not executed, and the newer `9a16d43…` tip is a separate observation.

## What makes an upgrade justified

Choose a development build for an identified capability or correction relevant to the exact model/export/workload. Establish that the published artifact contains it and matches the host CPU architecture, CUDA/driver requirements and kernel dependencies. A main SHA, container tag and wheel source label can all differ on the same day.

Then compare the effective configuration and quality in the execution repository. Keep stable when the required path already works and the newer build adds no demonstrated value. A merged PR can be absent from a release branch; a model-specific container can carry patches absent from generic main. Inspect inclusion and the call path instead of assuming chronology establishes support.
