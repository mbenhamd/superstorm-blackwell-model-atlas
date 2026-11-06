# Artificial Analysis Intelligence Index v5.0 and v5.0.1

**Checked: November 6, 2026 (UTC).** Third-party benchmark composites published by Artificial Analysis (AA), backfilled for the twelve catalog families and selected proprietary frontier releases. Values are extracted from AA page data (including the [homepage intelligence tabs](https://artificialanalysis.ai/#intelligence-category-tabs)) and Internet Archive captures. They are **not reproduced**, are **not B300 measurements**, and are **not tied to any catalog revision or NVFP4/MXFP4/FP8 export**. The consolidated record is [`catalog/aa-intelligence-index.json`](../catalog/aa-intelligence-index.json); each catalog model carries one generated `aa_intelligence_index` summary in [`catalog/models.json`](../catalog/models.json), including a `headline` (highest published v5.0.1 variant, computed from the variant records). The consolidated record is canonical; the former parallel field `artificial_analysis_intelligence_index` was folded into `aa_intelligence_index.headline` and removed.

## Definition

The AA Intelligence Index is a 0–100 weighted average of nine evaluations in four equally weighted categories. AA runs each effort setting (Low, Medium, High, Xhigh, Max, or non-reasoning) as a separate entry. A composite is published only when every component is present. [AA-II-METHOD](https://artificialanalysis.ai/methodology/intelligence-benchmarking)

| Category (25% each) | Evaluation | Index weight | Scoring used in the index |
| --- | --- | --- | --- |
| Knowledge Work | AA-Briefcase v1.1 | 15% | `clamp((Elo − 500) / 2000)` on the combined Elo frozen when the model was added |
| Knowledge Work | AutomationBench-AA | 5% | Objective completion; zero credit for a guardrail violation |
| Knowledge Work | GDP.pdf | 5% | All-pass, 100 tasks × 5 repeats |
| Coding | FrontierCode 2.0 | 15% | Tests plus LLM-judge rubric; a failed blocking check scores zero |
| Coding | Terminal-Bench 4.0 | 10% | Test-suite pass@1 |
| Science | Terminal-Bench-Science 0.1 | 15% | Test-suite pass@1 |
| Science | CritPt v2 (Hard Subset) | 10% | Official grading server, pass@1, 40 problems × 5 |
| General | AA-Omniscience v1.1 | 10% + 5% | Accuracy (10%) and 1 − hallucination rate (5%) |
| General | HLE-Diamond | 10% | Equality-checker LLM, pass@1 |

### Version boundary

| Version | Effective | Change | Evidence |
| --- | --- | --- | --- |
| v4.3.2 | Until late October 2026 | Prior composition (GDPval-AA, SciCode, AA-LCR, HLE and others) | Leaderboard capture 2026-10-28T01:03:49Z still labelled v4.3.2. [AA-WB-II-20261028](https://web.archive.org/web/20261028010349id_/https://artificialanalysis.ai/evaluations/artificial-analysis-intelligence-index) |
| v5.0 | 27 Oct 2026 (AA changelog) → 3 Nov 2026 | Added HLE-Diamond, Terminal-Bench-Science and FrontierCode 2.0; GDP.pdf to 5%; CritPt → CritPt v2 Hard; removed GDPval-AA, SciCode, AA-LCR and HLE; AA-Omniscience v1.1; 4 × 25% categories | AA changelog: methodology updated and v5 announced 27 Oct. First capture labelled v5.0 is 2026-10-29T01:01:15Z; latest v5.0 capture used is 2026-11-03T19:33:41Z. [AA-HOME](https://artificialanalysis.ai/#intelligence-category-tabs) [AA-WB-II-20261029](https://web.archive.org/web/20261029010115id_/https://artificialanalysis.ai/evaluations/artificial-analysis-intelligence-index) [AA-WB-MODEL-GEMINI-4-CARBON-20261103](https://web.archive.org/web/20261103193341id_/https://artificialanalysis.ai/models/gemini-4-carbon) |
| v5.0.1 | 3 Nov 2026 (AA changelog) → current | All models regraded on CritPt v2 with the CritPt authors' grading-robustness fixes; weights unchanged | AA changelog dates the methodology update 3 Nov; the 2026-11-03T19:33:41Z capture still shows v5.0, so rollout followed that time. Live pages on 2026-11-06. [AA-HOME](https://artificialanalysis.ai/#intelligence-category-tabs) [AA-II-METHOD](https://artificialanalysis.ai/methodology/intelligence-benchmarking) [AA-II-LEADERBOARD](https://artificialanalysis.ai/evaluations/artificial-analysis-intelligence-index) |

AA now serves only v5.0.1 values. The v5.0 column below therefore comes from archived captures and is historical; v5.0.1 is the current published value. Because the CritPt regrade is the only change, `v5.0.1 − v5.0 = 10 × ΔCritPt v2 Hard` for every variant observed in both versions.

## Catalog families

| Release | AA variant | Effort | v5.0 | v5.0.1 | Coverage note | v5.0.1 source |
| --- | --- | --- | --- | --- | --- | --- |
| [Kimi K3](../companies/moonshot-ai/kimi-k3/README.md) | `kimi-k3-low` | low | 17.419 | 17.419 |  | [AA-MODEL-KIMI-K3-LOW](https://artificialanalysis.ai/models/kimi-k3-low) |
| [Kimi K3](../companies/moonshot-ai/kimi-k3/README.md) | `kimi-k3` | max | null | null | Missing: FrontierCode 2.0, AA-Omniscience v1.1 accuracy, AA-Omniscience v1.1 non-hallucination | [AA-MODEL-KIMI-K3](https://artificialanalysis.ai/models/kimi-k3) |
| [Kimi K3.1 Pro](../companies/moonshot-ai/kimi-k3.1-pro/README.md) | `kimi-k3-1-pro` | max | 46.003 | 46.453 |  | [AA-MODEL-KIMI-K3-1-PRO](https://artificialanalysis.ai/models/kimi-k3-1-pro) |
| [GLM-5.3](../companies/z-ai/glm-5.3/README.md) | `glm-5-3` | max | 31.653 | 31.653 |  | [AA-MODEL-GLM-5-3](https://artificialanalysis.ai/models/glm-5-3) |
| [GLM-5.3](../companies/z-ai/glm-5.3/README.md) | `glm-5-3-low` | low | 23.058 | 23.108 |  | [AA-MODEL-GLM-5-3-LOW](https://artificialanalysis.ai/models/glm-5-3-low) |
| [GLM-5.3-Flash](../companies/z-ai/glm-5.3-flash/README.md) | `glm-5-3-flash` | max | 27.754 | 27.804 |  | [AA-MODEL-GLM-5-3-FLASH](https://artificialanalysis.ai/models/glm-5-3-flash) |
| [DeepSeek V4 Flash 0731](../companies/deepseek/deepseek-v4-flash-0731/README.md) | `deepseek-v4-flash` | max | null | null | Missing: FrontierCode 2.0, Terminal-Bench-Science 0.1, CritPt v2 (Hard Subset), AA-Omniscience v1.1 accuracy, AA-Omniscience v1.1 non-hallucination, HLE-Diamond | [AA-MODEL-DEEPSEEK-V4-FLASH](https://artificialanalysis.ai/models/deepseek-v4-flash) |
| [DeepSeek V4.1 Flash 1017](../companies/deepseek/deepseek-v4.1-flash-1017/README.md) | `deepseek-v4-1-flash-1017` | max | 32.490 | 32.590 |  | [AA-MODEL-DEEPSEEK-V4-1-FLASH-1017](https://artificialanalysis.ai/models/deepseek-v4-1-flash-1017) |
| [DeepSeek V4.1 Flash 1017](../companies/deepseek/deepseek-v4.1-flash-1017/README.md) | `deepseek-v4-1-flash-1017-high` | high | not captured | 28.644 | Evaluated under v5.0 (AA changelog 01 Nov); no archived capture embeds the v5.0 value | [AA-MODEL-DEEPSEEK-V4-1-FLASH-1017-HIGH](https://artificialanalysis.ai/models/deepseek-v4-1-flash-1017-high) |
| [DeepSeek V4.1 Flash 1017](../companies/deepseek/deepseek-v4.1-flash-1017/README.md) | `deepseek-v4-1-flash-1017-non-reasoning` | non-reasoning | 18.513 | 18.513 |  | [AA-MODEL-DEEPSEEK-V4-1-FLASH-1017-NON-REASONING](https://artificialanalysis.ai/models/deepseek-v4-1-flash-1017-non-reasoning) |
| [Qwen3.8 27B](../companies/alibaba-qwen/qwen3.8-27b/README.md) | `qwen3-8-27b` | xhigh | 20.107 | 20.107 |  | [AA-MODEL-QWEN3-8-27B](https://artificialanalysis.ai/models/qwen3-8-27b) |
| [Qwen3.8 27B](../companies/alibaba-qwen/qwen3.8-27b/README.md) | `qwen3-8-27b-medium` | medium | 17.483 | 17.483 |  | [AA-MODEL-QWEN3-8-27B-MEDIUM](https://artificialanalysis.ai/models/qwen3-8-27b-medium) |
| [Qwen3.8 27B](../companies/alibaba-qwen/qwen3.8-27b/README.md) | `qwen3-8-27b-low` | low | 15.685 | 15.685 |  | [AA-MODEL-QWEN3-8-27B-LOW](https://artificialanalysis.ai/models/qwen3-8-27b-low) |
| [Qwen3.8 27B](../companies/alibaba-qwen/qwen3.8-27b/README.md) | `qwen3-8-27b-non-reasoning` | non-reasoning | 10.032 | 10.032 |  | [AA-MODEL-QWEN3-8-27B-NON-REASONING](https://artificialanalysis.ai/models/qwen3-8-27b-non-reasoning) |
| [Qwen3.8-Flash-Next](../companies/alibaba-qwen/qwen3.8-flash-next/README.md) | `qwen3-8-flash-next` | reasoning, no effort setting | null | null | Missing: FrontierCode 2.0, Terminal-Bench-Science 0.1, CritPt v2 (Hard Subset) | [AA-MODEL-QWEN3-8-FLASH-NEXT](https://artificialanalysis.ai/models/qwen3-8-flash-next) |
| [Gemma 4 31B](../companies/google/gemma-4-31b-it/README.md) | `gemma-4-31b` | reasoning, no effort setting | null | 4.384 | v5.0 missing: FrontierCode 2.0, Terminal-Bench-Science 0.1, HLE-Diamond | [AA-MODEL-GEMMA-4-31B](https://artificialanalysis.ai/models/gemma-4-31b) |
| [Gemma 4 31B](../companies/google/gemma-4-31b-it/README.md) | `gemma-4-31b-non-reasoning` | non-reasoning | null | null | Missing: AA-Briefcase v1.1, AutomationBench-AA, GDP.pdf, FrontierCode 2.0, Terminal-Bench 4.0, Terminal-Bench-Science 0.1, CritPt v2 (Hard Subset), AA-Omniscience v1.1 accuracy, AA-Omniscience v1.1 non-hallucination, HLE-Diamond | [AA-MODEL-GEMMA-4-31B-NON-REASONING](https://artificialanalysis.ai/models/gemma-4-31b-non-reasoning) |
| [Mistral Medium 3.5](../companies/mistral-ai/mistral-medium-3.5/README.md) | `mistral-medium-3-5` | high | null | 4.645 | v5.0 missing: FrontierCode 2.0, CritPt v2 (Hard Subset) | [AA-MODEL-MISTRAL-MEDIUM-3-5](https://artificialanalysis.ai/models/mistral-medium-3-5) |
| [Mistral Large 4](../companies/mistral-ai/mistral-large-4/README.md) | `mistral-large-4` | high | 26.025 | 26.125 |  | [AA-MODEL-MISTRAL-LARGE-4](https://artificialanalysis.ai/models/mistral-large-4) |
| [Mistral Large 4](../companies/mistral-ai/mistral-large-4/README.md) | `mistral-large-4-medium` | medium | 23.078 | 23.128 |  | [AA-MODEL-MISTRAL-LARGE-4-MEDIUM](https://artificialanalysis.ai/models/mistral-large-4-medium) |
| [Muse Glimmer](../companies/meta/muse-glimmer-30b/README.md) | `muse-glimmer` | high | 6.341 | 6.341 |  | [AA-MODEL-MUSE-GLIMMER](https://artificialanalysis.ai/models/muse-glimmer) |

AA links each catalog family to the same Hugging Face repository as the catalog `hf_id`, but records no revision, served precision or evaluation endpoint. Its speed/price data source (`performanceDataSource`) is the first-party API, or the median across hosts for DeepSeek V4 Flash 0731 and Muse Glimmer 30B; that field does not identify the evaluation endpoint. Kimi K3.1 Pro, DeepSeek V4.1 Flash 1017, Mistral Large 4 and Muse Glimmer 30B were added to the catalog on November 6 with their own pinned revisions, so their scores are now catalog values. [AA-MODEL-KIMI-K3-1-PRO](https://artificialanalysis.ai/models/kimi-k3-1-pro) [AA-MODEL-DEEPSEEK-V4-1-FLASH-1017](https://artificialanalysis.ai/models/deepseek-v4-1-flash-1017) [AA-MODEL-MISTRAL-LARGE-4](https://artificialanalysis.ai/models/mistral-large-4) [AA-MODEL-MUSE-GLIMMER](https://artificialanalysis.ai/models/muse-glimmer)

## Lineage between catalog families

AA's deprecation links point from two catalog families to newer catalog families: Kimi K3 → Kimi K3.1 Pro, and DeepSeek V4 Flash 0731 → DeepSeek V4.1 Flash → DeepSeek V4.1 Flash 1017. Each is a **different model** with its own repository, revision and catalog record; no score is transferred between them. Kimi K3.1 Pro keeps Kimi K3's 2.8T / 104B publisher headline but adds a DSA indexer; DeepSeek V4.1 Flash 1017 is a different architecture class from 0731 (AA lists 552B / 16B with image input against 284B / 13B text-only; the 552B is a backbone count per the DeepSeek V4.1 family review). The intermediate DeepSeek V4.1 Flash release (2026-09-10) is deprecated in favour of the 1017 release, is not in the catalog and has no v5.0.1 composite. [AA-MODEL-KIMI-K3](https://artificialanalysis.ai/models/kimi-k3) [AA-MODEL-DEEPSEEK-V4-FLASH](https://artificialanalysis.ai/models/deepseek-v4-flash) [AA-MODEL-DEEPSEEK-V4-1-FLASH](https://artificialanalysis.ai/models/deepseek-v4-1-flash)

Mistral Large 4: the 2026-10-29T01:01:15Z leaderboard capture and the 2026-10-29T02:51:14Z model-page capture show the deprecated **Mistral Large 4 Preview** record (v5.0 25.286, no weights link) on the `mistral-large-4` slug. From the 07:59:48Z capture the Preview is on its own `mistral-large-4-preview` slug and no `mistral-large-4` record is embedded; the released Mistral Large 4 (High) record (26.025) appears on `mistral-large-4` from the 14:59:06Z capture. Preview records are excluded by name; the v5.0 values above come from records of the released model. [AA-WB-II-20261029](https://web.archive.org/web/20261029010115id_/https://artificialanalysis.ai/evaluations/artificial-analysis-intelligence-index) [AA-WB-MODEL-GEMINI-4-CARBON-20261029025114](https://web.archive.org/web/20261029025114id_/https://artificialanalysis.ai/models/gemini-4-carbon) [AA-WB-MODEL-GEMINI-4-CARBON-20261029075948](https://web.archive.org/web/20261029075948id_/https://artificialanalysis.ai/models/gemini-4-carbon) [AA-WB-MODEL-GEMINI-4-CARBON-20261029145906](https://web.archive.org/web/20261029145906id_/https://artificialanalysis.ai/models/gemini-4-carbon)

## Frontier reference releases

Proprietary API releases, recorded for scale. None is servable on the B300/KServe target.

| Release | AA variant | Effort | v5.0 | v5.0.1 | Coverage note | v5.0.1 source |
| --- | --- | --- | --- | --- | --- | --- |
| Claude Opus 5.5 | `claude-opus-5-5` | max | 58.406 | 59.106 |  | [AA-MODEL-CLAUDE-OPUS-5-5](https://artificialanalysis.ai/models/claude-opus-5-5) |
| Claude Opus 5.5 | `claude-opus-5-5-xhigh` | xhigh | 56.995 | 57.445 |  | [AA-MODEL-CLAUDE-OPUS-5-5-XHIGH](https://artificialanalysis.ai/models/claude-opus-5-5-xhigh) |
| Claude Opus 5.5 | `claude-opus-5-5-high` | high | 51.686 | 51.836 |  | [AA-MODEL-CLAUDE-OPUS-5-5-HIGH](https://artificialanalysis.ai/models/claude-opus-5-5-high) |
| Claude Opus 5.5 | `claude-opus-5-5-medium` | medium | 48.058 | 48.208 |  | [AA-MODEL-CLAUDE-OPUS-5-5-MEDIUM](https://artificialanalysis.ai/models/claude-opus-5-5-medium) |
| Claude Opus 5.5 | `claude-opus-5-5-low` | low | 34.503 | 34.753 |  | [AA-MODEL-CLAUDE-OPUS-5-5-LOW](https://artificialanalysis.ai/models/claude-opus-5-5-low) |
| Claude Fable 5.1 | `claude-fable-5-1-xhigh` | xhigh | 49.672 | 50.022 |  | [AA-MODEL-CLAUDE-FABLE-5-1-XHIGH](https://artificialanalysis.ai/models/claude-fable-5-1-xhigh) |
| Claude Fable 5.1 | `claude-fable-5-1` | max | 49.010 | 49.160 |  | [AA-MODEL-CLAUDE-FABLE-5-1](https://artificialanalysis.ai/models/claude-fable-5-1) |
| Claude Fable 5.1 | `claude-fable-5-1-high` | high | 47.025 | 47.175 |  | [AA-MODEL-CLAUDE-FABLE-5-1-HIGH](https://artificialanalysis.ai/models/claude-fable-5-1-high) |
| Claude Fable 5.1 | `claude-fable-5-1-medium` | medium | 42.972 | 43.172 |  | [AA-MODEL-CLAUDE-FABLE-5-1-MEDIUM](https://artificialanalysis.ai/models/claude-fable-5-1-medium) |
| Claude Fable 5.1 | `claude-fable-5-1-low` | low | 38.484 | 38.684 |  | [AA-MODEL-CLAUDE-FABLE-5-1-LOW](https://artificialanalysis.ai/models/claude-fable-5-1-low) |
| Claude Sonnet 5.5 | `claude-sonnet-5-5` | max | 54.241 | 54.541 |  | [AA-MODEL-CLAUDE-SONNET-5-5](https://artificialanalysis.ai/models/claude-sonnet-5-5) |
| Claude Sonnet 5.5 | `claude-sonnet-5-5-xhigh` | xhigh | 49.574 | 49.924 |  | [AA-MODEL-CLAUDE-SONNET-5-5-XHIGH](https://artificialanalysis.ai/models/claude-sonnet-5-5-xhigh) |
| Claude Sonnet 5.5 | `claude-sonnet-5-5-high` | high | 41.115 | 41.515 |  | [AA-MODEL-CLAUDE-SONNET-5-5-HIGH](https://artificialanalysis.ai/models/claude-sonnet-5-5-high) |
| Claude Sonnet 5.5 | `claude-sonnet-5-5-medium` | medium | 30.320 | 30.820 |  | [AA-MODEL-CLAUDE-SONNET-5-5-MEDIUM](https://artificialanalysis.ai/models/claude-sonnet-5-5-medium) |
| Claude Sonnet 5.5 | `claude-sonnet-5-5-low` | low | 25.300 | 25.650 |  | [AA-MODEL-CLAUDE-SONNET-5-5-LOW](https://artificialanalysis.ai/models/claude-sonnet-5-5-low) |
| GPT-6 Astra | `gpt-6-astra` | max | 56.854 | 56.854 |  | [AA-MODEL-GPT-6-ASTRA](https://artificialanalysis.ai/models/gpt-6-astra) |
| GPT-6 Astra | `gpt-6-astra-xhigh` | xhigh | 55.256 | 55.306 |  | [AA-MODEL-GPT-6-ASTRA-XHIGH](https://artificialanalysis.ai/models/gpt-6-astra-xhigh) |
| GPT-6 Astra | `gpt-6-astra-high` | high | 54.850 | 54.850 |  | [AA-MODEL-GPT-6-ASTRA-HIGH](https://artificialanalysis.ai/models/gpt-6-astra-high) |
| GPT-6 Astra | `gpt-6-astra-medium` | medium | 51.455 | 51.555 |  | [AA-MODEL-GPT-6-ASTRA-MEDIUM](https://artificialanalysis.ai/models/gpt-6-astra-medium) |
| GPT-6 Astra | `gpt-6-astra-low` | low | 43.035 | 43.335 |  | [AA-MODEL-GPT-6-ASTRA-LOW](https://artificialanalysis.ai/models/gpt-6-astra-low) |
| GPT-6.1 Sol | `gpt-6-1-sol` | max | 54.509 | 54.609 |  | [AA-MODEL-GPT-6-1-SOL](https://artificialanalysis.ai/models/gpt-6-1-sol) |
| GPT-6.1 Sol | `gpt-6-1-sol-xhigh` | xhigh | 52.308 | 52.458 |  | [AA-MODEL-GPT-6-1-SOL-XHIGH](https://artificialanalysis.ai/models/gpt-6-1-sol-xhigh) |
| GPT-6.1 Sol | `gpt-6-1-sol-high` | high | 50.229 | 50.329 |  | [AA-MODEL-GPT-6-1-SOL-HIGH](https://artificialanalysis.ai/models/gpt-6-1-sol-high) |
| GPT-6.1 Sol | `gpt-6-1-sol-medium` | medium | 46.147 | 46.347 |  | [AA-MODEL-GPT-6-1-SOL-MEDIUM](https://artificialanalysis.ai/models/gpt-6-1-sol-medium) |
| GPT-6.1 Sol | `gpt-6-1-sol-low` | low | 34.503 | 34.803 |  | [AA-MODEL-GPT-6-1-SOL-LOW](https://artificialanalysis.ai/models/gpt-6-1-sol-low) |
| Gemini 4 Carbon | `gemini-4-carbon` | high | 59.426 | 60.026 |  | [AA-MODEL-GEMINI-4-CARBON](https://artificialanalysis.ai/models/gemini-4-carbon) |
| Gemini 4 Carbon | `gemini-4-carbon-medium` | medium | not captured | 58.259 | Evaluated under v5.0 (AA changelog 1 Nov); no archived capture embeds the v5.0 value | [AA-MODEL-GEMINI-4-CARBON-MEDIUM](https://artificialanalysis.ai/models/gemini-4-carbon-medium) |
| Gemini 4 Carbon | `gemini-4-carbon-low` | low | not captured | 54.221 | Evaluated under v5.0 (AA changelog 2 Nov); no archived capture embeds the v5.0 value | [AA-MODEL-GEMINI-4-CARBON-LOW](https://artificialanalysis.ai/models/gemini-4-carbon-low) |
| Gemini 4 Argon | `gemini-4-argon` | high | 50.412 | 50.412 |  | [AA-MODEL-GEMINI-4-ARGON](https://artificialanalysis.ai/models/gemini-4-argon) |


Each v5.0.1 value cites the AA page of that variant (`/models/<variant-slug>`), whose capture embeds the record; v5.0 values come from [AA-WB-MODEL-GEMINI-4-CARBON-20261101](https://web.archive.org/web/20261101180313id_/https://artificialanalysis.ai/models/gemini-4-carbon) and [AA-WB-MODEL-GEMINI-4-CARBON-20261103](https://web.archive.org/web/20261103193341id_/https://artificialanalysis.ai/models/gemini-4-carbon).

## AA category classifications

The homepage intelligence tabs split the same index by **Open Weights / Proprietary**, **Text Only / Multimodal Inputs** and **By Country**. The classifications behind those tabs are recorded per release as `aa_category_classification`. They are AA's labels. They are not a licence review and do not verify which inputs the model supports. [AA-HOME](https://artificialanalysis.ai/#intelligence-category-tabs)

| Release | AA open-weights category | AA licence name | AA input modalities | Creator country |
| --- | --- | --- | --- | --- |
| Kimi K3 | Open Weights (Commercial Use Restricted) | Kimi K3 License | text, image | CN |
| Kimi K3.1 Pro | Open Weights (Commercial Use Restricted) | Kimi K3.1-Pro Licence | text, image | CN |
| GLM-5.3 | Open Weights (Commercial Use Restricted) | GLM-5.3 License | text | CN |
| GLM-5.3-Flash | Open Weights | MIT | text, image | CN |
| DeepSeek V4 Flash 0731 | Open Weights | MIT | text | CN |
| DeepSeek V4.1 Flash 1017 | Open Weights | MIT | text, image | CN |
| Qwen3.8 27B | Open Weights | Apache 2.0 | text, image, video | CN |
| Qwen3.8-Flash-Next | Open Weights (Commercial Use Restricted) | Qwen Community License 1.0 | text, image, video | CN |
| Gemma 4 31B | Open Weights | Apache 2.0 | text, image, video | US |
| Mistral Medium 3.5 | Open Weights (Commercial Use Restricted) | Modified MIT License | text, image | FR |
| Mistral Large 4 | Open Weights (Commercial Use Restricted) | Mistral Ecosystem Open-Weight License | text, image | FR |
| Muse Glimmer | Open Weights | Apache 2.0 | text, image | US |
| Claude Opus 5.5 | Proprietary | — | text, image | US |
| Claude Fable 5.1 | Proprietary | — | text, image | US |
| Claude Sonnet 5.5 | Proprietary | — | text, image | US |
| GPT-6 Astra | Proprietary | — | text, image | US |
| GPT-6.1 Sol | Proprietary | — | text, image | US |
| Gemini 4 Carbon | Proprietary | — | text, image, video, speech | US |
| Gemini 4 Argon | Proprietary | — | text, image | US |

AA's licence names agree with the catalog `license` fields for all twelve families. For nine families the catalog cites a pinned LICENSE-file review; Qwen3.8 27B and Qwen3.8-Flash-Next carry no LICENSE source ID, and Gemma 4 31B's licence source is Google's Apache-2.0 web page (`gemma-4-31b-it-LICENSE`), not a pinned LICENSE file. AA's "Commercial Use Restricted" label for GLM 5.3, Kimi K3, Kimi K3.1 Pro, Qwen 3.8 Flash Next, Mistral Medium 3.5 and Mistral Large 4 reflects custom or modified terms; the catalog records, for example, the Mistral revenue restriction. Input modalities describe AA's evaluated endpoint and do not establish that a quantized export or serving engine preserves the vision, video or speech path.

## Interpretation

- **Gemini 4 Carbon Medium and Low have no recoverable v5.0 value.** AA evaluated them on 1–2 Nov under v5.0, but every archived capture lists them only in the model selector, without a scored record.
- **Effort is part of the identity.** Claude Opus 5.5 spans 34.753 (Low) to 59.106 (Max) in v5.0.1; GLM-5.3 spans 23.108 (Low) to 31.653 (Max). Compare equal effort settings and report AA output tokens and cost per task alongside the index; higher effort buys score with substantially more generated tokens.
- **The maximum-effort variant is not always the highest.** Claude Fable 5.1 Xhigh (50.022) exceeds Fable 5.1 Max (49.160). The AA release-level summary object for Claude Fable 5.1 (`modelCount` 5, embedded in the GLM-5.3 release-page capture) carries 50.022, the Xhigh value. [AA-MODEL-GLM-5-3](https://artificialanalysis.ai/models/glm-5-3)
- **Kimi K3's highest published variant is Low.** Kimi K3 (Max) lacks FrontierCode 2.0 and AA-Omniscience v1.1 results, so AA publishes no Max composite. The highest published Kimi K3 variant is Low (17.419); the catalog headline is computed from the variant records. No captured AA page embeds a Kimi K3 release-level object carrying an index (the deprecated release object has only slug, name, deprecation flag and release date). 17.419 does not describe maximum-effort Kimi K3. [AA-MODEL-KIMI-K3](https://artificialanalysis.ai/models/kimi-k3) [AA-MODEL-KIMI-K3-LOW](https://artificialanalysis.ai/models/kimi-k3-low)
- **A null composite is missing coverage, not a zero.** DeepSeek V4 Flash 0731, Qwen3.8-Flash-Next, Kimi K3 (Max) and Gemma 4 31B (non-reasoning) remain unscored in both versions. Gemma 4 31B (reasoning) and Mistral Medium 3.5 gained composites only in v5.0.1. Gemma's v5.0 record lacked FrontierCode 2.0, Terminal-Bench-Science and HLE-Diamond while its CritPt v2 Hard score was 0.04 in both versions, so its composite followed publication of those three components, not the CritPt regrade. Mistral Medium 3.5's v5.0 record (2026-11-01T18:03Z capture) lacked FrontierCode 2.0 and CritPt v2 Hard; both appear in v5.0.1 (CritPt 0.005), so its composite may coincide with the CritPt regrade. DeepSeek V4.1 Flash 1017 (High) was evaluated under v5.0 but no archived capture embeds its v5.0 value.
- **Gemma 4 31B and Muse Glimmer receive zero Briefcase credit.** Their Briefcase Elos (368.55 and 477.83) are below the 500 floor of the normalization, so their composites (4.384 and 6.341) come entirely from the other components. On its displayed Elo (523.26), Mistral Medium 3.5 would receive a normalized Briefcase score of about 0.012. The index uses the unpublished Elo frozen at model addition; if the whole −0.063 reconstruction residual came from that Elo, it would be about 8 points lower and the normalized score about 0.007.
- **Scale of the gap.** Among catalog variants with a composite, Kimi K3.1 Pro (Max) is highest at 46.453, followed by DeepSeek V4.1 Flash 1017 (Max) at 32.590 and GLM-5.3 (Max) at 31.653. The frontier releases recorded here score 50.022–60.026 at their highest-scoring variant. The gap is a statement about AA's task suite under AA's harness, not about B300 serving quality of a particular export.

## Two-pass review

**Pass 1 — source support.** Every value is read from AA's embedded variant records (`intelligenceIndex`, component fields, `effort`, `modelWeightsSourceUrl`). The server-rendered leaderboard ignores the `models=` query, so model pages were captured instead. Each v5.0.1 value cites the page of that variant (`/models/<variant-slug>`, source ID `AA-MODEL-<VARIANT-SLUG>`); the generator verifies each saved capture against its recorded SHA-256 and checks that it embeds the cited record with the same index, ten component values, name and effort. Release-level metadata (weights link, licence, modalities, deprecation, performance data source) cites the release page, whose capture embeds the release-default record. The per-variant pages were retrieved at 12:32–12:33Z on November 6, after the release pages (07:51–08:34Z); every value was unchanged. Release-level summary objects, which carry only the highest variant, are excluded from variant values. Retrieval times, HTTP status where logged, response sizes and SHA-256 values are recorded under the source IDs above in [`evidence/sources.json`](../evidence/sources.json).

**Pass 2 — challenge.**

1. *Arithmetic.* Recomputing each published v5.0.1 composite from its ten component values and the documented weights and normalization reproduces it within 0.173 points. The residual is consistent with AA's documented use of the Briefcase Elo frozen at model addition, while pages display the current Elo. The frozen Elo is not published, so exact reproduction is not possible.
2. *Version delta.* For all 41 variants published in both versions, the v5.0 → v5.0.1 change equals 10 × the CritPt v2 Hard change. Examples: Gemini 4 Carbon High 0.63 → 0.69, +0.600; Claude Opus 5.5 Max 0.61 → 0.68, +0.700; GPT-6 Astra Max unchanged.
3. *Archive consistency.* Across 19 archived model-page captures (2026-10-29T02:51Z to 2026-11-03T19:33Z) and four leaderboard captures (2026-10-29T01:01Z to 2026-11-01T01:04Z) labelled v5.0, no variant record shows two different non-null values under the same AA record name. All 23 captures are registered (`AA-WB-II-*`, `AA-WB-MODEL-*`; listed in `verification.archived_consistency_source_ids`). GLM-5.3-Flash, Kimi K3 Low, Qwen3.8 27B Low and Qwen3.8 27B Medium were null through the 2026-10-29T14:59:06Z capture and published from the 2026-10-30T00:20:19Z capture. [AA-WB-MODEL-GEMINI-4-CARBON-20261029145906](https://web.archive.org/web/20261029145906id_/https://artificialanalysis.ai/models/gemini-4-carbon) [AA-WB-MODEL-GEMINI-4-CARBON-20261030002019](https://web.archive.org/web/20261030002019id_/https://artificialanalysis.ai/models/gemini-4-carbon) Mistral Large 4 Preview values on the `mistral-large-4` slug (01:01Z and 02:51Z captures on October 29) are excluded by name, not treated as a conflicting value. The table uses the latest v5.0 capture containing each variant.
4. *Identity.* AA's weights link equals the catalog `hf_id` for all twelve families. Revision, precision, chat template, reasoning budget and endpoint remain unidentified, so the scores are not attributed to the pinned revisions or to any NVIDIA, RedHat/Inferact or community export.
5. *Homepage cross-check.* The homepage capture embeds v5.0.1 records for 11 of the target variants (Kimi K3.1 Pro, GLM-5.3, DeepSeek V4.1 Flash 1017, Qwen3.8 27B and Mistral Large 4 release-default variants, plus the six frontier release-default variants); all equal the model-page values. [AA-HOME](https://artificialanalysis.ai/#intelligence-category-tabs) Its full model dataset is delivered as encrypted `/data/*.txt` manifests, which were not decrypted or used.
6. *Independent corroboration.* None is available. No pinned publisher card in this atlas quotes an AA Intelligence Index value, and the composites exist only at AA. The AA FAQ text (Gemini 4 Carbon 60; GLM-5.3 Max 32) agrees with the structured data but comes from the same publisher.

## Applicability to the B300 / KServe target

The composite can rank which model families deserve serving work. It cannot select a precision, engine or topology. A deployment candidate under KServe with vLLM or SGLang changes the artifact (quantized export), the runtime (kernels, KV-cache precision, speculative decoding) and the request configuration (template, reasoning budget, tool calling). Any of these can move task quality. Before relying on an AA rank for a specific deployment, an equal-effort quality comparison of the exact export through the intended KServe path is required. That comparison belongs in the execution repository.

**Evidence still needed:**

- AA's evaluation endpoint, revision and served precision for each open-weight variant.
- Composites for Kimi K3 (Max), DeepSeek V4 Flash 0731 and Qwen3.8-Flash-Next once AA publishes their missing components.
- v5.0 values for Gemini 4 Carbon Medium and Low (evaluated under v5.0 per the AA changelog; not embedded in any archived capture).

