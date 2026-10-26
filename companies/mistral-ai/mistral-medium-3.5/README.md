# Mistral Medium 3.5

**Latest scoped recheck: October 26, 2026 (UTC).** Stable references remain **vLLM v0.32.0** and **SGLang v0.5.22**, under required KServe (upstream v0.21.0; installed version unknown). All concrete catalog variants still match their retained revisions. Current publisher cards/configurations and selected engine restrictions were rechecked; no B300 execution was performed. See [current serving assessment](serving.md#october-26-stable-release-recheck) and [Hugging Face README snapshots](#hugging-face-readme-snapshots).

**As of 2026-10-15.** Dense 128B; 88 language layers, GQA, Pixtral vision; static FP8 export.

Mistral Medium 3.5 is a large dense multimodal model with a comparatively conventional GQA memory model. Its alternative checkpoint serializations require explicit download and storage accounting. [mistral-medium-3.5-CARD](https://huggingface.co/mistralai/Mistral-Medium-3.5-128B/blob/22b2b868a15677cfa6061277ed2f653d1349a9ab/README.md) [mistral-medium-3.5-CFG](https://huggingface.co/mistralai/Mistral-Medium-3.5-128B/raw/22b2b868a15677cfa6061277ed2f653d1349a9ab/config.json)

**First serving candidate:** vLLM publisher TP8 baseline; compare TP2/4 and publisher-documented SGLang at equal workload. This is an unbenchmarked candidate for the target B300 node; relative performance remains workload-dependent.

[Architecture](architecture.md) · [Precision and variants](precision.md) · [Serving decisions](serving.md) · [Sources](sources.md) · [Model catalog](../../../catalog/models.json)

## Architecture and serving implications

The dense language backbone uses GQA with full token-history KV in the inspected text configuration. Shared KV heads reduce cache requirements relative to an equal-query-head MHA layout, while retained history still grows with sequence length. The repository offers alternative checkpoint serializations; their file sizes must not be added as if both were required for one load. See [architecture and packaging](architecture.md) and [memory/precision accounting](precision.md).

## Practical identity

| Property | Value |
| --- | --- |
| Exact base repository | mistralai/Mistral-Medium-3.5-128B |
| Native positional limit | 262,144 tokens |
| Initial TP candidate | 8 for the publisher baseline; 2 and 4 are comparison probes |
| Base revision pin | `22b2b868a15677cfa6061277ed2f653d1349a9ab` |
| License scope | Modified MIT; revenue restriction in the publisher LICENSE file |
| Verification level | Pinned cards, configs and index metadata rechecked; no model load or B300 benchmark |


The positional limit is not a promise of that many usable tokens under arbitrary batching, image load or cache precision. [mistral-medium-3.5-CARD](https://huggingface.co/mistralai/Mistral-Medium-3.5-128B/blob/22b2b868a15677cfa6061277ed2f653d1349a9ab/README.md) [mistral-medium-3.5-CFG](https://huggingface.co/mistralai/Mistral-Medium-3.5-128B/raw/22b2b868a15677cfa6061277ed2f653d1349a9ab/config.json)

## The most important unresolved checks

Installed-image and B300 compatibility at the pinned corrected revision; runtime memory beyond the reported weight payload; maximum safe concurrency and best TP width; no audited NVFP4 variant. SGLang support is documented upstream, but has not been run locally.

[Return to repository index](../../../README.md)

## Hugging Face README snapshots

These are unmodified README bytes fetched from immutable Hugging Face revisions on October 26. The publisher target, catalog exports and additional drafts/candidates remain distinct. Original relative links and images are preserved; use the pinned upstream view to resolve assets. Publisher benchmarks and launch examples retain their original scope, including older or development images. Apply the atlas serving assessment for KServe/B300. Upstream terms apply; copying a card does not qualify its model or configuration.

| Artifact | Local README | Pinned upstream README |
| --- | --- | --- |
| Publisher target: `mistralai/Mistral-Medium-3.5-128B` | [README](huggingface/README.md) | [22b2b868a156](https://huggingface.co/mistralai/Mistral-Medium-3.5-128B/blob/22b2b868a15677cfa6061277ed2f653d1349a9ab/README.md) |
| Additional artifact (separate compatibility scope): `mistralai/Mistral-Medium-3.5-128B-EAGLE` | [README](huggingface/additional/mistralai--Mistral-Medium-3.5-128B-EAGLE/README.md) | [d31694b0f55b](https://huggingface.co/mistralai/Mistral-Medium-3.5-128B-EAGLE/blob/d31694b0f55b51d4d962b5c3dbf0e03d1f019275/README.md) |

Revision, retrieval time and SHA-256 are recorded through each card’s source ID in [sources.json](../../../evidence/sources.json) and the [model catalog](../../../catalog/models.json).
