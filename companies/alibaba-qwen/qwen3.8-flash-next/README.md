# Qwen 3.8 Flash Next

**As of 2026-10-15.** 125B main + 51B n-gram + 4B MTP; 6B active main; GDN + QSA.

Flash Next has the most easily overlooked accounting issue in this catalog: the main model, n-gram table and MTP module are separately advertised. Its 125B headline is not the complete resident-parameter story. [qwen3.8-flash-next-CARD](https://huggingface.co/Qwen/Qwen3.8-Flash-Next) [qwen3.8-flash-next-CFG](https://huggingface.co/Qwen/Qwen3.8-Flash-Next/raw/de4b8e4d43b917e7706784d8bb445c9af86a3540/config.json)

**First serving candidate:** vLLM first for the exact NVIDIA mixed NVFP4 export; qualify SGLang separately. This is a reasoned deployment starting point, not a measured winner on your hardware.

[Architecture](architecture.md) · [Precision and variants](precision.md) · [Serving decisions](serving.md) · [Validation](validation.md) · [Sources](sources.md) · [Machine-readable record](model.json)

## The mental model

A specialist team uses a very large phrasebook in addition to its expert knowledge. The phrasebook takes up shelf space even when only a few experts work on each word. The assistant’s edition of the phrasebook and the main editor’s edition must agree.

## Practical identity

| Property | Value |
| --- | --- |
| Exact base repository | Qwen/Qwen3.8-Flash-Next |
| Native positional limit | 262,144 tokens |
| Initial TP candidate | 4 |
| Base revision pin | de4b8e4d43b917e7706784d8bb445c9af86a3540 |
| License scope | Qwen Community License 1.0; NVIDIA derivative also names NVIDIA Open Model License |
| Verification level | Publisher configuration and cards reviewed; not loaded or benchmarked on hardware |


The positional limit is not a promise of that many usable tokens under arbitrary batching, image load or cache precision. [qwen3.8-flash-next-CARD](https://huggingface.co/Qwen/Qwen3.8-Flash-Next) [qwen3.8-flash-next-CFG](https://huggingface.co/Qwen/Qwen3.8-Flash-Next/raw/de4b8e4d43b917e7706784d8bb445c9af86a3540/config.json)

## The most important unresolved checks

Exact NVIDIA-export SGLang compatibility; end-to-end performance of n-gram placement choices; full checkpoint tensor-byte census; production throughput under realistic prefix reuse.

[Return to repository index](../../../README.md)
