# Superstorm · Blackwell model atlas

Technical reference for twelve model families on one **8×NVIDIA B300** node: architecture, memory, precision, inference engines and optimization tradeoffs, with dated sources and explicit applicability limits.

**Infrastructure requirement: KServe is mandatory.** All deployment guidance assumes the existing KServe platform, with vLLM or SGLang providing inference.

The [retrieval map](START_HERE.md) connects each model to its configurations, sources and [limits of the evidence](LIMITATIONS.md). On November 20, 2026, the upstream stable releases were **vLLM v0.34.0**, **SGLang v0.5.23** and **KServe v0.21.0**. Mistral Large 4 FP8 and NVFP4 now have vLLM release support. Kimi K3.1 Pro remains a development-build candidate on both engines. The installed KServe version and runtime integration are unknown. [Release and development channels](reports/nightly-readiness.md#november-20-release-and-channel-observation).

Read the [vLLM v0.34.0 upgrade review](reports/vllm-v034-upgrade.md) and the [SGLang stable and development comparison](reports/sglang-2026-11-20.md) for model-specific changes. The [precision review](reports/precision-and-kernels.md#nvfp4-export-recipes-and-engine-dispatch) covers export recipes. The [benchmark guide](reports/benchmark-insights.md#measuring-the-effect-of-an-nvfp4-recipe) identifies the controls needed to attribute a change to the recipe, engine or workload. The atlas contains no measured B300 engine ranking.

## Hardware → model → precision → engine

Choose the [workload and quality comparison](reports/optimization.md#nvfp4-comparisons-on-eight-b300-gpus) before choosing a topology. Each family’s serving page and catalog review identify candidate configurations, engine constraints and remaining measurements. Earlier [memory](reports/memory-math.md) and [attention/FA4](reports/attention-and-fa4.md) analyses retain their original eight-family scope. The [cross-model comparison](reports/comparison.md) covers all twelve.

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
| Benchmark insights | [GuideLLM/vLLM measurements, diagnostic insights and dashboard layout](reports/benchmark-insights.md) |
| Model quality (third-party) | [Artificial Analysis Intelligence Index v5.0/v5.0.1 for catalog and frontier models](reports/intelligence-index.md) |
| Workload datasets | [Bash-only agentic coding](workloads/agentic-bash-coding/README.md) |
| Configuration | [Source-derived parameter reference](reports/configuration-reference.md) |
| Recent changes | [Stable, main and nightly](reports/nightly-readiness.md) |
| vLLM v0.34 (current) | [Release support, engine changes and candidate comparisons](reports/vllm-v034-upgrade.md) |
| SGLang November 20 | [Stable versus development changes and recipes](reports/sglang-2026-11-20.md) |
| vLLM v0.33 | [Release changes, migration and per-family elements on B300](reports/vllm-v033-upgrade.md) |
| SGLang v0.5.23 (current) | [Release changes, migration, DeepSeek/GLM/Qwen elements and exclusions](reports/sglang-v0523-upgrade.md) |
| vLLM v0.32 | [Release changes, applicability and next B300 experiments](reports/vllm-v032-upgrade.md) |
| SGLang v0.5.22 | [Release changes, argument migration, per-model experiments and exclusions](reports/sglang-v0522-upgrade.md) |
| Report corrections | [Verified findings from the supplied report](reports/report-review.md) |

## Model families

| Company | Model | Main systems question | [AA Intelligence Index v5.0.1](reports/intelligence-index.md) |
| --- | --- | --- | --- |
| Moonshot | [Kimi K3](companies/moonshot-ai/kimi-k3/README.md) | Huge expert residency, KDA/MLA state, mixed quantization and engine-specific drafts | 17.419 (Low); Max unscored |
| Moonshot | [Kimi K3.1 Pro](companies/moonshot-ai/kimi-k3.1-pro/README.md) | K3 plus a DSA indexer on the 24 MLA layers; no stable engine release supports it | 46.453 (Max) |
| Z.ai | [GLM 5.3](companies/z-ai/glm-5.3/README.md) | Sparse MLA/indexer, exporter differences and MTP | 31.653 (Max) |
| Z.ai | [GLM 5.3 Flash](companies/z-ai/glm-5.3-flash/README.md) | KDA plus sparse MLA, mixed draft precision and state allocation | 27.804 (Max) |
| DeepSeek | [V4 Flash 0731](companies/deepseek/deepseek-v4-flash-0731/README.md) | Compressed history, exact July-31 serialization and bundled DSpark | none published |
| DeepSeek | [V4.1 Flash 1017](companies/deepseek/deepseek-v4.1-flash-1017/README.md) | Encoder-decoder compressed KV, Engram host memory, vision and DSpark; separate architecture class from 0731 | 32.590 (Max) |
| Qwen | [3.8 27B](companies/alibaba-qwen/qwen3.8-27b/README.md) | Dense hybrid state, TP1 replication and template fidelity | 20.107 (Xhigh) |
| Qwen | [3.8 Flash Next](companies/alibaba-qwen/qwen3.8-flash-next/README.md) | PLE/ngram placement, sparse attention and MTP | 28.575 (reasoning) |
| Google | [Gemma 4 31B IT](companies/google/gemma-4-31b-it/README.md) | Local/global attention, tool quality and shared-cache drafting | 4.384 (reasoning) |
| Mistral | [Medium 3.5](companies/mistral-ai/mistral-medium-3.5/README.md) | Dense FP8 residency, full-history KV and EAGLE | 4.645 (High) |
| Mistral | [Large 4](companies/mistral-ai/mistral-large-4/README.md) | ~1T MoE residency: FP8 uses TP8 at the 85% memory budget, NVFP4 admits a TP4 probe; vLLM v0.34.0 supports both formats, SGLang requires a development build | 26.125 (High) |
| Meta | [Muse Glimmer 30B](companies/meta/muse-glimmer-30b/README.md) | Dense 30B with two KV heads: TP1 replication, small global-layer cache, separate DFlash drafter | 6.341 (High) |

The twelve family directories link **67 revision-pinned Hugging Face README snapshots** for the 50 concrete catalog exports and recorded additional artifacts. Their source IDs, retrieval times and SHA-256 hashes are recorded in the existing registry and catalogs. Upstream relative assets are not mirrored; each copy has a pinned upstream viewing link in the family overview.

[GLOSSARY](GLOSSARY.md) explains the terminology. The [model catalog](catalog/models.json) and [configuration catalog](catalog/configurations.json) hold the consolidated machine-readable records. Read `latest_stable_review` for the current assessment and `huggingface_readme` for each card's provenance.

## Scope

This repository holds research and reference knowledge. Test harnesses, benchmark execution/results, deployment tools and detailed run campaigns belong in the separate execution repository. The earlier infrastructure and audit bundles remain recoverable from Git history.

Source-derived configurations are **not measured B300 winners**. The actual OEM node inventory, exact engine image and workload determine usable capacity and performance. KServe manages services; vLLM and SGLang execute inference.

The [evidence register](evidence/README.md) retains primary links, retrieval dates and immutable model/source identities. Authored content uses [LICENSE](LICENSE); upstream code and model artifacts retain their own terms.
