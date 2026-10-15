# Qwen 3.8 27B: serving on 8×B300

**Status: unbenchmarked local candidates.** Publisher and engine recipes document support; this audit did not run an engine or benchmark the node.

## Engine and topology

Begin with vLLM TP1 BF16 at 32K context, then the same FP8 and NVFP4 workload. Repeat with SGLang TP1. Keep vision enabled for multimodal validation and explicitly constrain its allowed input sizes; a text-only optimization must be a separate profile.

The supplied TP1 settings are controlled local experiments. NVIDIA's card documents a TP4 vLLM example and a SGLang example for its exact export; the current SGLang cookbook also lists that export. The cookbook pins FP8 KV, whereas the supplied SGLang comparison profiles pin BF16 KV. Record this difference and resolve vLLM's `auto` cache dtype before comparing results. The vLLM recipe's low-latency NVFP4 example uses an Inferact artifact, so its measurements do not establish NVIDIA-export performance.

Compare per-GPU replicas with TP2 and TP4 only after measuring single-request latency. The NVIDIA card’s TP4 long-context example is not evidence that TP4 maximizes node throughput for ordinary chat. For hybrid prefix caching, verify the recurrent-state path, not just token KV hits.

Use the correct thinking mode and sampling settings in benchmarks. Qwen’s documented thinking and non-thinking modes do not have identical generation defaults, so matching only temperature can still leave an unfair comparison.

Base, official FP8 and NVIDIA metadata revisions are pinned in [sources](sources.md) and [model.json](model.json). Pin the tokenizer/processor and actual runtime image as well. A revision identifies source artifacts; it does not validate installed kernels, multimodal execution or MTP behavior.

[qwen3.8-27b-VR](https://recipes.vllm.ai/Qwen/Qwen3.8-27B) [qwen3.8-27b-GR](https://docs.sglang.io/cookbook/autoregressive/Qwen/Qwen3.8-27B) [qwen3.8-27b-CARD](https://huggingface.co/Qwen/Qwen3.8-27B/raw/1d4bf0f2ff6012fd82039f2fa52739d0dd7c60c0/README.md) [qwen3.8-27b-NV](https://huggingface.co/nvidia/Qwen3.8-27B-NVFP4/raw/482ca0f3832238542f8f5295dde86b5f22711d80/README.md) [HW](https://docs.nvidia.com/dgx/dgxb300-user-guide/introduction-to-dgxb300.html)

## Experiment sequence

Measure TP1/2/4 with 1/8/32/128 concurrent requests; BF16/FP8/mixed NVFP4; 4K/32K/128K contexts; text-only versus image inputs; MTP off versus supported depths. Keep request payloads and thinking effort frozen.

First capture actual GPU memory, compute capability, peer topology and software versions with `python scripts/preflight.py`. Then resolve immutable model metadata, inspect the rendered profile and run the target-only correctness suite. Profiles live in [profiles](../../../profiles/README.md).

## Acceptance gates

A successful load is necessary but insufficient. Require valid streaming framing, finite outputs, correctly separated reasoning, valid tool calls where supported, repeatable quality tests, bounded memory at load, and correct cache/state behavior after cancellation. Only then compare latency and throughput.

For production, place one sharded model process group inside a pod that owns its whole GPU group. Do not make eight independent KServe replicas and expect them to form TP8. Start with colocated prefill and decode; adopt disaggregation only after it wins the workload comparison and state transfer is correct. [KS](https://kserve.github.io/website/docs/intro) [KSLLM](https://kserve.github.io/website/docs/model-serving/generative-inference/llmisvc/llmisvc-overview)

## Parameters are not magic constants

The profile’s context cap is an application policy. Tensor parallelism is a starting layout. Memory utilization reserves room for non-weight allocations; changing it can trade cache space against startup headroom. Batch-token and sequence caps trade prefill efficiency against memory and queueing. Speculative depth trades draft/verification cost against naturally accepted tokens. Each must be varied one at a time before interaction testing.

## Remaining uncertainty

Actual TP1 NVFP4 kernel efficiency on this B300 firmware/container combination; optimal hybrid-cache split; useful quality at the extended context; performance under the user’s language and tool distributions.
