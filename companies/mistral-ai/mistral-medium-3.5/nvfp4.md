# Mistral Medium 3.5 NVFP4: B300 serving dossier (vLLM and SGLang under KServe)

**Scope and recheck time.** Artifact `nvidia/Mistral-Medium-3.5-128B-NVFP4` at `b8c66d2098edd8c9c26bde2b2ff41b5967e111ae` (NVIDIA ModelOpt export of `mistralai/Mistral-Medium-3.5-128B` at `22b2b868a15677cfa6061277ed2f653d1349a9ab`; official EAGLE draft `mistralai/Mistral-Medium-3.5-128B-EAGLE` at `d31694b0f55b51d4d962b5c3dbf0e03d1f019275`). Hub, engine source and registry identities below were fetched on 2026-11-06 between 12:45 and 13:01 UTC. Engines: vLLM v0.33.0 (`4ba787ec9959e566d3b587a796dff07673324da5`) and SGLang v0.5.23 (`297e54fd105e974cdf401e5b4d20253a22c16f90`). Target: one 8×B300 (SM103) node; KServe is the deployment layer, installed version, resource kind and runtime integration unknown. **Nothing on this page is a measured serving result.** Exporter-reported numbers are attributed to the exporter; atlas calculations and source inferences are labelled.

Evidence labels: **[card]** NVIDIA exporter model card; **[eagle-card]** publisher EAGLE card; **[recipe]** vLLM recipe for the FP8 publisher artifact; **[cookbook]** SGLang cookbook for the FP8 publisher artifact; **[source]** engine source inspection at a named commit (not executed); **[atlas]** atlas derivation or deployment choice.

## 1. Artifact identity and model card

| Check (2026-11-06T12:45Z) | Result | Source |
| --- | --- | --- |
| Hub head | `b8c66d20…` = pin; `lastModified` 2026-07-01T15:47:29Z; `createdAt` 2026-06-30T19:32:15Z | [mistral-medium-3.5-NV-NVFP4-API](https://huggingface.co/api/models/nvidia/Mistral-Medium-3.5-128B-NVFP4) [mistral-medium-3.5-NV-NVFP4-REVISION](https://huggingface.co/api/models/nvidia/Mistral-Medium-3.5-128B-NVFP4/revision/b8c66d2098edd8c9c26bde2b2ff41b5967e111ae) |
| History | `de6bb618` initial → `fd385a8c` "Copy files from models/nvidia/Mistral-Medium-3.5-128B-NVFP4-0527a" → `d3d5ae7a` "Use canonical NVIDIA model card" → `ced60332` "Pin validated vLLM 0.21.0 image" → `b8c66d20` "Update Hugging Face release date" (2026-07-01); no later commit | [mistral-medium-3.5-NV-NVFP4-COMMITS](https://huggingface.co/api/models/nvidia/Mistral-Medium-3.5-128B-NVFP4/commits/main) |
| Local card copy | [huggingface/additional/nvidia--Mistral-Medium-3.5-128B-NVFP4/README.md](huggingface/additional/nvidia--Mistral-Medium-3.5-128B-NVFP4/README.md): SHA-256 `7bbf885d2e4fcb2418a3bcf16af9ac40b2d7ddf20e85a978206bc0c4bafeb764`, 9,839 bytes; byte-identical to the raw README re-fetched at `b8c66d20` (HTTP 200, 12:45:27Z) | [mistral-medium-3.5-NV-NVFP4-CARD](https://huggingface.co/nvidia/Mistral-Medium-3.5-128B-NVFP4/raw/b8c66d2098edd8c9c26bde2b2ff41b5967e111ae/README.md) |
| Repository contents at pin | 22 files, 95,259,207,898 bytes: 10 `model-0000N-of-00010.safetensors` (Transformers layout), index, `config.json`, `hf_quant_config.json`, `params.json`, `tekken.json`, `tokenizer.json`, `tokenizer_config.json`, `processor_config.json`, `generation_config.json`, `chat_template.jinja`, card, `.gitattributes`. **No `consolidated*.safetensors`, no LICENSE file.** | [mistral-medium-3.5-NV-NVFP4-TREE-FULL](https://huggingface.co/api/models/nvidia/Mistral-Medium-3.5-128B-NVFP4/tree/b8c66d2098edd8c9c26bde2b2ff41b5967e111ae?recursive=true&expand=true) |
| Files shared with the publisher pin | `tekken.json`, `tokenizer.json`, `tokenizer_config.json`, `processor_config.json`, `generation_config.json`: same size and LFS/blob OID as `22b2b868`. `params.json` byte-identical to the publisher `params.json` (SHA-256 `a645d362…`). **`chat_template.jinja` differs** (§6.4). | [mistral-medium-3.5-TREE-EXPAND](https://huggingface.co/api/models/mistralai/Mistral-Medium-3.5-128B/tree/22b2b868a15677cfa6061277ed2f653d1349a9ab?recursive=false&expand=true) [mistral-medium-3.5-NV-NVFP4-PARAMS](https://huggingface.co/nvidia/Mistral-Medium-3.5-128B-NVFP4/raw/b8c66d2098edd8c9c26bde2b2ff41b5967e111ae/params.json) [RR-GM-MISTRAL-PARAMS](https://huggingface.co/mistralai/Mistral-Medium-3.5-128B/raw/22b2b868a15677cfa6061277ed2f653d1349a9ab/params.json) |
| Index and headers | `metadata.total_size` 95,224,812,960 bytes; 10 header range reads (431,864 header bytes; aggregate header hash `edb6acba…`); dtype bytes F32 8,096 + BF16 11,803,244,032 + F8_E4M3 39,557,529,600 + U8 43,864,031,232 = index total | [mistral-medium-3.5-NV-NVFP4-INDEX](https://huggingface.co/nvidia/Mistral-Medium-3.5-128B-NVFP4/raw/b8c66d2098edd8c9c26bde2b2ff41b5967e111ae/model.safetensors.index.json) [mistral-medium-3.5-NV-NVFP4-HEADERS](https://huggingface.co/nvidia/Mistral-Medium-3.5-128B-NVFP4/tree/b8c66d2098edd8c9c26bde2b2ff41b5967e111ae) |

The index also reports `total_parameters: 83,840,179,560`. That value counts stored elements (two FP4 values per U8 byte count once), so it is not the model's parameter count; the card's "Total Parameters: 128B" refers to the base model. [mistral-medium-3.5-NV-NVFP4-INDEX](https://huggingface.co/nvidia/Mistral-Medium-3.5-128B-NVFP4/raw/b8c66d2098edd8c9c26bde2b2ff41b5967e111ae/model.safetensors.index.json)

**Card versus file metadata conflicts (recorded, not resolved).**

| Topic | Card | Files | Consequence |
| --- | --- | --- | --- |
| Licence | Front matter `license: other`, `license_name: nvidia-open-model-license`; body: "Use of this model is governed by Mistral's Modified MIT license", linking the **mutable** `blob/main/LICENSE` of the base repository | No LICENSE file in the export | The publisher LICENSE at `22b2b868` (Modified MIT with a US$20M monthly-revenue condition) is the only licence text in evidence. Legal review must decide which terms apply. [mistral-medium-3.5-LICENSE](https://huggingface.co/mistralai/Mistral-Medium-3.5-128B/raw/22b2b868a15677cfa6061277ed2f653d1349a9ab/LICENSE) |
| ModelOpt version | "nvidia-modelopt **v0.44.0**" | `config.json` and `hf_quant_config.json` producer `modelopt` **0.37.0** | Exporter tool version unknown; does not change the loader path. |
| Precision of `params.json` | — | `params.json` is the publisher's FP8 file (`fp8_e4m3` / `TENSOR`) and does **not** describe the NVFP4 tensors | Any loader that reads `params.json` (`--config-format mistral`) would see the wrong quantization contract. Use the Transformers `config.json` path (§3). |
| Validated runtime | `vllm/vllm-openai:v0.21.0`, TP4, B200, `--config-format hf --trust-remote-code` | No `auto_map` in `config.json` | `--trust-remote-code` has no effect for this repository; the v0.21.0/B200 validation does not transfer to v0.33.0/B300. |

## 2. Precision contract and how each engine loads it

`config.json` (and the identical block in `hf_quant_config.json`) carries `quantization_config = {quant_method: "modelopt", quant_algo: "MIXED_PRECISION", ignore: [], kv_cache_scheme: FP8 static, quantized_layers: {…}}` with 616 entries: **367 `FP8`** (q/k/v/o of all 88 layers; `gate/up/down` of layers 0–3 and 87) and **249 `NVFP4`** group 16 (`gate/up/down` of layers 4–86). `lm_head`, `embed_tokens`, the Pixtral vision tower and the projector are not listed and stay BF16. Architecture is unchanged from the publisher: `Mistral3ForConditionalGeneration`, text `ministral3`, 88 layers, hidden 12,288, intermediate 28,672, 96 query / 8 KV heads, head dim 128, YaRN factor 64 with `mscale_all_dim: 0.0` (the corrected value). [mistral-medium-3.5-NV-NVFP4-CFG](https://huggingface.co/nvidia/Mistral-Medium-3.5-128B-NVFP4/raw/b8c66d2098edd8c9c26bde2b2ff41b5967e111ae/config.json) [mistral-medium-3.5-NV-NVFP4-HFQ](https://huggingface.co/nvidia/Mistral-Medium-3.5-128B-NVFP4/raw/b8c66d2098edd8c9c26bde2b2ff41b5967e111ae/hf_quant_config.json)

| Tensor group (header census) | Serialized form | Bytes | vLLM v0.33.0 [source] | SGLang v0.5.23 [source] |
| --- | --- | ---: | --- | --- |
| MLP `gate/up/down`, layers 4–86 (249 matrices) | U8-packed FP4 E2M1; FP8 E4M3 scale per 16 values; F32 `weight_scale_2`, `input_scale`, `activation_scale` per matrix | 49,347,038,124 | NVFP4 sub-config via `build_linear_method` (`ModelOptLinearMethod` + NVFP4 kernel selection, §4), W4A4 (static global input scale, dynamic FP4 activation quantization); `gate/up` fused as `gate_up_proj` | `down_proj`: `ModelOptFp4LinearMethod`. Fused `gate_up_proj`: **unresolved → `UnquantizedLinearMethod`** (see §3) |
| Attention `q/k/v/o`, all 88 layers | FP8 E4M3 weight; F32 per-tensor `weight_scale`, `input_scale`, `activation_scale`; `k_proj.k_scale`, `v_proj.v_scale` | 28,789,707,584 | FP8 sub-config via `build_linear_method`, static per-tensor W8A8 (FP8 scaled-mm kernel selection, §4); `qkv_proj` fused | `o_proj`: `ModelOptFp8LinearMethod`. Fused `qkv_proj`: **unresolved → `UnquantizedLinearMethod`** |
| MLP `gate/up/down`, layers 0–3 and 87 | FP8 E4M3 + F32 per-tensor scales | 5,284,823,220 | static W8A8 | `down_proj` W8A8; `gate_up_proj` unresolved |
| Pixtral vision tower | BF16 | 4,991,404,288 | unquantized | unquantized |
| Embedding, `lm_head` | BF16 | 3,221,225,472 each | unquantized | unquantized |
| Multimodal projector | BF16 | 365,038,848 | unquantized | unquantized |
| Norms | BF16 | 4,349,952 | — | — |
| **Total** | | **95,224,812,960** | | |

KV cache: `kv_cache_scheme` is FP8 static; vLLM resolves `--kv-cache-dtype auto` to `fp8` from it (`get_kv_cache_quant_algo_string`) and loads `k_scale`/`v_scale` through `maybe_remap_kv_scale_name` into `ModelOptKVCacheMethod`. KV bytes are 180,224 B per token (FP8) across the full model (§5). [mistral-medium-3.5-V033-TORCH-UTILS](https://raw.githubusercontent.com/vllm-project/vllm/4ba787ec9959e566d3b587a796dff07673324da5/vllm/utils/torch_utils.py) [mistral-medium-3.5-V033-WEIGHT-UTILS](https://raw.githubusercontent.com/vllm-project/vllm/4ba787ec9959e566d3b587a796dff07673324da5/vllm/model_executor/model_loader/weight_utils.py)

**Duplicate activation scales.** Every quantized linear stores both `activation_scale` and `input_scale` (F32 scalars). vLLM's Mistral3 `hf_to_vllm_mapper` renames `.activation_scale` to `.input_scale`, so both tensors load into the same parameter and the later one in iteration order wins; SGLang's Llama loader applies the same rename. If the two values are equal the duplication is harmless; their equality was not checked (it needs 8-byte payload reads per layer, outside this review's header-only scope). [mistral-medium-3.5-V033-MISTRAL3](https://raw.githubusercontent.com/vllm-project/vllm/4ba787ec9959e566d3b587a796dff07673324da5/vllm/model_executor/models/mistral3.py) [mistral-medium-3.5-S0523-LLAMA](https://raw.githubusercontent.com/sgl-project/sglang/297e54fd105e974cdf401e5b4d20253a22c16f90/python/sglang/srt/models/llama.py)

Comparison with the FP8 control: the publisher export is static per-tensor FP8 on all text linears with BF16 KV unless FP8 KV is requested. The NVFP4 export changes (a) MLP weights and activations of 83 layers to FP4, (b) the KV cache default to FP8 with calibrated scales. Weight bytes fall from 133,605,834,656 to 95,224,812,960 (0.713×, −38.38 GB). Equality of the FP8 attention tensors with the publisher FP8 tensors was not checked.

## 3. Support at the stable releases

| | vLLM v0.33.0 | SGLang v0.5.23 |
| --- | --- | --- |
| Architecture class | `Mistral3ForConditionalGeneration` registered (`registry.py`) | `Mistral3ForConditionalGeneration` in `models/mistral.py`, a `LlavaForConditionalGeneration` subclass (wrapper fix `4542fc8f` is in v0.5.23) |
| Quantization method | `modelopt_mixed` selected automatically: `ModelOptMixedPrecisionConfig.override_quantization_method` returns it for `quant_algo: MIXED_PRECISION`. No `--quantization` flag needed | `modelopt_mixed` selected automatically: `_parse_modelopt_quant_config` returns it when any `quantized_layers` entry is NVFP4 |
| Prefix mapping | `quantized_layers` keys `model.language_model.layers.N…` map to vLLM `language_model.model.layers.N…` via prefix candidates and `apply_vllm_mapper` | `_quantized_layer_prefix_candidates` performs the same mapping |
| **Fused projections** | `qkv_proj`/`gate_up_proj` resolved from shard entries: step 2 through the class `packed_modules_mapping` (Mistral3 declares `qkv_proj` and `gate_up_proj`), plus an explicit step-4 fallback for exactly these names | `_resolve_quant_algo` resolves fused names only through `packed_modules_mapping`. The loader takes it from `getattr(model_class, "packed_modules_mapping", {})`; `Mistral3ForConditionalGeneration`, `LlavaForConditionalGeneration`, `LlavaBaseForCausalLM` and `LlamaForCausalLM` declare none, and there is no fused-name fallback. `qkv_proj` and `gate_up_proj` therefore resolve to `None` → `UnquantizedLinearMethod` |
| Expected load outcome [source inference, not executed] | Loads | **Fails**: unquantized BF16 `gate_up_proj` parameters cannot accept U8-packed NVFP4 shards of shape `[28672, 6144]` (and the FP8 `qkv_proj` would be created as BF16 without scales). Same code at SGLang main `62384de1` (2026-11-06T12:01Z); no SGLang PR or issue referencing this export found (GitHub search, 13:00Z) |
| Config / tokenizer resolution | `--config-format auto` → `hf` (only a repository with `consolidated*.safetensors` resolves to `mistral`); `--tokenizer-mode auto` → `hf` for the same reason | Transformers `config.json`; `tokenizer.json` + chat template |
| Release image | `vllm/vllm-openai:v0.33.0` = index `sha256:d825baf9ce4b1b6bfc5ecc7b79880c7e6748c65a72d697ce3d47607aafa84c6e` (amd64 `sha256:91ee972ab751fb7180bc71c175865e36b091686600dca783d52b2511399810b3`; last updated 2026-11-02T03:06:39Z) | `lmsysorg/sglang:v0.5.23` = index `sha256:f832b5c39559c9caa900b22ad37c76fcce66470676855c42052102c537812f1f` (unchanged at 12:56:58Z) |
| Publisher-side NVFP4 documentation | Recipe at `4ba787ec` lists only the FP8 variant | Cookbook lists only the FP8 artifact |

[V033-REGISTRY](https://raw.githubusercontent.com/vllm-project/vllm/4ba787ec9959e566d3b587a796dff07673324da5/vllm/model_executor/models/registry.py) [mistral-medium-3.5-V033-MODELOPT](https://raw.githubusercontent.com/vllm-project/vllm/4ba787ec9959e566d3b587a796dff07673324da5/vllm/model_executor/layers/quantization/modelopt.py) [mistral-medium-3.5-V033-MISTRAL3](https://raw.githubusercontent.com/vllm-project/vllm/4ba787ec9959e566d3b587a796dff07673324da5/vllm/model_executor/models/mistral3.py) [mistral-medium-3.5-V033-HF-CONFIG](https://raw.githubusercontent.com/vllm-project/vllm/4ba787ec9959e566d3b587a796dff07673324da5/vllm/transformers_utils/config.py) [mistral-medium-3.5-V033-REPO-UTILS](https://raw.githubusercontent.com/vllm-project/vllm/4ba787ec9959e566d3b587a796dff07673324da5/vllm/transformers_utils/repo_utils.py) [mistral-medium-3.5-V033-TOKENIZER-REGISTRY](https://raw.githubusercontent.com/vllm-project/vllm/4ba787ec9959e566d3b587a796dff07673324da5/vllm/tokenizers/registry.py) [mistral-medium-3.5-V033-RECIPE](https://raw.githubusercontent.com/vllm-project/vllm/4ba787ec9959e566d3b587a796dff07673324da5/recipes/models/mistralai/Mistral-Medium-3.5-128B.yaml) [mistral-medium-3.5-V033-IMAGE](https://hub.docker.com/v2/repositories/vllm/vllm-openai/tags/v0.33.0) [S0523-MODEL-CONFIG](https://raw.githubusercontent.com/sgl-project/sglang/297e54fd105e974cdf401e5b4d20253a22c16f90/python/sglang/srt/configs/model_config.py) [S0523-LOADER](https://raw.githubusercontent.com/sgl-project/sglang/297e54fd105e974cdf401e5b4d20253a22c16f90/python/sglang/srt/model_loader/loader.py) [mistral-medium-3.5-S0523-MODELOPT](https://raw.githubusercontent.com/sgl-project/sglang/297e54fd105e974cdf401e5b4d20253a22c16f90/python/sglang/srt/layers/quantization/modelopt_quant.py) [mistral-medium-3.5-S0523-WEIGHT-UTILS](https://raw.githubusercontent.com/sgl-project/sglang/297e54fd105e974cdf401e5b4d20253a22c16f90/python/sglang/srt/model_loader/weight_utils.py) [S0523-K-MISTRAL](https://raw.githubusercontent.com/sgl-project/sglang/297e54fd105e974cdf401e5b4d20253a22c16f90/python/sglang/srt/models/mistral.py) [mistral-medium-3.5-S0523-LLAVA](https://raw.githubusercontent.com/sgl-project/sglang/297e54fd105e974cdf401e5b4d20253a22c16f90/python/sglang/srt/models/llava.py) [mistral-medium-3.5-SMAIN-MISTRAL](https://raw.githubusercontent.com/sgl-project/sglang/62384de1ae5e3bbd3159afd1639525b0bf39fbf9/python/sglang/srt/models/mistral.py) [mistral-medium-3.5-SMAIN-LLAVA](https://raw.githubusercontent.com/sgl-project/sglang/62384de1ae5e3bbd3159afd1639525b0bf39fbf9/python/sglang/srt/models/llava.py) [mistral-medium-3.5-SMAIN-MODELOPT](https://raw.githubusercontent.com/sgl-project/sglang/62384de1ae5e3bbd3159afd1639525b0bf39fbf9/python/sglang/srt/layers/quantization/modelopt_quant.py) [mistral-medium-3.5-SGL-SEARCH](https://api.github.com/search/issues?q=repo%3Asgl-project%2Fsglang+%22Mistral-Medium-3.5-128B-NVFP4%22) [S0523-IMAGE](https://hub.docker.com/v2/repositories/lmsysorg/sglang/tags/v0.5.23) [mistral-medium-3.5-S0523-COOKBOOK](https://raw.githubusercontent.com/sgl-project/sglang/297e54fd105e974cdf401e5b4d20253a22c16f90/docs/cookbook/autoregressive/Mistral/Mistral-Medium-3.5.mdx)

**SGLang status is explicit:** no stable release, main commit or open PR found on 2026-11-06 loads this export by source reading. The minimal fix is a `packed_modules_mapping = {"qkv_proj": ["q_proj","k_proj","v_proj"], "gate_up_proj": ["gate_proj","up_proj"]}` on the SGLang Mistral3/Llava/Llama class used for this architecture, or a fused-name fallback in `ModelOptMixedPrecisionConfig._resolve_quant_algo` like vLLM's step 4. Either is a non-release change that must be built into an image, pinned by digest and load-tested; none exists today.

**vLLM tokenizer path at v0.33.0.** With an HF-format Mistral3 checkpoint and `mistral-common` installed, transformers can resolve the tokenizer to `MistralCommonBackend`, which does not encode `[IMG]` found in text; startup multimodal profiling then failed (#50706, which names this checkpoint). PR #54192 ("Avoid MistralCommonBackend for HF tokenizers", merged 2026-09-10 as `983b7e28`) is an ancestor of `4ba787ec` (compare: ahead 2,735, behind 0), so v0.33.0 contains the fix. `--tokenizer-mode mistral` with this HF-format checkpoint still crashes at startup: PR #45525 is open (the related issue #45289 was closed via the consolidated-checkpoint workaround, which this export does not have). PR #52643 (alternative fix, also naming this checkpoint) is open. [mistral-medium-3.5-VLLM-ISSUE50706](https://api.github.com/repos/vllm-project/vllm/issues/50706) [mistral-medium-3.5-VLLM-PR54192](https://api.github.com/repos/vllm-project/vllm/pulls/54192) [mistral-medium-3.5-VLLM-PR54192-IN-V033](https://api.github.com/repos/vllm-project/vllm/compare/983b7e28c9f87c3a150081640e0fdeafec5d553a...4ba787ec9959e566d3b587a796dff07673324da5?per_page=1) [mistral-medium-3.5-VLLM-PR45525](https://api.github.com/repos/vllm-project/vllm/pulls/45525) [mistral-medium-3.5-VLLM-ISSUE45289](https://api.github.com/repos/vllm-project/vllm/issues/45289) [mistral-medium-3.5-VLLM-PR52643](https://api.github.com/repos/vllm-project/vllm/pulls/52643) [mistral-medium-3.5-VLLM-SEARCH](https://api.github.com/search/issues?q=repo%3Avllm-project%2Fvllm+%22Mistral-Medium-3.5-128B-NVFP4%22)

## 4. Kernels selected on SM103 (source reading, not runtime observation)

B300 is compute capability 10.3. vLLM's SM10x-family checks and SGLang's `is_sm100_supported()` (major 10, CUDA ≥ 12.8) include it. [CC](https://developer.nvidia.com/cuda/gpus) [mistral-medium-3.5-S0523-COMMON](https://raw.githubusercontent.com/sgl-project/sglang/297e54fd105e974cdf401e5b4d20253a22c16f90/python/sglang/srt/utils/common.py)

**vLLM v0.33.0.**

- *NVFP4 linears (MLP layers 4–86).* CUDA priority: `FlashInferCuteDslNvFp4LinearKernel` (SM10x family, FlashInfer CuTe-DSL) → `FlashInferCutlassNvFp4LinearKernel` → `FlashInferB12xNvFp4LinearKernel` → `CutlassNvFp4LinearKernel` → weight-only fallbacks (W4A16 CuTe-DSL, Marlin) → TRT-LLM, cuDNN, FBGEMM, B12x, torch. The first kernel whose `is_supported`/`can_implement` passes is used; which one passes depends on the FlashInfer build inside the image (requirements pin `flashinfer-python` 0.7.2.post1 at the release commit). Override: `--linear-backend` (`flashinfer_cutedsl`, `flashinfer_cutlass`, `cutlass`, `flashinfer_trtllm`, `flashinfer_cudnn`, …) or the per-quantization kernel config.
- *FP8 per-tensor linears (attention, edge MLPs).* CUDA priority: `FlashInferFP8ScaledMMLinearKernel` (capability ≥ 100, per-tensor weight and activation scales — this export qualifies) → `CutlassFP8ScaledMMLinearKernel` → B12x → torch → Marlin → Humming. The startup log line "Selected <kernel> for <module>" records the choice.
- *Attention.* GQA, head dim 128, FP8 KV: backend resolution on SM103 was not traced; record the selected backend and CUDA-graph mode from the startup log.
- *Weight-only fallbacks.* Marlin/Humming entries would run W4A16/W8A16 and change numerics; a startup log showing them is a qualification failure for this comparison.

[mistral-medium-3.5-V033-LINEAR-KERNELS](https://raw.githubusercontent.com/vllm-project/vllm/4ba787ec9959e566d3b587a796dff07673324da5/vllm/model_executor/kernels/linear/__init__.py) [mistral-medium-3.5-V033-NVFP4-FLASHINFER](https://raw.githubusercontent.com/vllm-project/vllm/4ba787ec9959e566d3b587a796dff07673324da5/vllm/model_executor/kernels/linear/nvfp4/flashinfer.py) [mistral-medium-3.5-V033-SCALEDMM-FLASHINFER](https://raw.githubusercontent.com/vllm-project/vllm/4ba787ec9959e566d3b587a796dff07673324da5/vllm/model_executor/kernels/linear/scaled_mm/flashinfer.py) [mistral-medium-3.5-V033-HUMMING-PRIORITY](https://raw.githubusercontent.com/vllm-project/vllm/4ba787ec9959e566d3b587a796dff07673324da5/vllm/model_executor/layers/quantization/utils/humming/priority.py) [mistral-medium-3.5-V033-KERNEL-CONFIG](https://raw.githubusercontent.com/vllm-project/vllm/4ba787ec9959e566d3b587a796dff07673324da5/vllm/config/kernel.py) [V033-CUDA-REQUIREMENTS](https://raw.githubusercontent.com/vllm-project/vllm/4ba787ec9959e566d3b587a796dff07673324da5/requirements/cuda.txt)

**SGLang v0.5.23 (only relevant once the fused-projection gap is fixed).** FP4 GEMM backend `auto` resolves to `flashinfer_cutedsl` on SM100-family (`--fp4-gemm-backend` overrides). FP8 per-tensor linears use `ModelOptFp8LinearMethod` (FlashInfer per-tensor path when supported, otherwise CUTLASS `apply_fp8_linear`; helper selection not traced). KV dtype must be requested explicitly (`--kv-cache-dtype fp8_e4m3`); whether the calibrated `k_scale`/`v_scale` load on this path was not traced. [mistral-medium-3.5-S0523-FP4-UTILS](https://raw.githubusercontent.com/sgl-project/sglang/297e54fd105e974cdf401e5b4d20253a22c16f90/python/sglang/srt/layers/quantization/fp4_utils.py) [mistral-medium-3.5-S0523-EXEC-ARGS](https://raw.githubusercontent.com/sgl-project/sglang/297e54fd105e974cdf401e5b4d20253a22c16f90/python/sglang/srt/arg_groups/fields/exec_.py)

## 5. Memory: weights per GPU and KV room

**Weights per GPU [atlas calculation from the pinned headers].** "Even shard" divides the index total by TP. vLLM's default `--mm-encoder-tp-mode weights` shards the vision encoder; `--mm-encoder-tp-mode data` replicates vision tower + projector (5.36 GB) on every rank. Embedding and `lm_head` are vocab-sharded.

| Layout | NVFP4 even shard | NVFP4, encoder replicated (`data` mode) | FP8 control even shard | EAGLE draft per GPU (if enabled) |
| --- | ---: | ---: | ---: | ---: |
| TP1 | 95.22 GB | 95.22 GB | 133.61 GB | 3.07 GB |
| TP2 | 47.61 GB | 50.29 GB | 66.80 GB | 1.54 GB |
| TP4 | 23.81 GB | 27.82 GB | 33.40 GB | 0.77 GB |
| TP8 | 11.90 GB | 16.59 GB | 16.70 GB | 0.38 GB |

**KV bytes per token [atlas derivation from the pinned config].** 2 (K, V) × 88 layers × 8 KV heads × 128 × 1 byte = **180,224 B/token** with FP8 KV (360,448 B with BF16), split across TP ranks up to TP8 (8 KV heads). Per sequence: 5.5 GiB at 32,768 tokens, 44 GiB at 262,144. The EAGLE draft (2 layers, 8 KV heads, head dim 128 per its `params.json`) adds 4,096 B/token at FP8, +2.3%. This agrees with [memory math](../../../reports/memory-math.md). [mistral-medium-3.5-EAGLE-PARAMS](https://huggingface.co/mistralai/Mistral-Medium-3.5-128B-EAGLE/raw/d31694b0f55b51d4d962b5c3dbf0e03d1f019275/params.json)

**KV room on B300 [atlas calculation; upper bound].** Budget per GPU = 0.85 × 288 GB (advertised capacity convention) − even-shard weights, before activations, CUDA graphs, sampler, encoder cache and workspaces. Token ceiling per replica = budget × TP ÷ 180,224.

| Layout (replicas on 8 GPUs) | KV budget/GPU | FP8 KV token ceiling per replica | Full 32K sequences | Full 256K sequences | Node total |
| --- | ---: | ---: | ---: | ---: | ---: |
| TP1 (×8) | 149.58 GB | ≈0.83M | ≈25 | ≈3.2 | ≈6.6M |
| TP2 (×4) | 197.19 GB | ≈2.19M | ≈67 | ≈8.3 | ≈8.8M |
| TP4 (×2) | 220.99 GB | ≈4.90M | ≈150 | ≈18.7 | ≈9.8M |
| TP8 (×1) | 232.90 GB | ≈10.34M | ≈315 | ≈39.4 | ≈10.3M |

At `--gpu-memory-utilization 0.90` the ceilings are ≈0.91M / 2.35M / 5.22M / 10.98M. With the EAGLE draft at TP4: ≈4.78M per replica. The FP8 control leaves 111.19 / 178.00 / 211.40 / 228.10 GB per GPU at TP1/2/4/8 (≈0.62M / 1.98M / 4.69M / 10.13M tokens), so NVFP4 adds ≈35% KV room at TP1, ≈11% at TP2 and only ≈2–5% at TP4–TP8; the capacity effect matters at TP1–TP2. A single request can never use more than its replica's pool, and `--max-model-len` caps each sequence independently of pool size. These are not B300 measurements. [HW](https://docs.nvidia.com/dgx/dgxb300-user-guide/introduction-to-dgxb300.html)

## 6. Launch commands

The model argument can be the Hub ID with `--revision` (as written) or, under KServe, an immutable `b8c66d20` snapshot mounted at `/mnt/models` (then pass `/mnt/models` and drop `--revision`/`--tokenizer-revision`). No `--quantization` flag: both engines auto-detect `modelopt_mixed`; confirm it in the startup log. `--served-model-name`, `--host 0.0.0.0` and `--port 8000` are [atlas] choices aligned with KServe defaults.

### 6.1 vLLM, first B300 candidate: TP4, two replicas per node (catalog `mistral-medium-3.5.nvfp4.vllm.tp4`)

```bash
# image: vllm/vllm-openai@sha256:d825baf9ce4b1b6bfc5ecc7b79880c7e6748c65a72d697ce3d47607aafa84c6e  (v0.33.0)
export VLLM_ENGINE_READY_TIMEOUT_S=1800
vllm serve nvidia/Mistral-Medium-3.5-128B-NVFP4 \
  --revision b8c66d2098edd8c9c26bde2b2ff41b5967e111ae \
  --tokenizer-revision b8c66d2098edd8c9c26bde2b2ff41b5967e111ae \
  --tensor-parallel-size 4 \
  --tokenizer-mode hf \
  --kv-cache-dtype fp8 \
  --max-model-len 32768 \
  --gpu-memory-utilization 0.85 \
  --max-num-seqs 32 --max-num-batched-tokens 16384 \
  --tool-call-parser mistral --reasoning-parser mistral --enable-auto-tool-choice \
  --served-model-name mistral-medium-3.5-nvfp4 --host 0.0.0.0 --port 8000
# Step 2 (same image, layout and admission budget), add:
#   --speculative-config '{"model":"mistralai/Mistral-Medium-3.5-128B-EAGLE","revision":"d31694b0f55b51d4d962b5c3dbf0e03d1f019275","method":"eagle","num_speculative_tokens":3}'
```

| Flag or setting | Origin |
| --- | --- |
| Image digest | [atlas] v0.33.0 release index digest; the card's `v0.21.0` is not the atlas baseline |
| `VLLM_ENGINE_READY_TIMEOUT_S=1800` | [atlas]; v0.33.0 default 600 s; 95 GB load + compile + graph capture on B300 is unmeasured [V033-ENVS](https://raw.githubusercontent.com/vllm-project/vllm/4ba787ec9959e566d3b587a796dff07673324da5/vllm/envs.py) |
| `--revision`, `--tokenizer-revision` | [atlas] pin |
| `--tensor-parallel-size 4` | [card] exporter command; [atlas] two replicas per 8-GPU node |
| `--tokenizer-mode hf` | [atlas] equals what `auto` resolves to; written explicitly so the engine never takes the `mistral` path that #45525 shows crashing on HF-format Mistral3 |
| No `--config-format`, `--load-format` | [source] `auto` resolves to `hf`/safetensors. Do **not** pass `--config-format mistral` (`params.json` describes FP8). The card's `--config-format hf` is equivalent for the target but is inherited by the EAGLE draft (§7) |
| `--kv-cache-dtype fp8` | [card] "KV cache remain[s] in FP8"; [source] `auto` already resolves to FP8 from `kv_cache_scheme`; explicit for auditability |
| `--max-model-len 32768` | [atlas] cap for first qualification, same as the FP8 baseline record; [card] uses 196,608; native 262,144 |
| `--gpu-memory-utilization 0.85` | [atlas] same as the FP8 baseline record; [card] uses 0.9 |
| `--max-num-seqs 32`, `--max-num-batched-tokens 16384` | [atlas] FP8 baseline admission budget, held equal for the A/B; [recipe] EAGLE example uses 128 / 16,384 |
| Parsers, `--enable-auto-tool-choice` | [recipe]; [eagle-card]. `MistralParser` reads `[THINK]`/`[TOOL_CALLS]` from the HF tokenizer vocabulary and raises at startup if `[TOOL_CALLS]` is absent [mistral-medium-3.5-V033-PARSER](https://raw.githubusercontent.com/vllm-project/vllm/4ba787ec9959e566d3b587a796dff07673324da5/vllm/parser/mistral.py) |
| `--served-model-name`, `--host`, `--port 8000` | [atlas] |
| No `--trust-remote-code`, no `--dtype` | [source] no `auto_map`; `dtype: bfloat16` in config is the compute dtype for unquantized parts |
| CUDA graphs | [atlas] engine default (not overridden); record the resolved compilation/cudagraph mode at startup |
| Optional `--language-model-only` | [recipe] text-only serving: skips the vision encoder and projector (≈5.36 GB per replica, divided across its ranks); changes the served contract |
| Optional `--mm-encoder-tp-mode data` | [recipe] replicates the encoder to avoid TP communication; costs memory (§5) |

### 6.2 vLLM alternative: TP2, four replicas per node (catalog `mistral-medium-3.5.nvfp4.vllm.tp2`)

Same arguments with `--tensor-parallel-size 2`, one engine per 2-GPU group. This is the layout where NVFP4 changes feasibility: the FP8 control at TP2 holds 66.8 GB of weights per GPU versus 47.6 GB, and the NVFP4 ceiling is ≈2.19M KV tokens per replica (≈67 full 32K sequences). Per-replica TP communication halves and per-request decode bandwidth per replica falls; no evidence selects TP2 or TP4 for a given workload. Exporter validation used TP4 only.

### 6.3 SGLang compatibility probe: TP4 (catalog `mistral-medium-3.5.nvfp4.sglang.tp4`)

```bash
# image: lmsysorg/sglang@sha256:f832b5c39559c9caa900b22ad37c76fcce66470676855c42052102c537812f1f  (v0.5.23)
# EXPECTED TO FAIL AT WEIGHT LOAD at v0.5.23 (fused qkv_proj/gate_up_proj unresolved, §3).
# Use only with an image that carries a packed_modules_mapping fix, pinned by digest.
python3 -m sglang.launch_server \
  --model-path nvidia/Mistral-Medium-3.5-128B-NVFP4 \
  --revision b8c66d2098edd8c9c26bde2b2ff41b5967e111ae \
  --tp-size 4 \
  --kv-cache-dtype fp8_e4m3 \
  --context-length 32768 \
  --mem-fraction-static 0.82 \
  --max-running-requests 32 \
  --tool-call-parser mistral --reasoning-parser mistral \
  --served-model-name mistral-medium-3.5-nvfp4 --host 0.0.0.0 --port 8000
```

| Flag | Origin |
| --- | --- |
| `--tp-size 4` | [card] exporter TP; [atlas] matches the vLLM candidate |
| `--kv-cache-dtype fp8_e4m3` | [card] FP8 KV; [atlas] explicit |
| `--context-length 32768`, `--mem-fraction-static 0.82`, `--max-running-requests 32` | [atlas] same as the FP8 SGLang baseline record |
| Parsers | [cookbook]; publisher card SGLang command |
| No `--dtype bfloat16` for target-only | [cookbook] requires `--dtype bfloat16` only with the EAGLE draft (draft `params.json` has no dtype) |
| `--fp4-gemm-backend` | not set: `auto` → `flashinfer_cutedsl` on SM100-family [source] |

### 6.4 Chat template and renderer

With `--tokenizer-mode hf`, vLLM renders prompts with the export's `chat_template.jinja` (SHA-256 `6480e9ef…`, 11,999 bytes). It differs from the publisher template at `22b2b868` (SHA-256 `68827dcf…`, 14,255 bytes): the export sets `default_system_message = ''` where the publisher template injects a default Mistral Medium 3.5 system prompt when no system message is given; tool results are rendered as text only; there is no `render_content` macro; BOS/EOS are literals. Both support `reasoning_effort` `none`/`high`. The publisher FP8 recipe instead renders with `mistral-common` (`--tokenizer-mode mistral`). Consequences: (a) the exporter's FP8-vs-NVFP4 table and an atlas FP8-vs-NVFP4 comparison are renderer-sensitive; (b) for a quality A/B, hold the renderer constant — either submit pre-tokenized prompts to both arms or pass the same `--chat-template` file (record its SHA-256) to both arms under `--tokenizer-mode hf`. Which template is preferable for production (empty default system prompt vs publisher default) is a product decision, not an evidence question. [mistral-medium-3.5-NV-NVFP4-CHAT-TEMPLATE](https://huggingface.co/nvidia/Mistral-Medium-3.5-128B-NVFP4/raw/b8c66d2098edd8c9c26bde2b2ff41b5967e111ae/chat_template.jinja) [mistral-medium-3.5-CHAT-TEMPLATE](https://huggingface.co/mistralai/Mistral-Medium-3.5-128B/raw/22b2b868a15677cfa6061277ed2f653d1349a9ab/chat_template.jinja)

## 7. Speculative decoding (official EAGLE draft) with the NVFP4 target

| Property | Value | Evidence |
| --- | --- | --- |
| Draft artifact | `mistralai/Mistral-Medium-3.5-128B-EAGLE` @ `d31694b0…`: native `params.json` + one `consolidated.safetensors` (3,070,358,348 B incl. header); 2 GQA layers, 8 KV heads, no vision. Its file size fits two FP8 decoder layers without a BF16 embedding or head, so use of the target's embedding/head is inferred from size, not verified | [mistral-medium-3.5-EAGLE-PARAMS](https://huggingface.co/mistralai/Mistral-Medium-3.5-128B-EAGLE/raw/d31694b0f55b51d4d962b5c3dbf0e03d1f019275/params.json) [mistral-medium-3.5-EAGLE-TREE](https://huggingface.co/api/models/mistralai/Mistral-Medium-3.5-128B-EAGLE/tree/d31694b0f55b51d4d962b5c3dbf0e03d1f019275?recursive=false&expand=false) |
| Draft precision vs target | Draft FP8 per-tensor (its own `params.json`); target FP8 attention + NVFP4 MLP. vLLM builds the draft `ModelConfig` with `quantization=None` from the speculative config, so the draft's own quantization is detected; compute dtype is inherited from the target (BF16) | [source] [V033-SPEC-CONFIG](https://raw.githubusercontent.com/vllm-project/vllm/4ba787ec9959e566d3b587a796dff07673324da5/vllm/config/speculative.py) |
| Pairing | The [eagle-card] names only the FP8 target. The draft was trained on FP8-target hidden states; with NVFP4 MLPs the target hidden states shift, so **acceptance length is unknown** (output correctness is preserved by target verification under greedy decoding) | [mistral-medium-3.5-EAGLE-CARD](https://huggingface.co/mistralai/Mistral-Medium-3.5-128B-EAGLE/raw/d31694b0f55b51d4d962b5c3dbf0e03d1f019275/README.md) |
| vLLM format inheritance | The draft `ModelConfig` inherits the target's `config_format` and `tokenizer_mode` and uses the target tokenizer. Target `--config-format auto` lets the draft resolve to `mistral` (it has no `config.json`); **passing `--config-format hf` (as the exporter card does) forces the draft to `hf` and is expected to fail** [source inference] | [V033-SPEC-CONFIG](https://raw.githubusercontent.com/vllm-project/vllm/4ba787ec9959e566d3b587a796dff07673324da5/vllm/config/speculative.py) |
| vLLM flag | `--speculative-config '{"model":"mistralai/Mistral-Medium-3.5-128B-EAGLE","revision":"d31694b0f55b51d4d962b5c3dbf0e03d1f019275","method":"eagle","num_speculative_tokens":3}'`. Do not copy the recipe's draft `max_model_len: 65536` onto a 32,768 target (rejected: draft cap above target) | [recipe]; [mistral-medium-3.5-V033-RECIPE](https://raw.githubusercontent.com/vllm-project/vllm/4ba787ec9959e566d3b587a796dff07673324da5/recipes/models/mistralai/Mistral-Medium-3.5-128B.yaml) |
| Draft loading with target `--load-format auto` | The FP8 recipe uses `--load-format mistral`; with `auto` the default loader picks `*.safetensors`, which matches the draft's only weight file. Not executed | [source inference] |
| SGLang flags (once the load gap is fixed) | `--speculative-algorithm EAGLE --speculative-draft-model-path mistralai/Mistral-Medium-3.5-128B-EAGLE --speculative-num-steps 3 --speculative-eagle-topk 1 --speculative-num-draft-tokens 4 --dtype bfloat16` | [cookbook]; publisher card |
| Capacity cost | +0.77 GB weights per GPU at TP4 if the draft is sharded with the target TP (3.07 GB if replicated); +2.3% KV per token (§5) | [atlas] |

## 8. What is verified, by whom, where

| Claim | Who | Hardware | Engine build | Checkpoint |
| --- | --- | --- | --- | --- |
| Export serves under vLLM | NVIDIA (card) | B200 | `vllm/vllm-openai:v0.21.0` | this repository (revision at evaluation not stated; history shows `ced60332` pinned the image) |
| FP8 vs NVFP4 accuracy table | NVIDIA (card) | not stated (card lists B200 as test hardware) | not stated | not stated |
| vLLM v0.33.0 loads it | atlas source reading only | — | v0.33.0 source | `b8c66d20` |
| SGLang v0.5.23 loads it | **contradicted by atlas source reading** | — | v0.5.23 and main `62384de1` source | `b8c66d20` |
| EAGLE with NVFP4 target | nobody | — | — | — |
| Anything on B300 | nobody; atlas executed nothing | — | — | — |

## 9. Quality evidence

**Exporter table [card; not reproduced].** FP8 → NVFP4: MMLU Pro 82.31 → 82.20; GPQA Diamond 76.88 → 76.80; AA-LCR 62.06 → 65.10; SciCode 42.50 → 42.60; AIME 2025 88.85 → 88.75; IFBench 70.25 → 69.17; MMMU Pro 63.35 → 62.79. Conditions stated: vLLM, `reasoning_effort="high"`, temperature 0.7, top-p 0.95. Not stated: sample counts, repeats, seeds, engine version for each arm, KV dtype of the FP8 arm, renderer, hardware per run. The largest movement (AA-LCR +3.0) is in the NVFP4 direction and exceeds the other deltas; with sampled decoding and unknown repeat counts it cannot be read as an improvement. The table supports "no large regression on these seven tasks under the exporter's setup"; it does not establish equivalence, tool-call or long-context parity, or behavior on B300 or v0.33.0.

No engine (vLLM recipe, SGLang cookbook) publishes NVFP4 quality for this model. The [AA Intelligence Index](../../../reports/intelligence-index.md) entry for Mistral Medium 3.5 is not tied to this export.

## 10. Failure conditions and open issues

| Condition | Effect | Status / mitigation | Source |
| --- | --- | --- | --- |
| SGLang v0.5.23 (and main `62384de1`) | Fused `qkv_proj`/`gate_up_proj` resolve to BF16 → weight-shape failure at load | Do not deploy on SGLang until a `packed_modules_mapping` fix exists in a digest-pinned image | §3 |
| `--tokenizer-mode mistral` on vLLM | Startup crash in multimodal profiling for HF-format Mistral3 | PR #45525 open; use `hf` | [mistral-medium-3.5-VLLM-PR45525](https://api.github.com/repos/vllm-project/vllm/pulls/45525) |
| `MistralCommonBackend` chosen for the HF tokenizer | `[IMG]` not encoded → startup failure (#50706) | Fixed by #54192 in v0.33.0; confirm no `MistralCommonBackend` in the startup log | [mistral-medium-3.5-VLLM-PR54192](https://api.github.com/repos/vllm-project/vllm/pulls/54192) |
| `--config-format mistral` | Engine reads `params.json` (FP8 contract) for an NVFP4 checkpoint | Never pass it for this export | §1 |
| `--config-format hf` with EAGLE | Draft forced to HF format without `config.json` | Leave `auto` | §7 |
| Draft `max_model_len` above target | Rejected by vLLM | Omit or set ≤ target | [recipe] |
| `activation_scale` ≠ `input_scale` | Load-order-dependent activation scale | Payload check of both scalars per layer (open) | §2 |
| Kernel fallback to weight-only (Marlin/Humming) | Different numerics and speed | Treat as qualification failure; pin `--linear-backend` if needed | §4 |
| Startup longer than engine/probe budget | Pod restart loop | `VLLM_ENGINE_READY_TIMEOUT_S=1800`; KServe startup budget ≥ 1,800 s until measured | §11 |
| Mutable tags | Silent engine change | Pin `@sha256:` digests; record in-container engine commit | §3 |
| Context above 32K | Unqualified here; exporter ran 196,608 on B200 | Qualify longer caps separately; check YaRN `mscale_all_dim: 0.0` behavior | [card] |
| Image content (transformers, FlashInfer, CUDA/driver) | `tokenizer_class: TokenizersBackend` needs transformers v5; kernel availability depends on FlashInfer build; B300 driver must support the image's CUDA 13.0 | Inspect in-container versions at startup | — |

## 11. KServe integration

| Item | TP4 (×2 per node) | TP2 (×4 per node) |
| --- | --- | --- |
| GPUs per serving unit | 4 (`nvidia.com/gpu: 4`) | 2 (`nvidia.com/gpu: 2`) |
| Placement | Two units on one 8-GPU node, each on a 4-GPU NVLink group | Four units; GPU-to-unit assignment by the device plugin |
| Image | vLLM v0.33.0 by digest (§3); never a tag | same |
| Command | vLLM template default `vllm serve`; arguments from §6.1 | same with TP2 |
| Model storage | Immutable `b8c66d20` snapshot (95,259,207,898 bytes, all 22 files) on a PVC mounted read-only at `/mnt/models`; avoid unpinned `hf://`. EAGLE step needs a second snapshot of `d31694b0` | shared read-only snapshot |
| Startup probe | Budget ≥ 1,800 s matching `VLLM_ENGINE_READY_TIMEOUT_S` [atlas]; replace with measured cold start + margin | same |
| Readiness / liveness | `GET /health` on 8000 after startup; liveness only after startup succeeds. A 200 from `/health` does not prove correct generation; gate traffic on a generation smoke test during qualification | same |
| Shared memory | Memory-backed `emptyDir` at `/dev/shm` sized from node host RAM (TP>1 uses shared memory for NCCL/IPC) | same |
| OpenAI route | `/v1/chat/completions`, `/v1/completions`, `/v1/models` on port 8000; external prefix depends on the unknown KServe resource kind and gateway | a router/endpoint picker across replicas is needed for one model name |
| Model name | `--served-model-name mistral-medium-3.5-nvfp4` independent of mount path | same |
| Rollout on one node | Roll one unit at a time; capacity halves during rollout | capacity drops by a quarter per unit |

See the [KServe architecture analysis](../../../frameworks/kserve/ARCHITECTURE.md). [KEXP-TEMPLATE21](https://github.com/kserve/kserve/blob/d1482554fc4f66dd41aee70e01f5174e24f265bd/config/llmisvcconfig/config-llm-template.yaml) [RR-HK-WORKLOAD21](https://raw.githubusercontent.com/kserve/kserve/d1482554fc4f66dd41aee70e01f5174e24f265bd/pkg/controller/v1alpha2/llmisvc/workload.go) [RR-HK-STORAGE21](https://raw.githubusercontent.com/kserve/kserve/d1482554fc4f66dd41aee70e01f5174e24f265bd/pkg/controller/v1alpha2/llmisvc/workload_storage.go)

## 12. Side-by-side: vLLM vs SGLang for this export on 8×B300

| Dimension | vLLM v0.33.0 | SGLang v0.5.23 |
| --- | --- | --- |
| Architecture class | `Mistral3ForConditionalGeneration` | `Mistral3ForConditionalGeneration` (Llava subclass) |
| Quant method | `modelopt_mixed` (auto) | `modelopt_mixed` (auto) |
| Fused q/k/v and gate/up resolution | packed mapping + explicit fallback → resolves | no packed mapping, no fallback → **unresolved** |
| Expected load at release | loads (source inference) | fails (source inference) |
| NVFP4 GEMM on SM103 | FlashInfer CuTe-DSL first, then FlashInfer CUTLASS, CUTLASS | `flashinfer_cutedsl` (auto) |
| FP8 per-tensor GEMM | FlashInfer scaled-mm first, then CUTLASS | `ModelOptFp8LinearMethod` (FlashInfer/CUTLASS; not traced) |
| KV dtype | FP8 from `kv_cache_scheme` (`auto`), scales loaded | FP8 by flag; scale loading not traced |
| Config / tokenizer | `hf` / `hf` (auto) | Transformers config, `tokenizer.json` |
| First layout | TP4 ×2 | TP4 probe only after a fix |
| Memory knob | `--gpu-memory-utilization 0.85` | `--mem-fraction-static 0.82` |
| Parsers | `mistral` / `mistral` + auto tool choice | `mistral` / `mistral` |
| EAGLE | `--speculative-config` method `eagle`, 3 tokens; keep `--config-format` auto | EAGLE 3 steps / 4 draft tokens, `--dtype bfloat16` |
| Image | `vllm/vllm-openai@sha256:d825baf9…` | `lmsysorg/sglang@sha256:f832b5c3…` |
| Publisher/exporter support | exporter validated v0.21.0 on B200 | none |

Neither column is a measured comparison.

## 13. Qualification plan (proposed, not measured)

Run in the execution repository with the same snapshot, the digest-pinned vLLM image and the KServe route; record the in-container engine commit and library versions.

1. **Load and identity.** Startup log must show `modelopt_mixed`; selected NVFP4 and FP8 kernels (no weight-only fallback); KV dtype FP8 with scales loaded; HF tokenizer backend (not `MistralCommonBackend`); per-GPU weight memory (compare with §5); reported KV token capacity (compare with ≈4.9M per TP4 replica, ≈2.2M per TP2 replica, minus activations/graphs); cold-start time against the probe budget.
2. **Correctness, target-only (TP4).** Fixed renderer (§6.4). NVFP4 vs the FP8 publisher control (`mistral-medium-3.5.fp8.vllm.baseline`, same image, same admission budget, FP8 KV on both arms for the precision comparison, then FP8 vs BF16 KV on the control). Text, image, tool calls with strict JSON schemas, `reasoning_effort` none/high, a long-context retrieval check at the cap. Repeated samples with stated seeds; acceptance margins supplied before any adoption decision.
3. **EAGLE.** Greedy output equality on a fixed set (lossless check); acceptance length on the intended workload for NVFP4 vs the FP8 control; KV capacity loss.
4. **Layout.** TP4 ×2 vs TP2 ×4 vs TP8 ×1 at equal offered load and context distribution: TTFT/TPOT p50/p99, node output tokens/s, KV utilization, preemptions, errors, measured through the KServe route. Controls in [benchmark decision criteria](../../../reports/optimization.md#benchmark-decisions-and-measurement-contract).
5. **SGLang.** Only after a `packed_modules_mapping` fix exists in a digest-pinned image: repeat steps 1–2.

## 14. Open gaps and the evidence that would close them

| Gap | Evidence needed |
| --- | --- |
| SGLang fused-projection resolution for Mistral3 `modelopt_mixed` | Upstream patch (packed mapping or fused fallback), a digest-pinned image containing it, and a load + correctness run |
| Equality of `activation_scale` and `input_scale` per layer | 8-byte payload reads of both scalars for all 616 quantized linears, or a loader log of the value used |
| Resolved SM103 kernels, attention backend, CUDA-graph mode | vLLM startup log on B300 |
| Per-GPU resident memory and KV capacity on B300 | Startup logs per layout |
| In-image versions (transformers, FlashInfer, CUDA) and driver compatibility | In-container version dump on the node |
| EAGLE acceptance with the NVFP4 target | Step 3 measurement |
| NVFP4 vs FP8 quality on B300 with a fixed renderer | Step 2 measurement |
| Exporter evaluation conditions; ModelOpt 0.37.0 vs v0.44.0 | NVIDIA statement or updated card |
| Licence (`nvidia-open-model-license` metadata vs Mistral Modified MIT body; no LICENSE file) | NVIDIA/Mistral clarification; legal review |
| Equality of the FP8 attention tensors with the publisher FP8 export | Payload hashes of the relevant tensors |
| Installed KServe version, resource kind, gateway path, host RAM for `/dev/shm` | Cluster inventory |

[Serving decisions](serving.md) · [Precision](precision.md) · [Architecture](architecture.md) · [Sources](sources.md) · [Configuration catalog](../../../catalog/configurations.json)
