# Verified corrections to the supplied B300 serving report

**Primary-source review: October 16, 2026 UTC.** Six Astra max researchers checked hardware/KServe, engines and the eight model families. The useful corrections are integrated into the model and framework pages; this page is the concise map. The report's opaque citation markers were replaced by retrievable primary evidence. No B300 measurements or deployment claims were added.

## Material corrections

| Area | What the supplied report gets wrong or leaves incomplete | Correct interpretation |
| --- | --- | --- |
| SGLang release | Treats 0.5.20 as current stable at its October 16 cutoff | **0.5.21** was released October 2. Current main, wheel and container observations remain distinct. [Release](https://github.com/sgl-project/sglang/releases/tag/v0.5.21) |
| vLLM memory controls | Reads unused fraction as dependable operational reserve | Default 0.92, the device-memory alias and CUDA 13 release lane are confirmed. The fraction budgets the executor; explicit KV sizing and profiled non-KV allocations affect its interpretation. It is not a hard isolation boundary. [Details](../frameworks/vllm/SOURCE_REVIEW.md) |
| Kimi drafts | Infers no compatible speculation from native `nextn=0` | Separate **Inferact/RadixArk DSpark** artifacts exist, with engine-specific contracts; Modal DFlash is also identified. None establishes an interchangeable or measured B300 draft path. [Kimi serving](../companies/moonshot-ai/kimi-k3/serving.md) |
| Kimi NVIDIA NVFP4 | Suggests generic recent vLLM as a routine baseline | The mixed attention/expert path has unresolved generic-vLLM prerequisites; publisher-patched images and merged SGLang support are different evidence. [Precision](../companies/moonshot-ai/kimi-k3/precision.md) |
| DeepSeek 0731 NVIDIA export | Promotes TP4 plus DSpark and SGLang preference from bundled draft presence | The publisher documents **TP8 target-only** evidence and explicitly did not validate speculation for this export. The B200 evidence is not a B300 result. Native 0731 recipes remain separate. [Serving](../companies/deepseek/deepseek-v4-flash-0731/serving.md) |
| DeepSeek counts/precision | Treats 304B as a settled exact census and conversion as uniformly smaller/lossless | 284B versus 304B headline accounting remains unresolved; stored draft experts plausibly explain part of the gap. Scale conversion can increase bytes and has representability conditions. [Architecture](../companies/deepseek/deepseek-v4-flash-0731/architecture.md), [precision](../companies/deepseek/deepseek-v4-flash-0731/precision.md) |
| GLM 5.3 NVIDIA | Introduces a useful export without completing its distinctions | Exact artifact pinned; dense-prefix FP8, routed-expert NVFP4, FP8-KV metadata and excluded MTP are separate. Published evaluation used **two four-GPU nodes**. It remains an additional candidate, not the established production baseline. [Precision](../companies/z-ai/glm-5.3/precision.md) |
| GLM Flash | Uses a loose 300B description and treats speculation as unclear | Pinned architecture is 320B-class with 34 KDA / 11 sparse-MLA layers, mHC, vision and a native MTP path exposed through SGLang EAGLE controls. Export/image parser and autotuning differences matter. [Architecture](../companies/z-ai/glm-5.3-flash/architecture.md), [serving](../companies/z-ai/glm-5.3-flash/serving.md) |
| Qwen 27B revision | Assumes an alternative SHA is interchangeable because config matches | The supplied 366a… snapshot changes standalone Jinja from `string` to `tiger_royal`. The selected Transformers loading path prioritizes that asset. This is a source-derived rendering risk, not an observed GPU failure; retain the reviewed 1d4… pin. [Identity and template](../companies/alibaba-qwen/qwen3.8-27b/architecture.md) |
| Qwen Flash Next PLE | Transfers a community BF16 PLE assumption to NVIDIA's NVFP4 export | The exact NVIDIA export declares **FP8 PLE**. Its separate FP4-Local derivative changes PLE/MTP/scale formats; the roughly 96 GiB claim is disk size and its card requires community runtime support. [Precision](../companies/alibaba-qwen/qwen3.8-flash-next/precision.md) |
| Gemma drafting/quality | Says no matching assistant is identified; treats near-average retention too broadly | An official 31B assistant is now pinned. Red Hat's FP8 Agentic row is 9.29 percentage points below its baseline; evaluator and reproduction details limit causal conclusions. Quantized-target assistant compatibility remains separate. [Architecture](../companies/google/gemma-4-31b-it/architecture.md), [precision](../companies/google/gemma-4-31b-it/precision.md) |
| Gemma revision | Treats the older base revision as equivalent | Retrieved config/weight-object metadata match, but tokenizer/template behavior changes. A source-tree-relative tool template is not guaranteed inside a container. [Serving](../companies/google/gemma-4-31b-it/serving.md) |
| Mistral | Calls the publisher format FP8-ish and leaves a short pin unresolved | Static FP8 is explicit and the full target SHA is resolved. Alternate tensor layouts represent the same target; do not add them. SGLang EAGLE's BF16 setting aligns shared embedding/head handling. [Precision](../companies/mistral-ai/mistral-medium-3.5/precision.md), [serving](../companies/mistral-ai/mistral-medium-3.5/serving.md) |
| KServe manifest | Treats valid-looking fields plus a changed image/args as a complete SGLang service | Stable composition inherits a vLLM command; an explicit SGLang command/port/probe/TLS contract is needed. Timeout-only rules replace required routing, and HF/PVC storage paths must be coherent. [Schema and composition analysis](../frameworks/kserve/ARCHITECTURE.md) |

## What remains sound

The report correctly separates inference engines from KServe, distinguishes unique prompts/chat/agents, accounts for more than weights, and warns against invented performance. TP1 is a sensible capacity hypothesis for the smaller dense targets; TP8 remains a useful documented baseline for very large or specialized paths. Wider TP versus replicas is a workload decision, not a universal rule.

Its vLLM 0.31.0 utilization default and CUDA 13 baseline were confirmed. Several supplied alternative model SHAs are genuine historical snapshots; different hashes are not automatically hallucinations. The correction is to compare the actual protocol/config/weight metadata and retain explicit provenance.

## The knowledge to retain

Read [optimization](optimization.md) for the mechanisms and the eight-model, three-workload comparison. Read [configuration references](configuration-reference.md) for the consolidated parameter records, and [stable/main/nightly](nightly-readiness.md) for current build distinctions. Primary identities remain in [the evidence register](../evidence/README.md).

The repository now concentrates on hardware, architecture, formats, kernels, serving behavior and known constraints. Executable tests, benchmark runners/results, deployment tools, detailed validation campaigns and bulky audit bundles have been removed from the working tree; prior tracked versions remain in Git history. This review supplies justified hypotheses and corrections, not a new benchmark system or an unmeasured “best” configuration.

## October 19 follow-up: external SGLang v0.5.22 guide

Two Astra reviewers checked the supplied configuration and benchmark advice against the release source. The integrated [SGLang review](sglang-v0522-upgrade.md) retains the useful workload separation and adds these corrections:

| Area | Correction |
| --- | --- |
| Benchmark lengths | Random lengths vary by default; fixed requested lengths need `--random-range-ratio 1` |
| Agentic replay | Generated text is reused, but tool-call fields are dropped and tools are not executed; natural stopping must be selected explicitly |
| Load and metrics | Client semaphore wait is excluded from request latency; multi-turn summary input throughput remains zero; use detailed usage accounting |
| Hardware/backends | Page size resolves by model/backend. CuTe DSL is not a generic ordinary block-FP8 GEMM alternative |
| Model scope | Keep V4.1 separate from catalog V4 Flash 0731; Mistral's BF16 compute setting is not a BF16 weight reference; GLM's experimental RadixArk export is not every NVFP4 derivative |
| Missing provenance | The GLM Flash DFlash2 card declares CC-BY-NC-ND-4.0. This was omitted from the initial atlas upgrade review and is now recorded beside the candidate |
| Useful new experiment | Separate Qwen27 FP4-head and BF16-head NVFP4 exports are pinned for a controlled comparison; no tensor-identity or B300 performance claim is added |
| Downloadable kit | No archive or download URL accompanied the report; its scripts, sample and claimed syntax checks remain unavailable for review |

This was selected source inspection and static document consistency review. It did not execute the proposed commands or independently reproduce the release's performance headlines.
