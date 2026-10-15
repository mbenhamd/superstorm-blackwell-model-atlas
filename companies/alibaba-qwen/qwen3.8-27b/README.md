# Qwen 3.8 27B

**As of 2026-10-15.** Dense 27B language model; Gated DeltaNet + gated full attention; multimodal.

This is the small dense baseline in the requested set. Its architecture class still says Qwen3_5; the public model version and the loader class need not have the same spelling. [qwen3.8-27b-CARD](https://huggingface.co/Qwen/Qwen3.8-27B/raw/1d4bf0f2ff6012fd82039f2fa52739d0dd7c60c0/README.md) [qwen3.8-27b-CFG](https://huggingface.co/Qwen/Qwen3.8-27B/raw/1d4bf0f2ff6012fd82039f2fa52739d0dd7c60c0/config.json)

**Serving candidates:** compare vLLM and SGLang TP1 BF16, FP8 and NVIDIA mixed NVFP4. These are deployment experiments; no winner was measured on the target hardware.

[Architecture](architecture.md) · [Precision and variants](precision.md) · [Serving decisions](serving.md) · [Validation](validation.md) · [Sources](sources.md) · [Machine-readable record](model.json)

## The mental model

A compact editor updates a notebook for several steps and then rereads the detailed conversation. There is one full editing team rather than a large directory of specialists. Eight copies of that editor may serve a queue better than forcing eight people to cooperate on every word.

## Practical identity

| Property | Value |
| --- | --- |
| Exact base repository | Qwen/Qwen3.8-27B |
| Native positional limit | 262,144 tokens |
| Initial TP candidate | 1 |
| Base revision pin | 1d4bf0f2ff6012fd82039f2fa52739d0dd7c60c0 |
| License scope | Apache-2.0 on base; also review derivative terms |
| Verification level | Publisher cards and immutable metadata rechecked; no weight load or GPU benchmark |


The positional limit is not a promise of that many usable tokens under arbitrary batching, image load or cache precision. [qwen3.8-27b-CARD](https://huggingface.co/Qwen/Qwen3.8-27B/raw/1d4bf0f2ff6012fd82039f2fa52739d0dd7c60c0/README.md) [qwen3.8-27b-CFG](https://huggingface.co/Qwen/Qwen3.8-27B/raw/1d4bf0f2ff6012fd82039f2fa52739d0dd7c60c0/config.json)

## The most important unresolved checks

Actual TP1 NVFP4 kernel efficiency on this B300 firmware/container combination; optimal hybrid-cache split; useful quality at the extended context; performance under the user’s language and tool distributions. The NVIDIA card's ModelOpt version disagrees with its pinned quantization metadata; [precision](precision.md) records both values.

[Return to repository index](../../../README.md)
