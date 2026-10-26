# Qwen 3.8 Flash Next

**Latest scoped recheck: October 26, 2026 (UTC).** Stable references remain **vLLM v0.32.0** and **SGLang v0.5.22**, under required KServe (upstream v0.21.0; installed version unknown). All concrete catalog variants still match their retained revisions. Current publisher cards/configurations and selected engine restrictions were rechecked; no B300 execution was performed. See [current serving assessment](serving.md#october-26-stable-release-recheck) and [Hugging Face README snapshots](#hugging-face-readme-snapshots).

**As of 2026-10-16.** 125B main + 51B n-gram + 4B MTP; 6B active main; GDN + QSA.

Flash Next advertises the main model, n-gram table and MTP module separately. The rounded main-plus-n-gram count is 176B; adding the separately advertised 4B MTP gives approximately 180B. Calling `125 + 51 + 4` “176B total” mixes these scopes. Neither rounded sum is an exact tensor census or a separate vision count. [qwen3.8-flash-next-CARD](https://huggingface.co/Qwen/Qwen3.8-Flash-Next/raw/de4b8e4d43b917e7706784d8bb445c9af86a3540/README.md) [qwen3.8-flash-next-CFG](https://huggingface.co/Qwen/Qwen3.8-Flash-Next/raw/de4b8e4d43b917e7706784d8bb445c9af86a3540/config.json)

**Serving candidates under KServe:** compare the official FP8 export at TP4+EP in vLLM and SGLang; treat two independent four-GPU replicas separately from a shared expert world. The NVIDIA mixed export has a separate vLLM TP8 reference and SGLang TP1 compatibility probe, whose B300 cookbook cell remains unverified. See the [current release assessment](serving.md#october-26-stable-release-recheck); no engine winner was measured.

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


The positional limit is not a promise of that many usable tokens under arbitrary batching, image load or cache precision. [qwen3.8-flash-next-CARD](https://huggingface.co/Qwen/Qwen3.8-Flash-Next/raw/de4b8e4d43b917e7706784d8bb445c9af86a3540/README.md) [qwen3.8-flash-next-CFG](https://huggingface.co/Qwen/Qwen3.8-Flash-Next/raw/de4b8e4d43b917e7706784d8bb445c9af86a3540/config.json)

## The most important unresolved checks

B300 load, quality and performance for the documented SGLang NVIDIA TP1 recipe; n-gram placement costs; full checkpoint tensor-byte census; production throughput under realistic prefix reuse.

[Return to repository index](../../../README.md)

## Hugging Face README snapshots

These are unmodified README bytes fetched from immutable Hugging Face revisions on October 26. The publisher target, catalog exports and additional drafts/candidates remain distinct. Original relative links and images are preserved; use the pinned upstream view to resolve assets. Publisher benchmarks and launch examples retain their original scope, including older or development images. Apply the atlas serving assessment for KServe/B300. Upstream terms apply; copying a card does not qualify its model or configuration.

| Artifact | Local README | Pinned upstream README |
| --- | --- | --- |
| Publisher target: `Qwen/Qwen3.8-Flash-Next` | [README](huggingface/README.md) | [de4b8e4d43b9](https://huggingface.co/Qwen/Qwen3.8-Flash-Next/blob/de4b8e4d43b917e7706784d8bb445c9af86a3540/README.md) |
| Catalog export: fp8: `Qwen/Qwen3.8-Flash-Next-FP8` | [README](huggingface/fp8/README.md) | [236dfdf28582](https://huggingface.co/Qwen/Qwen3.8-Flash-Next-FP8/blob/236dfdf285828023ca3bcd3f37366c58a3469b13/README.md) |
| Catalog export: nvfp4: `nvidia/Qwen3.8-Flash-Next-NVFP4` | [README](huggingface/nvfp4/README.md) | [fc694b54fb01](https://huggingface.co/nvidia/Qwen3.8-Flash-Next-NVFP4/blob/fc694b54fb0174e0913e6adf86691ef85a4ead47/README.md) |
| Additional artifact (separate compatibility scope): `nvidia/Qwen3.8-Flash-Next-FP4-Local` | [README](huggingface/additional/nvidia--Qwen3.8-Flash-Next-FP4-Local/README.md) | [b9ce18a6887e](https://huggingface.co/nvidia/Qwen3.8-Flash-Next-FP4-Local/blob/b9ce18a6887e18c089fdea8509a33e63429a3300/README.md) |

Revision, retrieval time and SHA-256 are recorded through each card’s source ID in [sources.json](../../../evidence/sources.json) and the [model catalog](../../../catalog/models.json).
