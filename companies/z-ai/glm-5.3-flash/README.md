# GLM 5.3 Flash

**As of 2026-10-16.** Publisher headline: 320B total / 18B active. Pinned checkpoint metadata: 321.32B parameters. KDA + NoPE sparse MLA + mHC; multimodal.

Flash is a different multimodal hybrid base, not merely a faster decoding option for GLM 5.3. Its combined recurrent-state and sparse-attention behavior creates different allocation and correctness requirements. [glm-5.3-flash-CARD](https://huggingface.co/zai-org/GLM-5.3-Flash/raw/46a050bec13002ad29ee795c16e61cf4fa3c4a9c/README.md) [glm-5.3-flash-CFG](https://huggingface.co/zai-org/GLM-5.3-Flash/raw/46a050bec13002ad29ee795c16e61cf4fa3c4a9c/config.json)

**First serving candidate:** SGLang Blackwell FP8 initial candidate; vLLM FP8 and NVFP4 head-to-head. This is a reasoned deployment starting point, not a measured winner on your hardware.

[Architecture](architecture.md) · [Precision and variants](precision.md) · [Serving decisions](serving.md) · [Sources](sources.md) · [Model catalog](../../../catalog/models.json)

## The mental model

Imagine a team using a short running notebook, occasional archive lookups and four coordinated whiteboards. The whiteboards make collaboration richer, but moving their contents correctly matters as much as moving the archive records.

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
