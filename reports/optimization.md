# Optimization on one 8×B300 node

The useful configuration depends on **what the model stores, what each token computes, and what the application repeats**. This page keeps the reasoning and known constraints; executable benchmarks and results belong in the separate execution repository.

## Start with the limiting resource

| Limit | Why it appears | Optimization that may help | Cost or qualification question |
| --- | --- | --- | --- |
| Weight residency | All stored experts occupy memory even when few run per token | Quantized export; TP/EP placement; supported component offload | Exact mixed precision, scale layout, quality and transfer cost |
| Weight-read bandwidth | Low-concurrency decode repeatedly reads a large weight set | Lower-byte weights; wider sharding; effective speculation | Actual kernels and collectives may erase the gain |
| Prefill compute | Many input tokens are processed together | Efficient attention/GEMM backend; batching; supported context parallelism | Sparse/recurrent paths can restrict the available topology |
| KV/history capacity | Long histories and many active sequences retain attention state | Context/admission limits; supported cache precision; prefix reuse | Accuracy, cache scaling and model-specific state accounting |
| Recurrent-state capacity | Hybrid layers retain state and snapshots for reuse or rollback | State-pool sizing and applicable state-cache mechanisms | Tokens, sequences and saved snapshots consume different pools |
| Communication | TP reductions or MoE dispatch cross devices | Topology-aware rank placement; fewer ranks; balanced experts | Narrower placement can increase per-rank work or exceed HBM |
| Scheduling/queueing | Long prefills compete with interactive decoding | Chunked prefill, token budgets, batching and additional replicas | Fairness and total throughput can conflict with one-request latency |
| Agent reliability | A bad tool call or patch adds retries and context | Faithful templates/parsers, adequate reasoning and retained precision | A faster turn can produce a slower or failed complete task |

The [memory explanation](memory-math.md), [precision primer](precision-and-kernels.md) and [engine reviews](../frameworks/DECISION.md) trace these mechanisms to specific architectures and implementations. These are possible mechanisms, not measured gains.

## Unique prompts, chat and coding agents

| Workload | What is reused | What to prioritize | Common mistaken conclusion |
| --- | --- | --- | --- |
| One unique prompt | Usually only a shared system/template prefix | Useful-answer latency, prefill versus decode cost, supported TP and precision | More replicas will accelerate the same single request |
| Many independent prompts | Weights and the warm runtime; little semantic prefix | Aggregate useful throughput within latency limits | The fastest single-request configuration is the best fleet layout |
| Multi-turn chat | Token-identical history and sometimes recurrent snapshots | Prefix/state correctness, session routing, cache capacity and turn latency | Prefix caching is durable conversation storage |
| Agentic coding | System/tools, repository context and previous turns | Correct tools/patches and whole-task wall time | Faster token generation necessarily completes more coding tasks |

For unique prompts, distinguish **runtime warmup** from a **warm semantic prefix**. Graph/compile preparation can be complete while the request's cache is cold. Repeated synthetic prompts can accidentally become cache-hit measurements. vLLM's benchmark documentation explicitly warns about this. [RR-BENCH-VLLM-CLI](https://raw.githubusercontent.com/vllm-project/vllm/fa75d3456d60a5ffe923818c4b495295675b38e1/docs/benchmarking/cli.md)

For chat, the application still sends or reconstructs conversation history. Changing an earlier turn, template, reasoning-retention policy or tool schema changes the reusable prefix. Affinity may preserve useful state but overload one replica; a cache-aware router needs compatible backend observations and an explicit load/health policy. [KServe integration](../frameworks/kserve/ARCHITECTURE.md)

For coding agents, preserve exact tool and reasoning serialization. Consider completion quality and episode wall time together. Tool calls can run concurrently, so adding model/tool/test durations can double-count overlapping work; wall time and a trace describe different aspects. A public coding score is evidence about that benchmark setup, not a speed prediction for the user's agent.

## TP, EP and replicas answer different questions

**Tensor parallelism** splits suitable operators across GPUs. It can reduce per-rank weight/work but introduces communication. **Expert parallelism** distributes experts and routes tokens to them; it may use an existing TP/DP world rather than multiplying its GPU count again. **Independent replicas** serve different requests and maintain separate caches. Data-parallel attention inside an EP model is not automatically a set of independent complete-model replicas.

On eight physical GPUs, feasible independent placements include 1×TP8, 2×TP4, 4×TP2 or 8×TP1 **only where the exact model implementation and memory allow them**. No equation establishes the winner. One request cannot use extra independent replicas to accelerate its own decode. Many concurrent requests may benefit from narrower replicas, but a wider instance can batch or use bandwidth more effectively.

The actual NVLink/NVSwitch and CPU/NUMA layout matters. Do not import the topology of a DGX B300 or Grace-based GB300 into the user's unspecified SXM6-AC node. [Hardware](../hardware/B300-8GPU.md)

## Family-specific optimization questions

| Family | Evidence-backed starting point | Unique prompt | Multi-turn chat | Coding agents |
| --- | --- | --- | --- | --- |
| [Kimi K3](../companies/moonshot-ai/kimi-k3/serving.md) | TP8, exact native or supported NVIDIA mixed export | Target bandwidth and compatible DSpark draft cost | KDA/MLA snapshots, rollback and cache reuse | Native versus derivative quality; engine-specific drafts; DFlash training/workload mismatch |
| [GLM 5.3](../companies/z-ai/glm-5.3/serving.md) | Native FP8 or exact NVFP4 exporter; TP8 reference, documented lower-TP alternatives | MLA/indexer backend, MTP and TP width | Sparse history, parser fidelity and replica routing | Compare exporters at the same quality; avoid attributing exporter/topology changes to engine alone |
| [GLM 5.3 Flash](../companies/z-ai/glm-5.3-flash/serving.md) | Exact hybrid-model recipe; TP4 candidate | KDA/sparse-MLA kernels and native MTP route | Recurrent and sparse pools, reuse boundaries | Mixed draft precision, multimodal/tools and reasoning policy |
| [DeepSeek 0731](../companies/deepseek/deepseek-v4-flash-0731/serving.md) | Native documented TP/DP/EP paths; NVIDIA derivative has separate TP8 evidence | Native DSpark and compressed attention | Exact July-31 encoding and compressed/SWA state | Target-only quality before derivative speculation; no V4.1 support transfer |
| [Qwen 27B](../companies/alibaba-qwen/qwen3.8-27b/serving.md) | TP1 BF16, official FP8 or exact NVIDIA mixed export | Precision/kernel choice; TP2 only a comparison | GDN snapshots plus full-attention cache; faithful template | Native MTP versus target-only, correct tools and reasoning serialization |
| [Qwen Flash Next](../companies/alibaba-qwen/qwen3.8-flash-next/serving.md) | NVIDIA vLLM TP8 recipe; SGLang TP1 is an unverified B300 candidate | PLE placement, QSA constraints and MTP | Ngram, recurrent and sparse history costs | Retained thinking policy and mixed MTP; no exporter substitution |
| [Gemma 31B](../companies/google/gemma-4-31b-it/serving.md) | TP1 base/FP8/NVFP4 references | Local/global attention and newly identified assistant | Heterogeneous cache plus template revision | Task-specific quantization quality, exact tool template and assistant pairing |
| [Mistral Medium](../companies/mistral-ai/mistral-medium-3.5/serving.md) | Publisher FP8 TP8 reference; narrower TP remains a capacity/performance question | Full-history KV and separate EAGLE cost | Context length, replica cache locality and vision | EAGLE embedding/head alignment, tools and complete-task quality |

Each linked serving page supplies the primary evidence and exact caveats. A documented topology is a known starting path, not proof that it is optimal on B300.

## Precision and speculation are component decisions

An NVFP4 model name does not describe every tensor or operation. Keep separate: target weights, activations, KV/history, sparse-index state, recurrent state and draft weights/state. PLE tables, embeddings, shared experts, routers, heads and vision modules can stay at different precision. The loaded representation can also differ from on-disk packing. [Precision and kernels](precision-and-kernels.md)

Speculation replaces some sequential target steps with proposal and verification work. Its value depends on accepted length, draft cost, verification cost, extra memory and batching. A high acceptance ratio can still lose overall. Native MTP, bundled DSpark, an external DSpark draft, DFlash and EAGLE have different model/state contracts; a generic speculation flag does not make them interchangeable.

Target-only is the reference for understanding the change. Natural acceptance under the actual sampler matters. Extra draft memory can prevent a useful replica or shrink the history pool. A cache or rollback error matters even when isolated token throughput improves.

## Context, memory fractions and scheduling

Set the service context for the workload. The complete serialized input, tools/images/retained reasoning and requested output must fit the cap. A 128K input plus generated output does not fit a 128K service cap. Maximum advertised context is an architectural limit, not a recommended starting allocation.

Memory-utilization fractions are engine-specific budgeting inputs. They are not a hard partition or guaranteed operational reserve; explicit cache-size options and model-specific pools can alter their effect. `auto` cache dtype can be influenced by export metadata. Compare effective settings and actual state capacity, not equal numeric flags across engines. [vLLM controls](../frameworks/vllm/SOURCE_REVIEW.md), [SGLang controls](../frameworks/sglang/SOURCE_REVIEW.md)

Chunked prefill and batching manage competition among requests. Their benefit depends on prompt lengths, queue depth and the model's supported cache/state path. Disabling chunking is not a valid comparison if that implementation requires it. Async scheduling reduces some host overhead; it does not override model/backend incompatibilities.

## KServe's role on this node

KServe can manage service lifecycle, routing and integration with a Kubernetes platform. It does not create GPU capacity or replace the inference engine. A single TP8 instance leaves no GPUs for a concurrent replacement; two TP4 instances likewise consume the node. Prefill/decode disaggregation needs model-specific state transfer and a total allocation that fits eight GPUs. Begin with the engine's known behavior before adding orchestration. [KServe architecture](../frameworks/kserve/ARCHITECTURE.md)

The research priority is to explain why a change could help and where it can fail. Benchmark implementation and results are maintained separately; this repository records no unmeasured speedup as fact.
