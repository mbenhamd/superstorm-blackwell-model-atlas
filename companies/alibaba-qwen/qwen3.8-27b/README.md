# Qwen 3.8 27B

**Latest scoped recheck: October 26, 2026 (UTC).** Stable references remain **vLLM v0.32.0** and **SGLang v0.5.22**, under required KServe (upstream v0.21.0; installed version unknown). All concrete catalog variants still match their retained revisions. Current publisher cards/configurations and selected engine restrictions were rechecked; no B300 execution was performed. See [current serving assessment](serving.md#october-26-stable-release-recheck) and [Hugging Face README snapshots](#hugging-face-readme-snapshots).

**Qwen/vLLM v0.31 review: 2026-10-17.** Dense 27B language model; Gated DeltaNet + gated full attention; multimodal.

This is the small dense baseline in the requested set. Its architecture class still says Qwen3_5; the public model version and the loader class need not have the same spelling. [qwen3.8-27b-CARD](https://huggingface.co/Qwen/Qwen3.8-27B/raw/1d4bf0f2ff6012fd82039f2fa52739d0dd7c60c0/README.md) [qwen3.8-27b-CFG](https://huggingface.co/Qwen/Qwen3.8-27B/raw/1d4bf0f2ff6012fd82039f2fa52739d0dd7c60c0/config.json)

**Serving candidates:** under KServe, compare TP1 BF16, official FP8 and NVIDIA mixed NVFP4 with FlashInfer/BF16 KV first. Then assess FlashInfer/FP8 KV, FA4/BF16 KV and native MTP separately. v0.31.0 rejects forced FlashAttention with this model's hd256/FP8-KV combination. No production winner was measured; [the release-specific guidance](serving.md) records the source constraints and matched controls.

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


The positional limit is not a promise of that many usable tokens under arbitrary batching, image load or cache precision. [qwen3.8-27b-CARD](https://huggingface.co/Qwen/Qwen3.8-27B/raw/1d4bf0f2ff6012fd82039f2fa52739d0dd7c60c0/README.md) [qwen3.8-27b-CFG](https://huggingface.co/Qwen/Qwen3.8-27B/raw/1d4bf0f2ff6012fd82039f2fa52739d0dd7c60c0/config.json)

## The most important unresolved checks

Actual TP1 NVFP4 kernel efficiency on this B300 firmware/container combination; optimal hybrid-cache split; useful quality at the extended context; performance under the user’s language and tool distributions. The NVIDIA card's ModelOpt version disagrees with its pinned quantization metadata; [precision](precision.md) records both values.

[Return to repository index](../../../README.md)

## Hugging Face README snapshots

These are unmodified README bytes fetched from immutable Hugging Face revisions on October 26. The publisher target, catalog exports and additional drafts/candidates remain distinct. Original relative links and images are preserved; use the pinned upstream view to resolve assets. Publisher benchmarks and launch examples retain their original scope, including older or development images. Apply the atlas serving assessment for KServe/B300. Upstream terms apply; copying a card does not qualify its model or configuration.

| Artifact | Local README | Pinned upstream README |
| --- | --- | --- |
| Publisher target: `Qwen/Qwen3.8-27B` | [README](huggingface/README.md) | [1d4bf0f2ff60](https://huggingface.co/Qwen/Qwen3.8-27B/blob/1d4bf0f2ff6012fd82039f2fa52739d0dd7c60c0/README.md) |
| Catalog export: fp8: `Qwen/Qwen3.8-27B-FP8` | [README](huggingface/fp8/README.md) | [017b9c7af6b5](https://huggingface.co/Qwen/Qwen3.8-27B-FP8/blob/017b9c7af6b5689d5dd426a76e0bc077eb5ca20a/README.md) |
| Catalog export: nvfp4: `nvidia/Qwen3.8-27B-NVFP4` | [README](huggingface/nvfp4/README.md) | [482ca0f38322](https://huggingface.co/nvidia/Qwen3.8-27B-NVFP4/blob/482ca0f3832238542f8f5295dde86b5f22711d80/README.md) |
| Additional artifact (separate compatibility scope): `RadixArk/Qwen3.8-27B-NVFP4` | [README](huggingface/additional/RadixArk--Qwen3.8-27B-NVFP4/README.md) | [319f741cce68](https://huggingface.co/RadixArk/Qwen3.8-27B-NVFP4/blob/319f741cce68d7914884900c138a1fbb70a42f30/README.md) |
| Additional artifact (separate compatibility scope): `RadixArk/Qwen3.8-27B-NVFP4-BF16-LMHead` | [README](huggingface/additional/RadixArk--Qwen3.8-27B-NVFP4-BF16-LMHead/README.md) | [009632fef96d](https://huggingface.co/RadixArk/Qwen3.8-27B-NVFP4-BF16-LMHead/blob/009632fef96dd349150baa780c984e62e70e91fe/README.md) |

Revision, retrieval time and SHA-256 are recorded through each card’s source ID in [sources.json](../../../evidence/sources.json) and the [model catalog](../../../catalog/models.json).
