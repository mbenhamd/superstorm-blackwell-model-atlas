# Glossary: meaning, purpose and analogy

Use the analogies to build intuition, not as exact mathematics. Architecture-specific terms link back to the company reports; numeric and kernel claims are sourced in [the evidence register](evidence/SOURCES.md), [precision report](reports/precision-and-kernels.md) and [framework reviews](frameworks/DECISION.md). Unverified expansions are explicitly left as project/configuration names.

## Token

**Tokenizer unit.** A piece of text or a model-specific input symbol, not necessarily a word.

*Analogy:* A page is cut into differently sized tiles; count tiles, not words.

## Tokenizer / chat template

**Text encoding and conversation serialization.** Convert content and roles into the exact IDs/boundaries the model learned. Wrong tool/reasoning boundaries can break an otherwise fluent endpoint.

*Analogy:* The same message written in the wrong envelope format reaches the wrong desk.

## Parameter / weight

**Learned numerical value.** Total weights drive storage; active weights approximate work per token only under stated accounting.

*Analogy:* All books on the shelves versus the books consulted for one question.

## Dense

**All ordinary feed-forward layers participate.** No expert router chooses a small subset of the model’s MLPs per token.

*Analogy:* One permanent team reviews every paragraph.

## MLP / FFN

**Multilayer perceptron / feed-forward network.** The transformations within a decoder block after or alongside attention; can be dense or replaced by experts.

*Analogy:* An editing workshop transforms what the reader has gathered.

## MoE

**Mixture of Experts.** A router chooses a small number of expert networks per token. All experts still need storage somewhere unless deliberately offloaded.

*Analogy:* A large hospital employs many specialists; only a few see one patient.

## Top-k routing

**Select k routed experts.** The number of selected experts is not the number resident in memory. Shared experts can add work beyond routed top-k.

*Analogy:* Two assigned specialists plus the general practitioner still count as three workers.

## Shared expert

**Always-used expert branch in the relevant architecture.** Distinguish always-on shared computation from token-selected routed experts.

*Analogy:* A common reception desk supports every specialist appointment.

## Latent MoE

**Experts operating through a reduced representation.** Kimi projects into a smaller expert space and back. Layer dimensions and kernels must match that interface.

*Analogy:* Specialists exchange compact forms rather than the entire case folder.

## Attention

**Context-dependent information lookup.** Query/key comparisons determine how values contribute to a token’s representation.

*Analogy:* A reader searches previous notes before choosing the next sentence.

## MHA / GQA / MQA

**Multi-head / grouped-query / multi-query attention.** Query heads can share key/value heads, reducing cached K/V. Always read explicit dimensions.

*Analogy:* Several readers share fewer reference notebooks.

## KV cache

**Key/value cache.** Saved attention data avoids recalculating past token projections. It grows with context in ordinary full attention.

*Analogy:* Keep the reference notes instead of rereading the entire source every time.

## MLA

**Multi-head Latent Attention.** A model-specific compressed latent representation changes projection and cache layout. Ordinary GQA memory arithmetic is not a full MLA estimate.

*Analogy:* Compress the reference folder before storing it, then reconstruct what is needed.

## DSA

**DeepSeek Sparse Attention.** An indexed selection mechanism reduces which past representations receive expensive attention. Index and selected-value caches are distinct.

*Analogy:* A catalog points to relevant shelves rather than scanning every book.

## QSA

**Qwen sparse-attention path.** Qwen’s particular sparse/indexed attention implementation must be read with its own compression and index shapes.

*Analogy:* A different library uses a different catalog; shelf numbers are not interchangeable.

## SWA

**Sliding-window attention.** Restricts a layer’s direct attention to a recent window; some architectures interleave global layers.

*Analogy:* Keep recent pages on the desk, occasionally consult the complete archive.

## NoPE

**No positional encoding in the named path.** A specific attention path omits ordinary positional encoding; not a claim the whole model has no ordering information.

*Analogy:* One index sorts by content, while other mechanisms preserve sequence.

## RoPE

**Rotary position embedding.** Transforms components according to position. Partial rotary dimensions can differ from total head size.

*Analogy:* Position stamps help distinguish otherwise similar entries.

## YaRN

**A RoPE context-extension method.** Its configured scale/original window affects position handling; a larger limit alone does not guarantee useful long-context accuracy.

*Analogy:* Stretch the map’s coordinate scale, then check that landmarks still line up.

## KDA

**Kimi Delta Attention.** A gated recurrent/linear-attention mechanism with its own state and convolution path. It cannot be treated as ordinary token KV alone.

*Analogy:* Maintain and revise a compact notebook as each sentence arrives.

## GDN

**Gated DeltaNet.** A gated delta-rule recurrent attention family used in Qwen hybrids; its state dimension and cache slots affect concurrency.

*Analogy:* The notebook has rules for what to replace, retain or forget.

## SSM / recurrent state

**State-space model / persistent running representation.** Serving terminology may group recurrent caches under SSM/Mamba labels even for different linear-attention architectures.

*Analogy:* A running summary survives between steps; copying it also consumes space.

## Convolution state

**Short recent-input history.** Hybrid blocks may require convolution buffers as well as matrix state. Disaggregation and rollback must preserve both.

*Analogy:* The running summary also carries a small stack of the latest pages.

## mHC

**Manifold-constrained Hyper-Connections.** Multiple residual streams with constrained mixing; GLM Flash and DeepSeek expose related configuration. Do not infer Qwen gated residuals are identical.

*Analogy:* Several parallel discussion threads exchange information under stability rules.

## Sinkhorn iterations

**Iterative matrix normalization.** An implementation mechanism for constrained mixing; iteration count is a real architecture/accuracy parameter, not a free speed knob.

*Analogy:* Repeatedly balance row and column totals until the routing ledger is consistent.

## Residual connection

**Bypass added or mixed with a transformation.** Allows information to flow around a block; newer architectures can mix several residual streams.

*Analogy:* Keep the original draft available while applying an edit.

## RMSNorm

**Root-mean-square normalization.** Rescales activations using RMS statistics. Fusion can reduce kernel/communication overhead without intentionally changing the mathematical contract.

*Analogy:* Adjust loudness without rewriting the speech.

## GELU / SwiGLU / SiTU

**Activation/operator names.** GELU and gated Swish-family operations differ; Kimi’s SiTU coefficients and scale placement are part of its checkpoint contract. This atlas does not invent an unverified long-form expansion for SiTU.

*Analogy:* Different workshop machines need different settings, even when their input sizes match.

## PLE / n-gram tables

**Checkpoint labels for lexical/table components.** Flash Next contains a large separately reported n-gram component. The long-form PLE expansion was not independently established here; retain the literal config label.

*Analogy:* A large phrase dictionary still occupies shelves even when only one entry is looked up.

## MTP / NextN

**Multi-token prediction / implementation naming.** Auxiliary prediction structures can support speculative serving. A legacy config key does not prove the current engine should use its MTP algorithm.

*Analogy:* An attached assistant proposes a continuation, but the main writer approves it.

## DSpark

**Speculative-decoding project/method name.** Match target features, checkpoint, proposal semantics and verification implementation. No invented acronym expansion.

*Analogy:* A fast assistant sketches a phrase before the lead editor checks it.

## EAGLE

**Speculative-decoding family / engine algorithm option.** An engine’s EAGLE switch can route a model’s built-in MTP implementation; it does not necessarily mean an unrelated external draft model.

*Analogy:* The software menu names a workflow, not always the exact assistant employed.

## Speculative acceptance

**Verified draft tokens retained.** Use observed acceptance under the actual workload and sampling; simulated acceptance is a synthetic experiment.

*Analogy:* Count edits the lead editor really accepted, not edits assumed accepted.

## BF16 / FP16

**Brain floating point 16 / 16-bit floating point.** Two-byte formats with different exponent/significand allocations. Neither spelling establishes every tensor’s effective storage dtype.

*Analogy:* Two measuring tapes with the same number of markings but different range/detail trade-offs.

## FP8 / E4M3 / E5M2

**8-bit floating point / exponent-mantissa allocations.** Smaller numeric formats rely on scaling and calibrated/dynamic ranges. FP8 in a filename is not a complete tensor-level specification.

*Analogy:* Write shorter numbers but retain the scale printed beside them.

## NVFP4

**NVIDIA four-bit floating-point representation.** Combines FP4 values with block/global scaling. Scale precision, block size, packing and kernels matter.

*Analogy:* A compact ruler with a small local scale legend for each group.

## MXFP4 / MXFP8

**Microscaled four-/eight-bit floating point.** Microscaling is a different contract from NVFP4. Kimi native MXFP4/MXFP8 is not the same export as NVIDIA NVFP4.

*Analogy:* Two compression formats can use four-bit symbols yet different dictionaries.

## W4A4 / W4A8 / W4A16

**Weight bits / activation bits.** Weight and activation precision are independent. These labels do not describe KV-cache or recurrent-state precision.

*Analogy:* The archived recipe, active worksheet and notebook can each use a different paper size.

## FP8_PB_WO

**ModelOpt per-block FP8 weight-only label.** A loader must handle exported block scales, shapes and mixed-module dispatch. Runtime activation processing may still be implementation-specific.

*Analogy:* The storage label is not a complete instruction manual for the calculation.

## PTQ / QAT

**Post-training quantization / quantization-aware training.** PTQ transforms a trained checkpoint; QAT exposes training to quantization effects. Either still needs task-quality verification.

*Analogy:* Shrink a completed drawing versus practice drawing on the smaller grid.

## Calibration

**Estimate numeric ranges using representative samples.** Calibration data/algorithm can affect quality. Do not compare exports as if all four-bit artifacts were equivalent.

*Analogy:* Set a camera’s exposure using scenes similar to those it will actually photograph.

## ModelOpt / compressed-tensors

**NVIDIA optimization tooling / serialized quantization framework.** Exporter metadata directs loading and kernels. These are tool/format names, not universal interchangeable quantization flags.

*Analogy:* Two manufacturers package similar components with different wiring diagrams.

## GPU / HBM

**Graphics processing unit / high-bandwidth memory.** The compute accelerator and its local high-bandwidth storage. Advertised capacity is not fully available for weights.

*Analogy:* A workshop plus its fast on-site warehouse.

## SM / compute capability

**Streaming multiprocessor / GPU architecture feature level.** Kernels are compiled for compatible GPU targets. B300 is not equivalent to every device marketed as Blackwell.

*Analogy:* Related engines can still require different compatible parts.

## SXM / SXM6-AC

**Module/interface designation / user-provided OEM label.** The precise AC-labeled server variant was not independently identified. Check the actual supplier inventory and board topology.

*Analogy:* A component label is not a complete vehicle specification.

## NVLink / NVSwitch

**NVIDIA GPU interconnect / switching fabric.** Fast GPU communication can make sharding practical; it does not make eight GPUs one uniformly shared memory allocation.

*Analogy:* Fast roads join warehouses, but stock still lives at particular locations.

## PCIe / NUMA

**Peripheral Component Interconnect Express / non-uniform memory access.** Host-device paths and CPU-memory locality affect input, communication and startup.

*Analogy:* Distance to the loading dock matters even with a fast workshop.

## TP

**Tensor parallelism.** Split tensor work across ranks; introduces communication. Smaller dense models can benefit more from replicas.

*Analogy:* Several people work on sections of the same sentence and must synchronize.

## DP

**Data parallelism.** Independent request/data work; attention-DP and full-model replicas are not necessarily the same MoE topology.

*Analogy:* Several reception desks handle separate customers.

## EP

**Expert parallelism.** Distribute experts across existing ranks and route tokens between them. Active expert count does not multiply available memory.

*Analogy:* Specialists occupy different buildings and cases travel between them.

## PP

**Pipeline parallelism.** Place sequential layer stages on different ranks. Scheduling bubbles and batch behavior affect utilization.

*Analogy:* An assembly line waits when the previous station has not delivered its part.

## CP / DCP

**Context parallelism / decode context parallelism.** Split context-related attention work/cache under engine-specific semantics. Do not blindly divide all caches and state by this factor.

*Analogy:* Several archivists divide the reference pages, not necessarily every notebook.

## Prefill / decode

**Process prompt / generate subsequent tokens.** Different workload phases with different compute/bandwidth profiles. Separating them adds transfer and scheduling costs.

*Analogy:* Read the brief first, then dictate the response a word at a time.

## PD disaggregation

**Prefill/decode separation.** Dedicated pools can reduce interference, but hybrid state and KV transfer must match exactly.

*Analogy:* Transfer the case from a reading team to a writing team without losing notes.

## Continuous batching

**Dynamic request scheduling.** Completed requests leave and new ones enter execution without waiting for a fixed batch to finish.

*Analogy:* A restaurant fills available seats as diners leave.

## Paged attention / prefix cache

**Managed KV blocks / reuse of shared prompt work.** Paging improves allocation behavior; prefix caching reuses matching work. Neither proves hybrid-state or cross-tenant isolation is correct.

*Analogy:* Manage notebooks in reusable page blocks and keep copies of common introductions.

## Radix cache

**Prefix tree organized cache.** Shared token prefixes can be represented by common tree paths. Eviction, state snapshots and tenant isolation still matter.

*Analogy:* Many routes share the same first streets before branching.

## CUDA Graph

**Recorded GPU execution graph.** Replays work with less launch overhead under shape/state constraints; graph capture reserves memory and needs correctness testing.

*Analogy:* Record a repeatable production sequence instead of issuing every instruction again.

## GEMM

**General matrix multiplication.** Core tensor operation. Fused or low-precision kernels are useful only for supported shapes, scales and hardware.

*Analogy:* A specialized press processes many entries together.

## FlashInfer / FlashMLA / DeepGEMM

**Kernel-library project names.** Different libraries implement attention, latent-attention or matrix/MoE paths. Presence in an image does not prove the intended kernel was selected.

*Analogy:* A toolkit may contain the correct wrench, but the mechanic still has to use it.

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

*Analogy:* A workshop can use another maker’s machine without changing ownership.

## NCCL / DeepEP / all-reduce / all-to-all

**NVIDIA collective communications / expert communication library / collective patterns.** All-reduce combines values; all-to-all redistributes different payloads among ranks. Communication topology must match parallelism.

*Analogy:* A group totals everyone’s results, or sends different cases to the right specialists.

## NIXL / RDMA

**NVIDIA inference-transfer library (NIXL) / remote direct memory access.** Transfer infrastructure used in some disaggregated designs. Exact buffer/state layouts remain an engine contract.

*Analogy:* A courier can move a folder quickly but cannot fix missing pages.

## vLLM / SGLang

**Serving-runtime project names.** Both coordinate model execution, scheduling and kernels. Their argument names and support details differ.

*Analogy:* Two workshop operating systems, each with different compatible machinery.

## KServe / Kubernetes

**Serving control plane / cluster orchestration.** KServe manages serving resources on Kubernetes; it is not a replacement numerical inference engine.

*Analogy:* The building manager assigns rooms and health checks; the workshop still performs the work.

## CRD / CR / controller

**Custom Resource Definition / Custom Resource / reconciliation program.** The CRD defines an API shape; a CR is an instance; the controller acts on it. Schema acceptance alone does not prove model readiness.

*Analogy:* A form template, a completed order, and the staff who actually fulfill it.

## InferenceService / LLMInferenceService

**KServe resource kinds.** The ordinary serving resource and LLM-specialized coordination surface have different version/integration requirements.

*Analogy:* A standard booking versus a coordinated multi-room production order.

## LWS / EPP / Gateway API

**LeaderWorkerSet / endpoint picker / Kubernetes gateway API.** Building blocks for coordinated workers and routing; exact installation and engine adapters must be validated.

*Analogy:* Keep a team together and send each customer to the correct entrance.

## PVC / image digest

**PersistentVolumeClaim / immutable container content identifier.** The PVC supplies storage; a digest pins image content. A syntactically valid digest does not prove availability or model compatibility.

*Analogy:* A warehouse reservation and a sealed versioned toolbox.

## TTFT / TPOT / ITL

**Time to first token / time per output token / inter-token latency.** Different latency measurements. Semantic SSE chunks are not guaranteed to be individual tokens.

*Analogy:* Wait for the speaker to begin, then measure pace; sentence delivery is not syllable timing.

## Throughput / goodput / SLO

**Work per time / acceptable work per time / service-level objective.** More tokens per second can hide poor tail latency or failures. Goodput counts work meeting declared requirements.

*Analogy:* Meals produced versus meals delivered correctly and on time.

## p50 / p95 / p99

**Latency percentiles.** Describe distribution tails, not different forms of average. State how failed requests are handled.

*Analogy:* Most customers wait briefly, but the longest queues still matter.

## SSE / API / HTTP

**Server-sent events / application programming interface / Hypertext Transfer Protocol.** Transport and request interfaces. Correct transport does not guarantee correct tokenization or tool semantics.

*Analogy:* The telephone line works, but the participants must still speak the same protocol.

## GB / GiB

**Decimal gigabyte / binary gibibyte.** One GB is 1e9 bytes; one GiB is 2^30 bytes. Never subtract capacities expressed in different units without converting.

*Analogy:* Kilometers and miles can describe the same road but not with the same number.

## SHA / pin / nightly

**Content identifier / immutable selection / frequently rebuilt development artifact.** Pin checkpoint and image independently. Main source, a release tag and a nightly image are different objects.

*Analogy:* A dated blueprint does not identify the exact assembled machine.
