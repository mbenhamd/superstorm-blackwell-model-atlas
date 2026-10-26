# Qwen 3.8 Flash Next: sources

**October 26 scoped refresh:** current Hub identities, immutable README/configuration files and selected latest-stable engine restrictions were rechecked. [Local README snapshots](README.md#hugging-face-readme-snapshots) link every concrete catalog variant and recorded additional artifact. Retrieval metadata remains in the single [source registry](../../../evidence/sources.json); the historical source descriptions below retain their original scope.

Rechecked 2026-10-16 UTC; the earlier retrieval entries below remain dated to their original captures. Publisher metadata was retrieved at the immutable revisions below. No model weights were downloaded or tensor payloads audited. Engine recipe statements remain upstream evidence.

## Checkpoint revisions

| Artifact | Immutable metadata revision |
| --- | --- |
| Qwen/Qwen3.8-Flash-Next | `de4b8e4d43b917e7706784d8bb445c9af86a3540` |
| Qwen/Qwen3.8-Flash-Next-FP8 | `236dfdf285828023ca3bcd3f37366c58a3469b13` |
| nvidia/Qwen3.8-Flash-Next-NVFP4 | `fc694b54fb0174e0913e6adf86691ef85a4ead47` |

## October 16 claim recheck

| Observation | Fresh primary evidence |
| --- | --- |
| Current identities (all unchanged) | [TOPQ-NEXT-API](https://huggingface.co/api/models/Qwen/Qwen3.8-Flash-Next) [TOPQ-NEXTFP8-API](https://huggingface.co/api/models/Qwen/Qwen3.8-Flash-Next-FP8) [TOPQ-NEXTNV-API](https://huggingface.co/api/models/nvidia/Qwen3.8-Flash-Next-NVFP4) |
| Serialized FP8 bytes | [TOPQ-NEXTFP8-TREE](https://huggingface.co/api/models/Qwen/Qwen3.8-Flash-Next-FP8/tree/236dfdf285828023ca3bcd3f37366c58a3469b13?recursive=true&expand=false) [TOPQ-NEXTFP8-INDEX](https://huggingface.co/Qwen/Qwen3.8-Flash-Next-FP8/resolve/236dfdf285828023ca3bcd3f37366c58a3469b13/model.safetensors.index.json) |
| Current vLLM recipe and block alignment | [TOPQ-NEXT-VR-SOURCE](https://raw.githubusercontent.com/vllm-project/recipes/b3d267608417e41bbbeddccdadb5040b64a8c93f/models/Qwen/Qwen3.8-Flash-Next.yaml) [TOPQ-VLLM-STABLE-FP8-ORACLE](https://raw.githubusercontent.com/vllm-project/vllm/db9527a46873454610df6dbedf79a36d6bf1a7f6/vllm/model_executor/layers/fused_moe/oracle/fp8.py) |
| PLE placement and the H200 benchmark | [TOPQ-SGL-BLOG](https://www.lmsys.org/blog/2026-08-26-qwen-flash-next) [TOPQ-VLLM-STABLE-ENGRAM](https://raw.githubusercontent.com/vllm-project/vllm/db9527a46873454610df6dbedf79a36d6bf1a7f6/vllm/config/engram.py) |
| MTP reuse and defaults | [TOPQ-VLLM-STABLE-SPEC-CONFIG](https://raw.githubusercontent.com/vllm-project/vllm/db9527a46873454610df6dbedf79a36d6bf1a7f6/vllm/config/speculative.py) [TOPQ-VLLM-STABLE-PROPOSER](https://raw.githubusercontent.com/vllm-project/vllm/db9527a46873454610df6dbedf79a36d6bf1a7f6/vllm/v1/spec_decode/llm_base_proposer.py) [TOPQ-SGL-STABLE-NEXT-MODEL](https://raw.githubusercontent.com/sgl-project/sglang/e00930c5489053f26d86b179cee0d087f846acbb/python/sglang/srt/models/qwen4_exp.py) |
| SGLang NVIDIA cells and topology defaults | [TOPQ-SGL-STABLE-RECIPE](https://raw.githubusercontent.com/sgl-project/sglang/e00930c5489053f26d86b179cee0d087f846acbb/docs/src/snippets/configs/Qwen/qwen3.8-flash-next.jsx) [TOPQ-SGL-STABLE-OVERRIDE-QWEN4](https://raw.githubusercontent.com/sgl-project/sglang/e00930c5489053f26d86b179cee0d087f846acbb/python/sglang/srt/arg_groups/model_overrides/qwen4_exp.py) [TOPQ-SGL-STABLE-OVERRIDE-QWENMOE](https://raw.githubusercontent.com/sgl-project/sglang/e00930c5489053f26d86b179cee0d087f846acbb/python/sglang/srt/arg_groups/model_overrides/qwen3_moe.py) |
| Resolved SM120/SM121 issue | [TOPQ-SGL-36537](https://api.github.com/repos/sgl-project/sglang/issues/36537) [TOPQ-SGL-36537-COMMENTS](https://api.github.com/repos/sgl-project/sglang/issues/36537/comments) [TOPQ-SGL-36806](https://api.github.com/repos/sgl-project/sglang/pulls/36806) [TOPQ-SGL-37500](https://api.github.com/repos/sgl-project/sglang/pulls/37500) [TOPQ-SGL-36845](https://api.github.com/repos/sgl-project/sglang/pulls/36845) |

Stable source inspection uses vLLM 0.31.0 (`db9527a46873454610df6dbedf79a36d6bf1a7f6`) and SGLang 0.5.21 (`e00930c5489053f26d86b179cee0d087f846acbb`). Recipe assertions and source support remain separate from measured behavior on this node.

## Source register

### qwen3.8-flash-next-CARD

[Qwen 3.8 Flash Next publisher model card](https://huggingface.co/Qwen/Qwen3.8-Flash-Next/raw/de4b8e4d43b917e7706784d8bb445c9af86a3540/README.md)

Retrieved successfully on 2026-10-15 (HTTP 200). Immutable revision `de4b8e4d43b917e7706784d8bb445c9af86a3540`. Publisher-owned repository API and immutable raw metadata retrieved successfully; no model weights downloaded.

### qwen3.8-flash-next-CFG

[Qwen 3.8 Flash Next configuration](https://huggingface.co/Qwen/Qwen3.8-Flash-Next/raw/de4b8e4d43b917e7706784d8bb445c9af86a3540/config.json)

Retrieved successfully on 2026-10-15 (HTTP 200). Immutable revision `de4b8e4d43b917e7706784d8bb445c9af86a3540`. Publisher-owned repository API and immutable raw metadata retrieved successfully; no model weights downloaded.

### qwen3.8-flash-next-FP8

[Official Qwen Flash Next FP8 card](https://huggingface.co/Qwen/Qwen3.8-Flash-Next-FP8/raw/236dfdf285828023ca3bcd3f37366c58a3469b13/README.md)

Retrieved successfully on 2026-10-15 (HTTP 200). Immutable revision `236dfdf285828023ca3bcd3f37366c58a3469b13`. Publisher-owned repository API and immutable raw metadata retrieved successfully; no model weights downloaded.

### qwen3.8-flash-next-FP8-CFG

[Official Qwen Flash Next FP8 quantization configuration](https://huggingface.co/Qwen/Qwen3.8-Flash-Next-FP8/raw/236dfdf285828023ca3bcd3f37366c58a3469b13/config.json)

Retrieved successfully on 2026-10-15 (HTTP 200). Immutable revision `236dfdf285828023ca3bcd3f37366c58a3469b13`. Publisher-owned repository API and immutable raw metadata retrieved successfully; no model weights downloaded.

### qwen3.8-flash-next-NV

[NVIDIA mixed Flash Next export card](https://huggingface.co/nvidia/Qwen3.8-Flash-Next-NVFP4/raw/fc694b54fb0174e0913e6adf86691ef85a4ead47/README.md)

Retrieved successfully on 2026-10-15 (HTTP 200). Immutable revision `fc694b54fb0174e0913e6adf86691ef85a4ead47`. Publisher-owned repository API and immutable raw metadata retrieved successfully; no model weights downloaded.

### qwen3.8-flash-next-NV-CFG

[NVIDIA Flash Next mixed configuration](https://huggingface.co/nvidia/Qwen3.8-Flash-Next-NVFP4/raw/fc694b54fb0174e0913e6adf86691ef85a4ead47/config.json)

Retrieved successfully on 2026-10-15 (HTTP 200). Immutable revision `fc694b54fb0174e0913e6adf86691ef85a4ead47`. Publisher-owned repository API and immutable raw metadata retrieved successfully; no model weights downloaded.

### qwen3.8-flash-next-NV-QUANT

[NVIDIA Flash Next quantization metadata](https://huggingface.co/nvidia/Qwen3.8-Flash-Next-NVFP4/raw/fc694b54fb0174e0913e6adf86691ef85a4ead47/hf_quant_config.json)

Retrieved successfully on 2026-10-15 (HTTP 200). Immutable revision `fc694b54fb0174e0913e6adf86691ef85a4ead47`. Publisher-owned repository API and immutable raw metadata retrieved successfully; no model weights downloaded.

### qwen3.8-flash-next-VR

[vLLM Flash Next recipe](https://recipes.vllm.ai/Qwen/Qwen3.8-Flash-Next)

Retrieved successfully on 2026-10-15 (HTTP 200). Mutable page or pull-request record. Current engine documentation retrieved; statements describe upstream documentation or measurements, not local serving validation.

### qwen3.8-flash-next-GR

[SGLang Flash Next cookbook](https://docs.sglang.io/cookbook/autoregressive/Qwen/Qwen3.8-Flash-Next)

Retrieved successfully on 2026-10-15 (HTTP 200). Mutable page or pull-request record. Retrieved and inspected. PR 41046 adds NVIDIA TP1 B200/B300/GB300 recipes with verified=false; it explicitly claims no new GPU measurements.

### qwen3.8-flash-next-GPR

[SGLang exact NVIDIA Flash Next B300 recipe PR 41046](https://github.com/sgl-project/sglang/pull/41046)

Retrieved successfully on 2026-10-15 (HTTP 200). Mutable page or pull-request record. Retrieved and inspected. PR 41046 adds NVIDIA TP1 B200/B300/GB300 recipes with verified=false; it explicitly claims no new GPU measurements.

### qwen3.8-flash-next-GR-SOURCE

[Pinned SGLang Flash Next recipe generator after PR 41046](https://raw.githubusercontent.com/sgl-project/sglang/a1eb691ab51bc461378b2fcca8991883add4f1b5/docs/src/snippets/configs/Qwen/qwen3.8-flash-next.jsx)

Retrieved successfully on 2026-10-15 (HTTP 200). Immutable revision `a1eb691ab51bc461378b2fcca8991883add4f1b5`. B300 NVIDIA target-only cell inspected at lines 789-802; TP1, FlashInfer linear prefill/decode, BF16 SSM, reasoning-parser auto, verified=false.

## Source caveats

SGLang PR #41046 and its pinned generator add B300 NVIDIA TP1 recipes with `verified: false`; their publication is not a GPU result. The cookbook prose still has a narrower NVIDIA hardware table and says thinking cannot be disabled and sampling recommendations are absent. The pinned publisher card supplies thinking controls and both sampling modes, so use that card and its chat template for model behavior.

See the global [source register](../../../evidence/sources.json) and [limits](../../../LIMITATIONS.md).
