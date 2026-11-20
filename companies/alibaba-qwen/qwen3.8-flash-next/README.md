# Qwen 3.8 Flash Next

**November 20, 2026 review.** The BF16 and official FP8 repositories added assistant-generation boundaries to chat_template.jinja and response_template to tokenizer_config.json. The Hub tree comparison found unchanged weight object IDs and model configurations. Retain the earlier revisions for release comparisons, and compare the new tokenizer/template revisions separately with multi-turn reasoning and tool-call fixtures. [Current engine and benchmark analysis](serving.md#november-20-release-and-benchmark-controls).

**As of 2026-10-16.** 125B main + 51B n-gram + 4B MTP; 6B active main; GDN + QSA.

Flash Next advertises the main model, n-gram table and MTP module separately. The rounded main-plus-n-gram count is 176B; adding the separately advertised 4B MTP gives approximately 180B. Calling `125 + 51 + 4` “176B total” mixes these scopes. Neither rounded sum is an exact tensor census or a separate vision count. [qwen3.8-flash-next-CARD](https://huggingface.co/Qwen/Qwen3.8-Flash-Next/raw/de4b8e4d43b917e7706784d8bb445c9af86a3540/README.md) [qwen3.8-flash-next-CFG](https://huggingface.co/Qwen/Qwen3.8-Flash-Next/raw/de4b8e4d43b917e7706784d8bb445c9af86a3540/config.json)

**Serving candidate.** KServe vLLM v0.34.0 official FP8 TP4+EP baseline. Compare NVIDIA, Inferact, RadixArk and Red Hat separately at fixed placement, TP/EP and natural MTP acceptance. SGLang source includes distinct cookbook and AgentX evidence.

[Architecture](architecture.md) · [Precision and variants](precision.md) · [Serving decisions](serving.md) · [Sources](sources.md) · [Model catalog](../../../catalog/models.json)

## Architecture and serving implications

The backbone combines Gated DeltaNet, Qwen Sparse Attention and MoE layers with a separate n-gram/PLE lookup component. The table, experts, recurrent state, sparse history and MTP have different precision and placement requirements. Active-expert counts alone cannot establish residency or latency. See [architecture and component accounting](architecture.md), [precision](precision.md) and [serving tradeoffs](serving.md).

## Practical identity

| Property | Value |
| --- | --- |
| Exact base repository | Qwen/Qwen3.8-Flash-Next |
| Native positional limit | 262,144 tokens |
| Initial TP candidates | Official FP8: TP4+EP comparison; NVIDIA mixed: vLLM TP8 and SGLang TP1 compatibility probe |
| Base revision pin | de4b8e4d43b917e7706784d8bb445c9af86a3540 |
| License scope | Qwen Community License 1.0; NVIDIA derivative also names NVIDIA Open Model License |
| Verification level | Publisher cards and immutable metadata rechecked; no weight load or GPU benchmark |
| AA Intelligence Index v5.0.1 (third-party) | reasoning, no effort setting: 28.575 (v5.0 null). Not reproduced; not tied to this revision or any export. [Details](../../../reports/intelligence-index.md) [AA-MODEL-QWEN3-8-FLASH-NEXT](https://artificialanalysis.ai/models/qwen3-8-flash-next) |


The positional limit is not a promise of that many usable tokens under arbitrary batching, image load or cache precision. [qwen3.8-flash-next-CARD](https://huggingface.co/Qwen/Qwen3.8-Flash-Next/raw/de4b8e4d43b917e7706784d8bb445c9af86a3540/README.md) [qwen3.8-flash-next-CFG](https://huggingface.co/Qwen/Qwen3.8-Flash-Next/raw/de4b8e4d43b917e7706784d8bb445c9af86a3540/config.json)

## The most important unresolved checks

B300 load, quality and performance for the documented SGLang NVIDIA TP1 recipe; n-gram placement costs; full checkpoint tensor-byte census; production throughput under realistic prefix reuse.

[Return to repository index](../../../README.md)

## Hugging Face README snapshots

The original snapshots were fetched on October 26. The table also identifies the November 20 additions. The publisher target, catalog exports and additional drafts/candidates remain distinct. Original relative links and images are preserved; use the pinned upstream view to resolve assets. Publisher benchmarks and launch examples retain their original scope, including older or development images. Apply the atlas serving assessment for KServe/B300. Upstream terms apply; copying a card does not qualify its model or configuration.

| Artifact | Local README | Pinned upstream README |
| --- | --- | --- |
| Publisher target: `Qwen/Qwen3.8-Flash-Next` | [README](huggingface/README.md) | [de4b8e4d43b9](https://huggingface.co/Qwen/Qwen3.8-Flash-Next/blob/de4b8e4d43b917e7706784d8bb445c9af86a3540/README.md) |
| Catalog export: fp8: `Qwen/Qwen3.8-Flash-Next-FP8` | [README](huggingface/fp8/README.md) | [236dfdf28582](https://huggingface.co/Qwen/Qwen3.8-Flash-Next-FP8/blob/236dfdf285828023ca3bcd3f37366c58a3469b13/README.md) |
| Catalog export: nvfp4: `nvidia/Qwen3.8-Flash-Next-NVFP4` | [README](huggingface/nvfp4/README.md) | [fc694b54fb01](https://huggingface.co/nvidia/Qwen3.8-Flash-Next-NVFP4/blob/fc694b54fb0174e0913e6adf86691ef85a4ead47/README.md) |
| Additional artifact (separate compatibility scope): `nvidia/Qwen3.8-Flash-Next-FP4-Local` | [README](huggingface/additional/nvidia--Qwen3.8-Flash-Next-FP4-Local/README.md) | [b9ce18a6887e](https://huggingface.co/nvidia/Qwen3.8-Flash-Next-FP4-Local/blob/b9ce18a6887e18c089fdea8509a33e63429a3300/README.md) |
| November 20 redhat-nvfp4 · `RedHatAI/Qwen3.8-Flash-Next-NVFP4` | [README](huggingface/redhat-nvfp4/README.md) | [96de4d48e432](https://huggingface.co/RedHatAI/Qwen3.8-Flash-Next-NVFP4/blob/96de4d48e43282a6430707f9eaf902bff2398507/README.md) |
| November 20 inferact-nvfp4 · `Inferact/Qwen3.8-Flash-Next-NVFP4` | [README](huggingface/inferact-nvfp4/README.md) | [103a76083161](https://huggingface.co/Inferact/Qwen3.8-Flash-Next-NVFP4/blob/103a7608316173ca6edd49929544244de7ffda70/README.md) |
| November 20 radixark-nvfp4 · `RadixArk/Qwen3.8-Flash-Next-NVFP4` | [README](huggingface/radixark-nvfp4/README.md) | [7b719225242a](https://huggingface.co/RadixArk/Qwen3.8-Flash-Next-NVFP4/blob/7b719225242aacd3dbd3f9407468c2ee9a9d2594/README.md) |

Revision, retrieval time and SHA-256 are recorded through each card’s source ID in [sources.json](../../../evidence/sources.json) and the [model catalog](../../../catalog/models.json).
