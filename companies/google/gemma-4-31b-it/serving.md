# Gemma 4 31B IT: serving on 8×B300

**Status: unbenchmarked local recommendations.** The upstream recipes are evidence of documented support, not a benchmark of your node.

## Engine and topology

Start with vLLM TP1, 32K context and restrained concurrency. Compare BF16, RedHat block FP8 and RedHat NVFP4. The exact tool template is a versioned deployment asset, not a path guaranteed to exist inside every image; the baseline profile therefore does not blindly reference a source-tree-relative example file.

SGLang is an alternative to qualify, particularly for its caching behavior, but the generic Hugging Face “use with SGLang” widget is not a hardware benchmark or a guarantee that every quantized export works. A profile marked compatibility-probe must first load and pass protocol/accuracy tests.

Keep audio disabled for this variant unless a separately verified processor/runtime path proves the intended capability. Do not copy the generic example’s audio limit and advertise audio support.

[gemma-4-31b-it-CARD](https://huggingface.co/google/gemma-4-31B-it) [HW](https://docs.nvidia.com/dgx/dgxb300-user-guide/introduction-to-dgxb300.html)

## Experiment sequence

Compare TP1 BF16/FP8/NVFP4 at matched context and batch; verify global/local cache accounting; test thinking on/off separately; include image grounding, tool-call JSON, long-distance retrieval and concurrent cancellations.

First capture actual GPU memory, compute capability, peer topology and software versions with `python scripts/preflight.py`. Then resolve immutable model metadata, inspect the rendered profile and run the target-only correctness suite. Profiles live in [profiles](../../../profiles/README.md).

## Acceptance gates

A successful load is necessary but insufficient. Require valid streaming framing, finite outputs, correctly separated reasoning, valid tool calls where supported, repeatable quality tests, bounded memory at load, and correct cache/state behavior after cancellation. Only then compare latency and throughput.

For production, place one sharded model process group inside a pod that owns its whole GPU group. Do not make eight independent KServe replicas and expect them to form TP8. Start with colocated prefill and decode; adopt disaggregation only after it wins the workload comparison and state transfer is correct. [KS](https://kserve.github.io/website/docs/intro) [KSLLM](https://kserve.github.io/website/docs/model-serving/generative-inference/llmisvc/llmisvc-overview)

## Parameters are not magic constants

The profile’s context cap is an application policy. Tensor parallelism is a starting layout. Memory utilization reserves room for non-weight allocations; changing it can trade cache space against startup headroom. Batch-token and sequence caps trade prefill efficiency against memory and queueing. Speculative depth trades draft/verification cost against naturally accepted tokens. Each must be varied one at a time before interaction testing.

## Remaining uncertainty

Physical KV allocation under attention_k_eq_v in the selected engine; exact export-level SGLang compatibility; correct tool template at the final image revision; local B300 quality and latency.
