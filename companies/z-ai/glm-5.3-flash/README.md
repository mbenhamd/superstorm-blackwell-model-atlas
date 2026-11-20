# GLM 5.3 Flash

**November 20, 2026.** The RedHat NVFP4 head differs from the retained pin in README and LICENSE. The external incoai DFlash2 head changes its README license declaration from CC BY-NC-ND 4.0 to Apache-2.0. Material published with the retained snapshot still carries its original terms. Current engine references are vLLM v0.34.0 and SGLang v0.5.23 under required KServe. [November 20 serving review](serving.md#november-20-engine-and-benchmark-review)

**As of 2026-10-16.** Publisher headline: 320B total / 18B active. Pinned checkpoint metadata: 321.32B parameters. KDA + NoPE sparse MLA + mHC; multimodal.

Flash is a different multimodal hybrid base, not merely a faster decoding option for GLM 5.3. Its combined recurrent-state and sparse-attention behavior creates different allocation and correctness requirements. [glm-5.3-flash-CARD](https://huggingface.co/zai-org/GLM-5.3-Flash/raw/46a050bec13002ad29ee795c16e61cf4fa3c4a9c/README.md) [glm-5.3-flash-CFG](https://huggingface.co/zai-org/GLM-5.3-Flash/raw/46a050bec13002ad29ee795c16e61cf4fa3c4a9c/config.json)

**First serving comparison.** Compare native FP8 on two TP4 groups against one TP8 group under KServe. Compare RedHat, RadixArk and NVIDIA NVFP4 exports at the same topology before changing state precision, MTP or expert parallelism. [Precision evidence](precision.md)

[Architecture](architecture.md) · [Precision and variants](precision.md) · [Serving decisions](serving.md) · [Sources](sources.md) · [Model catalog](../../../catalog/models.json)

## Architecture and serving implications

KDA layers maintain recurrent state, NoPE sparse-MLA layers retrieve selected history, and mHC mixes multiple residual streams. Serving must preserve those transformations and account separately for recurrent, attention, multimodal and speculative state. See [architecture](architecture.md), [mixed precision](precision.md) and [serving constraints](serving.md).

## Practical identity

| Property | Value |
| --- | --- |
| Exact base repository | zai-org/GLM-5.3-Flash |
| Native positional limit | 1,048,576 tokens |
| Initial TP candidate | 4 |
| Base revision pin | `46a050bec13002ad29ee795c16e61cf4fa3c4a9c` |
| License scope | MIT in the pinned publisher LICENSE; inspect derivative terms separately |
| Verification level | Current main resolves to the retained pin; publisher card, config, template, license and checkpoint metadata rechecked on 2026-10-16; no GPU load or benchmark |
| AA Intelligence Index v5.0.1 (third-party) | max: 27.804 (v5.0 27.754). Not reproduced; not tied to this revision or any export. [Details](../../../reports/intelligence-index.md) [AA-MODEL-GLM-5-3-FLASH](https://artificialanalysis.ai/models/glm-5-3-flash) |


The positional limit is not a promise of that many usable tokens under arbitrary batching, image load or cache precision. [glm-5.3-flash-CARD](https://huggingface.co/zai-org/GLM-5.3-Flash/raw/46a050bec13002ad29ee795c16e61cf4fa3c4a9c/README.md) [glm-5.3-flash-CFG](https://huggingface.co/zai-org/GLM-5.3-Flash/raw/46a050bec13002ad29ee795c16e61cf4fa3c4a9c/config.json)

The publisher's pinned benchmark graphic reports **84.3 on Terminal Bench 2.1** and **63.4 on DeepSWE v1.1**, versus Claude Opus 4.8 at 85.0 and 58.0 respectively. The Flash card specifies Claude Code 2.1.207 with a six-hour timeout for Terminal Bench, and mini-swe-agent with a six-hour timeout and 400K context for DeepSWE. These are publisher comparisons, not independent confirmation of a universal coding winner or measurements of these local serving candidates. [TOPG-FLASH-BENCH](https://raw.githubusercontent.com/zai-org/GLM-5/83c03d317378f86f0a012f7c4cd48b6243c7e69b/resources/bench_53.png) [glm-5.3-flash-CARD](https://huggingface.co/zai-org/GLM-5.3-Flash/raw/46a050bec13002ad29ee795c16e61cf4fa3c4a9c/README.md)

## The most important unresolved checks

The November 20 review distinguishes all three NVFP4 exports by their main-model and MTP storage. Loader peaks, draft acceptance, multimodal quality and the KDA/KV allocation that best serves the workload remain unmeasured. [Export comparison and tensor headers](precision.md#november-20-export-contracts)

[Return to repository index](../../../README.md)

## Hugging Face README snapshots

The additional November 20 rows link the newly inspected, revision-pinned publisher files.

These are unmodified README bytes fetched from immutable Hugging Face revisions on October 26 and November 20. The publisher target, catalog exports and additional drafts/candidates remain distinct. Original relative links and images are preserved; use the pinned upstream view to resolve assets. Publisher benchmarks and launch examples retain their original scope, including older or development images. Apply the atlas serving assessment for KServe/B300. Upstream terms apply; copying a card does not qualify its model or configuration.

| Artifact | Local README | Pinned upstream README |
| --- | --- | --- |
| Publisher target: `zai-org/GLM-5.3-Flash` | [README](huggingface/README.md) | [46a050bec130](https://huggingface.co/zai-org/GLM-5.3-Flash/blob/46a050bec13002ad29ee795c16e61cf4fa3c4a9c/README.md) |
| Catalog export: bf16: `zai-org/GLM-5.3-Flash-BF16` | [README](huggingface/bf16/README.md) | [f9fed3bbc822](https://huggingface.co/zai-org/GLM-5.3-Flash-BF16/blob/f9fed3bbc82291073373d67452e9f25317ef7577/README.md) |
| Catalog export: nvfp4: `RedHatAI/GLM-5.3-Flash-NVFP4` | [README](huggingface/nvfp4/README.md) | [18d55bfd5a21](https://huggingface.co/RedHatAI/GLM-5.3-Flash-NVFP4/blob/18d55bfd5a2194887738da73753975c9d3842f46/README.md) |
| Additional artifact (separate compatibility scope): `incoai/GLM-5.3-Flash-DFlash2` | [README](huggingface/additional/incoai--GLM-5.3-Flash-DFlash2/README.md) | [bf582e4eacc1](https://huggingface.co/incoai/GLM-5.3-Flash-DFlash2/blob/bf582e4eacc1810f76656d1811693ff6c6737d2a/README.md) |
| Target export `nvidia/GLM-5.3-Flash-NVFP4` | [README](huggingface/nvfp4-nvidia/README.md) | [1d00738646cb](https://huggingface.co/nvidia/GLM-5.3-Flash-NVFP4/blob/1d00738646cbb0c6d0a9eb403dac5f366f1473a7/README.md) |
| Target export `RadixArk/GLM-5.3-Flash-NVFP4` | [README](huggingface/nvfp4-radixark/README.md) | [f46cf340d35a](https://huggingface.co/RadixArk/GLM-5.3-Flash-NVFP4/blob/f46cf340d35a22d0d83d0c1dac8957cf2b1bcd35/README.md) |

Revision, retrieval time and SHA-256 are recorded through each card’s source ID in [sources.json](../../../evidence/sources.json) and the [model catalog](../../../catalog/models.json).
