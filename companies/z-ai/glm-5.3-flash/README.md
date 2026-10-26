# GLM 5.3 Flash

**Latest scoped recheck: October 26, 2026 (UTC).** Stable references remain **vLLM v0.32.0** and **SGLang v0.5.22**, under required KServe (upstream v0.21.0; installed version unknown). All concrete catalog variants still match their retained revisions. Current publisher cards/configurations and selected engine restrictions were rechecked; no B300 execution was performed. See [current serving assessment](serving.md#october-26-stable-release-recheck) and [Hugging Face README snapshots](#hugging-face-readme-snapshots).

**As of 2026-10-16.** Publisher headline: 320B total / 18B active. Pinned checkpoint metadata: 321.32B parameters. KDA + NoPE sparse MLA + mHC; multimodal.

Flash is a different multimodal hybrid base, not merely a faster decoding option for GLM 5.3. Its combined recurrent-state and sparse-attention behavior creates different allocation and correctness requirements. [glm-5.3-flash-CARD](https://huggingface.co/zai-org/GLM-5.3-Flash/raw/46a050bec13002ad29ee795c16e61cf4fa3c4a9c/README.md) [glm-5.3-flash-CFG](https://huggingface.co/zai-org/GLM-5.3-Flash/raw/46a050bec13002ad29ee795c16e61cf4fa3c4a9c/config.json)

**First serving candidate:** SGLang Blackwell FP8 initial candidate; vLLM FP8 and NVFP4 head-to-head. This is an unbenchmarked candidate for the target B300 node; relative performance remains workload-dependent.

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


The positional limit is not a promise of that many usable tokens under arbitrary batching, image load or cache precision. [glm-5.3-flash-CARD](https://huggingface.co/zai-org/GLM-5.3-Flash/raw/46a050bec13002ad29ee795c16e61cf4fa3c4a9c/README.md) [glm-5.3-flash-CFG](https://huggingface.co/zai-org/GLM-5.3-Flash/raw/46a050bec13002ad29ee795c16e61cf4fa3c4a9c/config.json)

The publisher's pinned benchmark graphic reports **84.3 on Terminal Bench 2.1** and **63.4 on DeepSWE v1.1**, versus Claude Opus 4.8 at 85.0 and 58.0 respectively. The Flash card specifies Claude Code 2.1.207 with a six-hour timeout for Terminal Bench, and mini-swe-agent with a six-hour timeout and 400K context for DeepSWE. These are publisher comparisons, not independent confirmation of a universal coding winner or measurements of these local serving candidates. [TOPG-FLASH-BENCH](https://raw.githubusercontent.com/zai-org/GLM-5/83c03d317378f86f0a012f7c4cd48b6243c7e69b/resources/bench_53.png) [glm-5.3-flash-CARD](https://huggingface.co/zai-org/GLM-5.3-Flash/raw/46a050bec13002ad29ee795c16e61cf4fa3c4a9c/README.md)

## The most important unresolved checks

The RedHat quantization configuration is now inspected at an immutable revision: main routed experts use NVFP4 and MTP routed experts use FP8. Other exporters require their own configuration audit. Quality, loader memory, the best KDA/KV split and the disaggregation crossover still need local measurements.

[Return to repository index](../../../README.md)

## Hugging Face README snapshots

These are unmodified README bytes fetched from immutable Hugging Face revisions on October 26. The publisher target, catalog exports and additional drafts/candidates remain distinct. Original relative links and images are preserved; use the pinned upstream view to resolve assets. Publisher benchmarks and launch examples retain their original scope, including older or development images. Apply the atlas serving assessment for KServe/B300. Upstream terms apply; copying a card does not qualify its model or configuration.

| Artifact | Local README | Pinned upstream README |
| --- | --- | --- |
| Publisher target: `zai-org/GLM-5.3-Flash` | [README](huggingface/README.md) | [46a050bec130](https://huggingface.co/zai-org/GLM-5.3-Flash/blob/46a050bec13002ad29ee795c16e61cf4fa3c4a9c/README.md) |
| Catalog export: bf16: `zai-org/GLM-5.3-Flash-BF16` | [README](huggingface/bf16/README.md) | [f9fed3bbc822](https://huggingface.co/zai-org/GLM-5.3-Flash-BF16/blob/f9fed3bbc82291073373d67452e9f25317ef7577/README.md) |
| Catalog export: nvfp4: `RedHatAI/GLM-5.3-Flash-NVFP4` | [README](huggingface/nvfp4/README.md) | [18d55bfd5a21](https://huggingface.co/RedHatAI/GLM-5.3-Flash-NVFP4/blob/18d55bfd5a2194887738da73753975c9d3842f46/README.md) |
| Additional artifact (separate compatibility scope): `incoai/GLM-5.3-Flash-DFlash2` | [README](huggingface/additional/incoai--GLM-5.3-Flash-DFlash2/README.md) | [bf582e4eacc1](https://huggingface.co/incoai/GLM-5.3-Flash-DFlash2/blob/bf582e4eacc1810f76656d1811693ff6c6737d2a/README.md) |

Revision, retrieval time and SHA-256 are recorded through each card’s source ID in [sources.json](../../../evidence/sources.json) and the [model catalog](../../../catalog/models.json).
