# Mistral Medium 3.5

**November 20, 2026 review.** Publisher FP8, NVIDIA mixed NVFP4 and the publisher EAGLE draft still match their pins. The NVIDIA repository uses a different HF serialization and chat template from the publisher’s native Mistral format. [Current engine and benchmark analysis](serving.md#november-20-release-and-benchmark-controls).

**As of 2026-10-15.** Dense 128B; 88 language layers, GQA, Pixtral vision; static FP8 export.

Mistral Medium 3.5 is a large dense multimodal model with a comparatively conventional GQA memory model. Its alternative checkpoint serializations require explicit download and storage accounting. [mistral-medium-3.5-CARD](https://huggingface.co/mistralai/Mistral-Medium-3.5-128B/blob/22b2b868a15677cfa6061277ed2f653d1349a9ab/README.md) [mistral-medium-3.5-CFG](https://huggingface.co/mistralai/Mistral-Medium-3.5-128B/raw/22b2b868a15677cfa6061277ed2f653d1349a9ab/config.json)

**Serving candidate.** KServe native FP8 target-only control. vLLM v0.34.0 NVIDIA mixed NVFP4 at TP4, then TP2, is a source-supported candidate. SGLang v0.5.23 mixed NVFP4 remains blocked by fused-projection lookup.

[Architecture](architecture.md) · [Precision and variants](precision.md) · [Serving decisions](serving.md) · [NVFP4 dossier](nvfp4.md) · [Sources](sources.md) · [Model catalog](../../../catalog/models.json)

## Architecture and serving implications

The dense language backbone uses GQA with full token-history KV in the inspected text configuration. Shared KV heads reduce cache requirements relative to an equal-query-head MHA layout, while retained history still grows with sequence length. The repository offers alternative checkpoint serializations; their file sizes must not be added as if both were required for one load. See [architecture and packaging](architecture.md) and [memory/precision accounting](precision.md).

## Practical identity

| Property | Value |
| --- | --- |
| Exact base repository | mistralai/Mistral-Medium-3.5-128B |
| NVFP4 variant (exporter) | nvidia/Mistral-Medium-3.5-128B-NVFP4 at `b8c66d2098edd8c9c26bde2b2ff41b5967e111ae`; 95,224,812,960 serialized bytes (0.713× FP8) |
| Native positional limit | 262,144 tokens |
| Initial TP candidate | 8 for the publisher baseline; 2 and 4 are comparison probes; NVFP4: 4 (×2 replicas), alternative 2 (×4) |
| Base revision pin | `22b2b868a15677cfa6061277ed2f653d1349a9ab` |
| License scope | Modified MIT; revenue restriction in the publisher LICENSE file. NVFP4 export: card metadata `nvidia-open-model-license` vs body "governed by Mistral's Modified MIT"; no LICENSE file in the export (unresolved) |
| Verification level | Pinned cards, configs and index metadata rechecked; no model load or B300 benchmark |
| AA Intelligence Index v5.0.1 (third-party) | high: 4.645 (v5.0 null). Null means incomplete AA coverage. Not reproduced; not tied to this revision or any export. [Details](../../../reports/intelligence-index.md) [AA-MODEL-MISTRAL-MEDIUM-3-5](https://artificialanalysis.ai/models/mistral-medium-3-5) |


The positional limit is not a promise of that many usable tokens under arbitrary batching, image load or cache precision. [mistral-medium-3.5-CARD](https://huggingface.co/mistralai/Mistral-Medium-3.5-128B/blob/22b2b868a15677cfa6061277ed2f653d1349a9ab/README.md) [mistral-medium-3.5-CFG](https://huggingface.co/mistralai/Mistral-Medium-3.5-128B/raw/22b2b868a15677cfa6061277ed2f653d1349a9ab/config.json)

## The most important unresolved checks

Installed-image and B300 compatibility at the pinned corrected revision; runtime memory beyond the reported weight payload; maximum safe concurrency and best TP width; the NVIDIA NVFP4 variant is source-reviewed only (vLLM v0.33.0 loads it by source reading; SGLang v0.5.23 fused-projection resolution fails by source reading; EAGLE acceptance with it unknown; exporter validation vLLM v0.21.0/B200). SGLang support for the FP8 publisher artifact is documented upstream, but has not been run locally.

[Return to repository index](../../../README.md)

## Hugging Face README snapshots

These are unmodified README bytes fetched from immutable Hugging Face revisions on October 26. The publisher target, catalog exports and additional drafts/candidates remain distinct. Original relative links and images are preserved; use the pinned upstream view to resolve assets. Publisher benchmarks and launch examples retain their original scope, including older or development images. Apply the atlas serving assessment for KServe/B300. Upstream terms apply; copying a card does not qualify its model or configuration.

| Artifact | Local README | Pinned upstream README |
| --- | --- | --- |
| Publisher target: `mistralai/Mistral-Medium-3.5-128B` | [README](huggingface/README.md) | [22b2b868a156](https://huggingface.co/mistralai/Mistral-Medium-3.5-128B/blob/22b2b868a15677cfa6061277ed2f653d1349a9ab/README.md) |
| Additional artifact (separate compatibility scope): `mistralai/Mistral-Medium-3.5-128B-EAGLE` | [README](huggingface/additional/mistralai--Mistral-Medium-3.5-128B-EAGLE/README.md) | [d31694b0f55b](https://huggingface.co/mistralai/Mistral-Medium-3.5-128B-EAGLE/blob/d31694b0f55b51d4d962b5c3dbf0e03d1f019275/README.md) |
| Catalog variant `nvfp4` (NVIDIA mixed NVFP4/FP8 export; snapshot retrieved November 6): `nvidia/Mistral-Medium-3.5-128B-NVFP4` | [README](huggingface/additional/nvidia--Mistral-Medium-3.5-128B-NVFP4/README.md) | [b8c66d2098ed](https://huggingface.co/nvidia/Mistral-Medium-3.5-128B-NVFP4/blob/b8c66d2098edd8c9c26bde2b2ff41b5967e111ae/README.md) |

Revision, retrieval time and SHA-256 are recorded through each card’s source ID in [sources.json](../../../evidence/sources.json) and the [model catalog](../../../catalog/models.json).

**Byte-identity recheck, 2026-11-06T12:45:27Z:** the raw NVFP4 README at `b8c66d20` was fetched again: 9,839 bytes, SHA-256 `7bbf885d2e4fcb2418a3bcf16af9ac40b2d7ddf20e85a978206bc0c4bafeb764`, equal to the local copy; the Hub head still equals the pin. [mistral-medium-3.5-NV-NVFP4-CARD](https://huggingface.co/nvidia/Mistral-Medium-3.5-128B-NVFP4/raw/b8c66d2098edd8c9c26bde2b2ff41b5967e111ae/README.md) [mistral-medium-3.5-NV-NVFP4-API](https://huggingface.co/api/models/nvidia/Mistral-Medium-3.5-128B-NVFP4)
