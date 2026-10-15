# SGLang: source review and upgrade candidates

**Source and metadata review, refreshed October 15 UTC / October 16, 2026 in Paris. No engine, model weights or nightly binary was run.** The [experiment plans](EXPERIMENTS.md) turn these findings into comparisons on the actual eight-B300 node. Existing [profiles](../../profiles/README.md) retain their recorded model revisions, inspected-source references and compatibility statuses.

## Released source, main and published artifacts

| Object | Fresh observation | Evidence boundary |
| --- | --- | --- |
| Latest stable release | **v0.5.21**, published October 2; peeled source tag `e00930c5489053f26d86b179cee0d087f846acbb`; release page documents the NVIDIA image as CUDA 13 | Released source baseline; the local image must still be identified |
| Current main | `4e0609ea277d09393d752fcb79181e3416d94c56`, committed October 15 at **22:05:08 UTC** | Immutable source snapshot for the expanded inspection below |
| CUDA 13 nightly wheel | Newest dated index entry: `sglang-0.5.22.dev20261015+ga12814c158-cp312-cp312-manylinux_2_39_x86_64.whl` | Filename, source abbreviation, Python/platform constraints and index checksum metadata; wheel bytes not downloaded |
| Dated development container | `nightly-dev-cu13-20261015-a6a8c560`, with amd64 and arm64 registry entries | Different source abbreviation from both the wheel and current main; platform-specific digests are recorded in evidence |
| CUDA 13.4 nightly container | `nightly-cu134-20261015-f7ad434`, listed with an arm64 image | B300 GPU identity alone does not establish host-CPU compatibility |

[GEXP-REL](https://github.com/sgl-project/sglang/releases/tag/v0.5.21), [GEXP-COMMITS](https://github.com/sgl-project/sglang/commits/main/), [GEXP-INSTALL](https://docs.sglang.io/docs/get-started/install), [GEXP-NIGHTLY-WHEELS](https://sgl-project.github.io/whl/cu130/sglang/), [GEXP-NIGHTLY-TAGS](https://hub.docker.com/v2/repositories/lmsysorg/sglang/tags?page_size=10&name=nightly&ordering=last_updated).

The earlier atlas inspection at `877be2974aa151a984e52822c028276c2b1e9303` covered the registry and ModelOpt quantization lines 1–240. This expansion adds a separate, broader snapshot. A nightly can lag a merge, and dependency changes can alter behavior independently of SGLang's commit.

**Merge time does not prove release inclusion.** Qwen NEXTN graph-input fusion, PR #41175, merged October 2 at 00:17 UTC, before v0.5.21's publication. Nevertheless, the release's pinned `eagle.py` lacks `prepare_verify_commit_outputs` and `prepare_draft_extend_inputs`; current main contains them. The comparison shows separate release-branch commits. Treat these functions as a main-source candidate for the reviewed release comparison. [GEXP-PR41175](https://github.com/sgl-project/sglang/pull/41175), [GEXP-STABLE-QWENPREP](https://raw.githubusercontent.com/sgl-project/sglang/e00930c5489053f26d86b179cee0d087f846acbb/python/sglang/kernels/ops/speculative/eagle.py), [GEXP-MAIN-QWENPREP](https://raw.githubusercontent.com/sgl-project/sglang/4e0609ea277d09393d752fcb79181e3416d94c56/python/sglang/kernels/ops/speculative/eagle.py), [GEXP-PR41175-COMPARE](https://github.com/sgl-project/sglang/compare/67eab57057062e05eabd4227a943b1aa777e563f...v0.5.21).

## Hybrid state and prefix reuse

A hybrid request needs attention KV and recurrent/convolution state representing the same prefix. Branches, overlapping execution and speculative verification can require several state slots per request. Giving nearly all post-weight HBM to KV can leave free token pages but too few state slots to admit work. The useful split depends on request length, cache strategy and speculation. Record the **resolved** strategy and pool capacities; a generic default and a model-specific recipe need not resolve identically. [GEXP-QWEN](https://docs.sglang.io/cookbook/autoregressive/Qwen/Qwen3.8-27B), [GEXP-GLMFLASH](https://docs.sglang.io/cookbook/autoregressive/GLM/GLM-5.3-Flash).

ReplaySSM uses a replay ring instead of ordinary per-request speculative intermediate-state slots. PR #40517 made its KDA gate capability-based, allowing GLM-5.3 Flash rather than depending on a Kimi-specific config class; v0.5.21 lists the change. This motivates memory and rollback comparisons, without establishing a latency win. [GEXP-PR40517](https://github.com/sgl-project/sglang/pull/40517), [GEXP-REL](https://github.com/sgl-project/sglang/releases/tag/v0.5.21).

The int8 checkpoint pool is **already present in stable source**. It compresses idle radix-owned temporal state, retains convolution windows at their native dtype and restores checkpoints into active slots. This differs from reducing active-state arithmetic precision. Scales, convolution state and the additional pool still consume memory. Source comments describing quality do not replace long-conversation evaluation: rounding at a cache hit changes the starting state for later computation. [GEXP-STABLE-MAMBA](https://raw.githubusercontent.com/sgl-project/sglang/e00930c5489053f26d86b179cee0d087f846acbb/python/sglang/srt/mem_cache/mamba_checkpoint_pool.py), [GEXP-SRC-MAMBA](https://raw.githubusercontent.com/sgl-project/sglang/4e0609ea277d09393d752fcb79181e3416d94c56/python/sglang/srt/mem_cache/mamba_checkpoint_pool.py).

The unified radix cache groups full-attention, sliding-window and recurrent components behind a tree core. Rust is a v0.5.21 feature, but current source can resolve even an explicit Rust request to Python for unsupported components, session-aware caching, platform or installation constraints. Check the logged concrete core before comparing treatments. [GEXP-PR39627](https://github.com/sgl-project/sglang/pull/39627), [GEXP-SRC-TREECORE](https://raw.githubusercontent.com/sgl-project/sglang/4e0609ea277d09393d752fcb79181e3416d94c56/python/sglang/srt/mem_cache/unified_cache/tree_core_registry.py), [GEXP-SRC-CACHE](https://raw.githubusercontent.com/sgl-project/sglang/4e0609ea277d09393d752fcb79181e3416d94c56/python/sglang/srt/mem_cache/unified_radix_cache.py).

HiCache extends reuse to host memory and optionally storage. L2 belongs to one engine instance; independent replicas do not automatically share it. L3 supports cross-instance reuse only through an appropriately configured backend and namespace. Hits can save prefill work but add transfer time, CPU memory demand and storage traffic. Compare cold, GPU-hit, host-hit and storage-hit cases separately, then replay the real mixture. [GEXP-HICACHE](https://docs.sglang.io/docs/advanced_features/hicache_design).

Main PR #44173 adds an opt-in `buffer_only` optimization: an SWA component backs up the trailing window required at a node endpoint. Source trims transfer rows, storage keys and dependent sidecars consistently. This can reduce SWA writes, not every component's memory. Validate node splits, hits inside nodes, unequal windows and storage misses before adoption. [GEXP-PR44173](https://github.com/sgl-project/sglang/pull/44173), [GEXP-SRC-SWA](https://raw.githubusercontent.com/sgl-project/sglang/4e0609ea277d09393d752fcb79181e3416d94c56/python/sglang/srt/mem_cache/buffer_mode/pipeline.py).

## Precision must reach the intended implementation

The model registry logs and skips non-strict import failures, and can normalize an unresolved architecture to a Transformers fallback. Capture the resolved class and warnings; accepting a model name does not establish its optimized path. [GEXP-SRC-REG](https://raw.githubusercontent.com/sgl-project/sglang/4e0609ea277d09393d752fcb79181e3416d94c56/python/sglang/srt/models/registry.py).

ModelOpt dispatches modules through a quantization map. Current source recognizes both `FP8_PB_WO` and `FP8_BLOCK_SCALES` for linears and fused experts, derives their block size and rejects conflicting sizes. Released PR #38726 addresses the exact NVIDIA Qwen Flash Next case in which metadata copies name MTP experts differently. An NVFP4-labeled checkpoint can still require FP8 expert, attention and embedding handling. Record loaded module methods and exclusions for the exact export. [GEXP-PR38726](https://github.com/sgl-project/sglang/pull/38726), [GEXP-SRC-QUANT](https://raw.githubusercontent.com/sgl-project/sglang/4e0609ea277d09393d752fcb79181e3416d94c56/python/sglang/srt/layers/quantization/modelopt_quant.py).

The earlier Kimi PR #35077 is included in v0.5.21 source. Its author reported correctness on eight **GB300** GPUs and no speed test. That supports a B300 compatibility candidate, not measured B300 throughput. [KIMIPR](https://github.com/sgl-project/sglang/pull/35077), [GREL-KIMI-ANCESTRY](https://github.com/sgl-project/sglang/compare/5f128395910dafb98c34083dc26cb790c7674d34...v0.5.21).

## Recent scheduling and parallelism changes

| Change and status at retrieval | Mechanism and applicability | Evidence limit and experiment |
| --- | --- | --- |
| Qwen NEXTN input fusion, **merged main** #41175; new functions absent from v0.5.21 | Fuses small verification/draft preparation operations while retaining position and multimodal fallbacks | Author's combined-series B200 NEXTN speed runs use **simulated acceptance length 3.3**; accuracy runs use natural acceptance. Neither isolates this patch's gain nor qualifies a B300 deployment; G06/G07 |
| Kimi pipeline/graph fix, **merged main** #43604 | Exposes the text wrapper's pipeline layer range; bounds profiling by context/mapping capacity and releases allocations after failure | Reported synthetic six-layer B200 validation is not full K3 qualification; G07/G08 |
| DeepSeek V4 sparse-prefill staging, **merged main** #44557 | Uses asynchronous host-to-device staging for compressed lengths | The function still falls back to device-to-host length retrieval when CPU lengths are unavailable; trace the exact 0731 path; G07 |
| EP sentinel fix, **merged main** #40498 | Preserves negative padding IDs during global-to-local expert mapping | Several FlashInfer backends bypass this mapping and consume global IDs; no universal MoE speed claim; G08 |
| Blackwell CC scheduling, **merged main** #36810 | Moves blocking result readback onto a worker thread when Confidential Computing is detected | Ordinary B300 execution does not prove this path is active; G11 |

[GEXP-PR41175](https://github.com/sgl-project/sglang/pull/41175), [GEXP-PR43604](https://github.com/sgl-project/sglang/pull/43604), [GEXP-PR44557](https://github.com/sgl-project/sglang/pull/44557), [GEXP-PR40498](https://github.com/sgl-project/sglang/pull/40498), [GEXP-PR36810](https://github.com/sgl-project/sglang/pull/36810). The pinned code ranges below substantiate the mechanism descriptions.

Prefill/decode separation adds a transfer boundary and consumes GPUs in both roles. GLM Flash's mechanical preview uses **TP2 prefill + TP2 decode on four GB300 GPUs**, dummy weights, NIXL, BF16 KV, TileLang DSA and Triton MoE. It lacks real-weight load/accuracy qualification; the Playground's Mooncake selection is a separate path. G09's 4+4 layout is an atlas scaling experiment. Keep speculation and prefill CP disabled, equal TP sizes and the preview's backend combination during initial qualification; its `flashinfer_trtllm` PD path is untested. Preserve every required state component and layout. A published layout using more than eight GPUs does not fit this node's comparison budget. [GEXP-GLMFLASH](https://docs.sglang.io/cookbook/autoregressive/GLM/GLM-5.3-Flash), [GEXP-PD](https://docs.sglang.io/docs/advanced_features/pd_disaggregation), [GEXP-KIMI](https://docs.sglang.io/cookbook/autoregressive/Moonshotai/Kimi-K3).

PR #44093 changes GLM Flash's fallback expert-count default; the author explains that real checkpoints already override it. It provides no reason to expect an improvement for the pinned atlas checkpoint. [GEXP-PR44093](https://github.com/sgl-project/sglang/pull/44093).

PR #40965 remained **open**. Its observed patch head, `9f9415c5072aaf89f3359c238649eac7bc85acc7`, proposes preserving prior-turn thinking in the field consumed by relevant Jinja templates when adapting Anthropic Messages requests. This is the optional G12 API-compatibility probe. An ordinary nightly must not be described as including this unmerged patch. [GEXP-PR40965](https://github.com/sgl-project/sglang/pull/40965), [GEXP-PR40965-PATCH](https://github.com/sgl-project/sglang/pull/40965.patch).

## Actual inspection scope

Current-main files are pinned at `4e0609ea277d09393d752fcb79181e3416d94c56`. This is a selected-source review, not a full runtime audit.

| Source | Lines inspected | Purpose |
| --- | --- | --- |
| [GEXP-SRC-REG: model registry](https://raw.githubusercontent.com/sgl-project/sglang/4e0609ea277d09393d752fcb79181e3416d94c56/python/sglang/srt/models/registry.py) | 1–159 | Resolution, fallback and warnings |
| [GEXP-SRC-QUANT: ModelOpt](https://raw.githubusercontent.com/sgl-project/sglang/4e0609ea277d09393d752fcb79181e3416d94c56/python/sglang/srt/layers/quantization/modelopt_quant.py) | 802–968, 1032–1093 | Mixed block-FP8 configuration and dispatch |
| [GEXP-SRC-TREECORE: core selection](https://raw.githubusercontent.com/sgl-project/sglang/4e0609ea277d09393d752fcb79181e3416d94c56/python/sglang/srt/mem_cache/unified_cache/tree_core_registry.py) | 1–189 | Compatibility fallback |
| [GEXP-SRC-CACHE: unified radix](https://raw.githubusercontent.com/sgl-project/sglang/4e0609ea277d09393d752fcb79181e3416d94c56/python/sglang/srt/mem_cache/unified_radix_cache.py) | 175–325 | Components, selection and host-mode separation |
| [GEXP-SRC-MAMBA: cached state](https://raw.githubusercontent.com/sgl-project/sglang/4e0609ea277d09393d752fcb79181e3416d94c56/python/sglang/srt/mem_cache/mamba_checkpoint_pool.py) | 1–355 | Compression, restoration and memory accounting |
| [GEXP-SRC-SWA: buffer pipeline](https://raw.githubusercontent.com/sgl-project/sglang/4e0609ea277d09393d752fcb79181e3416d94c56/python/sglang/srt/mem_cache/buffer_mode/pipeline.py) | 279–292, 520–605; #44173 patch | Tail backup and storage keys |
| [GEXP-SRC-EP: dispatcher](https://raw.githubusercontent.com/sgl-project/sglang/4e0609ea277d09393d752fcb79181e3416d94c56/python/sglang/srt/layers/moe/token_dispatcher/standard.py) | 94–180; #40498 patch | Sentinel and backend applicability |
| [GEXP-SRC-DSV4: sparse prefill](https://raw.githubusercontent.com/sgl-project/sglang/4e0609ea277d09393d752fcb79181e3416d94c56/python/sglang/srt/layers/attention/dsv4/sparse_prefill_utils.py) | 536–585; #44557 patch | Length metadata staging |
| [GEXP-SRC-KIMI: wrapper](https://raw.githubusercontent.com/sgl-project/sglang/4e0609ea277d09393d752fcb79181e3416d94c56/python/sglang/srt/models/kimi_k3.py) | 3005–3010; #43604 patch | Pipeline layer range |
| [GEXP-SRC-DYNAMIC: chunk profiler](https://raw.githubusercontent.com/sgl-project/sglang/4e0609ea277d09393d752fcb79181e3416d94c56/python/sglang/srt/managers/scheduler_components/dynamic_chunk_sizer.py) | 133–258 | Bounds and allocation release |
| [GEXP-SRC-CC: result-copy worker](https://raw.githubusercontent.com/sgl-project/sglang/4e0609ea277d09393d752fcb79181e3416d94c56/python/sglang/srt/managers/async_d2h_copy_worker.py) | 1–106; #36810 patch | Device ownership, completion and errors |
| [GEXP-MAIN-QWENPREP: NEXTN helpers](https://raw.githubusercontent.com/sgl-project/sglang/4e0609ea277d09393d752fcb79181e3416d94c56/python/sglang/kernels/ops/speculative/eagle.py) | #41175 patch and named-function comparison with complete v0.5.21 file | Main/release distinction |

Response hashes identify the retrieved material. Release-note figures, PR author tests and recipe badges retain their upstream scope. All experiment outcomes remain unmeasured.
