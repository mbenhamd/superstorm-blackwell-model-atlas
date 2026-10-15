# vLLM, SGLang and KServe: justified roles

## Decision

Use **vLLM and SGLang as competing execution engines**. Use **KServe as the optional Kubernetes lifecycle layer**. Begin with a single-node colocated prefill/decode service. Select an engine per exact artifact, not by brand loyalty. Introduce disaggregation when measured queueing and transfer economics justify it. [KS](https://kserve.github.io/website/docs/intro) [KSRT](https://kserve.github.io/website/docs/model-serving/generative-inference/overview) [KSLLM](https://kserve.github.io/website/docs/model-serving/generative-inference/llmisvc/llmisvc-overview)

## Why vLLM is a strong first path here

The inspected registry resolves model classes to implementation modules, including current `vllm.models.*` namespaces for several newer architectures. Its Kimi DSpark implementation exposes model-specific MLA, draft quantization, hidden-state projection and fused reductions. Official recipes cover the requested families, and Mistral explicitly recommends vLLM. These are compatibility and reproducibility reasons, not a claim that it is always faster. [VREG](https://github.com/vllm-project/vllm/blob/f8460ef23659afd69046a81529ec2295e4c3f686/vllm/model_executor/models/registry.py) [VDS](https://github.com/vllm-project/vllm/blob/f8460ef23659afd69046a81529ec2295e4c3f686/vllm/models/kimi_k3/nvidia/dspark_mla.py) [mistral-medium-3.5-CARD](https://huggingface.co/mistralai/Mistral-Medium-3.5-128B)

The exact NVIDIA Flash Next mixed export is documented for vLLM. Its MTP loader fix is merged; Kimi’s separate FP8-attention support PR remains open. Therefore two NVIDIA NVFP4 artifacts deserve different readiness labels even inside the same engine. [qwen3.8-flash-next-NV](https://huggingface.co/nvidia/Qwen3.8-Flash-Next-NVFP4) [QPR](https://github.com/vllm-project/vllm/pull/55513) [KIMIVPR](https://github.com/vllm-project/vllm/pull/52406)

## Why SGLang is a strong first path here

Its model-specific cookbooks make recurrent-state allocation, cache hierarchy and speculative strategy explicit. The current release includes hybrid-model and Kimi correctness/performance work. The Kimi mixed NVFP4/FP8 compatibility fix is merged, and its source handles multiple quantized GEMM pathways. These justify a first compatibility trial for Kimi NVFP4 and a serious comparison for GLM Flash and Qwen hybrid models. They do not substitute for B300 workload measurements. [GREL](https://github.com/sgl-project/sglang/releases/tag/v0.5.21) [GQUANT](https://github.com/sgl-project/sglang/blob/877be2974aa151a984e52822c028276c2b1e9303/python/sglang/srt/layers/quantization/modelopt_quant.py) [KIMIPR](https://github.com/sgl-project/sglang/pull/35077) [glm-5.3-flash-GR](https://docs.sglang.io/cookbook/autoregressive/GLM/GLM-5.3-Flash) [qwen3.8-27b-GR](https://docs.sglang.io/cookbook/autoregressive/Qwen/Qwen3.8-27B)

The inspected SGLang registry can discover an architecture through package entry classes, log an import error, or append a Transformers fallback during normalization. This makes the resolved implementation and import logs important evidence. A registry match alone is weaker than a successful exact-artifact load with verified kernels. [GREG](https://github.com/sgl-project/sglang/blob/877be2974aa151a984e52822c028276c2b1e9303/python/sglang/srt/models/registry.py)

## What KServe contributes

KServe adds declarative deployment, lifecycle reconciliation and integration with Kubernetes resources. Its LLMInferenceService path adds composable LLM configuration, specialized scheduling, distributed workloads and prefill/decode orchestration. This is a control-plane choice, not an FP4 arithmetic choice. [KS](https://kserve.github.io/website/docs/intro) [KSLLM](https://kserve.github.io/website/docs/model-serving/generative-inference/llmisvc/llmisvc-overview) [KSCFG](https://kserve.github.io/website/docs/model-serving/generative-inference/llmisvc/llmisvc-configuration)

For this eight-GPU single-node task, a custom-container InferenceService is a transparent initial path for either engine. For advanced vLLM/llm-d routing and transfer, use the compatible LLMInferenceService configuration rather than pretending that replacing a container name certifies SGLang integration. A dedicated SGLang-aware orchestration design must explicitly preserve its transfer and cache semantics.

## Decision matrix

| Requirement | Preferred initial route | Promotion condition |
| --- | --- | --- |
| Exact Kimi NVIDIA NVFP4 compatibility | SGLang with merged mixed-format path | Load, SiTU/scale checks, target-only quality |
| Exact NVIDIA Flash Next NVFP4 | vLLM | Correct mixed MTP/PLE handling in installed image |
| Mistral producer alignment | vLLM | Corrected config, tokenizer and vision validated |
| Qwen/Gemma smaller-model fleet | Either, TP1 baseline | Better node goodput at equal quality/latency |
| Hybrid pool tuning | Benchmark both | Boot-log accounting and cancellation correctness |
| Basic Kubernetes service | Custom-container InferenceService | Server-side schema dry run and readiness test |
| Advanced prefill/decode or cluster routing | Version-matched LLM orchestration | Correct state transfer and measured crossover |

Every recommendation is conditional. Actual measurements are intentionally absent until run on the target hardware.
