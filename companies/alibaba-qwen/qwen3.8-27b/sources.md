# Qwen 3.8 27B: sources

**October 26 scoped refresh:** current Hub identities, immutable README/configuration files and selected latest-stable engine restrictions were rechecked. [Local README snapshots](README.md#hugging-face-readme-snapshots) link every concrete catalog variant and recorded additional artifact. Retrieval metadata remains in the single [source registry](../../../evidence/sources.json); the historical source descriptions below retain their original scope.

Checkpoint identity and selected vLLM v0.31 source rechecked 2026-10-17 UTC; the earlier retrieval entries below remain dated to their original captures. Publisher metadata was retrieved at the immutable revisions below. No model weights were downloaded or tensor payloads audited. Engine recipe statements remain upstream evidence.

## Checkpoint revisions

| Artifact | Immutable metadata revision |
| --- | --- |
| Qwen/Qwen3.8-27B | `1d4bf0f2ff6012fd82039f2fa52739d0dd7c60c0` |
| Qwen/Qwen3.8-27B-FP8 | `017b9c7af6b5689d5dd426a76e0bc077eb5ca20a` |
| nvidia/Qwen3.8-27B-NVFP4 | `482ca0f3832238542f8f5295dde86b5f22711d80` |

## October 17 v0.31 claim recheck

| Scope | Primary evidence |
| --- | --- |
| Release identity and SM103 attention selection | [ATTV-TAG](https://api.github.com/repos/vllm-project/vllm/git/ref/tags/v0.31.0) [ATTV-S-CUDA](https://raw.githubusercontent.com/vllm-project/vllm/db9527a46873454610df6dbedf79a36d6bf1a7f6/vllm/platforms/cuda.py) |
| hd256 FA4/FP8 validation and page geometry | [ATTV-S-FA-UTIL](https://raw.githubusercontent.com/vllm-project/vllm/db9527a46873454610df6dbedf79a36d6bf1a7f6/vllm/v1/attention/backends/fa_utils.py) [ATTV-S-FA](https://raw.githubusercontent.com/vllm-project/vllm/db9527a46873454610df6dbedf79a36d6bf1a7f6/vllm/v1/attention/backends/flash_attn.py) |
| Mixed loader and independent linear kernels | [ATTQ-V-MODELOPT-STABLE](https://raw.githubusercontent.com/vllm-project/vllm/db9527a46873454610df6dbedf79a36d6bf1a7f6/vllm/model_executor/layers/quantization/modelopt.py) [ATTQ-V-LINEAR-STABLE](https://raw.githubusercontent.com/vllm-project/vllm/db9527a46873454610df6dbedf79a36d6bf1a7f6/vllm/model_executor/kernels/linear/__init__.py) |
| Native MTP, explicit draft revision and align mode | [Q31-V-STABLE-QWEN-MTP](https://raw.githubusercontent.com/vllm-project/vllm/db9527a46873454610df6dbedf79a36d6bf1a7f6/vllm/model_executor/models/qwen3_5_mtp.py) [TOPQ-VLLM-STABLE-SPEC-CONFIG](https://raw.githubusercontent.com/vllm-project/vllm/db9527a46873454610df6dbedf79a36d6bf1a7f6/vllm/config/speculative.py) [TOPM-GEMMA-V-CONFIG](https://raw.githubusercontent.com/vllm-project/vllm/db9527a46873454610df6dbedf79a36d6bf1a7f6/vllm/model_executor/models/config.py) |
| Removed scale flag, historical issue and current scales | [Q31-V-KVSCALE-ISSUE](https://api.github.com/repos/vllm-project/vllm/issues/37554) [Q31-V-KVSCALE-REMOVAL-IN-STABLE](https://api.github.com/repos/vllm-project/vllm/compare/dd11df04f3b7046c40f13e586ac38a3725bc3c03...db9527a46873454610df6dbedf79a36d6bf1a7f6?per_page=1) [Q31-V-STABLE-KVSCALES](https://raw.githubusercontent.com/vllm-project/vllm/db9527a46873454610df6dbedf79a36d6bf1a7f6/vllm/model_executor/layers/quantization/kv_cache.py) |
| GDN dispatch and graph constraints | [Q31-S-GDN](https://raw.githubusercontent.com/vllm-project/vllm/db9527a46873454610df6dbedf79a36d6bf1a7f6/vllm/model_executor/layers/mamba/gdn/qwen_gdn_linear_attn.py) [Q31-V-STABLE-GDN-META](https://raw.githubusercontent.com/vllm-project/vllm/db9527a46873454610df6dbedf79a36d6bf1a7f6/vllm/v1/attention/backends/gdn_attn.py) |

Three separate source reviews covered attention, precision and MTP/scale handling; cross-checks challenged version inclusion, shared-head precision, comparisons and memory arithmetic. This is selected source corroboration, not independent measured B300 validation. Artifact heads remain unchanged. The JSON registry retains the original captures and dated rechecks.

## October 16 claim recheck

| Observation | Fresh primary evidence |
| --- | --- |
| Current identities (all unchanged) | [TOPQ-27-API](https://huggingface.co/api/models/Qwen/Qwen3.8-27B) [TOPQ-27FP8-API](https://huggingface.co/api/models/Qwen/Qwen3.8-27B-FP8) [TOPQ-27NV-API](https://huggingface.co/api/models/nvidia/Qwen3.8-27B-NVFP4) |
| Serialized quantized sizes | [TOPQ-27FP8-TREE](https://huggingface.co/api/models/Qwen/Qwen3.8-27B-FP8/tree/017b9c7af6b5689d5dd426a76e0bc077eb5ca20a?recursive=true&expand=false) [TOPQ-27NV-TREE](https://huggingface.co/api/models/nvidia/Qwen3.8-27B-NVFP4/tree/482ca0f3832238542f8f5295dde86b5f22711d80?recursive=true&expand=false) |
| Native MTP inventory | [TOPQ-27-INDEX](https://huggingface.co/Qwen/Qwen3.8-27B/resolve/1d4bf0f2ff6012fd82039f2fa52739d0dd7c60c0/model.safetensors.index.json) [TOPQ-27FP8-INDEX](https://huggingface.co/Qwen/Qwen3.8-27B-FP8/resolve/017b9c7af6b5689d5dd426a76e0bc077eb5ca20a/model.safetensors.index.json) [TOPQ-27NV-INDEX](https://huggingface.co/nvidia/Qwen3.8-27B-NVFP4/resolve/482ca0f3832238542f8f5295dde86b5f22711d80/model.safetensors.index.json) |
| Current recipe and cache-scale scope | [TOPQ-27-VR-SOURCE](https://raw.githubusercontent.com/vllm-project/recipes/b3d267608417e41bbbeddccdadb5040b64a8c93f/models/Qwen/Qwen3.8-27B.yaml) [TOPQ-SGL-STABLE-RECIPE27](https://raw.githubusercontent.com/sgl-project/sglang/e00930c5489053f26d86b179cee0d087f846acbb/docs/src/snippets/configs/Qwen/qwen3.8-27b.jsx) [TOPQ-27NV-QUANT](https://huggingface.co/nvidia/Qwen3.8-27B-NVFP4/raw/482ca0f3832238542f8f5295dde86b5f22711d80/hf_quant_config.json) |
| NVIDIA modality and evaluation scope | [TOPQ-27NV-CARD](https://huggingface.co/nvidia/Qwen3.8-27B-NVFP4/raw/482ca0f3832238542f8f5295dde86b5f22711d80/README.md) |

Stable source inspection uses vLLM 0.31.0 (`db9527a46873454610df6dbedf79a36d6bf1a7f6`) and SGLang 0.5.21 (`e00930c5489053f26d86b179cee0d087f846acbb`). Recipe assertions and source support remain separate from measured behavior on this node.

## Source register

### qwen3.8-27b-CARD

[Qwen 3.8 27B publisher model card](https://huggingface.co/Qwen/Qwen3.8-27B/raw/1d4bf0f2ff6012fd82039f2fa52739d0dd7c60c0/README.md)

Retrieved successfully on 2026-10-15 (HTTP 200). Immutable revision `1d4bf0f2ff6012fd82039f2fa52739d0dd7c60c0`. Publisher-owned repository API and immutable raw metadata retrieved successfully; no model weights downloaded.

### qwen3.8-27b-CFG

[Qwen 3.8 27B configuration](https://huggingface.co/Qwen/Qwen3.8-27B/raw/1d4bf0f2ff6012fd82039f2fa52739d0dd7c60c0/config.json)

Retrieved successfully on 2026-10-15 (HTTP 200). Immutable revision `1d4bf0f2ff6012fd82039f2fa52739d0dd7c60c0`. Publisher-owned repository API and immutable raw metadata retrieved successfully; no model weights downloaded.

### qwen3.8-27b-FP8

[Official Qwen 27B FP8 card](https://huggingface.co/Qwen/Qwen3.8-27B-FP8/raw/017b9c7af6b5689d5dd426a76e0bc077eb5ca20a/README.md)

Retrieved successfully on 2026-10-15 (HTTP 200). Immutable revision `017b9c7af6b5689d5dd426a76e0bc077eb5ca20a`. Publisher-owned repository API and immutable raw metadata retrieved successfully; no model weights downloaded.

### qwen3.8-27b-FP8-CFG

[Official Qwen 27B FP8 quantization configuration](https://huggingface.co/Qwen/Qwen3.8-27B-FP8/raw/017b9c7af6b5689d5dd426a76e0bc077eb5ca20a/config.json)

Retrieved successfully on 2026-10-15 (HTTP 200). Immutable revision `017b9c7af6b5689d5dd426a76e0bc077eb5ca20a`. Publisher-owned repository API and immutable raw metadata retrieved successfully; no model weights downloaded.

### qwen3.8-27b-NV

[NVIDIA mixed NVFP4/FP8 Qwen 27B card](https://huggingface.co/nvidia/Qwen3.8-27B-NVFP4/raw/482ca0f3832238542f8f5295dde86b5f22711d80/README.md)

Retrieved successfully on 2026-10-15 (HTTP 200). Immutable revision `482ca0f3832238542f8f5295dde86b5f22711d80`. Publisher-owned repository API and immutable raw metadata retrieved successfully; no model weights downloaded.

### qwen3.8-27b-NV-CFG

[NVIDIA Qwen 27B mixed configuration](https://huggingface.co/nvidia/Qwen3.8-27B-NVFP4/raw/482ca0f3832238542f8f5295dde86b5f22711d80/config.json)

Retrieved successfully on 2026-10-15 (HTTP 200). Immutable revision `482ca0f3832238542f8f5295dde86b5f22711d80`. Publisher-owned repository API and immutable raw metadata retrieved successfully; no model weights downloaded.

### qwen3.8-27b-NV-QUANT

[NVIDIA Qwen 27B quantization metadata](https://huggingface.co/nvidia/Qwen3.8-27B-NVFP4/raw/482ca0f3832238542f8f5295dde86b5f22711d80/hf_quant_config.json)

Retrieved successfully on 2026-10-15 (HTTP 200). Immutable revision `482ca0f3832238542f8f5295dde86b5f22711d80`. Publisher-owned repository API and immutable raw metadata retrieved successfully; no model weights downloaded.

### qwen3.8-27b-VR

[vLLM Qwen 27B recipe](https://recipes.vllm.ai/Qwen/Qwen3.8-27B)

Retrieved successfully on 2026-10-15 (HTTP 200). Mutable page or pull-request record. Current engine documentation retrieved; statements describe upstream documentation or measurements, not local serving validation.

### qwen3.8-27b-GR

[SGLang Qwen 27B cookbook](https://docs.sglang.io/cookbook/autoregressive/Qwen/Qwen3.8-27B)

Retrieved successfully on 2026-10-15 (HTTP 200). Mutable page or pull-request record. Current engine documentation retrieved; statements describe upstream documentation or measurements, not local serving validation.

## Source conflict

The NVIDIA card reports ModelOpt 0.48.0; both pinned quantization metadata files report `0.47.0.dev80+g913f5e224`. This audit records the disagreement without choosing an unsupported exporter version.

See the global [source register](../../../evidence/sources.json) and [limits](../../../LIMITATIONS.md).
