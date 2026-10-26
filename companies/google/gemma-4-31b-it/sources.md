# Gemma 4 31B IT: sources

**October 26 scoped refresh:** current Hub identities, immutable README/configuration files and selected latest-stable engine restrictions were rechecked. [Local README snapshots](README.md#hugging-face-readme-snapshots) link every concrete catalog variant and recorded additional artifact. Retrieval metadata remains in the single [source registry](../../../evidence/sources.json); the historical source descriptions below retain their original scope.

Refreshed on **2026-10-16**. The refresh below re-fetched current Hub identities before immutable cards, configurations and file listings. Earlier entries retain their own retrieval dates. Live documentation is identified separately. No model-weight payloads were downloaded and no inference engine was run.

## October 16 identity and parameter refresh

| Repository | Current immutable revision | Fresh metadata |
| --- | --- | --- |
| `google/gemma-4-31B-it` | `842da3794eaa0b77d5f08bae87a17459d91ff475` | [TOPM-GEMMA-BASE-META](https://huggingface.co/api/models/google/gemma-4-31B-it) |
| `google/gemma-4-31B-it-assistant` | `627c5ec1458b9086b841a91e0512fd31fd2fbbf1` | [TOPM-GEMMA-DRAFT-META](https://huggingface.co/api/models/google/gemma-4-31B-it-assistant) |
| `RedHatAI/gemma-4-31B-it-FP8-block` | `d7242548c457ab4b45bd3adb8937f2659af4739d` | [TOPM-GEMMA-RHFP8-META](https://huggingface.co/api/models/RedHatAI/gemma-4-31B-it-FP8-block) |
| `RedHatAI/gemma-4-31B-it-NVFP4` | `5df75ccad9b74546f5be758a2a68acc2e16bbc9b` | [TOPM-GEMMA-RHNV-META](https://huggingface.co/api/models/RedHatAI/gemma-4-31B-it-NVFP4) |
| `nvidia/Gemma-4-31B-IT-NVFP4` | `4135a98a9b728a548947683219633b25682223ac` | [TOPM-GEMMA-NVIDIA-META](https://huggingface.co/api/models/nvidia/Gemma-4-31B-IT-NVFP4) |
| `unsloth/gemma-4-31B-it-NVFP4` | `373c00b5ecb0a8ee43942b5ca08b93805de8eee4` | [TOPM-GEMMA-UNSLOTH-META](https://huggingface.co/api/models/unsloth/gemma-4-31B-it-NVFP4) |
| `LilaRest/gemma-4-31B-it-NVFP4-turbo` | `782d58ea7f9cf3a148be86e153f5689a2d73238b` | [TOPM-GEMMA-TURBO-META](https://huggingface.co/api/models/LilaRest/gemma-4-31B-it-NVFP4-turbo) |

[TOPM-GEMMA-PAPER-RECORD](https://arxiv.org/abs/2607.02770) establishes the latest paper as v2, July 24, 2026. [TOPM-GEMMA-PAPER](https://arxiv.org/html/2607.02770v2) Table 1 separates rounded text components (1.410B embedding plus 29.290B einsums), 0.550B vision and 0.500B drafter. [TOPM-GEMMA-BASE-CFG](https://huggingface.co/google/gemma-4-31B-it/raw/842da3794eaa0b77d5f08bae87a17459d91ff475/config.json) confirms the dense 60-layer target, two attention geometries, no cross-layer KV sharing and no audio encoder.

The separate assistant is verified by [TOPM-GEMMA-DRAFT-CARD](https://huggingface.co/google/gemma-4-31B-it-assistant/raw/627c5ec1458b9086b841a91e0512fd31fd2fbbf1/README.md), [TOPM-GEMMA-DRAFT-CFG](https://huggingface.co/google/gemma-4-31B-it-assistant/raw/627c5ec1458b9086b841a91e0512fd31fd2fbbf1/config.json) and [TOPM-GEMMA-DRAFT-TREE](https://huggingface.co/api/models/google/gemma-4-31B-it-assistant/tree/627c5ec1458b9086b841a91e0512fd31fd2fbbf1?recursive=true&expand=false). Its four layers and KV-sharing fields belong to the assistant, not the target.

## Additional export evidence

| Export | Sources | Scope |
| --- | --- | --- |
| NVIDIA | [TOPM-GEMMA-NVIDIA-CARD](https://huggingface.co/nvidia/Gemma-4-31B-IT-NVFP4/raw/4135a98a9b728a548947683219633b25682223ac/README.md), [TOPM-GEMMA-NVIDIA-CFG](https://huggingface.co/nvidia/Gemma-4-31B-IT-NVFP4/raw/4135a98a9b728a548947683219633b25682223ac/config.json), [TOPM-GEMMA-NVIDIA-TREE](https://huggingface.co/api/models/nvidia/Gemma-4-31B-IT-NVFP4/tree/4135a98a9b728a548947683219633b25682223ac?recursive=true&expand=false) | ModelOpt NVFP4 with attention/vision exclusions; six publisher quality metrics; card/config producer-version discrepancy; 32,633,477,808 listed weight-file bytes. |
| Unsloth | [TOPM-GEMMA-UNSLOTH-CARD](https://huggingface.co/unsloth/gemma-4-31B-it-NVFP4/raw/373c00b5ecb0a8ee43942b5ca08b93805de8eee4/README.md), [TOPM-GEMMA-UNSLOTH-CFG](https://huggingface.co/unsloth/gemma-4-31B-it-NVFP4/raw/373c00b5ecb0a8ee43942b5ca08b93805de8eee4/config.json), [TOPM-GEMMA-UNSLOTH-TREE](https://huggingface.co/api/models/unsloth/gemma-4-31B-it-NVFP4/tree/373c00b5ecb0a8ee43942b5ca08b93805de8eee4?recursive=true&expand=false) | Mixed compressed-tensors FP8/NVFP4; selected FP8 MLP layers and attention; current exporter dependency recipe; 24,765,757,504 listed bytes. |
| LilaRest Turbo | [TOPM-GEMMA-TURBO-CARD](https://huggingface.co/LilaRest/gemma-4-31B-it-NVFP4-turbo/raw/782d58ea7f9cf3a148be86e153f5689a2d73238b/README.md), [TOPM-GEMMA-TURBO-CFG](https://huggingface.co/LilaRest/gemma-4-31B-it-NVFP4-turbo/raw/782d58ea7f9cf3a148be86e153f5689a2d73238b/config.json), [TOPM-GEMMA-TURBO-TREE](https://huggingface.co/api/models/LilaRest/gemma-4-31B-it-NVFP4-turbo/tree/782d58ea7f9cf3a148be86e153f5689a2d73238b?recursive=true&expand=false), [TOPM-GEMMA-TURBO-INDEX](https://huggingface.co/LilaRest/gemma-4-31B-it-NVFP4-turbo/raw/782d58ea7f9cf3a148be86e153f5689a2d73238b/model.safetensors.index.json) | Text-only ModelOpt export; publisher RTN/calibrated-MLP description; index excludes vision/audio; 19,295,277,512 listed bytes. |

[TOPM-GEMMA-TURBO-BENCH](https://huggingface.co/LilaRest/gemma-4-31B-it-NVFP4-turbo/raw/782d58ea7f9cf3a148be86e153f5689a2d73238b/bench/bench.sh) was read as source and not executed. It defines the random 1,000/200-token workload, load sweep, throughput maximum and input-length/TTFT prefill proxy. [TOPM-GEMMA-TURBO-RESULTS](https://huggingface.co/LilaRest/gemma-4-31B-it-NVFP4-turbo/raw/782d58ea7f9cf3a148be86e153f5689a2d73238b/bench/results/LilaRest--gemma-4-31B-it-NVFP4-turbo.csv) and [TOPM-GEMMA-NVIDIA-RESULTS](https://huggingface.co/LilaRest/gemma-4-31B-it-NVFP4-turbo/raw/782d58ea7f9cf3a148be86e153f5689a2d73238b/bench/results/nvidia--Gemma-4-31B-IT-NVFP4.csv) are that exporter's published measurements, not independent NVIDIA or local B300 results.

## Exact runtime source

All runtime sources below were re-fetched October 16. Stable vLLM `db9527a46873454610df6dbedf79a36d6bf1a7f6` is v0.31.0; stable SGLang `e00930c5489053f26d86b179cee0d087f846acbb` is v0.5.21. Global release identities are in the [upstream lock](../../../evidence/upstreams.lock.json).

| Claim | Primary source |
| --- | --- |
| Dense target execution and separate vision/embedding paths | [TOPM-GEMMA-V-GEMMA](https://github.com/vllm-project/vllm/blob/db9527a46873454610df6dbedf79a36d6bf1a7f6/vllm/model_executor/models/gemma4.py) |
| Explicit method versus artifact quantization metadata | [TOPM-GEMMA-V-OVERRIDE](https://github.com/vllm-project/vllm/blob/db9527a46873454610df6dbedf79a36d6bf1a7f6/vllm/config/model.py) |
| Stable Transformers constraint | [TOPM-GEMMA-V-REQUIRE](https://github.com/vllm-project/vllm/blob/db9527a46873454610df6dbedf79a36d6bf1a7f6/requirements/common.txt) |
| Gemma backend preference and lower-level FA4 geometry/cache gates | [TOPM-GEMMA-V-CONFIG](https://github.com/vllm-project/vllm/blob/db9527a46873454610df6dbedf79a36d6bf1a7f6/vllm/model_executor/models/config.py), [TOPM-GEMMA-V-FAUTIL](https://github.com/vllm-project/vllm/blob/db9527a46873454610df6dbedf79a36d6bf1a7f6/vllm/v1/attention/backends/fa_utils.py) |
| Separate assistant resolution, Q-only layers and per-type target KV binding | [TOPM-GEMMA-V-SPEC](https://github.com/vllm-project/vllm/blob/db9527a46873454610df6dbedf79a36d6bf1a7f6/vllm/config/speculative.py), [TOPM-GEMMA-V-DRAFT](https://github.com/vllm-project/vllm/blob/db9527a46873454610df6dbedf79a36d6bf1a7f6/vllm/model_executor/models/gemma4_mtp.py), [TOPM-GEMMA-V-PROPOSER](https://github.com/vllm-project/vllm/blob/db9527a46873454610df6dbedf79a36d6bf1a7f6/vllm/v1/spec_decode/gemma4.py) |
| SGLang ModelOpt FP4 path | [TOPM-GEMMA-G-MODELOPT](https://github.com/sgl-project/sglang/blob/e00930c5489053f26d86b179cee0d087f846acbb/python/sglang/srt/layers/quantization/modelopt_quant.py) |
| SGLang assistant alias and frozen target-cache binding | [TOPM-GEMMA-G-HOOK](https://github.com/sgl-project/sglang/blob/e00930c5489053f26d86b179cee0d087f846acbb/python/sglang/srt/arg_groups/speculative_hook.py), [TOPM-GEMMA-G-DRAFT](https://github.com/sgl-project/sglang/blob/e00930c5489053f26d86b179cee0d087f846acbb/python/sglang/srt/models/gemma4_mtp.py) |
| Official explicit Google target/assistant recipe | [TOPM-GEMMA-G-COOKBOOK](https://github.com/sgl-project/sglang/blob/e00930c5489053f26d86b179cee0d087f846acbb/docs/cookbook/autoregressive/Google/Gemma4.mdx) |
| Live recipe's still-present nightly-only warning | [TOPM-GEMMA-V-RECIPE](https://recipes.vllm.ai/Google/gemma-4-31B-it) |
| Main preserves the reviewed FA4 gates | [TOPM-GEMMA-V-FAUTIL-MAIN](https://github.com/vllm-project/vllm/blob/9a16d43ef0413b0a2a222e7f5baa4498c291ae5b/vllm/v1/attention/backends/fa_utils.py) |
| Main draft-head quantization excludes Gemma MTP | [TOPM-GEMMA-V-SPEC-MAIN](https://github.com/vllm-project/vllm/blob/9a16d43ef0413b0a2a222e7f5baa4498c291ae5b/vllm/config/speculative.py) |
| Main block verification excludes the resolved frozen-KV path | [TOPM-GEMMA-G-HOOK-MAIN](https://github.com/sgl-project/sglang/blob/2adc76ad61a9c036304716a4548093b1b27b10fb/python/sglang/srt/arg_groups/speculative_hook.py) |

## Earlier retained source entries

## gemma-4-31b-it-CARD

[Gemma 4 31B IT publisher card at pinned revision](https://huggingface.co/google/gemma-4-31B-it/raw/842da3794eaa0b77d5f08bae87a17459d91ff475/README.md)

Revision: `842da3794eaa0b77d5f08bae87a17459d91ff475`. Retrieval: HTTP 200 on 2026-10-15. Publisher identifies dense 31B family, text/image modalities without audio for this variant, 256K context and Apache-2.0.

## gemma-4-31b-it-CFG

[Gemma 4 31B IT pinned configuration](https://huggingface.co/google/gemma-4-31B-it/raw/842da3794eaa0b77d5f08bae87a17459d91ff475/config.json)

Revision: `842da3794eaa0b77d5f08bae87a17459d91ff475`. Retrieval: HTTP 200 on 2026-10-15. All existing normalized config fields matched; 60 layer types count as 50 sliding and 10 full attention; audio_config is explicitly null.

## gemma-4-31b-it-FP8

[Red Hat Gemma block FP8 pinned card](https://huggingface.co/RedHatAI/gemma-4-31B-it-FP8-block/raw/d7242548c457ab4b45bd3adb8937f2659af4739d/README.md)

Revision: `d7242548c457ab4b45bd3adb8937f2659af4739d`. Retrieval: HTTP 200 on 2026-10-15. Names exact base; documents W8A8 block/group recipe and exclusions; advertised 50% memory saving is not a runtime measurement here.

## gemma-4-31b-it-NV

[Red Hat Gemma NVFP4 pinned card](https://huggingface.co/RedHatAI/gemma-4-31B-it-NVFP4/raw/5df75ccad9b74546f5be758a2a68acc2e16bbc9b/README.md)

Revision: `5df75ccad9b74546f5be758a2a68acc2e16bbc9b`. Retrieval: HTTP 200 on 2026-10-15. Names exact base; documents group-16 W4A4 with local activation scaling. Generic audio example conflicts with variant-specific publisher modality/config and is not accepted as audio support.

## gemma-4-31b-it-FP8-CFG

[Red Hat Gemma block FP8 pinned configuration](https://huggingface.co/RedHatAI/gemma-4-31B-it-FP8-block/raw/d7242548c457ab4b45bd3adb8937f2659af4739d/config.json)

Revision: `d7242548c457ab4b45bd3adb8937f2659af4739d`. Retrieval: HTTP 200 on 2026-10-15. compressed-tensors; weight block_structure [128,128]; input group_size 128 and dynamic true; vision/lm_head/embeddings ignored.

## gemma-4-31b-it-NV-CFG

[Red Hat Gemma NVFP4 pinned configuration](https://huggingface.co/RedHatAI/gemma-4-31B-it-NVFP4/raw/5df75ccad9b74546f5be758a2a68acc2e16bbc9b/config.json)

Revision: `5df75ccad9b74546f5be758a2a68acc2e16bbc9b`. Retrieval: HTTP 200 on 2026-10-15. nvfp4-pack-quantized; W4A4 group size16, tensor_group scales, input dynamic local; vision linears/lm_head ignored. Targets are Linear, not embedding modules.

## gemma-4-31b-it-BASE-TREE

[Gemma BF16 pinned file metadata](https://huggingface.co/api/models/google/gemma-4-31B-it/tree/842da3794eaa0b77d5f08bae87a17459d91ff475?recursive=false&expand=false)

Revision: `842da3794eaa0b77d5f08bae87a17459d91ff475`. Retrieval: HTTP 200 on 2026-10-15. Two safetensors files sum to 62546338248 bytes, including headers; metadata only, no weights downloaded.

## gemma-4-31b-it-FP8-TREE

[Gemma FP8 pinned file metadata](https://huggingface.co/api/models/RedHatAI/gemma-4-31B-it-FP8-block/tree/d7242548c457ab4b45bd3adb8937f2659af4739d?recursive=false&expand=false)

Revision: `d7242548c457ab4b45bd3adb8937f2659af4739d`. Retrieval: HTTP 200 on 2026-10-15. Two safetensors files sum to 33263238928 bytes, including headers; metadata only, no weights downloaded.

## gemma-4-31b-it-NV-TREE

[Gemma NVFP4 pinned file metadata](https://huggingface.co/api/models/RedHatAI/gemma-4-31B-it-NVFP4/tree/5df75ccad9b74546f5be758a2a68acc2e16bbc9b?recursive=false&expand=false)

Revision: `5df75ccad9b74546f5be758a2a68acc2e16bbc9b`. Retrieval: HTTP 200 on 2026-10-15. One safetensors file is listed as 23265401144 bytes, including header; metadata only, no weights downloaded.

## gemma-4-31b-it-LICENSE

[Google Gemma Apache 2.0 license page](https://ai.google.dev/gemma/apache_2)

Live publisher/engine documentation; no immutable revision resolved. Retrieval: HTTP 200 on 2026-10-15. Google base and derivative cards link to this publisher Apache 2.0 license page; no derivative-only inference is needed.

See the global [source register](../../../evidence/sources.json) and [limits](../../../LIMITATIONS.md).
