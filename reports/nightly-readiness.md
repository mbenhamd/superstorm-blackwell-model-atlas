# Stable, main and nightly: what to test next

Refreshed October 16, 2026 Europe/Paris, with retrievals on October 15 UTC. These are timestamped source and publication observations. **No wheel, container or GPU-serving configuration was executed.** Exact retrieval records are in the [source register](../evidence/SOURCES.md) and [upstream lock](../evidence/upstreams.lock.json).

## Release identities and inspected branch snapshots

| Component | Latest stable observed | Stable source commit | Main/master inspected for this update |
| --- | --- | --- | --- |
| vLLM | 0.31.0, October 5 | `db9527a46873454610df6dbedf79a36d6bf1a7f6` | `784d1fff0c491b9add10ecd732de8f707a7e7dbe` |
| SGLang | 0.5.21, October 2 | `e00930c5489053f26d86b179cee0d087f846acbb` | `4e0609ea277d09393d752fcb79181e3416d94c56` |
| KServe | 0.21.0, September 25 | `d1482554fc4f66dd41aee70e01f5174e24f265bd` | `22be2b0496eea4548a98395c3abccf48d8235385` (master) |

[vLLM release](https://github.com/vllm-project/vllm/releases/tag/v0.31.0), [SGLang release](https://github.com/sgl-project/sglang/releases/tag/v0.5.21), [KServe release](https://github.com/kserve/kserve/releases/tag/v0.21.0), [vLLM main snapshot](https://github.com/vllm-project/vllm/commit/784d1fff0c491b9add10ecd732de8f707a7e7dbe), [SGLang main snapshot](https://github.com/sgl-project/sglang/commit/4e0609ea277d09393d752fcb79181e3416d94c56), [KServe master snapshot](https://github.com/kserve/kserve/commit/22be2b0496eea4548a98395c3abccf48d8235385).

The earlier audit inspected vLLM `f8460ef23659afd69046a81529ec2295e4c3f686` and SGLang `877be2974aa151a984e52822c028276c2b1e9303`. Existing profile `reviewed_source_commit` values and the cloner's inspected references retain those identities. This follow-up examines additional code at newer snapshots; it does not certify existing profile arguments against every new binary. The framework reports identify the selected files and restrictions actually reviewed.

During review, vLLM main advanced again: the 22:35:37 UTC remote-ref check observed `de7d70676d9a39353aab4796a6987d345c597991`, committed at 22:29:13 UTC. The expanded function inspection remains at `784d1fff…`; the later branch observation does not extend that inspection to the newer code. [VEXP-LATEST-MAIN](https://github.com/vllm-project/vllm/commit/de7d70676d9a39353aab4796a6987d345c597991).

The model-benchmark follow-up rechecked all three official latest-release pages at 22:51 UTC: stable versions remain unchanged. SGLang main was then observed at `4cca7fcd3e644f22a61c7a6e6b57bb89b568d62a`; its tip diff changes kernel version declarations from 0.4.9 to 0.4.10. This is a dependency-pinning reason to requalify a chosen build, not evidence of a performance gain or a complete audit of the intervening changes. The inspected SGLang snapshot above remains unchanged. [BPLAN-G-MAIN](https://github.com/sgl-project/sglang/commit/4cca7fcd3e644f22a61c7a6e6b57bb89b568d62a).

An independent benchmark-method review observed vLLM main at `3f1e57225abec635b2ec1b513271ac385267bad3` at 22:58 UTC, while stable versions and the dev260 nightly index observation below were unchanged. This later branch metadata is retained separately; no additional engine source-tree audit or binary qualification is implied. [BPLAN-V-MAIN-CROSS](https://github.com/vllm-project/vllm/commit/3f1e57225abec635b2ec1b513271ac385267bad3).

## Published development artifacts are separate snapshots

| Channel | Fresh observation | Consequence for an experiment |
| --- | --- | --- |
| vLLM CUDA 13 nightly wheel index, 22:25 UTC | `0.32.0rc1.dev256+g0c2584929`, commit reference `0c2584929202353a1b2e33934611125c604b7eed` | The index moved beyond the original audit's `dev255` observation. Preserve this first-pass receipt. |
| Same vLLM index, independent review at 22:35 UTC | `0.32.0rc1.dev258+g9b99ccb56`, commit reference `9b99ccb56bc90d9f6524f0861af274ea2af02f70` | The index moved again. This later publication was captured separately; its source tree and wheel bytes were not inspected. Check feature inclusion at that exact reference before testing. |
| Same vLLM index, benchmark-plan recheck at 22:51 UTC | `0.32.0rc1.dev260+gd92a4f25f`, advertised commit `d92a4f25f270a4c9e3a4ceb5c0fad0035e200936` | Another publication observation; preserve its own receipt and qualify the downloaded artifact before use. |
| SGLang CUDA 13 wheel index | `0.5.22.dev20261015+ga12814c158`, CPython 3.12, x86_64 | Check Python, architecture and platform requirements; retain the downloaded wheel hash and dependency resolution. The index checksum has not been checked against downloaded bytes here. |
| SGLang CUDA 13 development container | `nightly-dev-cu13-20261015-a6a8c560`, amd64 and arm64 manifests | Different source label from the wheel and current main. Pin the correct platform manifest, not only a mutable tag. |
| SGLang CUDA 13.4 nightly container | Observed `nightly-cu134-20261015-f7ad434` has an arm64 manifest | Newer publication time does not select the correct image for an x86_64 host. Inventory the actual node architecture first. |
| KServe controller development publication | `llmisvc-controller:latest` registry metadata observed separately from release and master source | A mutable development image is not a verified source-to-image mapping or a selected production/nightly stack. Pin controller, router, CRDs and engine independently. |

[VEXP-NIGHTLY](https://wheels.vllm.ai/nightly/cu130/vllm/), [VEXP-NIGHTLY-CROSS](https://wheels.vllm.ai/nightly/cu130/vllm/), [GEXP-NIGHTLY-WHEELS](https://sgl-project.github.io/whl/cu130/sglang/), [GEXP-NIGHTLY-TAGS](https://hub.docker.com/v2/repositories/lmsysorg/sglang/tags?page_size=10&name=nightly&ordering=last_updated). The successive vLLM response hashes and times are distinct records in the evidence register, including [BPLAN-V-NIGHTLY-WHEELS](https://wheels.vllm.ai/nightly/cu130/vllm/). The [benchmark-plan recheck](../evidence/updates/2026-10-16-model-benchmarks/upstream-recheck.json) also records unchanged SGLang and KServe publication observations. KServe's exact registry reference and its limits are recorded in the [KServe source review](../frameworks/kserve/ARCHITECTURE.md).

The lock preserves observed registry index/platform digests and wheel metadata. Those identify published references; no container layers or wheel bodies were pulled. An embedded source commit, CUDA/PyTorch build, compiler targets and kernel dependencies still need inspection in the chosen artifact before an experiment is reproducible.

## Recent changes that justify targeted experiments

| Engine/layer | Change worth investigating | What the experiment must establish |
| --- | --- | --- |
| vLLM speculation | Random-draw reuse, stop-trim accounting and draft-slot budgeting fixes on main | Sampling correctness, stop/reuse/cancellation state and goodput under the same natural acceptance workload; a throughput-only smoke test misses these failures. |
| vLLM memory/state | cuBLAS initialization before the memory snapshot; Mamba block-table gather fusion | Real memory headroom and applicable hybrid-state overhead. A local kernel improvement is not an equal end-to-end gain. |
| vLLM model-specific paths | GLM draft-metadata optimization and quantized shared draft heads | Respect the gates: the reviewed GLM path requires DCP=1, PCP=1 and no HiSparse; the shared-head change excludes the Gemma4 MTP and DSpark/DFlash paths reviewed. |
| SGLang caches/graphs | Recurrent-state, HiCache/SWA backup and Qwen draft/verification graph work | Reuse correctness after eviction/cancellation and the applicable architecture's pool/graph cost; do not assume every cache backend serves every model. |
| SGLang parallel paths | Expert-routing sentinel, Kimi graph-input and DeepSeek compressed-length fixes | Correct rank mapping, replay inputs and sparse-context behavior on the selected backend. Several paths bypass the changed code. |
| KServe master | Specific SGLang runtime templates, DisaggregatedSet rollout/scaling work and dependency changes | Stable versus master API availability, rendered configuration, engine/router compatibility, startup/recovery and routing behavior. These are control-plane experiments. |

Primary changes, immutable source links and applicability details are in the expanded [vLLM source review](../frameworks/vllm/SOURCE_REVIEW.md), [SGLang source review](../frameworks/sglang/SOURCE_REVIEW.md) and [KServe architecture review](../frameworks/kserve/ARCHITECTURE.md). The corresponding [vLLM](../frameworks/vllm/EXPERIMENTS.md), [SGLang](../frameworks/sglang/EXPERIMENTS.md) and [KServe](../frameworks/kserve/EXPERIMENTS.md) experiment cards define controls, measurements and rejection criteria.

## Three traps exposed by source review

**Merged before publication does not prove release inclusion.** A release branch can omit a commit merged to main before its publication time. SGLang's Qwen graph-preparation change is a concrete example in the refreshed source review. Check the release's actual file or ancestry rather than comparing dates alone.

**A kernel row does not prove a model uses it.** The reviewed vLLM MegaMoE NVFP4 feature-matrix change adds a lower-level path without a model caller in that patch. It is useful future implementation evidence, not permission to invent a backend flag or claim that every NVFP4 checkpoint is faster. [VEXP-61538](https://github.com/vllm-project/vllm/pull/61538).

**A template does not prove it is active.** KServe's endpoint-picker configuration depends on image/version selection. The stable default and master dependency stack can select different paths even when similarly named preset files exist. Inspect the rendered deployment and effective scheduler configuration; the [KServe review](../frameworks/kserve/ARCHITECTURE.md) gives the exact selection gate.

## Upgrade procedure and promotion decision

Follow [X01–X09 in the experiment roadmap](EXPERIMENTS.md). First qualify the exact artifact with target-only loading and representative quality checks. Compare baseline and candidate using identical effective precision, topology, serialized workload, cache state and objectives. Then isolate features within the candidate where supported. Include long context, cancellation, eviction, stop handling and graph replay before a speed claim; measure natural speculative acceptance and keep the target-only baseline.

Use the [run-record template](../benchmarks/experiment.template.json) for immutable identities, dependency versions, effective flags, workload hashes, predeclared thresholds and results. Promote only after repeated measurements meet quality, latency, error and capacity requirements. A regression can justify keeping stable even when main contains a promising optimization. Preserve the previous artifact and rollback procedure.

No profile has been promoted to tested status by this update. No missing model support has been inferred from a neighboring architecture, and no engine was installed or launched.
