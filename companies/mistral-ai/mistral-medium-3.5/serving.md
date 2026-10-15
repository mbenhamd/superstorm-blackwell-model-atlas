# Mistral Medium 3.5: serving on 8×B300

**Status: unbenchmarked local recommendations.** The upstream recipes are evidence of documented support, not a benchmark of your node.

## Engine and topology

Use vLLM first because the producer explicitly recommends it and documents the Mistral reasoning and tool parsers. Establish the TP8 publisher baseline with the atlas’s 32K cap, then compare the TP2 probe and a TP4 experiment. Keep a fixed number of total node GPUs when comparing independent replicas against tensor sharding.

Resolve the correct tokenizer and Mistral encoding dependencies in the image. Do not copy an old nightly-install command and label it reproducible: pin the wheel or image digest and record the loaded config checksum. The card’s historical dependency minima are not a complete tested bill of materials.

The pinned publisher card also supplies a SGLang TP8 command with `--tool-call-parser mistral` and `--reasoning-parser mistral`. The official SGLang cookbook documents this exact FP8 model, the alternate checkpoint layouts and H200 validation runs. This establishes documented support; it does not certify the atlas’s B300 image or settings. The local SGLang profile remains a compatibility probe until loaded and tested, and a parser-free probe cannot establish reasoning or tool-call correctness. [mistral-medium-3.5-GR](https://docs.sglang.io/cookbook/autoregressive/Mistral/Mistral-Medium-3.5)

[mistral-medium-3.5-CARD](https://huggingface.co/mistralai/Mistral-Medium-3.5-128B/blob/22b2b868a15677cfa6061277ed2f653d1349a9ab/README.md) [HW](https://docs.nvidia.com/dgx/dgxb300-user-guide/introduction-to-dgxb300.html)

## Experiment sequence

After the TP8 correctness baseline, measure TP1 if it fits the workload, TP2, TP4 and TP8 with the same total node GPU budget. Keep KV precision fixed while comparing native FP8 weights; cover 4K/32K/128K prompts, one versus multiple images, and `reasoning_effort=none` versus `high`. Include a regression that records `mscale_all_dim=0.0` and checks long-context output quality.

First capture actual GPU memory, compute capability, peer topology and software versions with `python scripts/preflight.py`. Then resolve immutable model metadata, inspect the rendered profile and run the target-only correctness suite. Profiles live in [profiles](../../../profiles/README.md).

## Acceptance gates

A successful load is necessary but insufficient. Require valid streaming framing, finite outputs, correctly separated reasoning, valid tool calls where supported, repeatable quality tests, bounded memory at load, and correct cache/state behavior after cancellation. Only then compare latency and throughput.

For production, place one sharded model process group inside a pod that owns its whole GPU group. Do not make eight independent KServe replicas and expect them to form TP8. Start with colocated prefill and decode; adopt disaggregation only after it wins the workload comparison and state transfer is correct. [KS](https://kserve.github.io/website/docs/intro) [KSLLM](https://kserve.github.io/website/docs/model-serving/generative-inference/llmisvc/llmisvc-overview)

## Parameters are not magic constants

The profile’s context cap is an application policy. Tensor parallelism is a starting layout. Memory utilization reserves room for non-weight allocations; changing it can trade cache space against startup headroom. Batch-token and sequence caps trade prefill efficiency against memory and queueing. Speculative depth trades draft/verification cost against naturally accepted tokens. Each must be varied one at a time before interaction testing.

## Remaining uncertainty

Installed-image and B300 compatibility at the pinned corrected revision; runtime memory beyond the reported weight payload; maximum safe concurrency and best TP width; no audited NVFP4 variant. SGLang support is documented upstream, but has not been run locally.
