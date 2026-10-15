# Qwen 3.8 Flash Next: serving on 8×B300

**Status: unbenchmarked local recommendations.** The upstream recipes are evidence of documented support, not a benchmark of your node.

## Engine and topology

Use the exact NVIDIA export with vLLM as the first NVFP4 compatibility path. Keep target-only and MTP profiles separate. The supplied target-only candidate uses TP4 at 64K for a controlled comparison; the source-backed TP8/MTP layout is also included with expert parallelism and one speculative token as a cautious starting point.

Do not transfer Inferact or RedHat NVFP4 flags solely because the model names look the same. Their serialization and calibration can differ. The NVIDIA card names vLLM as its supported runtime; SGLang architecture support must not be promoted to exact-export certification without a load and accuracy probe.

The immutable base configuration revision is recorded in the catalog. Most other model revisions could not be established immutably in this environment, and the metadata fetcher is provided to resolve and hash them before execution.

[qwen3.8-flash-next-VR](https://recipes.vllm.ai/Qwen/Qwen3.8-Flash-Next) [qwen3.8-flash-next-CARD](https://huggingface.co/Qwen/Qwen3.8-Flash-Next) [HW](https://docs.nvidia.com/dgx/dgxb300-user-guide/introduction-to-dgxb300.html)

## Experiment sequence

Compare TP4 target-only, TP8 target-only, TP8+EP with one-token MTP, and alternative proposal depths after accuracy checks. Track n-gram allocation, lookup stalls, recurrent-state allocation, indexer time and total node goodput.

First capture actual GPU memory, compute capability, peer topology and software versions with `python scripts/preflight.py`. Then resolve immutable model metadata, inspect the rendered profile and run the target-only correctness suite. Profiles live in [profiles](../../../profiles/README.md).

## Acceptance gates

A successful load is necessary but insufficient. Require valid streaming framing, finite outputs, correctly separated reasoning, valid tool calls where supported, repeatable quality tests, bounded memory at load, and correct cache/state behavior after cancellation. Only then compare latency and throughput.

For production, place one sharded model process group inside a pod that owns its whole GPU group. Do not make eight independent KServe replicas and expect them to form TP8. Start with colocated prefill and decode; adopt disaggregation only after it wins the workload comparison and state transfer is correct. [KS](https://kserve.github.io/website/docs/intro) [KSLLM](https://kserve.github.io/website/docs/model-serving/generative-inference/llmisvc/llmisvc-overview)

## Parameters are not magic constants

The profile’s context cap is an application policy. Tensor parallelism is a starting layout. Memory utilization reserves room for non-weight allocations; changing it can trade cache space against startup headroom. Batch-token and sequence caps trade prefill efficiency against memory and queueing. Speculative depth trades draft/verification cost against naturally accepted tokens. Each must be varied one at a time before interaction testing.

## Remaining uncertainty

Exact NVIDIA-export SGLang compatibility; end-to-end performance of n-gram placement choices; full checkpoint tensor-byte census; production throughput under realistic prefix reuse.
