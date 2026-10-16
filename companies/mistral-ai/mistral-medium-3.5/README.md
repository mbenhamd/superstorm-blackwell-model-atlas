# Mistral Medium 3.5

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
