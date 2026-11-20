# Qwen 3.8 27B

**November 20, 2026 review.** The BF16 and official FP8 repositories added assistant-generation boundaries to chat_template.jinja and response_template to tokenizer_config.json. The Hub tree comparison found unchanged weight object IDs and model configurations. Retain the earlier revisions for release comparisons, and compare the new tokenizer/template revisions separately with multi-turn reasoning and tool-call fixtures. [Current engine and benchmark analysis](serving.md#november-20-release-and-benchmark-controls).

**Qwen/vLLM v0.31 review: 2026-10-17.** Dense 27B language model; Gated DeltaNet + gated full attention; multimodal.

This is the small dense baseline in the requested set. Its architecture class still says Qwen3_5; the public model version and the loader class need not have the same spelling. [qwen3.8-27b-CARD](https://huggingface.co/Qwen/Qwen3.8-27B/raw/1d4bf0f2ff6012fd82039f2fa52739d0dd7c60c0/README.md) [qwen3.8-27b-CFG](https://huggingface.co/Qwen/Qwen3.8-27B/raw/1d4bf0f2ff6012fd82039f2fa52739d0dd7c60c0/config.json)

**Serving candidates.** Compare TP1 BF16 and official FP8 with the original NVIDIA PTQ, the NVIDIA QAD student, Red Hat and Inferact exports under KServe. Keep the prompt and effective KV precision fixed, then vary KV and native MTP separately. [Release-specific controls](serving.md#november-20-release-and-benchmark-controls).

[Architecture](architecture.md) · [Precision and variants](precision.md) · [Serving decisions](serving.md) · [Sources](sources.md) · [Model catalog](../../../catalog/models.json)

## Architecture and serving implications

Dense feed-forward blocks accompany a repeated Gated DeltaNet/full-attention pattern. Recurrent and convolution state coexist with token-history KV. Capacity analysis must account for both state types; TP1 replication and wider TP remain workload-dependent comparisons. See [architecture and state layout](architecture.md) and [serving tradeoffs](serving.md).

## Practical identity

| Property | Value |
| --- | --- |
| Exact base repository | Qwen/Qwen3.8-27B |
| Native positional limit | 262,144 tokens |
| Initial TP candidate | 1 |
| Base revision pin | 1d4bf0f2ff6012fd82039f2fa52739d0dd7c60c0 |
| License scope | Apache-2.0 on base; also review derivative terms |
| Verification level | Publisher cards and immutable metadata rechecked; no weight load or GPU benchmark |
| AA Intelligence Index v5.0.1 (third-party) | xhigh: 20.107 (v5.0 20.107); medium: 17.483 (v5.0 17.483); low: 15.685 (v5.0 15.685); non-reasoning: 10.032 (v5.0 10.032). Not reproduced; not tied to this revision or any export. [Details](../../../reports/intelligence-index.md) [AA-MODEL-QWEN3-8-27B](https://artificialanalysis.ai/models/qwen3-8-27b) [AA-MODEL-QWEN3-8-27B-MEDIUM](https://artificialanalysis.ai/models/qwen3-8-27b-medium) [AA-MODEL-QWEN3-8-27B-LOW](https://artificialanalysis.ai/models/qwen3-8-27b-low) [AA-MODEL-QWEN3-8-27B-NON-REASONING](https://artificialanalysis.ai/models/qwen3-8-27b-non-reasoning) |


The positional limit is not a promise of that many usable tokens under arbitrary batching, image load or cache precision. [qwen3.8-27b-CARD](https://huggingface.co/Qwen/Qwen3.8-27B/raw/1d4bf0f2ff6012fd82039f2fa52739d0dd7c60c0/README.md) [qwen3.8-27b-CFG](https://huggingface.co/Qwen/Qwen3.8-27B/raw/1d4bf0f2ff6012fd82039f2fa52739d0dd7c60c0/config.json)

## The most important unresolved checks

Actual TP1 NVFP4 kernel efficiency on this B300 firmware/container combination; optimal hybrid-cache split; useful quality at the extended context; performance under the user’s language and tool distributions. The NVIDIA card's ModelOpt version disagrees with its pinned quantization metadata; [precision](precision.md) records both values.

[Return to repository index](../../../README.md)

## Hugging Face README snapshots

The original snapshots were fetched on October 26. The table also identifies the November 20 additions. The publisher target, catalog exports and additional drafts/candidates remain distinct. Original relative links and images are preserved; use the pinned upstream view to resolve assets. Publisher benchmarks and launch examples retain their original scope, including older or development images. Apply the atlas serving assessment for KServe/B300. Upstream terms apply; copying a card does not qualify its model or configuration.

| Artifact | Local README | Pinned upstream README |
| --- | --- | --- |
| Publisher target: `Qwen/Qwen3.8-27B` | [README](huggingface/README.md) | [1d4bf0f2ff60](https://huggingface.co/Qwen/Qwen3.8-27B/blob/1d4bf0f2ff6012fd82039f2fa52739d0dd7c60c0/README.md) |
| Catalog export: fp8: `Qwen/Qwen3.8-27B-FP8` | [README](huggingface/fp8/README.md) | [017b9c7af6b5](https://huggingface.co/Qwen/Qwen3.8-27B-FP8/blob/017b9c7af6b5689d5dd426a76e0bc077eb5ca20a/README.md) |
| Catalog export: nvfp4: `nvidia/Qwen3.8-27B-NVFP4` | [README](huggingface/nvfp4/README.md) | [482ca0f38322](https://huggingface.co/nvidia/Qwen3.8-27B-NVFP4/blob/482ca0f3832238542f8f5295dde86b5f22711d80/README.md) |
| Additional artifact (separate compatibility scope): `RadixArk/Qwen3.8-27B-NVFP4` | [README](huggingface/additional/RadixArk--Qwen3.8-27B-NVFP4/README.md) | [319f741cce68](https://huggingface.co/RadixArk/Qwen3.8-27B-NVFP4/blob/319f741cce68d7914884900c138a1fbb70a42f30/README.md) |
| Additional artifact (separate compatibility scope): `RadixArk/Qwen3.8-27B-NVFP4-BF16-LMHead` | [README](huggingface/additional/RadixArk--Qwen3.8-27B-NVFP4-BF16-LMHead/README.md) | [009632fef96d](https://huggingface.co/RadixArk/Qwen3.8-27B-NVFP4-BF16-LMHead/blob/009632fef96dd349150baa780c984e62e70e91fe/README.md) |
| November 20 nvfp4-qad · `nvidia/Qwen3.8-27B-NVFP4-QAD` | [README](huggingface/nvfp4-qad/README.md) | [cd46ab575a5a](https://huggingface.co/nvidia/Qwen3.8-27B-NVFP4-QAD/blob/cd46ab575a5a687f0bc3e54251016fc2cc1a6aef/README.md) |
| November 20 redhat-nvfp4 · `RedHatAI/Qwen3.8-27B-NVFP4` | [README](huggingface/redhat-nvfp4/README.md) | [5dd2bd1fffbf](https://huggingface.co/RedHatAI/Qwen3.8-27B-NVFP4/blob/5dd2bd1fffbfced02b863d69542514509c312b10/README.md) |
| November 20 inferact-nvfp4 · `Inferact/Qwen3.8-27B-NVFP4` | [README](huggingface/inferact-nvfp4/README.md) | [6128240ebaf4](https://huggingface.co/Inferact/Qwen3.8-27B-NVFP4/blob/6128240ebaf4eaa7bad2b3d1c72c37d677c5f462/README.md) |

Revision, retrieval time and SHA-256 are recorded through each card’s source ID in [sources.json](../../../evidence/sources.json) and the [model catalog](../../../catalog/models.json).
