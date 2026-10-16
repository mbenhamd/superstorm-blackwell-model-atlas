# Superstorm · Blackwell model atlas

Deep understanding of eight model families on one **8×NVIDIA B300** node: architecture, memory, precision, inference engines and optimization tradeoffs.

Start with [START_HERE](START_HERE.md), then [compare the models](reports/comparison.md). [LIMITATIONS](LIMITATIONS.md) distinguishes known facts, publisher claims and unresolved questions. Research refreshed **October 16, 2026 UTC**.

## Hardware → model → precision → engine

| Area | Read |
| --- | --- |
| Hardware | [B300 memory, topology and bandwidth](hardware/B300-8GPU.md) |
| Architecture | [Cross-model comparison](reports/comparison.md), then a family below |
| Memory | [Weights, KV, recurrent state and workspaces](reports/memory-math.md) |
| Quantization | [NVFP4, MXFP4, FP8 and actual kernel execution](reports/precision-and-kernels.md) |
| Attention | [FlashAttention, FA4, FP8 arithmetic, paging and model-specific sparsity](reports/attention-and-fa4.md) |
| Engines | [vLLM](frameworks/vllm/SOURCE_REVIEW.md), [SGLang](frameworks/sglang/SOURCE_REVIEW.md), [selection tradeoffs](frameworks/DECISION.md) |
| Deployment layer | [KServe architecture and integration limits](frameworks/kserve/ARCHITECTURE.md) |
| Optimization | [Unique prompts, multi-turn chat and coding agents](reports/optimization.md) |
| Configuration | [Source-derived parameter reference](reports/configuration-reference.md) |
| Recent changes | [Stable, main and nightly](reports/nightly-readiness.md) |
| Report corrections | [Verified findings from the supplied report](reports/report-review.md) |

## Model families

| Company | Model | Main systems question |
| --- | --- | --- |
| Moonshot | [Kimi K3](companies/moonshot-ai/kimi-k3/README.md) | Huge expert residency, KDA/MLA state, mixed quantization and engine-specific drafts |
| Z.ai | [GLM 5.3](companies/z-ai/glm-5.3/README.md) | Sparse MLA/indexer, exporter differences and MTP |
| Z.ai | [GLM 5.3 Flash](companies/z-ai/glm-5.3-flash/README.md) | KDA plus sparse MLA, mixed draft precision and state allocation |
| DeepSeek | [V4 Flash 0731](companies/deepseek/deepseek-v4-flash-0731/README.md) | Compressed history, exact July-31 serialization and bundled DSpark |
| Qwen | [3.8 27B](companies/alibaba-qwen/qwen3.8-27b/README.md) | Dense hybrid state, TP1 replication and template fidelity |
| Qwen | [3.8 Flash Next](companies/alibaba-qwen/qwen3.8-flash-next/README.md) | PLE/ngram placement, sparse attention and MTP |
| Google | [Gemma 4 31B IT](companies/google/gemma-4-31b-it/README.md) | Local/global attention, tool quality and shared-cache drafting |
| Mistral | [Medium 3.5](companies/mistral-ai/mistral-medium-3.5/README.md) | Dense FP8 residency, full-history KV and EAGLE |

Each family has an overview, architecture, precision, serving explanation and source links. [GLOSSARY](GLOSSARY.md) explains the terminology. The [model catalog](catalog/models.json) and [configuration catalog](catalog/configurations.json) hold the consolidated machine-readable records.

## Scope

This repository holds research and reference knowledge. Test harnesses, benchmark execution/results, deployment tools and detailed run campaigns belong in the separate execution repository. The earlier infrastructure and audit bundles remain recoverable from Git history.

Source-derived configurations are **not measured B300 winners**. The actual OEM node inventory, exact engine image and workload determine usable capacity and performance. KServe manages services; vLLM and SGLang execute inference.

The [evidence register](evidence/README.md) retains primary links, retrieval dates and immutable model/source identities. Authored content uses [LICENSE](LICENSE); upstream code and model artifacts retain their own terms.
