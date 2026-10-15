# Mistral Medium 3.5

**As of 2026-10-15.** Dense 128B; 88 language layers, GQA, Pixtral vision; static FP8 export.

Mistral Medium 3.5 is a large dense multimodal model with a comparatively conventional GQA memory model. Its checkpoint packaging contains an important download-size trap. [mistral-medium-3.5-CARD](https://huggingface.co/mistralai/Mistral-Medium-3.5-128B) [mistral-medium-3.5-CFG](https://huggingface.co/mistralai/Mistral-Medium-3.5-128B/blob/main/config.json)

**First serving candidate:** vLLM first, producer-endorsed; TP2/4 versus TP8 measured at equal workload. This is a reasoned deployment starting point, not a measured winner on your hardware.

[Architecture](architecture.md) · [Precision and variants](precision.md) · [Serving decisions](serving.md) · [Validation](validation.md) · [Sources](sources.md) · [Machine-readable record](model.json)

## The mental model

A large general-purpose editor rereads the entire accumulated manuscript at each step. Several editors share a common set of reference notes. The publisher supplies the same manuscript in two file formats; buying both does not make the manuscript twice as long.

## Practical identity

| Property | Value |
| --- | --- |
| Exact base repository | mistralai/Mistral-Medium-3.5-128B |
| Native positional limit | 262,144 tokens |
| Initial TP candidate | 2 |
| Base revision pin | Not resolved immutably; resolve before deployment |
| License scope | Publisher custom license / metadata other; not assumed Apache-2.0 |
| Verification level | Publisher configuration and cards reviewed; not loaded or benchmarked on hardware |


The positional limit is not a promise of that many usable tokens under arbitrary batching, image load or cache precision. [mistral-medium-3.5-CARD](https://huggingface.co/mistralai/Mistral-Medium-3.5-128B) [mistral-medium-3.5-CFG](https://huggingface.co/mistralai/Mistral-Medium-3.5-128B/blob/main/config.json)

## The most important unresolved checks

Installed-image compatibility of the corrected configuration; exact selected-layout bytes; SGLang static-FP8 support for this artifact; maximum safe concurrency and best TP width; no audited NVFP4 variant.

[Return to repository index](../../../README.md)
