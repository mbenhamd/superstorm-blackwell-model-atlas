# Qwen 3.8 27B

**As of 2026-10-15.** Dense 27B language model; Gated DeltaNet + gated full attention; multimodal.

This is the small dense baseline in the requested set. Its architecture class still says Qwen3_5; the public model version and the loader class need not have the same spelling. [qwen3.8-27b-CARD](https://huggingface.co/Qwen/Qwen3.8-27B) [qwen3.8-27b-CFG](https://huggingface.co/Qwen/Qwen3.8-27B/raw/main/config.json)

**First serving candidate:** vLLM TP1 BF16/FP8 and SGLang TP1; test NVFP4 rather than assuming it wins. This is a reasoned deployment starting point, not a measured winner on your hardware.

[Architecture](architecture.md) · [Precision and variants](precision.md) · [Serving decisions](serving.md) · [Validation](validation.md) · [Sources](sources.md) · [Machine-readable record](model.json)

## The mental model

A compact editor updates a notebook for several steps and then rereads the detailed conversation. There is one full editing team rather than a large directory of specialists. Eight copies of that editor may serve a queue better than forcing eight people to cooperate on every word.

## Practical identity

| Property | Value |
| --- | --- |
| Exact base repository | Qwen/Qwen3.8-27B |
| Native positional limit | 262,144 tokens |
| Initial TP candidate | 1 |
| Base revision pin | Not resolved immutably; resolve before deployment |
| License scope | Apache-2.0 on base; also review derivative terms |
| Verification level | Publisher configuration and cards reviewed; not loaded or benchmarked on hardware |


The positional limit is not a promise of that many usable tokens under arbitrary batching, image load or cache precision. [qwen3.8-27b-CARD](https://huggingface.co/Qwen/Qwen3.8-27B) [qwen3.8-27b-CFG](https://huggingface.co/Qwen/Qwen3.8-27B/raw/main/config.json)

## The most important unresolved checks

Actual TP1 NVFP4 kernel efficiency on this B300 firmware/container combination; optimal hybrid-cache split; useful quality at the extended context; performance under the user’s language and tool distributions.

[Return to repository index](../../../README.md)
