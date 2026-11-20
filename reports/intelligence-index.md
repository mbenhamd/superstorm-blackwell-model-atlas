# Artificial Analysis Intelligence Index v5.0 and v5.0.1

**November 20, 2026 (UTC).** Qwen3.8-Flash-Next now has a v5.0.1 composite of **28.575**. Eleven of the twelve atlas families have at least one published composite. DeepSeek V4 Flash 0731 still lacks one. Kimi K3.1 Pro (Max) remains the highest-scoring atlas variant at **46.453**. Among the selected proprietary releases, Claude Fable 5.2 (Max, Default Fallback) leads at **64.564**. [Qwen](https://artificialanalysis.ai/models/qwen3-8-flash-next) · [DeepSeek 0731](https://artificialanalysis.ai/models/deepseek-v4-flash) · [Kimi](https://artificialanalysis.ai/models/kimi-k3-1-pro) · [AA leaderboard](https://artificialanalysis.ai/evaluations/artificial-analysis-intelligence-index)

The 74 effort variants below describe AA's evaluated endpoints. Use the [index catalog](../catalog/aa-intelligence-index.json) for the components and source ID of each variant. Each entry in the [model catalog](../catalog/models.json) also carries its applicable effort variants and highest published composite. AA does not identify the evaluated weight revision, precision or KServe deployment.

## Definition

The AA Intelligence Index is a 0–100 weighted average of nine evaluations in four equally weighted categories. AA runs each effort setting (Low, Medium, High, Xhigh, Max, or non-reasoning) as a separate entry. All 71 variants with a November 20 composite have ten component scores. The three incomplete variants have a null composite. [AA-II-METHOD](https://artificialanalysis.ai/methodology/intelligence-benchmarking)

| Category (25% each) | Evaluation | Index weight | Scoring used in the index |
| --- | --- | --- | --- |
| Knowledge Work | AA-Briefcase v1.1 | 15% | `clamp((Elo − 500) / 2000)` on the combined Elo frozen when the model was added |
| Knowledge Work | AutomationBench-AA | 5% | Objective completion; zero credit for a guardrail violation |
| Knowledge Work | GDP.pdf | 5% | All-pass, 100 tasks × 5 repeats |
| Coding | FrontierCode-AA 2.0 | 15% | AA runs Cognition's 132 tasks three times with Stirrup and grades them with GPT-6 Luna (medium). A failed blocking check or a flagged solution lookup scores zero. |
| Coding | Terminal-Bench 4.0 | 10% | Test-suite pass@1 |
| Science | Terminal-Bench-Science 0.1 | 15% | Test-suite pass@1 |
| Science | CritPt v2 (Hard Subset) | 10% | Official grading server, pass@1, 40 problems × 5 |
| General | AA-Omniscience v1.1 | 10% + 5% | Accuracy (10%) and 1 − hallucination rate (5%) |
| General | HLE-Diamond | 10% | Equality-checker LLM, pass@1 |

### Version boundary

| Version | Effective | Change | Evidence |
| --- | --- | --- | --- |
| v4.3.2 | Until late October 2026 | Prior composition (GDPval-AA, SciCode, AA-LCR, HLE and others) | Leaderboard capture 2026-10-28T01:03:49Z still labelled v4.3.2. [AA-WB-II-20261028](https://web.archive.org/web/20261028010349id_/https://artificialanalysis.ai/evaluations/artificial-analysis-intelligence-index) |
| v5.0 | 27 Oct 2026 (AA changelog) → 3 Nov 2026 | Added HLE-Diamond, Terminal-Bench-Science and FrontierCode-AA 2.0; GDP.pdf to 5%; CritPt → CritPt v2 Hard; removed GDPval-AA, SciCode, AA-LCR and HLE; AA-Omniscience v1.1; 4 × 25% categories | AA changelog: methodology updated and v5 announced 27 Oct. First capture labelled v5.0 is 2026-10-29T01:01:15Z; latest v5.0 capture used is 2026-11-03T19:33:41Z. [AA-HOME](https://artificialanalysis.ai/#intelligence-category-tabs) [AA-WB-II-20261029](https://web.archive.org/web/20261029010115id_/https://artificialanalysis.ai/evaluations/artificial-analysis-intelligence-index) [AA-WB-MODEL-GEMINI-4-CARBON-20261103](https://web.archive.org/web/20261103193341id_/https://artificialanalysis.ai/models/gemini-4-carbon) |
| v5.0.1 | 3 Nov 2026 (AA changelog) → current | All models regraded on CritPt v2 with the CritPt authors' grading-robustness fixes; weights unchanged | AA changelog dates the methodology update 3 Nov; the 2026-11-03T19:33:41Z capture still shows v5.0, so rollout followed that time. The live methodology and leaderboard still show v5.0.1 on November 20. [AA-HOME](https://artificialanalysis.ai/#intelligence-category-tabs) [AA-II-METHOD](https://artificialanalysis.ai/methodology/intelligence-benchmarking) [AA-II-LEADERBOARD](https://artificialanalysis.ai/evaluations/artificial-analysis-intelligence-index) |

The live pages report v5.0.1. Historical v5.0 values come from dated captures of the same publisher. For all 44 variants scored under both versions, the change in the index equals ten times the change in the CritPt v2 Hard score to the recorded precision.

## Catalog families

| Release | AA variant | Effort | v5.0 | v5.0.1 | Coverage note | Current score source |
| --- | --- | --- | ---: | ---: | --- | --- |
| [Kimi K3](../companies/moonshot-ai/kimi-k3/README.md) | `kimi-k3-low` | low | 17.419 | 17.419 |  | [AA model page](https://artificialanalysis.ai/models/kimi-k3-low) |
| [Kimi K3](../companies/moonshot-ai/kimi-k3/README.md) | `kimi-k3` | max | null | null | Missing FrontierCode-AA 2.0, AA-Omniscience v1.1 accuracy, AA-Omniscience v1.1 non-hallucination | [AA model page](https://artificialanalysis.ai/models/kimi-k3) |
| [Kimi K3.1 Pro](../companies/moonshot-ai/kimi-k3.1-pro/README.md) | `kimi-k3-1-pro` | max | 46.003 | 46.453 |  | [AA model page](https://artificialanalysis.ai/models/kimi-k3-1-pro) |
| [GLM-5.3](../companies/z-ai/glm-5.3/README.md) | `glm-5-3` | max | 31.653 | 31.653 |  | [AA model page](https://artificialanalysis.ai/models/glm-5-3) |
| [GLM-5.3](../companies/z-ai/glm-5.3/README.md) | `glm-5-3-low` | low | 23.058 | 23.108 |  | [AA model page](https://artificialanalysis.ai/models/glm-5-3-low) |
| [GLM-5.3-Flash](../companies/z-ai/glm-5.3-flash/README.md) | `glm-5-3-flash` | max | 27.754 | 27.804 |  | [AA model page](https://artificialanalysis.ai/models/glm-5-3-flash) |
| [DeepSeek V4 Flash 0731](../companies/deepseek/deepseek-v4-flash-0731/README.md) | `deepseek-v4-flash` | max | null | null | Missing FrontierCode-AA 2.0, Terminal-Bench-Science 0.1, CritPt v2 (Hard Subset), AA-Omniscience v1.1 accuracy, AA-Omniscience v1.1 non-hallucination, HLE-Diamond | [AA model page](https://artificialanalysis.ai/models/deepseek-v4-flash) |
| [DeepSeek V4.1 Flash 1017](../companies/deepseek/deepseek-v4.1-flash-1017/README.md) | `deepseek-v4-1-flash-1017` | max | 32.490 | 32.590 |  | [AA model page](https://artificialanalysis.ai/models/deepseek-v4-1-flash-1017) |
| [DeepSeek V4.1 Flash 1017](../companies/deepseek/deepseek-v4.1-flash-1017/README.md) | `deepseek-v4-1-flash-1017-high` | high | 28.544 | 28.644 | [v5.0 archive](https://web.archive.org/web/20261103184023id_/https://artificialanalysis.ai/models/nanbeige4-3-33b) | [AA model page](https://artificialanalysis.ai/models/deepseek-v4-1-flash-1017-high) |
| [DeepSeek V4.1 Flash 1017](../companies/deepseek/deepseek-v4.1-flash-1017/README.md) | `deepseek-v4-1-flash-1017-non-reasoning` | non-reasoning | 18.513 | 18.513 |  | [AA model page](https://artificialanalysis.ai/models/deepseek-v4-1-flash-1017-non-reasoning) |
| [Qwen3.8 27B](../companies/alibaba-qwen/qwen3.8-27b/README.md) | `qwen3-8-27b` | xhigh | 20.107 | 20.107 |  | [AA model page](https://artificialanalysis.ai/models/qwen3-8-27b) |
| [Qwen3.8 27B](../companies/alibaba-qwen/qwen3.8-27b/README.md) | `qwen3-8-27b-medium` | medium | 17.483 | 17.483 |  | [AA model page](https://artificialanalysis.ai/models/qwen3-8-27b-medium) |
| [Qwen3.8 27B](../companies/alibaba-qwen/qwen3.8-27b/README.md) | `qwen3-8-27b-low` | low | 15.685 | 15.685 |  | [AA model page](https://artificialanalysis.ai/models/qwen3-8-27b-low) |
| [Qwen3.8 27B](../companies/alibaba-qwen/qwen3.8-27b/README.md) | `qwen3-8-27b-non-reasoning` | non-reasoning | 10.032 | 10.032 |  | [AA model page](https://artificialanalysis.ai/models/qwen3-8-27b-non-reasoning) |
| [Qwen3.8-Flash-Next](../companies/alibaba-qwen/qwen3.8-flash-next/README.md) | `qwen3-8-flash-next` | reasoning, no effort setting | null | 28.575 | v5.0 lacked FrontierCode-AA 2.0, Terminal-Bench-Science 0.1, CritPt v2 (Hard Subset) | [AA model page](https://artificialanalysis.ai/models/qwen3-8-flash-next) |
| [Gemma 4 31B](../companies/google/gemma-4-31b-it/README.md) | `gemma-4-31b` | reasoning, no effort setting | null | 4.384 | v5.0 lacked FrontierCode-AA 2.0, Terminal-Bench-Science 0.1, HLE-Diamond | [AA model page](https://artificialanalysis.ai/models/gemma-4-31b) |
| [Gemma 4 31B](../companies/google/gemma-4-31b-it/README.md) | `gemma-4-31b-non-reasoning` | non-reasoning | null | null | Missing AA-Briefcase v1.1, AutomationBench-AA, GDP.pdf, FrontierCode-AA 2.0, Terminal-Bench 4.0, Terminal-Bench-Science 0.1, CritPt v2 (Hard Subset), AA-Omniscience v1.1 accuracy, AA-Omniscience v1.1 non-hallucination, HLE-Diamond | [AA model page](https://artificialanalysis.ai/models/gemma-4-31b-non-reasoning) |
| [Mistral Medium 3.5](../companies/mistral-ai/mistral-medium-3.5/README.md) | `mistral-medium-3-5` | high | null | 4.645 | v5.0 lacked FrontierCode-AA 2.0, CritPt v2 (Hard Subset) | [AA model page](https://artificialanalysis.ai/models/mistral-medium-3-5) |
| [Mistral Large 4](../companies/mistral-ai/mistral-large-4/README.md) | `mistral-large-4` | high | 26.025 | 26.125 |  | [AA model page](https://artificialanalysis.ai/models/mistral-large-4) |
| [Mistral Large 4](../companies/mistral-ai/mistral-large-4/README.md) | `mistral-large-4-medium` | medium | 23.078 | 23.128 |  | [AA model page](https://artificialanalysis.ai/models/mistral-large-4-medium) |
| [Muse Glimmer](../companies/meta/muse-glimmer-30b/README.md) | `muse-glimmer` | high | 6.341 | 6.341 |  | [AA model page](https://artificialanalysis.ai/models/muse-glimmer) |

Qwen3.8-Flash-Next filled three component gaps observed on November 6. Its November 20 record contains FrontierCode-AA 2.0 at 0.2714, Terminal-Bench-Science at 0.0714 and CritPt v2 Hard at 0.245. Its historical v5.0 value remains null. The current null variants are Kimi K3 Max, DeepSeek V4 Flash 0731 Max and Gemma 4 31B non-reasoning. Missing components differ by variant, as listed above. [Qwen3.8-Flash-Next](https://artificialanalysis.ai/models/qwen3-8-flash-next)

AA links each of the twelve catalog releases to its publisher's Hugging Face repository. The field `performanceDataSource` identifies the source of a speed measurement, including a median across hosts for DeepSeek V4 Flash 0731 and Muse Glimmer. The quality evaluation endpoint remains unidentified. [DeepSeek 0731](https://artificialanalysis.ai/models/deepseek-v4-flash) · [Muse Glimmer](https://artificialanalysis.ai/models/muse-glimmer)

## Lineage between catalog families

AA's deprecation links point from two catalog families to newer catalog families: Kimi K3 → Kimi K3.1 Pro, and DeepSeek V4 Flash 0731 → DeepSeek V4.1 Flash → DeepSeek V4.1 Flash 1017. Each of the four catalog endpoints has its own publisher repository, pinned revision and score coverage. The intermediate DeepSeek release appears only in the lineage. Kimi K3.1 Pro keeps Kimi K3's 2.8T / 104B publisher headline but adds a DSA indexer; DeepSeek V4.1 Flash 1017 is a different architecture class from 0731 (AA lists 552B / 16B with image input against 284B / 13B text-only; the 552B is a backbone count per the DeepSeek V4.1 family review). The intermediate DeepSeek V4.1 Flash release (2026-09-10) is deprecated in favour of the 1017 release, is not in the catalog and has no v5.0.1 composite. [AA-MODEL-KIMI-K3](https://artificialanalysis.ai/models/kimi-k3) [AA-MODEL-DEEPSEEK-V4-FLASH](https://artificialanalysis.ai/models/deepseek-v4-flash) [AA-MODEL-DEEPSEEK-V4-1-FLASH](https://artificialanalysis.ai/models/deepseek-v4-1-flash)

The October 29 01:01:15Z leaderboard lists **Mistral Large 4 Preview** at 25.286 on the `mistral-large-4` slug. At 07:59:48Z the model page lists the Preview on `mistral-large-4-preview`. At 14:59:06Z it also lists the released Mistral Large 4 High at 26.025 on `mistral-large-4`. The atlas uses the released model's record. The previously cited 02:51:14Z model-page URL now redirects to the 07:59:48Z capture. [01:01 leaderboard](https://web.archive.org/web/20261029010115id_/https://artificialanalysis.ai/evaluations/artificial-analysis-intelligence-index) · [07:59 model page](https://web.archive.org/web/20261029075948id_/https://artificialanalysis.ai/models/gemini-4-carbon) · [14:59 model page](https://web.archive.org/web/20261029145906id_/https://artificialanalysis.ai/models/gemini-4-carbon)

## Frontier reference releases

The comparison retains the seven proprietary releases from November 6 and adds five November releases from the same model lines or providers. The three highest **distinct releases** in this selection are Claude Fable 5.2 (Max, Default Fallback) at 64.564, GPT-6.2 Astra (Max) at 62.139 and Gemini 4 Neon (Xhigh) at 61.398. Ranking individual variants places Fable 5.2 Xhigh (62.217) second, ahead of Astra Max. All Claude rows below use AA's **Default Fallback** setting. [AA leaderboard](https://artificialanalysis.ai/evaluations/artificial-analysis-intelligence-index) · [AA changelog](https://artificialanalysis.ai/changelog)

AA marks Fable 5.1, GPT-6 Astra and GPT-6.1 Sol as deprecated in favor of Fable 5.2, GPT-6.2 Astra and GPT-6.2 Sol respectively. AA lists Gemini 4 Carbon, Argon, Hydrogen and Neon separately. A dash in the v5.0 column means the release or effort evaluation postdates v5.0. Argon Medium was evaluated November 13. [Fable 5.1](https://artificialanalysis.ai/models/claude-fable-5-1) · [GPT-6 Astra](https://artificialanalysis.ai/models/gpt-6-astra) · [GPT-6.1 Sol](https://artificialanalysis.ai/models/gpt-6-1-sol) · [AA changelog](https://artificialanalysis.ai/changelog)

| Release | AA variant | Effort | v5.0 | v5.0.1 | Coverage note | Current score source |
| --- | --- | --- | ---: | ---: | --- | --- |
| Claude Fable 5.2 | `claude-fable-5-2` | max | — | 64.564 |  | [AA model page](https://artificialanalysis.ai/models/claude-fable-5-2) |
| Claude Fable 5.2 | `claude-fable-5-2-xhigh` | xhigh | — | 62.217 |  | [AA model page](https://artificialanalysis.ai/models/claude-fable-5-2-xhigh) |
| Claude Fable 5.2 | `claude-fable-5-2-high` | high | — | 61.822 |  | [AA model page](https://artificialanalysis.ai/models/claude-fable-5-2-high) |
| Claude Fable 5.2 | `claude-fable-5-2-medium` | medium | — | 56.408 |  | [AA model page](https://artificialanalysis.ai/models/claude-fable-5-2-medium) |
| Claude Fable 5.2 | `claude-fable-5-2-low` | low | — | 53.925 |  | [AA model page](https://artificialanalysis.ai/models/claude-fable-5-2-low) |
| GPT-6.2 Astra | `gpt-6-2-astra` | max | — | 62.139 |  | [AA model page](https://artificialanalysis.ai/models/gpt-6-2-astra) |
| GPT-6.2 Astra | `gpt-6-2-astra-xhigh` | xhigh | — | 61.560 |  | [AA model page](https://artificialanalysis.ai/models/gpt-6-2-astra-xhigh) |
| GPT-6.2 Astra | `gpt-6-2-astra-high` | high | — | 60.088 |  | [AA model page](https://artificialanalysis.ai/models/gpt-6-2-astra-high) |
| GPT-6.2 Astra | `gpt-6-2-astra-medium` | medium | — | 56.999 |  | [AA model page](https://artificialanalysis.ai/models/gpt-6-2-astra-medium) |
| GPT-6.2 Astra | `gpt-6-2-astra-low` | low | — | 45.650 |  | [AA model page](https://artificialanalysis.ai/models/gpt-6-2-astra-low) |
| GPT-6.2 Sol | `gpt-6-2-sol` | max | — | 57.258 |  | [AA model page](https://artificialanalysis.ai/models/gpt-6-2-sol) |
| GPT-6.2 Sol | `gpt-6-2-sol-xhigh` | xhigh | — | 55.735 |  | [AA model page](https://artificialanalysis.ai/models/gpt-6-2-sol-xhigh) |
| GPT-6.2 Sol | `gpt-6-2-sol-high` | high | — | 54.890 |  | [AA model page](https://artificialanalysis.ai/models/gpt-6-2-sol-high) |
| GPT-6.2 Sol | `gpt-6-2-sol-medium` | medium | — | 52.678 |  | [AA model page](https://artificialanalysis.ai/models/gpt-6-2-sol-medium) |
| GPT-6.2 Sol | `gpt-6-2-sol-low` | low | — | 40.553 |  | [AA model page](https://artificialanalysis.ai/models/gpt-6-2-sol-low) |
| Gemini 4 Hydrogen | `gemini-4-hydrogen` | xhigh | — | 53.919 |  | [AA model page](https://artificialanalysis.ai/models/gemini-4-hydrogen) |
| Gemini 4 Hydrogen | `gemini-4-hydrogen-high` | high | — | 50.787 |  | [AA model page](https://artificialanalysis.ai/models/gemini-4-hydrogen-high) |
| Gemini 4 Hydrogen | `gemini-4-hydrogen-medium` | medium | — | 41.233 |  | [AA model page](https://artificialanalysis.ai/models/gemini-4-hydrogen-medium) |
| Gemini 4 Hydrogen | `gemini-4-hydrogen-low` | low | — | 26.894 |  | [AA model page](https://artificialanalysis.ai/models/gemini-4-hydrogen-low) |
| Gemini 4 Neon | `gemini-4-neon` | xhigh | — | 61.398 |  | [AA model page](https://artificialanalysis.ai/models/gemini-4-neon) |
| Gemini 4 Neon | `gemini-4-neon-high` | high | — | 59.619 |  | [AA model page](https://artificialanalysis.ai/models/gemini-4-neon-high) |
| Gemini 4 Neon | `gemini-4-neon-medium` | medium | — | 54.862 |  | [AA model page](https://artificialanalysis.ai/models/gemini-4-neon-medium) |
| Gemini 4 Neon | `gemini-4-neon-low` | low | — | 44.083 |  | [AA model page](https://artificialanalysis.ai/models/gemini-4-neon-low) |
| Claude Opus 5.5 | `claude-opus-5-5` | max | 58.406 | 59.106 |  | [AA model page](https://artificialanalysis.ai/models/claude-opus-5-5) |
| Claude Opus 5.5 | `claude-opus-5-5-xhigh` | xhigh | 56.995 | 57.445 |  | [AA model page](https://artificialanalysis.ai/models/claude-opus-5-5-xhigh) |
| Claude Opus 5.5 | `claude-opus-5-5-high` | high | 51.686 | 51.836 |  | [AA model page](https://artificialanalysis.ai/models/claude-opus-5-5-high) |
| Claude Opus 5.5 | `claude-opus-5-5-medium` | medium | 48.058 | 48.208 |  | [AA model page](https://artificialanalysis.ai/models/claude-opus-5-5-medium) |
| Claude Opus 5.5 | `claude-opus-5-5-low` | low | 34.503 | 34.753 |  | [AA model page](https://artificialanalysis.ai/models/claude-opus-5-5-low) |
| Claude Fable 5.1 | `claude-fable-5-1-xhigh` | xhigh | 49.672 | 50.022 |  | [AA model page](https://artificialanalysis.ai/models/claude-fable-5-1-xhigh) |
| Claude Fable 5.1 | `claude-fable-5-1` | max | 49.010 | 49.160 |  | [AA model page](https://artificialanalysis.ai/models/claude-fable-5-1) |
| Claude Fable 5.1 | `claude-fable-5-1-high` | high | 47.025 | 47.175 |  | [AA model page](https://artificialanalysis.ai/models/claude-fable-5-1-high) |
| Claude Fable 5.1 | `claude-fable-5-1-medium` | medium | 42.972 | 43.172 |  | [AA model page](https://artificialanalysis.ai/models/claude-fable-5-1-medium) |
| Claude Fable 5.1 | `claude-fable-5-1-low` | low | 38.484 | 38.684 |  | [AA model page](https://artificialanalysis.ai/models/claude-fable-5-1-low) |
| Claude Sonnet 5.5 | `claude-sonnet-5-5` | max | 54.241 | 54.541 |  | [AA model page](https://artificialanalysis.ai/models/claude-sonnet-5-5) |
| Claude Sonnet 5.5 | `claude-sonnet-5-5-xhigh` | xhigh | 49.574 | 49.924 |  | [AA model page](https://artificialanalysis.ai/models/claude-sonnet-5-5-xhigh) |
| Claude Sonnet 5.5 | `claude-sonnet-5-5-high` | high | 41.115 | 41.515 |  | [AA model page](https://artificialanalysis.ai/models/claude-sonnet-5-5-high) |
| Claude Sonnet 5.5 | `claude-sonnet-5-5-medium` | medium | 30.320 | 30.820 |  | [AA model page](https://artificialanalysis.ai/models/claude-sonnet-5-5-medium) |
| Claude Sonnet 5.5 | `claude-sonnet-5-5-low` | low | 25.300 | 25.650 |  | [AA model page](https://artificialanalysis.ai/models/claude-sonnet-5-5-low) |
| GPT-6 Astra | `gpt-6-astra` | max | 56.854 | 56.854 |  | [AA model page](https://artificialanalysis.ai/models/gpt-6-astra) |
| GPT-6 Astra | `gpt-6-astra-xhigh` | xhigh | 55.256 | 55.306 |  | [AA model page](https://artificialanalysis.ai/models/gpt-6-astra-xhigh) |
| GPT-6 Astra | `gpt-6-astra-high` | high | 54.850 | 54.850 |  | [AA model page](https://artificialanalysis.ai/models/gpt-6-astra-high) |
| GPT-6 Astra | `gpt-6-astra-medium` | medium | 51.455 | 51.555 |  | [AA model page](https://artificialanalysis.ai/models/gpt-6-astra-medium) |
| GPT-6 Astra | `gpt-6-astra-low` | low | 43.035 | 43.335 |  | [AA model page](https://artificialanalysis.ai/models/gpt-6-astra-low) |
| GPT-6.1 Sol | `gpt-6-1-sol` | max | 54.509 | 54.609 |  | [AA model page](https://artificialanalysis.ai/models/gpt-6-1-sol) |
| GPT-6.1 Sol | `gpt-6-1-sol-xhigh` | xhigh | 52.308 | 52.458 |  | [AA model page](https://artificialanalysis.ai/models/gpt-6-1-sol-xhigh) |
| GPT-6.1 Sol | `gpt-6-1-sol-high` | high | 50.229 | 50.329 |  | [AA model page](https://artificialanalysis.ai/models/gpt-6-1-sol-high) |
| GPT-6.1 Sol | `gpt-6-1-sol-medium` | medium | 46.147 | 46.347 |  | [AA model page](https://artificialanalysis.ai/models/gpt-6-1-sol-medium) |
| GPT-6.1 Sol | `gpt-6-1-sol-low` | low | 34.503 | 34.803 |  | [AA model page](https://artificialanalysis.ai/models/gpt-6-1-sol-low) |
| Gemini 4 Carbon | `gemini-4-carbon` | high | 59.426 | 60.026 |  | [AA model page](https://artificialanalysis.ai/models/gemini-4-carbon) |
| Gemini 4 Carbon | `gemini-4-carbon-medium` | medium | 57.709 | 58.259 | [v5.0 archive](https://web.archive.org/web/20261103001605id_/https://artificialanalysis.ai/models/gemini-4-carbon-medium) | [AA model page](https://artificialanalysis.ai/models/gemini-4-carbon-medium) |
| Gemini 4 Carbon | `gemini-4-carbon-low` | low | 53.721 | 54.221 | [v5.0 archive](https://web.archive.org/web/20261103164702id_/https://artificialanalysis.ai/models/gemini-4-carbon-low) | [AA model page](https://artificialanalysis.ai/models/gemini-4-carbon-low) |
| Gemini 4 Argon | `gemini-4-argon` | high | 50.412 | 50.412 |  | [AA model page](https://artificialanalysis.ai/models/gemini-4-argon) |
| Gemini 4 Argon | `gemini-4-argon-medium` | medium | — | 47.604 |  | [AA model page](https://artificialanalysis.ai/models/gemini-4-argon-medium) |

## AA category classifications

AA groups releases by weight availability, input modality and creator country. Its labels describe the release represented on the page. The pinned license and engine integration require their own evidence. [AA intelligence categories](https://artificialanalysis.ai/#intelligence-category-tabs)

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
| Claude Fable 5.2 | Proprietary | — | text, image | US |
| GPT-6.2 Astra | Proprietary | — | text, image | US |
| GPT-6.2 Sol | Proprietary | — | text, image | US |
| Gemini 4 Hydrogen | Proprietary | — | text, image, video, speech | US |
| Gemini 4 Neon | Proprietary | — | text, image, video, speech | US |

AA's licence names agree with the catalog `license` fields for all twelve families. For nine families the catalog cites a pinned LICENSE-file review; Qwen3.8 27B and Qwen3.8-Flash-Next carry no LICENSE source ID, and Gemma 4 31B's licence source is Google's Apache-2.0 web page (`gemma-4-31b-it-LICENSE`), not a pinned LICENSE file. AA's "Commercial Use Restricted" label for GLM 5.3, Kimi K3, Kimi K3.1 Pro, Qwen 3.8 Flash Next, Mistral Medium 3.5 and Mistral Large 4 reflects custom or modified terms; the catalog records, for example, the Mistral revenue restriction. Input modalities describe AA's evaluated endpoint and do not establish that a quantized export or serving engine preserves the vision, video or speech path.

## Interpretation

- **Compare effort within each release.** GLM-5.3 scores 23.108 at Low and 31.653 at Max. Claude Fable 5.1 scores higher at Xhigh (50.022) than at Max (49.160). AA's effort names describe provider settings and do not establish a common token budget. [GLM-5.3](https://artificialanalysis.ai/models/glm-5-3) · [Claude Fable 5.1](https://artificialanalysis.ai/models/claude-fable-5-1)
- **Kimi K3's headline describes Low effort.** Its 17.419 is the maximum over published variants. FrontierCode and both AA-Omniscience terms are missing at Max. Kimi K3.1 Pro has its own separate Max record. [Kimi K3](https://artificialanalysis.ai/models/kimi-k3) · [Kimi K3.1 Pro](https://artificialanalysis.ai/models/kimi-k3-1-pro)
- **Component coverage can change within the same version.** Qwen3.8-Flash-Next gained a composite after November 6 without a change of index version. Gemma 4 31B reasoning and Mistral Medium 3.5 already had v5.0.1 composites on November 6. Their earlier v5.0 records lacked three and two components respectively. [Qwen](https://artificialanalysis.ai/models/qwen3-8-flash-next) · [Gemma](https://artificialanalysis.ai/models/gemma-4-31b) · [Mistral](https://artificialanalysis.ai/models/mistral-medium-3-5)
- **Briefcase uses a frozen Elo.** The displayed November 20 Elos for Gemma 4 31B reasoning (369.09) and Muse Glimmer (478.09) fall below the 500 normalization floor. Both receive zero Briefcase credit in a reconstruction using their displayed Elo. AA freezes the Elo at model addition for its published index. [AA methodology](https://artificialanalysis.ai/methodology/intelligence-benchmarking)

## Two-pass review

**Source support.** Each v5.0.1 row uses the embedded record with the exact variant slug, AA name, reasoning setting, component fields and `intelligenceIndex`. Non-default variant URLs can redirect to their release page, which embeds several effort variants. The [source registry](../evidence/sources.json) records capture time, SHA-256, response length and the resolved URL where it differs.

**Cross-checks.**

1. Reconstructing all 71 published composites with AA's weights and the full-precision page fields gives a largest absolute residual of 0.202 points for Qwen3.8-Flash-Next (28.373 reconstructed, 28.575 published). The displayed Briefcase Elo can move after publication. Using the displayed Elo also gives 46.421 for Kimi K3.1 Pro Max (published 46.453) and 64.560 for Claude Fable 5.2 Max, Default Fallback (published 64.564). The model pages omit the frozen Elo needed for an exact reconstruction. [AA methodology](https://artificialanalysis.ai/methodology/intelligence-benchmarking) · [Qwen](https://artificialanalysis.ai/models/qwen3-8-flash-next) · [Kimi](https://artificialanalysis.ai/models/kimi-k3-1-pro) · [Claude](https://artificialanalysis.ai/models/claude-fable-5-2)
2. The November 1 and November 3 archived Gemini release pages matched their registered response hashes. The historical values previously transcribed from these two pages were checked against the variant records, including nulls. Four additional archived Gemini **variant** pages recover two scores. Both captures of Carbon Medium give 57.709, and both captures of Carbon Low give 53.721. Across all 44 variants scored under both versions, the index difference matches ten times the CritPt Hard difference to the recorded precision. [November 1 release page](https://web.archive.org/web/20261101180313id_/https://artificialanalysis.ai/models/gemini-4-carbon) · [November 3 release page](https://web.archive.org/web/20261103193341id_/https://artificialanalysis.ai/models/gemini-4-carbon) · [Archived Medium](https://web.archive.org/web/20261103001605id_/https://artificialanalysis.ai/models/gemini-4-carbon-medium) · [Archived Low](https://web.archive.org/web/20261103164702id_/https://artificialanalysis.ai/models/gemini-4-carbon-low)
3. Four additional archived AA model pages embed the full record for **DeepSeek V4.1 Flash 1017 High**, giving **28.544** under v5.0 and CritPt v2 Hard at 0.265. Its November 20 v5.0.1 record gives 28.644 and 0.275. The archived DeepSeek release pages contain only Max among scored variants from this release. The November 3 Nanbeige page embeds 723 model records, including all 50 variants in the November 6 atlas selection. Those records confirm the historical scores and composite nulls, including the three recovered values. [Archived Kimi page](https://web.archive.org/web/20261102160645id_/https://artificialanalysis.ai/models/kimi-k3-1-pro) · [Archived Nanbeige page](https://web.archive.org/web/20261103184023id_/https://artificialanalysis.ai/models/nanbeige4-3-33b) · [Current DeepSeek High](https://artificialanalysis.ai/models/deepseek-v4-1-flash-1017-high)
4. The November 20 homepage and default leaderboard each contain 13 of these variant scores. All 13 agree with the model-page values. These are same-publisher checks. The atlas has no independent execution of AA's complete suite. [Homepage](https://artificialanalysis.ai/#intelligence-category-tabs) · [Leaderboard](https://artificialanalysis.ai/evaluations/artificial-analysis-intelligence-index)
5. A replay check matched 32 of the 34 earlier archived response hashes. Two requests redirected to captures at other times. The October 30 00:20:19Z request now replays **October 29 22:52:11Z**, which already contains GLM-5.3 Flash Max (27.754), Kimi K3 Low (17.419), Qwen3.8 27B Low (15.685) and Medium (17.483). All four were null at 14:59:06Z that day. These observations bound when the scores appeared. [14:59 capture](https://web.archive.org/web/20261029145906id_/https://artificialanalysis.ai/models/gemini-4-carbon) · [22:52 capture](https://web.archive.org/web/20261029225211id_/https://artificialanalysis.ai/models/gemini-4-carbon)

## Applicability to the B300 / KServe target

Kimi K3.1 Pro Max leads the local shortlist on AA's suite, followed by DeepSeek V4.1 Flash 1017 Max (32.590) and GLM-5.3 Max (31.653). These scores can inform model selection. Evaluating a particular export on KServe requires its exact revision, precision, template, reasoning setting and vLLM or SGLang build. Tool and task quality through that path, latency and memory still require measurement in the execution repository.
