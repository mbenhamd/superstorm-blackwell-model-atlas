# Kimi K3

**Latest scoped recheck: October 26, 2026 (UTC).** Stable references remain **vLLM v0.32.0** and **SGLang v0.5.22**, under required KServe (upstream v0.21.0; installed version unknown). All concrete catalog variants still match their retained revisions. Current publisher cards/configurations and selected engine restrictions were rechecked; no B300 execution was performed. See [current serving assessment](serving.md#october-26-stable-release-recheck) and [Hugging Face README snapshots](#hugging-face-readme-snapshots).

**Reverified 2026-10-16 (UTC).** Publisher reports 2.8T total / 104B active; hybrid KDA + gated MLA; latent MoE. The current publisher and NVIDIA repository heads still match the retained immutable revisions. [Publisher identity](https://huggingface.co/api/models/moonshotai/Kimi-K3), [NVIDIA identity](https://huggingface.co/api/models/nvidia/Kimi-K3-NVFP4).

Treat K3 as a large hybrid system, not as a conventional trillion-parameter Transformer with a smaller file format. The ordinary release is already a low-precision, quantization-aware-trained artifact. The NVIDIA NVFP4 release is a different mixed-format artifact with a different loading and kernel contract. [kimi-k3-CARD](https://huggingface.co/moonshotai/Kimi-K3/blob/f831ab66814297da540d832a5235f8e904f29d06/README.md) [kimi-k3-CFG](https://huggingface.co/moonshotai/Kimi-K3/raw/f831ab66814297da540d832a5235f8e904f29d06/config.json)

**First serving candidate:** SGLang initial candidate for NVIDIA mixed NVFP4; compare vLLM and SGLang for native MXFP4. This is an unbenchmarked candidate for the target B300 node; relative performance remains workload-dependent.

Native MXFP4 already makes single-node weight storage plausible; NVIDIA NVFP4 is a separate option. The [precision report](precision.md) separates checkpoint bytes from residency, and the [serving report](serving.md) explains why the published AgentX throughput figures do not measure fresh output-token capacity or this NVIDIA export.

[Architecture](architecture.md) · [Precision and variants](precision.md) · [Serving decisions](serving.md) · [Sources](sources.md) · [Model catalog](../../../catalog/models.json)

## Architecture and serving implications

KDA layers maintain recurrent state, gated MLA layers retain compressed token history, and latent MoE layers execute routed and shared expert computation. The complete expert set remains part of weight storage. Optional DSpark adds a distinct target/draft compatibility contract and additional state. See [architecture](architecture.md), [precision and residency](precision.md) and [DSpark integration](dspark.md).

## Practical identity

| Property | Value |
| --- | --- |
| Exact base repository | moonshotai/Kimi-K3 |
| Configured positional limit | 1,048,576 tokens |
| Initial TP candidate | 8 |
| Base revision pin | `f831ab66814297da540d832a5235f8e904f29d06` |
| License scope | Kimi K3 License; pinned file reviewed |
| Verification level | Immutable publisher card/config/license retrieved; no local GPU load or benchmark |


The positional limit is not a promise of that many usable tokens under arbitrary batching, image load or cache precision. [kimi-k3-CARD](https://huggingface.co/moonshotai/Kimi-K3/blob/f831ab66814297da540d832a5235f8e904f29d06/README.md) [kimi-k3-CFG](https://huggingface.co/moonshotai/Kimi-K3/raw/f831ab66814297da540d832a5235f8e904f29d06/config.json)

## The most important unresolved checks

Exact B300 SXM6-AC OEM topology; all-FP8 artifact availability; exact installed-image ancestry of mixed-format fixes; maximum safe long-context concurrency; native-versus-NVFP4 quality for the target tool/language distribution; actual DSpark acceptance for the target workload.

[Return to repository index](../../../README.md)

For the speculative integration and current development-image caveats, see [DSpark and state sizing](dspark.md).

## Hugging Face README snapshots

These are unmodified README bytes fetched from immutable Hugging Face revisions on October 26. The publisher target, catalog exports and additional drafts/candidates remain distinct. Original relative links and images are preserved; use the pinned upstream view to resolve assets. Publisher benchmarks and launch examples retain their original scope, including older or development images. Apply the atlas serving assessment for KServe/B300. Upstream terms apply; copying a card does not qualify its model or configuration.

| Artifact | Local README | Pinned upstream README |
| --- | --- | --- |
| Publisher target: `moonshotai/Kimi-K3` | [README](huggingface/README.md) | [f831ab668142](https://huggingface.co/moonshotai/Kimi-K3/blob/f831ab66814297da540d832a5235f8e904f29d06/README.md) |
| Catalog export: nvfp4: `nvidia/Kimi-K3-NVFP4` | [README](huggingface/nvfp4/README.md) | [b2428a0b83a8](https://huggingface.co/nvidia/Kimi-K3-NVFP4/blob/b2428a0b83a8b712ff2e1a8448a103d4175341f1/README.md) |
| Additional artifact (separate compatibility scope): `Inferact/Kimi-K3-DSpark` | [README](huggingface/additional/Inferact--Kimi-K3-DSpark/README.md) | [cf6b8244620e](https://huggingface.co/Inferact/Kimi-K3-DSpark/blob/cf6b8244620e7ea4b0651d214f28e89eac75bed6/README.md) |
| Additional artifact (separate compatibility scope): `RadixArk/Kimi-K3-DSpark` | [README](huggingface/additional/RadixArk--Kimi-K3-DSpark/README.md) | [3c5bac301d9c](https://huggingface.co/RadixArk/Kimi-K3-DSpark/blob/3c5bac301d9cf392706189d82ed947feca6c2f0f/README.md) |
| Additional artifact (separate compatibility scope): `modal-labs/Kimi-K3-DFlash` | [README](huggingface/additional/modal-labs--Kimi-K3-DFlash/README.md) | [c192d15a4340](https://huggingface.co/modal-labs/Kimi-K3-DFlash/blob/c192d15a43407bf758b5ae0880d5c72052fef1de/README.md) |

Revision, retrieval time and SHA-256 are recorded through each card’s source ID in [sources.json](../../../evidence/sources.json) and the [model catalog](../../../catalog/models.json). The hypothetical all-FP8 Kimi entry has no verified repository or README.
