# Technical glossary

Definitions identify mechanisms and serving implications. Architecture-specific applicability is documented in the model reports; numeric and kernel claims are sourced in [the evidence register](evidence/sources.json), [precision report](reports/precision-and-kernels.md) and [framework reviews](frameworks/DECISION.md). Unverified acronym expansions remain literal project/configuration names. A glossary definition does not establish runtime support for a specific model or artifact.

## Token

**Tokenizer unit.** A piece of text or a model-specific input symbol, not necessarily a word.

## Tokenizer / chat template

**Text encoding and conversation serialization.** Convert content and roles into the exact IDs/boundaries the model learned. Wrong tool/reasoning boundaries can break an otherwise fluent endpoint.

## Parameter / weight

**Learned numerical value.** Total weights drive storage; active weights approximate work per token only under stated accounting.

## Dense

**All ordinary feed-forward layers participate.** No expert router chooses a small subset of the model’s MLPs per token.

## MLP / FFN

**Multilayer perceptron / feed-forward network.** The transformations within a decoder block after or alongside attention; can be dense or replaced by experts.

## MoE

**Mixture of Experts.** A router chooses a small number of expert networks per token. All experts require storage; offloading changes placement and GPU residency.

## Top-k routing

**Select k routed experts.** The number of selected experts is not the number resident in memory. Shared experts can add work beyond routed top-k.

## Shared expert

**Always-used expert branch in the relevant architecture.** Distinguish always-on shared computation from token-selected routed experts.

## Latent MoE

**Experts operating through a reduced representation.** Kimi projects into a smaller expert space and back. Layer dimensions and kernels must match that interface.

## Attention

**Context-dependent information lookup.** Query/key comparisons determine how values contribute to a token’s representation.

## MHA / GQA / MQA

**Multi-head / grouped-query / multi-query attention.** Query heads can share key/value heads, reducing cached K/V. Always read explicit dimensions.

## KV cache

**Key/value cache.** Saved attention data avoids recalculating past token projections. It grows with context in ordinary full attention.

## MLA

**Multi-head Latent Attention.** A model-specific compressed latent representation changes projection and cache layout. Ordinary GQA memory arithmetic is not a full MLA estimate.

## DSA

**DeepSeek Sparse Attention.** An indexed selection mechanism reduces which past representations receive expensive attention. Index and selected-value caches are distinct.

## QSA

**Qwen sparse-attention path.** Qwen’s particular sparse/indexed attention implementation must be read with its own compression and index shapes.

## SWA

**Sliding-window attention.** Restricts a layer’s direct attention to a recent window; some architectures interleave global layers.

## NoPE

**No positional encoding in the named path.** A specific attention path omits ordinary positional encoding; not a claim the whole model has no ordering information.

## RoPE

**Rotary position embedding.** Transforms components according to position. Partial rotary dimensions can differ from total head size.

## YaRN

**A RoPE context-extension method.** Its configured scale/original window affects position handling; a larger limit alone does not guarantee useful long-context accuracy.

## KDA

**Kimi Delta Attention.** A gated recurrent/linear-attention mechanism with its own state and convolution path. It cannot be treated as ordinary token KV alone.

## GDN

**Gated DeltaNet.** A gated delta-rule recurrent attention family used in Qwen hybrids; its state dimension and cache slots affect concurrency.

## SSM / recurrent state

**State-space model / persistent running representation.** Serving terminology may group recurrent caches under SSM/Mamba labels even for different linear-attention architectures.

## Convolution state

**Short recent-input history.** Hybrid blocks may require convolution buffers as well as matrix state. Disaggregation and rollback must preserve both.

## mHC

**Manifold-constrained Hyper-Connections.** Multiple residual streams with constrained mixing; GLM Flash and DeepSeek expose related configuration. Do not infer Qwen gated residuals are identical.

## Sinkhorn iterations

**Iterative matrix normalization.** An implementation mechanism for constrained mixing; iteration count is a real architecture/accuracy parameter, not a free speed knob.

## Residual connection

**Bypass added or mixed with a transformation.** Allows information to flow around a block; newer architectures can mix several residual streams.

## RMSNorm

**Root-mean-square normalization.** Rescales activations using RMS statistics. Fusion can reduce kernel/communication overhead without intentionally changing the mathematical contract.

## GELU / SwiGLU / SiTU

**Activation/operator names.** GELU and gated Swish-family operations differ; Kimi’s SiTU coefficients and scale placement are part of its checkpoint contract. This atlas does not invent an unverified long-form expansion for SiTU.

## PLE / n-gram tables

**Checkpoint labels for lexical/table components.** Flash Next contains a large separately reported n-gram component. The long-form PLE expansion was not independently established here; retain the literal config label.

## MTP / NextN

**Multi-token prediction / implementation naming.** Auxiliary prediction structures can support speculative serving. A legacy config key does not prove the current engine should use its MTP algorithm.

## DSpark

**Speculative-decoding project/method name.** Match target features, checkpoint, proposal semantics and verification implementation. No invented acronym expansion.

## EAGLE

**Speculative-decoding family / engine algorithm option.** An engine’s EAGLE switch can route a model’s built-in MTP implementation; it does not necessarily mean an unrelated external draft model.

## Speculative acceptance

**Verified draft tokens retained.** Use observed acceptance under the actual workload and sampling; simulated acceptance is a synthetic experiment.

## BF16 / FP16

**Brain floating point 16 / 16-bit floating point.** Two-byte formats with different exponent/significand allocations. Neither spelling establishes every tensor’s effective storage dtype.

## FP8 / E4M3 / E5M2

**8-bit floating point / exponent-mantissa allocations.** Smaller numeric formats rely on scaling and calibrated/dynamic ranges. FP8 in a filename is not a complete tensor-level specification.

## NVFP4

**NVIDIA four-bit floating-point representation.** Combines FP4 values with block/global scaling. Scale precision, block size, packing and kernels matter.

## MXFP4 / MXFP8

**Microscaled four-/eight-bit floating point.** Microscaling is a different contract from NVFP4. Kimi native MXFP4/MXFP8 is not the same export as NVIDIA NVFP4.

## W4A4 / W4A8 / W4A16

**Weight bits / activation bits.** Weight and activation precision are independent. These labels do not describe KV-cache or recurrent-state precision.

## FP8_PB_WO

**ModelOpt per-block FP8 weight-only label.** A loader must handle exported block scales, shapes and mixed-module dispatch. Runtime activation processing may still be implementation-specific.

## PTQ / QAT

**Post-training quantization / quantization-aware training.** PTQ transforms a trained checkpoint; QAT exposes training to quantization effects. Either still needs task-quality verification.

## Calibration

**Estimate numeric ranges using representative samples.** Calibration data/algorithm can affect quality. Do not compare exports as if all four-bit artifacts were equivalent.

## ModelOpt / compressed-tensors

**NVIDIA optimization tooling / serialized quantization framework.** Exporter metadata directs loading and kernels. These are tool/format names, not universal interchangeable quantization flags.

## GPU / HBM

**Graphics processing unit / high-bandwidth memory.** The compute accelerator and its local high-bandwidth storage. Advertised capacity is not fully available for weights.

## SM / compute capability

**Streaming multiprocessor / GPU architecture feature level.** Kernels are compiled for compatible GPU targets. B300 is not equivalent to every device marketed as Blackwell.

## SXM / SXM6-AC

**Module/interface designation / user-provided OEM label.** The precise AC-labeled server variant was not independently identified. Check the actual supplier inventory and board topology.

## NVLink / NVSwitch

**NVIDIA GPU interconnect / switching fabric.** Fast GPU communication can make sharding practical; it does not make eight GPUs one uniformly shared memory allocation.

## PCIe / NUMA

**Peripheral Component Interconnect Express / non-uniform memory access.** Host-device paths and CPU-memory locality affect input, communication and startup.

## TP

**Tensor parallelism.** Split tensor work across ranks; introduces communication. Smaller dense models can benefit more from replicas.

## DP

**Data parallelism.** Independent request/data work; attention-DP and full-model replicas are not necessarily the same MoE topology.

## EP

**Expert parallelism.** Distribute experts across existing ranks and route tokens between them. Active expert count does not multiply available memory.

## PP

**Pipeline parallelism.** Place sequential layer stages on different ranks. Scheduling bubbles and batch behavior affect utilization.

## CP / DCP

**Context parallelism / decode context parallelism.** Split context-related attention work/cache under engine-specific semantics. Do not blindly divide all caches and state by this factor.

## Prefill / decode

**Process prompt / generate subsequent tokens.** Different workload phases with different compute/bandwidth profiles. Separating them adds transfer and scheduling costs.

## PD disaggregation

**Prefill/decode separation.** Dedicated pools can reduce interference, but hybrid state and KV transfer must match exactly.

## Continuous batching

**Dynamic request scheduling.** Completed requests leave and new ones enter execution without waiting for a fixed batch to finish.

## Paged attention / prefix cache

**Managed KV blocks / reuse of shared prompt work.** Paging improves allocation behavior; prefix caching reuses matching work. Neither proves hybrid-state or cross-tenant isolation is correct.

## Radix cache

**Prefix tree organized cache.** Shared token prefixes can be represented by common tree paths. Eviction, state snapshots and tenant isolation still matter.

## CUDA Graph

**Recorded GPU execution graph.** Replays work with less launch overhead under shape/state constraints; graph capture reserves memory and needs correctness testing.

## GEMM

**General matrix multiplication.** Core tensor operation. Fused or low-precision kernels are useful only for supported shapes, scales and hardware.

## FlashInfer / FlashMLA / DeepGEMM

**Kernel-library project names.** Different libraries implement attention, latent-attention or matrix/MoE paths. Presence in an image does not prove the intended kernel was selected.

## FlashAttention / FA4

**Tiled attention algorithms and kernel implementations.** They avoid materializing the complete attention-score matrix in HBM. FA4 adds hardware-specific scheduling and softmax optimizations. The package name does not establish which kernel an engine selects or whether a model uses dense, sparse or recurrent attention. [Mechanisms and B300 applicability](reports/attention-and-fa4.md).

## Online softmax

**Incremental normalized accumulation across tiles.** Running maxima, normalization sums and output sums let attention process chunks without storing all scores. Rescaling these quantities consistently is essential; conditional rescaling is not permission to discard normalization corrections. [Equations](reports/attention-and-fa4.md).

## SMEM / TMEM / TMA

**Shared memory / tensor memory / Tensor Memory Accelerator.** SMEM stages data accessible to cooperating threads; supported Blackwell paths use TMEM for Tensor Core accumulators and scales; TMA moves tensor tiles asynchronously. These are different resources. B300 and RTX Blackwell do not expose identical kernel targets. [Hardware and FA4](reports/attention-and-fa4.md).

## Sparse attention versus paged storage

**Selection of history versus placement of history.** Sparsity limits the entries an attention operation uses. Paging maps logical cache positions to physical storage blocks. A token-sparse operation can gather individual entries from paged storage; a paged dense operation can still use the entire eligible history. [Dense and sparse paths](reports/attention-and-fa4.md).

## TRT-LLM / CUTLASS

**TensorRT-LLM / CUDA templates for linear-algebra subroutines.** Kernel/backend families may be called by vLLM or SGLang; using a TRT-LLM MoE kernel does not replace the entire serving engine.

## NCCL / DeepEP / all-reduce / all-to-all

**NVIDIA collective communications / expert communication library / collective patterns.** All-reduce combines values; all-to-all redistributes different payloads among ranks. Communication topology must match parallelism.

## NIXL / RDMA

**NVIDIA inference-transfer library (NIXL) / remote direct memory access.** Transfer infrastructure used in some disaggregated designs. Exact buffer/state layouts remain an engine contract.

## vLLM / SGLang

**Serving-runtime project names.** Both coordinate model execution, scheduling and kernels. Their argument names and support details differ.

## KServe / Kubernetes

**Serving control plane / cluster orchestration.** KServe manages serving resources on Kubernetes; it is not a replacement numerical inference engine.

## CRD / CR / controller

**Custom Resource Definition / Custom Resource / reconciliation program.** The CRD defines an API shape; a CR is an instance; the controller acts on it. Schema acceptance alone does not prove model readiness.

## InferenceService / LLMInferenceService

**KServe resource kinds.** The ordinary serving resource and LLM-specialized coordination surface have different version/integration requirements.

## LWS / EPP / Gateway API

**LeaderWorkerSet / endpoint picker / Kubernetes gateway API.** Building blocks for coordinated workers and routing; exact installation and engine adapters must be validated.

## PVC / image digest

**PersistentVolumeClaim / immutable container content identifier.** The PVC supplies storage; a digest pins image content. A syntactically valid digest does not prove availability or model compatibility.

## TTFT / TPOT / ITL

**Time to first token / time per output token / inter-token latency.** Different latency measurements. Semantic SSE chunks are not guaranteed to be individual tokens.

## Throughput / goodput / SLO

**Work per time / acceptable work per time / service-level objective.** More tokens per second can hide poor tail latency or failures. Goodput counts work meeting declared requirements.

## p50 / p95 / p99

**Latency percentiles.** Describe distribution tails, not different forms of average. State how failed requests are handled.

## SSE / API / HTTP

**Server-sent events / application programming interface / Hypertext Transfer Protocol.** Transport and request interfaces. Correct transport does not guarantee correct tokenization or tool semantics.

## GB / GiB

**Decimal gigabyte / binary gibibyte.** One GB is 1e9 bytes; one GiB is 2^30 bytes. Never subtract capacities expressed in different units without converting.

## SHA / pin / nightly

**Content identifier / immutable selection / frequently rebuilt development artifact.** Pin checkpoint and image independently. Main source, a release tag and a nightly image are different objects.
