# Qwen 3.8 Flash Next

**As of 2026-10-15.** 125B main + 51B n-gram + 4B MTP; 6B active main; GDN + QSA.

Flash Next advertises the main model, n-gram table and MTP module separately. Their rounded language-model counts add to approximately 180B, without a separate vision count or an exact tensor census. [qwen3.8-flash-next-CARD](https://huggingface.co/Qwen/Qwen3.8-Flash-Next/raw/de4b8e4d43b917e7706784d8bb445c9af86a3540/README.md) [qwen3.8-flash-next-CFG](https://huggingface.co/Qwen/Qwen3.8-Flash-Next/raw/de4b8e4d43b917e7706784d8bb445c9af86a3540/config.json)

**Serving candidates:** vLLM TP8 baseline for the NVIDIA mixed export; SGLang documented TP1 candidate, unverified on B300. These are deployment experiments; no winner was measured on the target hardware.

[Architecture](architecture.md) · [Precision and variants](precision.md) · [Serving decisions](serving.md) · [Sources](sources.md) · [Model catalog](../../../catalog/models.json)

## The mental model

A specialist team uses a very large phrasebook in addition to its expert knowledge. The phrasebook takes up shelf space even when only a few experts work on each word. The assistant’s edition of the phrasebook and the main editor’s edition must agree.

## Practical identity

| Property | Value |
| --- | --- |
| Exact base repository | Qwen/Qwen3.8-Flash-Next |
| Native positional limit | 262,144 tokens |
| Initial TP candidates | vLLM 8; SGLang 1 compatibility probe |
| Base revision pin | de4b8e4d43b917e7706784d8bb445c9af86a3540 |
| License scope | Qwen Community License 1.0; NVIDIA derivative also names NVIDIA Open Model License |
| Verification level | Publisher cards and immutable metadata rechecked; no weight load or GPU benchmark |


The positional limit is not a promise of that many usable tokens under arbitrary batching, image load or cache precision. [qwen3.8-flash-next-CARD](https://huggingface.co/Qwen/Qwen3.8-Flash-Next/raw/de4b8e4d43b917e7706784d8bb445c9af86a3540/README.md) [qwen3.8-flash-next-CFG](https://huggingface.co/Qwen/Qwen3.8-Flash-Next/raw/de4b8e4d43b917e7706784d8bb445c9af86a3540/config.json)

## The most important unresolved checks

B300 load, quality and performance for the documented SGLang NVIDIA TP1 recipe; n-gram placement costs; full checkpoint tensor-byte census; production throughput under realistic prefix reuse.

[Return to repository index](../../../README.md)
