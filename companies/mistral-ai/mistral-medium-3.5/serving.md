# Mistral Medium 3.5: serving on 8×B300

**Status: unbenchmarked local recommendations.** The upstream recipes are evidence of documented support, not a benchmark of your node.

## Engine and topology

Use vLLM first because the producer explicitly recommends it and documents the model-specific reasoning and tool parsers. Start at TP2 with a 32K cap, then compare TP4 and the original TP8-style topology. Keep a fixed number of total node GPUs when comparing independent replicas against tensor sharding.

Resolve the correct tokenizer and Mistral encoding dependencies in the image. Do not copy an old nightly-install command and label it reproducible: pin the wheel or image digest and record the loaded config checksum. The card’s historical dependency minima are not a complete tested bill of materials.

SGLang remains an experimental alternate profile until the exact static-FP8 multimodal load and protocol are checked. The repository does not claim a measured winner between the engines.

[mistral-medium-3.5-CARD](https://huggingface.co/mistralai/Mistral-Medium-3.5-128B) [HW](https://docs.nvidia.com/dgx/dgxb300-user-guide/introduction-to-dgxb300.html)

## Experiment sequence

Measure TP1 if it fits your chosen workload, TP2, TP4 and TP8; native FP8 with matched KV precision; 4K/32K/128K prompts; one versus multiple images; reasoning none versus high as separate workloads; corrected-config regression cases.

First capture actual GPU memory, compute capability, peer topology and software versions with `python scripts/preflight.py`. Then resolve immutable model metadata, inspect the rendered profile and run the target-only correctness suite. Profiles live in [profiles](../../../profiles/README.md).

## Acceptance gates

A successful load is necessary but insufficient. Require valid streaming framing, finite outputs, correctly separated reasoning, valid tool calls where supported, repeatable quality tests, bounded memory at load, and correct cache/state behavior after cancellation. Only then compare latency and throughput.

For production, place one sharded model process group inside a pod that owns its whole GPU group. Do not make eight independent KServe replicas and expect them to form TP8. Start with colocated prefill and decode; adopt disaggregation only after it wins the workload comparison and state transfer is correct. [KS](https://kserve.github.io/website/docs/intro) [KSLLM](https://kserve.github.io/website/docs/model-serving/generative-inference/llmisvc/llmisvc-overview)

## Parameters are not magic constants

The profile’s context cap is an application policy. Tensor parallelism is a starting layout. Memory utilization reserves room for non-weight allocations; changing it can trade cache space against startup headroom. Batch-token and sequence caps trade prefill efficiency against memory and queueing. Speculative depth trades draft/verification cost against naturally accepted tokens. Each must be varied one at a time before interaction testing.

## Remaining uncertainty

Installed-image compatibility of the corrected configuration; exact selected-layout bytes; SGLang static-FP8 support for this artifact; maximum safe concurrency and best TP width; no audited NVFP4 variant.
