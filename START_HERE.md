# Technical scope and repository navigation

This atlas documents eight model families on an 8×NVIDIA B300 reference node, with vLLM or SGLang executing inference inside the required KServe platform. Analysis separates architecture, checkpoint representation, runtime implementation, hardware constraints and workload objectives. Recommendations require an explicit connection between those layers and supporting evidence.

## Retrieval map

| Analysis area | Entry point | Information to extract |
| --- | --- | --- |
| Scope and uncertainty | [LIMITATIONS](LIMITATIONS.md) | Unmeasured quantities, missing node inventory and unresolved compatibility |
| Hardware | [B300 reference](hardware/B300-8GPU.md) | Capacity units, compute capability, interconnect and software compatibility |
| Model identity | [Model catalog](catalog/models.json), [family index](README.md#model-families) | Exact target/export/draft, architecture, revision and source IDs |
| Model mechanisms | Each family's `architecture.md`, `precision.md`, `serving.md` | Tensor/state layout, quantization exclusions, loader/backend requirements and serving consequences |
| Cross-model analysis | [Comparison](reports/comparison.md), [memory accounting](reports/memory-math.md) | Component counts, cache/state scaling and placement assumptions |
| GPU execution | [Precision and kernels](reports/precision-and-kernels.md), [attention and FA4](reports/attention-and-fa4.md) | Storage versus arithmetic precision, kernel dispatch and shape restrictions |
| Runtime and platform | [vLLM](frameworks/vllm/SOURCE_REVIEW.md), [SGLang](frameworks/sglang/SOURCE_REVIEW.md), [KServe](frameworks/kserve/ARCHITECTURE.md) | Inspected implementation paths, version boundaries and integration requirements |
| Optimization | [Workload analysis](reports/optimization.md), [engine comparison](frameworks/DECISION.md) | Bottleneck hypothesis, tradeoffs, rejection conditions and unresolved measurements |
| Configuration | [Reference explanation](reports/configuration-reference.md), [configuration catalog](catalog/configurations.json) | Historical argument snapshots and their evidence/status; these are untested references |
| Evidence and revisions | [Evidence conventions](evidence/README.md), [source registry](evidence/sources.json), [upstream identities](evidence/upstreams.lock.json), [release/main/nightly analysis](reports/nightly-readiness.md) | Supporting artifact, retrieval date, immutable identity and scope of verification |
| Definitions and corrections | [Glossary](GLOSSARY.md), [report review](reports/report-review.md) | Terminology, corrected claims and remaining discrepancies |

Resolve each cited source ID through `sources[ID]` in `evidence/sources.json`. Catalogs support discovery; the cited primary artifact establishes what a claim actually supports. A historical configuration can retain an older source identity after a family report gains newer findings. For B300/vLLM v0.31, read `vllm_v031_b300_review` first, then filter configurations by `reference_scope`; [catalog interpretation and lookup examples](reports/configuration-reference.md#choosing-a-record-for-analysis) explain the distinction.

## System boundaries

| Component | Defines | Required distinction |
| --- | --- | --- |
| Architecture | Layer operations, attention, experts, recurrent state, multimodal and output paths | Architectural capability does not establish engine support |
| Checkpoint and input artifacts | Trained tensors, quantization metadata, tokenizer, processor and chat template | A derivative or changed template can have a different compatibility contract |
| vLLM / SGLang | Scheduling, cache/state allocation, model loading and kernel dispatch | A registered model class does not establish support for every export or feature combination |
| CUDA / kernel libraries | GPU operations for supported targets, shapes, layouts and dtypes | Hardware capability and library presence do not establish actual runtime dispatch |
| KServe | Kubernetes serving resources, lifecycle, rollout and routing integration | Installed resource kinds and runtime templates must be identified separately from engine flags |

**KServe is a deployment requirement.** The installed version, resource kind and integration remain unknown. Its lifecycle and routing responsibilities are distinct from numerical model execution. [KS](https://kserve.github.io/website/docs/intro) [KSRT](https://kserve.github.io/website/docs/model-serving/generative-inference/overview) [KSLLM](https://kserve.github.io/website/docs/model-serving/generative-inference/llmisvc/llmisvc-overview)

## Execution and resource model

Tokenization and chat serialization produce model input IDs; embeddings and any applicable multimodal encoder produce input representations. Decoder layers update those representations, and the output head and sampler produce continuation tokens. The exact operations and input protocol are model-specific. [qwen3.8-27b-CARD](https://huggingface.co/Qwen/Qwen3.8-27B/raw/1d4bf0f2ff6012fd82039f2fa52739d0dd7c60c0/README.md) [gemma-4-31b-it-CFG](https://huggingface.co/google/gemma-4-31B-it/raw/842da3794eaa0b77d5f08bae87a17459d91ff475/config.json) [mistral-medium-3.5-CFG](https://huggingface.co/mistralai/Mistral-Medium-3.5-128B/raw/22b2b868a15677cfa6061277ed2f653d1349a9ab/config.json)

**Prefill** processes uncached input tokens and initializes or extends attention/recurrent state. **Decode** extends the sequence using retained state; speculative execution additionally proposes and verifies multiple tokens. Their compute, memory and scheduling costs depend on architecture, sequence length, batch size and implementation. [Workload analysis](reports/optimization.md).

Dense feed-forward layers execute without selecting a subset of experts. MoE routing selects experts per token. Unselected expert weights still require storage; GPU residency depends on the placement and offload path. **Active-parameter counts describe selected computation under a stated counting convention; stored tensor bytes and placement determine weight residency.** Shared experts and other model components require separate accounting. [kimi-k3-CARD](https://huggingface.co/moonshotai/Kimi-K3/blob/f831ab66814297da540d832a5235f8e904f29d06/README.md) [glm-5.3-flash-CARD](https://huggingface.co/zai-org/GLM-5.3-Flash/raw/46a050bec13002ad29ee795c16e61cf4fa3c4a9c/README.md)

Memory accounting must include target and draft weights, quantization metadata, attention history/indexes, recurrent/convolution state, activations, graph and kernel workspaces, communication buffers and allocator overhead. Recurrent-state snapshots for prefix reuse or speculative rollback can exceed the storage of a single state matrix. Each component has its own sharding and lifetime rules. [Memory accounting](reports/memory-math.md), [Qwen hybrid state](companies/alibaba-qwen/qwen3.8-27b/architecture.md), [Kimi draft/state allocation](companies/moonshot-ai/kimi-k3/dspark.md).

Weight, activation, KV/history, indexer, recurrent-state and draft precision are separate choices. BF16 and FP8 specify value formats; NVFP4 and MXFP4 additionally use distinct block-scaling layouts. Mixed exports require tensor-level accounting and compatible loader/kernel paths. A checkpoint label alone does not identify attention arithmetic or cache precision. [Precision and kernels](reports/precision-and-kernels.md), [NV4](https://developer.nvidia.com/blog/introducing-nvfp4-for-efficient-and-accurate-low-precision-inference/), [CUDNN](https://docs.nvidia.com/deeplearning/cudnn/latest/operations/BlockScaling.html).

## Analysis and justification procedure

1. **Define applicability.** Identify model/export/draft revisions, engine version or commit, hardware allocation, KServe integration and workload. Mark missing inputs explicitly.
2. **Trace the mechanism.** Connect the architecture to stored tensors, request state, precision, sharding and the inspected execution path. Keep prefill, decode and speculative verification costs distinct.
3. **Recheck the evidence.** Follow the source ID to the primary artifact and verify the supporting passage, configuration field or implementation. Apply the [two-pass review procedure](evidence/README.md#two-pass-claim-review); two repeated descriptions of one publisher result are not independent corroboration.
4. **Derive the tradeoff.** State the expected bottleneck, the proposed change, its costs and the conditions under which it would help or fail. Show units, formulas and per-rank assumptions for calculations.
5. **Bound the conclusion.** Label publisher statements, source observations, calculations and untested candidates separately. A recommendation must identify the evidence still needed to establish runtime correctness, quality or performance.

For a new task involving current support, refresh the relevant upstream releases, main commits, model revisions and development artifacts before using historical findings. The repository's research date does not establish current runtime support. Execution and benchmark results remain in the separate execution repository; this atlas contains no reproduced B300 serving results.
