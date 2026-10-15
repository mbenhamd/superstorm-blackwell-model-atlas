# Qwen 3.8 27B: serving on 8×B300

**Status: unbenchmarked local recommendations.** The upstream recipes are evidence of documented support, not a benchmark of your node.

## Engine and topology

Begin with vLLM TP1 BF16 at 32K context, then the same FP8 and NVFP4 workload. Repeat with SGLang TP1. Keep vision enabled for multimodal validation and explicitly constrain its allowed input sizes; a text-only optimization must be a separate profile.

Compare per-GPU replicas with TP2 and TP4 only after measuring single-request latency. The NVIDIA card’s TP4 long-context example is not evidence that TP4 maximizes node throughput for ordinary chat. For hybrid prefix caching, verify the recurrent-state path, not just token KV hits.

Use the correct thinking mode and sampling settings in benchmarks. Qwen’s documented thinking and non-thinking modes do not have identical generation defaults, so matching only temperature can still leave an unfair comparison.

[qwen3.8-27b-VR](https://recipes.vllm.ai/Qwen/Qwen3.8-27B) [qwen3.8-27b-GR](https://docs.sglang.io/cookbook/autoregressive/Qwen/Qwen3.8-27B) [qwen3.8-27b-CARD](https://huggingface.co/Qwen/Qwen3.8-27B) [HW](https://docs.nvidia.com/dgx/dgxb300-user-guide/introduction-to-dgxb300.html)

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
