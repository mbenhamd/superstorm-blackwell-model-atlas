# vLLM, SGLang and KServe: justified roles

**October 26 recheck:** latest stable identities remain vLLM v0.32.0, SGLang v0.5.22 and KServe v0.21.0. The [catalog's `latest_stable_review`](../catalog/models.json) and each family serving page contain the current selected-source assessment. [All catalog model/export README snapshots](../README.md#model-families) are pinned and locally available. The [channel record](../reports/nightly-readiness.md#october-26-catalog-wide-recheck) keeps current development artifacts separate; unchanged versions do not establish a measured engine winner.

The [October 19 SGLang v0.5.22 review](../reports/sglang-v0522-upgrade.md) updates the SGLang side of the comparison across all eight families. Use it alongside [vLLM v0.32](../reports/vllm-v032-upgrade.md); neither source review establishes a measured engine winner. KServe remains required.

**October 18 release context:** vLLM v0.32.0 is the latest observed release. The [B300 upgrade comparison](../reports/vllm-v032-upgrade.md) supplies version-specific priorities across the catalog; v0.31 remains the controlled baseline. No measured engine ranking or KServe deployment compatibility is inferred from the changelog.

## Decision

**KServe is mandatory in the user's existing infrastructure.** Choose **vLLM or SGLang as the execution engine within KServe**. Begin with a single-node colocated prefill/decode service and select the engine per exact artifact. Introduce disaggregation when measured queueing and transfer economics justify it. [KS](https://kserve.github.io/website/docs/intro) [KSRT](https://kserve.github.io/website/docs/model-serving/generative-inference/overview) [KSLLM](https://kserve.github.io/website/docs/model-serving/generative-inference/llmisvc/llmisvc-overview)

## Why vLLM is a strong first path here

The inspected registry resolves model classes to implementation modules, including `vllm.models.*` namespaces for several newer architectures. Its Kimi DSpark implementation exposes model-specific MLA, draft quantization, hidden-state projection and fused reductions. Official recipes cover the requested families, and Mistral recommends vLLM while also documenting SGLang. These are compatibility and reproducibility reasons, not measured engine rankings. [VREG](https://github.com/vllm-project/vllm/blob/f8460ef23659afd69046a81529ec2295e4c3f686/vllm/model_executor/models/registry.py) [VDS](https://github.com/vllm-project/vllm/blob/f8460ef23659afd69046a81529ec2295e4c3f686/vllm/models/kimi_k3/nvidia/dspark_mla.py) [mistral-medium-3.5-CARD](https://huggingface.co/mistralai/Mistral-Medium-3.5-128B/blob/22b2b868a15677cfa6061277ed2f653d1349a9ab/README.md)

The NVIDIA Flash Next mixed export has a TP8 reference and its MTP loader fix is included in v0.31.0. Kimi's release source also contains selected mixed-precision fixes despite open historical PRs; its old publisher patch is not a drop-in for the refactored release. Exact image/export integration remains a separate question. See [Flash Next's release review](../companies/alibaba-qwen/qwen3.8-flash-next/serving.md) and [Kimi's corrected compatibility analysis](../companies/moonshot-ai/kimi-k3/precision.md).

## Why SGLang is a strong first path here

Its model-specific cookbooks make recurrent-state allocation, cache hierarchy and speculative strategy explicit. The current release includes hybrid-model and Kimi correctness/performance work. The Kimi mixed NVFP4/FP8 compatibility fix is merged, and its source handles multiple quantized GEMM pathways. These justify a first compatibility trial for Kimi NVFP4 and a serious comparison for GLM Flash and Qwen hybrid models. They do not substitute for B300 workload measurements. [GREL](https://github.com/sgl-project/sglang/releases/tag/v0.5.21) [GQUANT](https://github.com/sgl-project/sglang/blob/877be2974aa151a984e52822c028276c2b1e9303/python/sglang/srt/layers/quantization/modelopt_quant.py) [KIMIPR](https://github.com/sgl-project/sglang/pull/35077) [glm-5.3-flash-GR](https://docs.sglang.io/cookbook/autoregressive/GLM/GLM-5.3-Flash) [qwen3.8-27b-GR](https://docs.sglang.io/cookbook/autoregressive/Qwen/Qwen3.8-27B)

SGLang also has exact-artifact evidence for DeepSeek 0731 TP4 and NVIDIA Flash Next NVFP4 TP1. The latter’s B300 recipe cell is explicitly marked `verified: false`, and its PR reports no new GPU measurements. Documented configurations remain candidates until the target hardware and workload are tested. [deepseek-v4-flash-0731-CARD](https://huggingface.co/deepseek-ai/DeepSeek-V4-Flash-0731/blob/7872f01b1d1fe23eabc4c98b48bffcef5a386062/README.md) [qwen3.8-flash-next-GPR](https://github.com/sgl-project/sglang/pull/41046) [qwen3.8-flash-next-GR-SOURCE](https://raw.githubusercontent.com/sgl-project/sglang/a1eb691ab51bc461378b2fcca8991883add4f1b5/docs/src/snippets/configs/Qwen/qwen3.8-flash-next.jsx)

The inspected SGLang registry can discover an architecture through package entry classes, log an import error, or append a Transformers fallback during normalization. This makes the resolved implementation and import logs important evidence. A registry match alone is weaker than a successful exact-artifact load with verified kernels. [GREG](https://github.com/sgl-project/sglang/blob/877be2974aa151a984e52822c028276c2b1e9303/python/sglang/srt/models/registry.py)

## What KServe contributes

KServe supplies the required deployment and lifecycle layer. Its LLMInferenceService path adds composable LLM configuration, specialized scheduling, distributed workloads and prefill/decode orchestration. Engine precision and kernels remain separate configuration decisions. [KS](https://kserve.github.io/website/docs/intro) [KSLLM](https://kserve.github.io/website/docs/model-serving/generative-inference/llmisvc/llmisvc-overview) [KSCFG](https://kserve.github.io/website/docs/model-serving/generative-inference/llmisvc/llmisvc-configuration)

Match the integration to the existing cluster's resource kind and installed version. A custom-container InferenceService and an LLMInferenceService runtime are separate KServe paths; requiring KServe does not determine which is installed. For advanced vLLM/llm-d routing and transfer, use the compatible LLMInferenceService configuration. An SGLang integration must explicitly preserve its command, ports, readiness, metrics, transfer and cache semantics.

The refreshed [KServe source review](kserve/ARCHITECTURE.md) separates stable capabilities from newer master templates and controller changes. An SGLang runtime template, where present, establishes a particular integration path; prefill/decode transfer, routing metrics and scaling still need their own version-specific qualification.

## Decision matrix

| Requirement | Preferred initial route | Promotion condition |
| --- | --- | --- |
| Exact Kimi NVIDIA NVFP4 compatibility | SGLang with merged mixed-format path | Load, SiTU/scale checks, target-only quality |
| Exact NVIDIA Flash Next NVFP4 | vLLM TP8 baseline; SGLang TP1 documented candidate | Correct mixed MTP/PLE handling and B300 validation in the installed image |
| Mistral producer alignment | vLLM TP8 baseline; SGLang documented comparator | Corrected config, tokenizer and vision validated |
| Qwen/Gemma smaller-model fleet | Either, TP1 baseline | Better node goodput at equal quality/latency |
| Hybrid pool tuning | Benchmark both | Boot-log accounting and cancellation correctness |
| Basic Kubernetes service | Custom-container InferenceService | Server-side schema dry run and readiness test |
| Advanced prefill/decode or cluster routing | Version-matched LLM orchestration | Correct state transfer and measured crossover |

The KServe requirement is fixed; engine, topology and integration recommendations remain conditional. Actual measurements are intentionally absent until run on the target hardware.

## FP8 with FA4: compare the actual execution paths

The October 16 source recheck does not support treating “FP8 + FA4” as one interchangeable configuration across engines.

| Question | vLLM 0.31.0 / selected main | SGLang 0.5.21 / selected main |
| --- | --- | --- |
| Does an FP8 checkpoint select FP8 attention? | No; runtime attention operands and cache settings determine that path | No; checkpoint precision and attention/cache support remain separate |
| Ordinary FP8 KV with generic FA4 on B300 | Eligible BF16 activation/output path quantizes Q and uses FP8 Q/K/V; head geometry and feature restrictions apply | Complete ordinary MHA/GQA FA4 prefill with FP8 KV is not established: the inspected prefill conversion differs from decode, and the documentation marks this combination unsupported |
| Can prefill and decode use different implementations? | Yes, selected backends can dispatch phases internally; the CLI is not a description of every kernel call | Explicit prefill/decode controls exist, but the pair must share a supported cache layout, dtype and page size |
| Is installing standalone FA4 sufficient? | No; the inspected generic route uses vLLM's pinned fork | No; engine integration and its vendored implementation determine supported features |
| Does a generic FA4 override apply to all eight families? | No; sparse MLA, QSA, compressed and recurrent paths have model-specific selection | No; DSA, QSA, compressed and recurrent paths likewise have their own contracts |

The detailed [vLLM trace](vllm/SOURCE_REVIEW.md) and [SGLang trace](sglang/SOURCE_REVIEW.md) provide immutable source links and the exact exclusions. An FP8 checkpoint with a compatible higher precision attention/cache path remains a distinct candidate; native FP8 attention is an additional choice. Select by exact model path, numerical requirements and supported phase pairing before assigning a performance preference. The [workload guide](../reports/optimization.md#when-fp8-plus-fa4-is-a-useful-candidate) explains where each mechanism can help without asserting an unmeasured engine ranking.

## Optimization reasoning

The [optimization guide](../reports/optimization.md) connects engine mechanisms to unique prompts, multi-turn chat and coding agents. The source reviews above explain the recent changes, affected code paths and exclusions. Execution and results belong in the separate implementation repository.

A newer nightly can contain a useful correctness fix and still regress another workload. A kernel can exist before a model calls it. Keep exact export, engine and workload applicability with every recommendation.
