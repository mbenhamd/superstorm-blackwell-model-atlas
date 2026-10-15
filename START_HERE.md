# Start here: a model-serving factory

You do not need to know GPU programming to navigate this repository. The core distinction is **the model is the trained machine; the engine operates it; the platform keeps the service available**.

## One request, from question to answer

A tokenizer turns text into numbered pieces called tokens. An embedding turns each number into a vector, a list of numerical features. The model repeatedly transforms those features through its layers. Attention retrieves useful information from earlier tokens. A feed-forward block performs another learned transformation. A final head produces scores for possible next tokens, and the sampler chooses a token. This repeats until a stopping condition is met. Images require an additional encoder and preprocessing path. The exact implementation varies across the eight model reports. [qwen3.8-27b-CARD](https://huggingface.co/Qwen/Qwen3.8-27B/raw/1d4bf0f2ff6012fd82039f2fa52739d0dd7c60c0/README.md) [gemma-4-31b-it-CFG](https://huggingface.co/google/gemma-4-31B-it/raw/842da3794eaa0b77d5f08bae87a17459d91ff475/config.json) [mistral-medium-3.5-CFG](https://huggingface.co/mistralai/Mistral-Medium-3.5-128B/raw/22b2b868a15677cfa6061277ed2f653d1349a9ab/config.json)

**Prefill** is reading the question and existing conversation. **Decode** is writing the answer a piece at a time. A restaurant analogy helps: preparing all ingredients is not the same job as plating each course. An optimization that speeds preparation might slow service if it monopolizes the same kitchen.

## Five objects that must not be confused

| Object | In this repository | Analogy |
| --- | --- | --- |
| Architecture | Layers, attention, experts, state, vision and output path | Design of the machine |
| Checkpoint | A particular set of trained and possibly quantized weights | The calibrated machine, not just its blueprint |
| vLLM / SGLang | Scheduling, cache management and GPU execution | Factory operating system |
| CUDA / kernels | The operations executed on the GPU | Motors, gears and specialized tools |
| KServe | Kubernetes resources, rollout and routing lifecycle | Warehouse and dispatch management |

KServe is not a third arithmetic engine competing with vLLM and SGLang. It can manage a service whose container runs one of them. Advanced LLM orchestration has its own resources and integration requirements. [KS](https://kserve.github.io/website/docs/intro) [KSRT](https://kserve.github.io/website/docs/model-serving/generative-inference/overview) [KSLLM](https://kserve.github.io/website/docs/model-serving/generative-inference/llmisvc/llmisvc-overview)

## Dense versus mixture of experts

A dense model uses its ordinary feed-forward blocks for every token. An MoE model routes tokens through a selected subset of experts. A building with 896 specialist offices may consult only 16 offices for a token, but the others still occupy floor space. **Activated parameters describe selected work; total resident parameters and tensor bytes describe weight storage.** Do not buy GPU memory based only on the activated count. [kimi-k3-CARD](https://huggingface.co/moonshotai/Kimi-K3/blob/f831ab66814297da540d832a5235f8e904f29d06/README.md) [glm-5.3-flash-CARD](https://huggingface.co/zai-org/GLM-5.3-Flash/raw/46a050bec13002ad29ee795c16e61cf4fa3c4a9c/README.md)

## Four kinds of memory

**Weights** are the learned constants. **KV cache** stores attention information associated with previous tokens. **Recurrent state** is the running summary used by linear-attention blocks. **Temporary memory** includes activations, graph capture, communication buffers, quantization/repacking workspaces and speculative verification. A model can fit its weights and still fail to start or run long requests.

A notebook is a useful analogy for recurrent state, but it is not a lossless transcript. Full-attention or sparse-history layers remain important. Conversely, a small recurrent state can need several snapshots per request for prefix caching, overlap and speculative rollback. The per-sequence state matrix alone is not the complete state-pool allocation. [qwen3.8-27b-GR](https://docs.sglang.io/cookbook/autoregressive/Qwen/Qwen3.8-27B) [kimi-k3-GR](https://docs.sglang.io/cookbook/autoregressive/Moonshotai/Kimi-K3) [glm-5.3-flash-GR](https://docs.sglang.io/cookbook/autoregressive/GLM/GLM-5.3-Flash)

## What precision changes

BF16 uses 16 bits per represented element. FP8 usually uses eight. NVFP4 and MXFP4 use four-bit values plus different scaling structures. Think of recording measurements to different precision, with scale notes attached to groups of values. They are not interchangeable file extensions. Exported checkpoints frequently mix several precisions. [NV4](https://developer.nvidia.com/blog/introducing-nvfp4-for-efficient-and-accurate-low-precision-inference/) [TE](https://docs.nvidia.com/deeplearning/transformer-engine/examples/fp8_primer.html) [CUDNN](https://docs.nvidia.com/deeplearning/cudnn/latest/operations/BlockScaling.html)

## What the evidence labels mean

**Publisher fact** means that a primary source states it. **Config extraction** means the value is present in the cited machine-readable configuration. **Source inspected** means particular code ranges were read at a named commit. **Publisher benchmark** means the author measured it under stated conditions. **Derived** means a calculation here uses explicit assumptions. **Candidate** means a setting needs testing. **Not verified** means no confirmation was obtained; it does not mean false.

## Reading paths

For understanding, read [the comparison](reports/comparison.md), [the precision primer](reports/precision-and-kernels.md) and [the glossary](GLOSSARY.md). For deployment, read [hardware](hardware/B300-8GPU.md), [engine decisions](frameworks/DECISION.md), [profiles](profiles/README.md) and [benchmark protocol](benchmarks/PROTOCOL.md). For auditability, read [the evidence register](evidence/README.md) and [limitations](LIMITATIONS.md).

For hands-on investigation, select a model-specific quality campaign from the [benchmark guide](benchmarks/MODEL-BENCHMARKS.md), then follow the [experiment roadmap](reports/EXPERIMENTS.md): qualify an exact build, check quality and state correctness, measure the workload, then introduce speculation, parallelism or KServe. The engine experiment pages explain which recent changes motivate each test and what would count as a useful result.
