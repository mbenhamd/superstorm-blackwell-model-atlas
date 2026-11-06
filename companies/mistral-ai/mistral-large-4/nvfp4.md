# Mistral Large 4 NVFP4: B300 serving dossier (vLLM and SGLang under KServe)

**Scope and recheck time.** Artifact `mistralai/Mistral-Large-4-1T-A52B-NVFP4` at `bb6d00fe249b0e876f0cffc6b85014be02de3e68` (official Mistral export; FP8 base `mistralai/Mistral-Large-4-1T-A52B` at `af26e7869af601441d5cdf75a1272469ddc3d059`). All engine, registry and Hub identities below were re-fetched on 2026-11-06 between 12:45 and 12:55 UTC. Target: one 8×B300 (SM103) node; KServe is the deployment layer, installed version, resource kind and runtime integration unknown. **Nothing on this page is a measured serving result.** Engine-reported numbers are attributed to their engine, hardware and checkpoint revision; atlas calculations are labelled.

Evidence labels used below: **[card]** publisher model card; **[recipe]** vLLM recipe; **[cookbook]** SGLang cookbook command matrix; **[source]** engine source inspection at a named commit; **[atlas]** atlas derivation or deployment choice.

## 1. Artifact identity and model card

| Check (2026-11-06T12:45Z) | Result | Source |
| --- | --- | --- |
| NVFP4 Hub head | `bb6d00fe…` = pin; last modified 2026-10-29T16:46:50Z | [mistral-large-4-NVFP4-API](https://huggingface.co/api/models/mistralai/Mistral-Large-4-1T-A52B-NVFP4/revision/main) |
| NVFP4 history | `d5fdac87…` "Initial release" (2026-10-29T14:11:17Z) → `bb6d00fe…` "Add FP8 vs NVFP4 evaluation comparison to the model card" (16:46:50Z); no later commit | [mistral-large-4-NVFP4-COMMITS](https://huggingface.co/api/models/mistralai/Mistral-Large-4-1T-A52B-NVFP4/commits/main) |
| Base Hub head | `af26e786…` = pin; last modified 2026-11-02T18:30:59Z | [mistral-large-4-API](https://huggingface.co/api/models/mistralai/Mistral-Large-4-1T-A52B/revision/main) |
| Local NVFP4 card copy | [huggingface/additional/…NVFP4/README.md](huggingface/additional/mistralai--Mistral-Large-4-1T-A52B-NVFP4/README.md): SHA-256 `25f7c255ebe5f63931061886bdce29d524e0ab505ac13500fd01e2e644c615d8`, 7,791 bytes, byte-identical to the raw README at `bb6d00fe` | [mistral-large-4-NVFP4-CARD](https://huggingface.co/mistralai/Mistral-Large-4-1T-A52B-NVFP4/raw/bb6d00fe249b0e876f0cffc6b85014be02de3e68/README.md) |
| Local base card copy | [huggingface/README.md](huggingface/README.md): SHA-256 `498bf4121e75f5582ee276f8ad6c6d96eea78885c878819dd1551c2dd84dc92c`, 19,174 bytes, byte-identical to the raw README at `af26e786` | [mistral-large-4-CARD](https://huggingface.co/mistralai/Mistral-Large-4-1T-A52B/raw/af26e7869af601441d5cdf75a1272469ddc3d059/README.md) |
| Repository contents at pin | 44 files, 610,105,677,691 bytes: 32 `consolidated-*.safetensors`, index, `params.json`, `tekken.json`, `tokenizer.json`, `tokenizer_config.json`, `chat_template.jinja`, `generation_config.json`, `processor_config.json`, LICENSE, card, evaluation PNG. **No `config.json`.** | [mistral-large-4-NVFP4-TREE](https://huggingface.co/api/models/mistralai/Mistral-Large-4-1T-A52B-NVFP4/tree/bb6d00fe249b0e876f0cffc6b85014be02de3e68?recursive=true) |
| Index and headers | `total_size` 610,030,457,408 bytes; 32 header range reads re-run: 11,793,648 header bytes, aggregate header hash `13048429…` identical to the registered census | [mistral-large-4-NVFP4-INDEX](https://huggingface.co/mistralai/Mistral-Large-4-1T-A52B-NVFP4/resolve/bb6d00fe249b0e876f0cffc6b85014be02de3e68/consolidated.safetensors.index.json) [mistral-large-4-NVFP4-HEADERS](https://huggingface.co/mistralai/Mistral-Large-4-1T-A52B-NVFP4/tree/bb6d00fe249b0e876f0cffc6b85014be02de3e68) |

The card's evaluation image is referenced by an intermediate commit (`3d843073…`); its bytes (SHA-256 `96832fb0…`) equal the LFS object of `images/fp8-vs-nvfp4-evaluations.png` in the pinned tree. [mistral-large-4-NVFP4-EVAL-IMG](https://huggingface.co/mistralai/Mistral-Large-4-1T-A52B-NVFP4/resolve/3d843073c9987de83d1f94a73a3184da8cf0dba2/images/fp8-vs-nvfp4-evaluations.png)

## 2. Precision contract and how each engine loads it

`params.json` carries `quantization_config = {quant_method: "modelopt", quant_algo: "MIXED_PRECISION", group_size: 16, ignore: [], quantized_layers: {…}}` with 475 entries: 71 `NVFP4` (group 16) routed-expert groups and 404 `FP8_PB_WO` linears (72 × `wq`, `wo`; 44 × indexer `wq_b`; shared-expert and layer-0 dense `w1/w2/w3`). Everything not listed stays BF16. [mistral-large-4-NVFP4-PARAMS](https://huggingface.co/mistralai/Mistral-Large-4-1T-A52B-NVFP4/raw/bb6d00fe249b0e876f0cffc6b85014be02de3e68/params.json)

| Tensor group (header census) | Serialized form | Bytes | vLLM (PR #64534 / image) | SGLang (PR #47271 / image) |
| --- | --- | ---: | --- | --- |
| Routed experts, 71 × 128 × `w1/w2/w3` | U8-packed FP4 E2M1, FP8 E4M3 scale per 16 values, F32 `weight_scale_2` and `input_scale` per matrix | 578,914,615,296 | `ModelOptNvFp4FusedMoE`; W4A4 (`kNvfp4Static` weight, dynamic FP4 activations using the static global input scale) | `ModelOptNvFp4FusedMoEMethod` |
| Shared experts (71) + layer-0 dense FFN | FP8 E4M3, F32 128×128 block scales (`FP8_PB_WO`) | 8,495,539,200 | `FP8_PB_WO` → `kFp8Static128BlockSym` weight + `kFp8Dynamic128Sym` (1×128 dynamic) activation: W8A8 | `Fp8LinearMethod` with `weight_block_size [128,128]`, `activation_scheme dynamic` |
| Attention `wq`, `wo` (FP8_PB_WO) and `wkv_b` (BF16) | FP8 + block scales; BF16 | 8,230,993,920 | as above; `wkv_b` unquantized | as above; `wkv_b` unquantized |
| Indexer `wq_b` (FP8_PB_WO), `wk`, `weights_proj`, norms (BF16) | FP8 + scales; BF16 | 1,195,183,616 | `wq_b` block FP8; `wk`/`weights_proj` unquantized | same algo mapping |
| Embedding + output head | BF16 | 5,033,164,800 | unquantized | unquantized |
| Vision encoder, adapter, patch merger | BF16 | 3,408,437,248 | unquantized | unquantized |
| Router gates, norms, `wkv_a_with_mqa`, SSMax, `lerope` | BF16 | 552,367,168 | unquantized | unquantized |
| Embedded DSpark draft (`mtp_dspark.*`) | BF16 | 4,199,938,048 | not listed in `quantized_layers` → unquantized | unquantized |
| **Total** | | **610,030,457,408** | | |

Detection: both engines resolve this export to the `modelopt_mixed` quantization method without a `--quantization` flag. vLLM's `ModelOptMixedPrecisionConfig.override_quantization_method` returns `modelopt_mixed` for `MIXED_PRECISION`; SGLang's `_parse_quant_hf_config` returns `modelopt_mixed` when any `quantized_layers` entry is NVFP4. The vLLM PR's Mistral config converter passes a `params.json` `quantization_config` through unchanged and maps a DSA `params.json` to `MistralLarge4ForCausalLM` (Pixtral wrapper when vision is present); SGLang's PR converter does the same and adds `kv_cache_quant_algo: None` so the loader does not look for an `hf_quant_config.json`. [mistral-large-4-VLLM-PR-MODELOPT](https://raw.githubusercontent.com/vllm-project/vllm/28a4495de85c64050b3aad39e946d02791710579/vllm/model_executor/layers/quantization/modelopt.py) [mistral-large-4-VLLM-PR-CFG](https://raw.githubusercontent.com/vllm-project/vllm/28a4495de85c64050b3aad39e946d02791710579/vllm/transformers_utils/configs/mistral.py) [mistral-large-4-SGL-PR-MODEL-CONFIG](https://raw.githubusercontent.com/sgl-project/sglang/eb80b0b66de7d5dda991758a71d8579ae0700526/python/sglang/srt/configs/model_config.py) [mistral-large-4-SGL-PR-MISTRAL-UTILS](https://raw.githubusercontent.com/sgl-project/sglang/eb80b0b66de7d5dda991758a71d8579ae0700526/python/sglang/srt/hf_transformers/mistral_utils.py) [mistral-large-4-SGL-PR-MODELOPT](https://raw.githubusercontent.com/sgl-project/sglang/eb80b0b66de7d5dda991758a71d8579ae0700526/python/sglang/srt/layers/quantization/modelopt_quant.py)

What this resolves and what it does not: the FP8_PB_WO tensors run as **W8A8 with dynamic 1×128 activation quantization in both engines** (source mapping), not as weight-only FP8. Whether the FP8 bytes equal the FP8 export's bytes was not checked (no payload download). The draft is BF16 against an NVFP4/FP8 target in both official checkpoints; the card says the NVFP4 repository "ships the same DSpark draft head as the FP8 model" (publisher claim; header dtypes and shapes match, bytes not compared).

## 3. Support at the stable releases and where it actually lives

| | vLLM | SGLang |
| --- | --- | --- |
| Latest stable | v0.33.0, `4ba787ec9959e566d3b587a796dff07673324da5` | v0.5.23, `297e54fd105e974cdf401e5b4d20253a22c16f90` |
| Model class in stable | **Absent**: `registry.py` has no `MistralLarge4*` entry | **Absent**: no `models/mistral_large_4.py`, no `models/dspark_mla.py` |
| `modelopt_mixed` quantization in stable | **Present** (`modelopt.py` at `4ba787ec`: `ModelOptMixedPrecisionConfig`, `FP8_PB_WO`, NVFP4) | **Present** (`modelopt_quant.py`, `quantization/__init__.py`, `model_config.py` at `297e54f`) |
| Mistral DSA config remap in stable | Absent: v0.33.0 `configs/mistral.py` has no DSA branch | Absent |
| Where support lives | Draft PR #64534, branch `mistral-large-4`, head `28a4495de85c64050b3aad39e946d02791710579` (unchanged since 2026-11-04T19:43Z; draft, not merged, 2 commits, 170 files; "not meant to be merged as is") | Open PR #47271, branch `new-model-support`, head `eb80b0b66de7d5dda991758a71d8579ae0700526` at 12:45Z (was `1fd8f59c` at 10:02Z; not merged, 17 commits, 83 files) |
| Model files in the PR | `vllm/models/mistral/mistral_large4/nvidia/model.py`, `…/nvidia/dspark.py`, `vllm/models/mistral/nvidia/{attention,indexer,moe,mlp}.py`; registry adds `MistralLarge4ForCausalLM`, `MistralLarge4DSparkModel` | `python/sglang/srt/models/mistral_large_4.py`, `python/sglang/srt/models/dspark_mla.py`; DeepSeek-family override list adds `MistralLarge4ForCausalLM` |
| Release image | None. Recipe `min_vllm_version: "0.34.0"` and "no vLLM release or nightly wheel includes it yet" | None |
| Non-release image (by digest) | `vllm/vllm-openai@sha256:83a52c97e78b284d031e98135f17a448789358be31aa246237d6ad0130ef7657` (index; amd64 `sha256:13bc2adaca593fddfa8f88e41f7cea53582d46d169d63bd86e1477157575fa52`); tag last pushed 2026-10-29T14:27:23Z, unchanged at 12:45Z | `lmsysorg/sglang@sha256:6c9e19a08f30ef8472f3c2ae2d01de99b452cf1fed77f720cd3b6fec61625770` (index; amd64 `sha256:bff7ea4d5feb5ef8f07e32e67d58d295a36bdcd65541f4c830bb18c66c3d249b`); tag last pushed 2026-10-29T13:56:51Z, unchanged at 12:45Z |

**Non-release status is explicit:** every launch command below needs one of the two digest-pinned development images. The engine commit, CUDA, FlashInfer, DeepGEMM and `mistral-common` versions inside the images were not inspected; the PR heads were pushed after the images, so the images are not shown to equal any PR head. The SGLang head movement from `1fd8f59c` to `eb80b0b6` is 188 commits, mostly a merge of upstream main; the PR-specific commits change Mistral tool-argument markers, thinking-part parity, reasoning grammar and continued content parts, and `mistral_large_4.py` differs from the `2cc2f0ef` copy only by one import path. [mistral-large-4-VLLM-PR64534](https://api.github.com/repos/vllm-project/vllm/pulls/64534) [mistral-large-4-VLLM-PR64534-FILES](https://api.github.com/repos/vllm-project/vllm/pulls/64534/files?per_page=100) [mistral-large-4-VLLM-PR64534-FILES-P2](https://api.github.com/repos/vllm-project/vllm/pulls/64534/files?per_page=100&page=2) [V033-REGISTRY](https://raw.githubusercontent.com/vllm-project/vllm/4ba787ec9959e566d3b587a796dff07673324da5/vllm/model_executor/models/registry.py) [mistral-large-4-VLLM-V033-MODELOPT](https://raw.githubusercontent.com/vllm-project/vllm/4ba787ec9959e566d3b587a796dff07673324da5/vllm/model_executor/layers/quantization/modelopt.py) [mistral-large-4-SGL-PR47271](https://api.github.com/repos/sgl-project/sglang/pulls/47271) [mistral-large-4-SGL-PR47271-FILES](https://api.github.com/repos/sgl-project/sglang/pulls/47271/files?per_page=100) [mistral-large-4-SGL-PR47271-COMPARE-EB80](https://api.github.com/repos/sgl-project/sglang/compare/1fd8f59c249034bf0239de2894b0659b21576925...eb80b0b66de7d5dda991758a71d8579ae0700526) [mistral-large-4-SGL-PR-MODEL-EB80](https://raw.githubusercontent.com/sgl-project/sglang/eb80b0b66de7d5dda991758a71d8579ae0700526/python/sglang/srt/models/mistral_large_4.py) [mistral-large-4-SGL-V0523-TREE](https://api.github.com/repos/sgl-project/sglang/git/trees/297e54fd105e974cdf401e5b4d20253a22c16f90?recursive=1) [mistral-large-4-SGL-V0523-MODELOPT](https://raw.githubusercontent.com/sgl-project/sglang/297e54fd105e974cdf401e5b4d20253a22c16f90/python/sglang/srt/layers/quantization/modelopt_quant.py) [mistral-large-4-SGL-V0523-QUANT-REGISTRY](https://raw.githubusercontent.com/sgl-project/sglang/297e54fd105e974cdf401e5b4d20253a22c16f90/python/sglang/srt/layers/quantization/__init__.py) [mistral-large-4-VLLM-IMAGE](https://hub.docker.com/v2/repositories/vllm/vllm-openai/tags/mistral-large-4) [mistral-large-4-SGL-IMAGE](https://hub.docker.com/v2/repositories/lmsysorg/sglang/tags/mistral-large-4)

## 4. Kernels selected on SM103 (source reading, not runtime observation)

SM103 is compute capability 10.3: vLLM's `is_device_capability_family(100)` and SGLang's `is_sm100_supported()` (major 10) both include it.

**vLLM (PR head `28a4495d`; the cited selection files are identical or have the same priority list at v0.33.0).**

- *Routed-expert MoE.* `select_nvfp4_moe_backend` (`fused_moe/oracle/nvfp4.py`, byte-identical at v0.33.0 and the PR head) tries `FLASHINFER_TRTLLM` first, then CuteDSL, CuteDSL-batched, FlashInfer CUTLASS, vLLM CUTLASS, Marlin. `TrtLlmNvFp4Experts*` require the SM100 family and FlashInfer's TRT-LLM fused MoE. The Mistral MoE module uses softmax scoring with `norm_topk_prob: True` (renormalized top-4), `n_group` 1, FP32 router logits; the monolithic TRT-LLM kernel (router + experts) accepts renormalize-type routing with FP32 logits and is preferred unless all-to-all EP or EPLB is active, in which case the modular TRT-LLM kernel is used. Expected log line: "Using 'FLASHINFER_TRTLLM' NvFp4 MoE backend out of potential backends: …". `--moe-backend`/`--kernel-config '{"moe_backend":…}'` overrides it; the recipe uses `flashinfer_moe_ep_cutedsl` (MegaMoE) only on EP prefill nodes in GB300 P/D presets.
- *FP8_PB_WO GEMMs.* CUDA priority for block-FP8 linears: `FlashInferFp8DeepGEMMDynamicBlockScaledKernel` (FlashInfer swap-AB for M < 32, DeepGEMM for M ≥ 32) → `DeepGemmFp8BlockScaledMMKernel` → `CutlassFp8BlockScaledMMKernel` → B12x → Marlin FP8 → Humming → Triton → torch. Which one passes its `is_supported`/`can_implement` gates depends on the FlashInfer and DeepGEMM builds inside the image; not observed.
- *Attention.* FlashMLA sparse with the DSA indexer and the `fp8_ds_mla` latent cache (recipe guide: default, no flag). The indexer (`wq_b`, `wk`, `weights_proj`) and `kv_a_proj_with_mqa` are `ReplicatedLinear`; `q_proj`, `kv_b_proj`, `o_proj`, embedding and head are TP-sharded.

[mistral-large-4-VLLM-V033-NVFP4-ORACLE](https://raw.githubusercontent.com/vllm-project/vllm/4ba787ec9959e566d3b587a796dff07673324da5/vllm/model_executor/layers/fused_moe/oracle/nvfp4.py) [mistral-large-4-VLLM-PR-NVFP4-ORACLE](https://raw.githubusercontent.com/vllm-project/vllm/28a4495de85c64050b3aad39e946d02791710579/vllm/model_executor/layers/fused_moe/oracle/nvfp4.py) [mistral-large-4-VLLM-PR-TRTLLM-NVFP4](https://raw.githubusercontent.com/vllm-project/vllm/28a4495de85c64050b3aad39e946d02791710579/vllm/model_executor/layers/fused_moe/experts/trtllm_nvfp4_moe.py) [mistral-large-4-VLLM-PR-NV-MOE](https://raw.githubusercontent.com/vllm-project/vllm/28a4495de85c64050b3aad39e946d02791710579/vllm/models/mistral/nvidia/moe.py) [mistral-large-4-VLLM-V033-LINEAR-KERNELS](https://raw.githubusercontent.com/vllm-project/vllm/4ba787ec9959e566d3b587a796dff07673324da5/vllm/model_executor/kernels/linear/__init__.py) [mistral-large-4-VLLM-PR-LINEAR-KERNELS](https://raw.githubusercontent.com/vllm-project/vllm/28a4495de85c64050b3aad39e946d02791710579/vllm/model_executor/kernels/linear/__init__.py) [mistral-large-4-VLLM-V033-SCALEDMM-FLASHINFER](https://raw.githubusercontent.com/vllm-project/vllm/4ba787ec9959e566d3b587a796dff07673324da5/vllm/model_executor/kernels/linear/scaled_mm/flashinfer.py) [mistral-large-4-VLLM-V033-SCALEDMM-DEEPGEMM](https://raw.githubusercontent.com/vllm-project/vllm/4ba787ec9959e566d3b587a796dff07673324da5/vllm/model_executor/kernels/linear/scaled_mm/deep_gemm.py) [mistral-large-4-VLLM-PR-NV-INDEXER](https://raw.githubusercontent.com/vllm-project/vllm/28a4495de85c64050b3aad39e946d02791710579/vllm/models/mistral/nvidia/indexer.py) [mistral-large-4-VLLM-PR-NV-ATTN](https://raw.githubusercontent.com/vllm-project/vllm/28a4495de85c64050b3aad39e946d02791710579/vllm/models/mistral/nvidia/attention.py)

**SGLang (PR head `eb80b0b6`).**

- *Routed-expert MoE.* `_deepseek_moe_quant_resolution` (`arg_groups/overrides.py`) covers `MistralLarge4ForCausalLM` and `PixtralForConditionalGeneration`; on SM100-family with `--moe-a2a-backend none`, `--moe-runner-backend auto` and quantization `modelopt_mixed`, it sets `moe_runner_backend = flashinfer_trtllm` (the log message reads "Use flashinfer_trtllm as MoE runner backend on sm100 for DeepseekV3ForCausalLM" for every architecture in that family). `ModelOptNvFp4FusedMoEMethod` then uses the FlashInfer TRT-LLM FP4 path. With DeepEP or MegaMoE A2A the resolution differs (`flashinfer_trtllm_routed`, CuteDSL or MegaMoE).
- *FP8_PB_WO GEMMs.* `Fp8LinearMethod` with 128×128 blocks; the FP8 GEMM runner (`--fp8-gemm-runner-backend auto`) resolution for this model on SM103 was not traced.
- *Attention.* The DeepSeek-family override forces the `dsa` attention backend for this model ("NoPE, SSMax or KV-sharing attention is implemented only by the dsa attention backend"), rejects other attention backends, and sets page size 64 × index pool on CUDA. KV defaults to FP8 E4M3 on Blackwell [cookbook].

[mistral-large-4-SGL-PR-OVERRIDES](https://raw.githubusercontent.com/sgl-project/sglang/eb80b0b66de7d5dda991758a71d8579ae0700526/python/sglang/srt/arg_groups/overrides.py) [mistral-large-4-SGL-PR-OV-DSV2](https://raw.githubusercontent.com/sgl-project/sglang/eb80b0b66de7d5dda991758a71d8579ae0700526/python/sglang/srt/arg_groups/model_overrides/deepseek_v2.py) [mistral-large-4-SGL-V0523-SM100](https://raw.githubusercontent.com/sgl-project/sglang/297e54fd105e974cdf401e5b4d20253a22c16f90/python/sglang/srt/utils/common.py) [mistral-large-4-SGL-PR-MODELOPT](https://raw.githubusercontent.com/sgl-project/sglang/eb80b0b66de7d5dda991758a71d8579ae0700526/python/sglang/srt/layers/quantization/modelopt_quant.py)

## 5. Memory: weights per GPU and KV room

**Weights per GPU [atlas calculation from the pinned headers].** Classification follows the vLLM PR layer types: routed and shared experts, dense FFN, `wq`/`wo`/`wkv_b`, embedding and head are divided by TP; indexer, router, `wkv_a_with_mqa`, norms and vision are counted whole on every rank (vision replication is an assumption). The draft is resident only when speculative decoding is enabled and is shown as a replicated upper bound.

| Layout | Even shard (index ÷ TP) | Target-only estimate | With DSpark draft (upper bound) | Engine statements |
| --- | ---: | ---: | ---: | --- |
| TP8 (1 replica) | 76.25 GB (71.02 GiB) | 80.24 GB (74.73 GiB) | 84.44 GB (78.64 GiB) | vLLM recipe "~76 GiB per GPU on 8 GPUs"; SGLang cookbook "about 73 GB" (a halving of its TP4 figure, not a TP8 measurement) |
| TP4 (each of 2 replicas) | 152.51 GB (142.03 GiB) | 155.32 GB (144.66 GiB) | 159.52 GB (148.57 GiB) | SGLang cookbook "145.8 GB measured at TP4" on GB300 |

The SGLang 145.8 figure matches the target-only TP4 estimate if its unit is GiB (unit not stated in the cookbook); read as decimal GB it would be below the even-shard payload. The vLLM ~76 GiB lies between the target-only and draft-inclusive estimates. Neither is a B300 measurement.

**KV bytes per token [atlas derivation from the pinned config; engine layout is a hypothesis].** 63 layers own a latent cache (72 minus the 9 layers that read layer 35). With `fp8_ds_mla`-style entries of 656 B (512 FP8 latent + 4 × F32 scales + 64 BF16 RoPE elements) and FP8 indexer keys of 132 B (128 FP8 + 4-byte scale) on 44 `full` indexer layers: 63 × 656 + 44 × 132 = **47,136 B/token per GPU**. Under plain TP the latent is replicated on every rank, so the figure does not shrink with TP width. BF16 latent: (54 × 576 + 9 × 512) × 2 + 5,808 = 77,232 B/token. Per sequence (FP8): 2.88 GiB at 65,536 tokens, 11.51 GiB at 262,144, 46.03 GiB at 1,048,576.

**KV room on B300 [atlas calculation; payload only].** Budget = 0.85 × 288 GB (advertised capacity convention) minus weights, before activations, CUDA graphs, workspaces and the draft's own KV:

| Layout | KV budget/GPU | FP8 KV tokens | Full-length 64K sequences | Full-length 256K sequences | Engine-reported comparison |
| --- | ---: | ---: | ---: | ---: | --- |
| TP8 target-only | 164.6 GB | ≈3.49M | ≈53 | ≈13 | vLLM recipe, 2×GB300 NVFP4 TP8, no spec: 3.60M tokens |
| TP8 + draft weights | 160.4 GB | ≈3.40M | ≈52 | ≈13 | — |
| TP4 target-only (per replica) | 89.5 GB | ≈1.90M | ≈29 | ≈7 | vLLM recipe, GB300 NVFP4 TP4 decode node, no spec: 1.96M tokens |
| TP4 + draft weights (per replica) | 85.3 GB | ≈1.81M | ≈28 | ≈7 | SGLang/vLLM: none published for B300 |

If the device exposes more than 288 decimal GB (the SGLang cookbook states 278 GiB for GB300), the budgets grow by ≈9 GB per GPU. The derived token counts land within ≈3–4% of the GB300 engine figures, which supports the per-token model; they are not B300 measurements. Two TP4 replicas give ≈3.8M tokens per node in total but no single request can use more than its replica's ≈1.9M. [mistral-large-4-VLLM-RECIPE](https://raw.githubusercontent.com/vllm-project/vllm/6c15c6cc5380b7d2d6052144f96889bf6c5d2e7c/recipes/models/mistralai/Mistral-Large-4-1T-A52B.yaml) [mistral-large-4-SGL-CONFIG-SRC](https://raw.githubusercontent.com/sgl-project/sglang/80eedfaf2fb34e392eaacdbb78a7cff92d6b647d/docs/src/snippets/configs/mistralai/mistral-large-4.jsx) [HW](https://docs.nvidia.com/dgx/dgxb300-user-guide/introduction-to-dgxb300.html)

## 6. Launch commands

The model argument can be the Hub ID with `--revision` (as written) or, under KServe, a pre-staged immutable snapshot of `bb6d00fe` mounted at `/mnt/models` (then drop `--revision`). `--served-model-name`, `--host` and `--port 8000` are [atlas] choices aligned with KServe's default port and probes. No `--quantization` flag: both engines auto-detect `modelopt_mixed`; confirm it in the startup log.

### vLLM, first B300 candidate: NVFP4 TP8, one replica (catalog `mistral-large-4.nvfp4.vllm.tp8`)

```bash
# image: vllm/vllm-openai@sha256:83a52c97e78b284d031e98135f17a448789358be31aa246237d6ad0130ef7657
export VLLM_ENGINE_READY_TIMEOUT_S=6000
vllm serve mistralai/Mistral-Large-4-1T-A52B-NVFP4 \
  --revision bb6d00fe249b0e876f0cffc6b85014be02de3e68 \
  --tensor-parallel-size 8 \
  --tokenizer-mode mistral --config-format mistral --load-format mistral \
  --max-model-len 65536 \
  --max-num-batched-tokens 8192 --max-num-seqs 128 \
  --gpu-memory-utilization 0.85 \
  --kv-cache-dtype fp8_ds_mla \
  --tool-call-parser mistral --reasoning-parser mistral --enable-auto-tool-choice \
  --served-model-name mistral-large-4-nvfp4 --host 0.0.0.0 --port 8000
# Step 2, same image and layout, add:
#   --speculative-config '{"method":"dspark","num_speculative_tokens":3}'
```

| Flag or setting | Origin |
| --- | --- |
| `VLLM_ENGINE_READY_TIMEOUT_S=6000` | [recipe] `base_env`: cold starts of 1,300–1,800 s (weight load, DeepGEMM warmup, CUDA-graph capture) |
| `--revision` | [atlas] pin |
| `--tensor-parallel-size 8` | [card]; [recipe] B300 validated layout |
| `--tokenizer-mode/--config-format/--load-format mistral` | [recipe]; the repository has no `config.json` |
| `--max-model-len 65536` | [atlas] cap for first qualification; [recipe] validated up to 262,144 |
| `--max-num-batched-tokens 8192`, `--max-num-seqs 128` | [recipe] "every validated run used these" |
| `--gpu-memory-utilization 0.85` | [card]; [recipe] |
| `--kv-cache-dtype fp8_ds_mla` | [card] "needed for this checkpoint"; [recipe] default |
| Parsers and `--enable-auto-tool-choice` | [card]; [recipe] |
| `--served-model-name`, `--host`, `--port 8000` | [atlas], aligned with KServe defaults |
| DSpark `num_speculative_tokens: 3` | [card]; [recipe] (depth fixed by checkpoint); `"draft_sample_method":"probabilistic"` only for sampled serving at T ≥ 1 without top-p [recipe] |

Not set, by evidence: EP (no colocated B300 EP validation), CUDA-graph flags (recipe: model runner V2 with breakable CUDA graphs by default), chat template (with `--tokenizer-mode mistral` the prompt is rendered by `mistral-common` from `tekken.json`; `mistral_common[image] ≥ 1.13.0` is in the image per recipe), `--language-model-only` (only for text-only serving or PCP). `--gpu-memory-utilization 0.85` was re-verified on 2026-11-06T12:48Z: the recipe YAML at current vLLM main `f358f057` is byte-identical to the registered `6c15c6cc` copy (SHA-256 `f2a4c370…`), last changed by #64792 on 2026-10-31. [mistral-large-4-VLLM-RECIPE-COMMITS](https://api.github.com/repos/vllm-project/vllm/commits?path=recipes/models/mistralai/Mistral-Large-4-1T-A52B.yaml&per_page=10)

### vLLM alternative: NVFP4 TP4 × 2 replicas (catalog `mistral-large-4.nvfp4.vllm.tp4`)

Same arguments with `--tensor-parallel-size 4`, one engine per 4-GPU group. Evidence: the recipe validates NVFP4 TP4 on one 4-GPU GB300 tray and as the TP4 decode side of GB300 P/D presets, and documents two TP4 replicas per 8-GPU node only for AMD (second container on GPUs 4–7). **No B300 TP4 run is published.** At `--max-num-seqs 128` the ≈1.9M-token pool admits ≈29 concurrent 64K-token histories; the scheduler preempts or queues beyond that.

### SGLang, first B300 NVFP4 candidate: TP8, one replica (catalog `mistral-large-4.nvfp4.sglang.tp8`)

```bash
# image: lmsysorg/sglang@sha256:6c9e19a08f30ef8472f3c2ae2d01de99b452cf1fed77f720cd3b6fec61625770
sglang serve \
  --model-path mistralai/Mistral-Large-4-1T-A52B-NVFP4 \
  --revision bb6d00fe249b0e876f0cffc6b85014be02de3e68 \
  --tp-size 8 \
  --mem-fraction-static 0.85 \
  --context-length 65536 \
  --reasoning-parser auto --tool-call-parser auto \
  --served-model-name mistral-large-4-nvfp4 --host 0.0.0.0 --port 8000
# Step 2 (cookbook B300 NVFP4 low-latency cell, also unverified), add:
#   --speculative-algorithm DSPARK --max-running-requests 64
```

| Flag | Origin |
| --- | --- |
| `--tp-size 8` | [cookbook] B300 NVFP4 cell, "Not yet verified … derived from the verified recipes" |
| `--mem-fraction-static 0.85` | [cookbook]; [card] |
| `--context-length 65536` | [atlas] cap; [cookbook] leaves it unset (native 1,048,576) |
| `--reasoning-parser auto --tool-call-parser auto` | [cookbook]; [card]; both resolve to `mistral` |
| `--revision`, `--served-model-name`, `--host`, `--port 8000` | [atlas] |
| `--speculative-algorithm DSPARK --max-running-requests 64` | [cookbook] low-latency cell; keep `--max-running-requests` ≤ 48 for long-context traffic [cookbook] |

The SGLang matrix offers only TP8 for NVFP4 on B300 and hides the TP4 option for B300 ("The TP4 command on 4× B300 has not been validated here"). Tokenizer: by default SGLang tokenizes with `tokenizer.json` and renders `chat_template.jinja`, stated as token-identical to `mistral-common` for chat prompts; `--tokenizer-mode mistral` switches to `mistral-common` [cookbook]. Do not pass `--speculative-draft-model-path` or draft-length flags; do not pass `--enable-kv-cache-sharding` (rejected); KV dtype default is FP8 E4M3, `--kv-cache-dtype bfloat16` is the quality control [cookbook]. No environment variables are set by the B300/GB300 cells (the Vera Rubin cells set three).

### SGLang alternative: publisher card command, TP4 × 2 replicas (catalog `mistral-large-4.nvfp4.sglang.tp4`)

```bash
sglang serve \
  --model-path mistralai/Mistral-Large-4-1T-A52B-NVFP4 \
  --revision bb6d00fe249b0e876f0cffc6b85014be02de3e68 \
  --tp-size 4 \
  --mem-fraction-static 0.85 \
  --speculative-algorithm DSPARK \
  --max-running-requests 64 \
  --reasoning-parser auto --tool-call-parser auto \
  --context-length 65536 \
  --served-model-name mistral-large-4-nvfp4 --host 0.0.0.0 --port 8000
```

| Flag | Origin |
| --- | --- |
| `--tp-size 4` | [card] "example tensor-parallel size for a Blackwell node; adjust to your topology" |
| `--mem-fraction-static 0.85`, `--max-running-requests 64` | [card]; without the flag SGLang falls back to 48 with DSpark |
| `--speculative-algorithm DSPARK` | [card]; [atlas] drop it for the target-only first run |
| Parsers `auto` | [card] |
| `--context-length 65536`, `--revision`, `--served-model-name`, `--host`, `--port 8000` | [atlas]; the card uses port 30000 |

This equals the cookbook's GB300 NVFP4 low-latency cell, which is verified on 4×GB300 (and its high-throughput sibling on one Vera Rubin tray), not on B300.

## 7. Speculative decoding (DSpark) with the NVFP4 target

| Property | Value | Evidence |
| --- | --- | --- |
| Draft artifact | Embedded `mtp_dspark.*` in the same snapshot: 3 MLA layers, RNN autoregressive head, Markov rank 512, sliding window 2,048, target activations from layers 1/18/36/54/71 | `params.json` `mtp` block; header census |
| Draft precision vs target | BF16 draft (4.20 GB) against NVFP4 experts / FP8 linears: **does not match**; no quantized draft is published. vLLM builds the draft with `get_draft_quant_config`, and the unlisted `mtp_dspark` layers resolve to unquantized | [source] [mistral-large-4-VLLM-PR-NV-DSPARK](https://raw.githubusercontent.com/vllm-project/vllm/28a4495de85c64050b3aad39e946d02791710579/vllm/models/mistral/mistral_large4/nvidia/dspark.py) |
| Pairing risk | None across revisions: target and draft are one snapshot; disabling DSpark does not remove the draft from the download | — |
| vLLM flag | `--speculative-config '{"method":"dspark","num_speculative_tokens":3}'` | [card][recipe] |
| SGLang flag | `--speculative-algorithm DSPARK`; 3 drafted tokens, 4-token verify; default `--max-running-requests` 48 | [card][cookbook] |
| Engine-reported acceptance | SGLang 4×GB300 NVFP4 TP4: 3.69 accepted tokens per 4-token verify (bonus included; random 1,024-token prompts); vLLM GB300 NVFP4 `4359ec6`: AL ~2.98/2.85/2.79 at 8k/32k/60k real-text P/D | not B300; not comparable counting rules |
| Capacity cost | vLLM: draft per-block admission bound ≈0.69× plain DCP8 capacity at 64k; DSpark not supported on a DCP decode node in P/D | [recipe] |

## 8. What is verified, by whom, where

| Claim | Who | Hardware | Engine build | Checkpoint |
| --- | --- | --- | --- | --- |
| NVFP4 TP8 colocated serves; "validated" | vLLM recipe authors | 8×B300 listed (prerequisites text); measured tables are GB300/B200 | `vllm/vllm-openai:mistral-large-4` | runs cite NVFP4 revision `4359ec6`, not resolvable on the public repo |
| NVFP4 TP4 verified | SGLang cookbook | 4×GB300; one Vera Rubin tray (BF16 KV) | `lmsysorg/sglang:mistral-large-4` | not stated |
| NVFP4 TP8 on B300 | SGLang cookbook | **"Not yet verified"** | same | — |
| NVFP4 TP4 on B300 | nobody | — | — | — |
| FP8 vs NVFP4 quality parity | Mistral (card figure) | not stated | not stated | not stated |
| Anything on this node | atlas | — | — | **nothing executed** |

## 9. Quality evidence for the NVFP4 export

**Publisher figure [card; scores read from the PNG].** FP8 → NVFP4: GDP.pdf 19.2 → 17.4; MathVision 90.3 → 90.0; Graphwalks 512k 74.8 → 76.0; DeepSWE 62.7 → 64.6; SWE-bench Pro 57.9 → 58.4; Terminal-Bench 4 34.9 → 32.8; AutomationBench 70.2 → 70.1; CyberGym 82.6 → 80.9. Mean completion tokens within ≈4% per task. Error bars overlap on every task, but the figure states neither hardware, engine, sample counts nor the error-bar definition; NVFP4 is lower on four of eight tasks. "No accuracy regressions" is therefore a publisher reading of overlapping intervals, not an equivalence test.

**Engine-reported [cookbook, recipe].** SGLang 4×GB300 NVFP4 TP4: GSM8K first 100 questions 98% (`low`), 97–98% (`high`); MMMU-Pro 72.43% (seed 1). SGLang one Vera Rubin tray NVFP4 TP4 BF16 KV: GSM8K 96.74%, MMLU 91.64%, MMMU-Pro 72.66% (3 seeds) versus the two-tray FP8 TP8 run 96.64%, 91.70%, 72.22%. vLLM GB300 NVFP4 TP8: GSM8K-200 0.970 (no spec) / 0.965 (DSpark). These are the closest NVFP4-vs-FP8 comparisons with stated engine and hardware; none is on B300.

## 10. Failure conditions and open issues

| Condition | Effect | Status / mitigation | Source |
| --- | --- | --- | --- |
| Stable engine images | `MistralLarge4ForCausalLM` unknown → load fails | Use the digest-pinned development images only | §3 |
| Mutable tags | Silent engine change | Pin `@sha256:` digests; record engine commit from inside the image at startup | §3 |
| Startup longer than probe/engine timeout | Pod killed during load/DeepGEMM warmup/graph capture | `VLLM_ENGINE_READY_TIMEOUT_S=6000`; KServe startup budget ≥ 6,000 s | [recipe] |
| Responses API with `--tokenizer-mode mistral` | `developer` role (#64793) and `input_text` (#64789) rejected | Open at 12:54Z; use Chat Completions | [mistral-large-4-VLLM-ISSUE64793](https://api.github.com/repos/vllm-project/vllm/issues/64793) [mistral-large-4-VLLM-ISSUE64789](https://api.github.com/repos/vllm-project/vllm/issues/64789) |
| DSA indexer on ragged speculative decode steps | Wrong indexer weights/causal bound → wrong top-k, silent quality loss | vLLM #64855 open; verified on ROCm only, CUDA path asserted from code reading; whether the Large 4 image's indexer path is affected was not checked. Compare DSpark-on vs off quality | [mistral-large-4-VLLM-ISSUE64855](https://api.github.com/repos/vllm-project/vllm/issues/64855) |
| HiSparse with default MNNVL all-reduce | `CUDA error: unspecified launch failure` | Only with HiSparse: `VLLM_FLASHINFER_ALLREDUCE_BACKEND=trtllm` | [recipe] |
| FlashInfer JIT/autotune on shared filesystems | SIGBUS | Private `FLASHINFER_WORKSPACE_BASE` or disable autotune | [recipe] |
| SGLang `reasoning_effort: "none"` | HTTP 400 | Client contract: `low`/`medium`/`high` | [cookbook] |
| SGLang `--enable-kv-cache-sharding`; PP without layer-35 partition | Rejected / wrong KV sharing | Do not pass; `*_PP_LAYER_PARTITION=35,37` for PP2 | [cookbook][recipe] |
| SGLang DCP with DSPARK | Requires `SGLANG_RAGGED_VERIFY_MODE=static` (PR override) | Only if DCP is used | [mistral-large-4-SGL-PR-OV-DSV2](https://raw.githubusercontent.com/sgl-project/sglang/eb80b0b66de7d5dda991758a71d8579ae0700526/python/sglang/srt/arg_groups/model_overrides/deepseek_v2.py) |
| Context > 262,144 | Unvalidated in vLLM; no validated maximum in SGLang | Cap context; qualify longer contexts separately | [recipe][cookbook] |
| NVFP4 recipe revision `4359ec6` | Engine measurements may not describe the public bytes | Treat engine NVFP4 numbers as indicative | precision.md |

## 11. KServe integration

| Item | TP8 (one replica) | TP4 × 2 |
| --- | --- | --- |
| GPUs per InferenceService | 8 (`nvidia.com/gpu: 8`) | Two services (or two replicas) of 4 GPUs each; both must land on the same 8-GPU node |
| Rollout on one node | `maxSurge: 0, maxUnavailable: 1`: interruption during replacement | Roll one replica at a time; capacity halves during rollout |
| Image | Digest from §3; never the tag | same |
| Command | vLLM template's default command is `vllm serve` | SGLang requires replacing the container `command` (the v0.21.0 LLM template launches vLLM); see [KServe architecture](../../../frameworks/kserve/ARCHITECTURE.md#what-the-supplied-sglang-manifest-needs-to-change) |
| Model storage | Immutable `bb6d00fe` snapshot (610,105,677,691 bytes incl. tokenizer files) on a PVC, mounted read-only at `/mnt/models`; avoid unpinned `hf://` | same snapshot shared read-only by both replicas |
| Startup probe | Budget ≥ 6,000 s to match `VLLM_ENGINE_READY_TIMEOUT_S` (recipe cold starts 1,300–1,800 s, hardware not itemized); SGLang B300 cold-start time not published, start with the same budget [atlas] | same per replica |
| Readiness / liveness | `GET /health` on 8000 after startup succeeds; liveness only after the startup probe passes. A 200 from `/health` does not prove warmup or correct generation; gate traffic on a generation smoke test in qualification | same |
| Shared memory | Card uses `--ipc=host`; in Kubernetes mount a memory-backed `emptyDir` at `/dev/shm` sized from the node's host RAM (consumes host memory) | per pod |
| OpenAI route | Engine serves `/v1/chat/completions`, `/v1/models` on port 8000 (`--port 8000` set for SGLang, whose default is 30000); the external path prefix depends on the unknown KServe resource kind and gateway | same; a router/endpoint picker across two replicas is required for one service name |
| Model name | `--served-model-name mistral-large-4-nvfp4` gives clients a stable ID independent of the mount path | same |

## 12. Side-by-side: vLLM vs SGLang for this export on 8×B300

| Dimension | vLLM (`mistral-large-4` image) | SGLang (`mistral-large-4` image) |
| --- | --- | --- |
| Release support | None (min 0.34.0); draft PR #64534 | None; open PR #47271 |
| B300 NVFP4 status | TP8 listed as validated, no B300 table | TP8 cell "Not yet verified"; TP4 hidden for B300 |
| Recommended first layout | TP8 | TP8 (cookbook) — publisher card shows TP4 |
| Quant method | `modelopt_mixed` (auto) | `modelopt_mixed` (auto) |
| MoE kernel on SM103 | FlashInfer TRT-LLM NVFP4, monolithic (router fused) under TP | FlashInfer TRT-LLM (`flashinfer_trtllm`) via DeepSeek-family override |
| FP8 linears | Block W8A8: FlashInfer/DeepGEMM → DeepGEMM → CUTLASS … | `Fp8LinearMethod` block 128×128; runner not traced |
| Attention | FlashMLA sparse + DSA indexer | `dsa` backend (forced) |
| KV dtype | `fp8_ds_mla` (explicit per card) | FP8 E4M3 default |
| Memory knob | `--gpu-memory-utilization 0.85` | `--mem-fraction-static 0.85` |
| Context validation | ≤ 262,144 | none stated |
| Batching | `--max-num-seqs 128`, `--max-num-batched-tokens 8192` | `--max-running-requests` 48 (DSpark default) / 64 |
| Parsers | `mistral` / `mistral` + auto tool choice | `auto` → `mistral` |
| Tokenizer path | `mistral-common` (`--tokenizer-mode mistral`) | `tokenizer.json` + `chat_template.jinja` by default |
| DSpark | `--speculative-config` dspark, 3 | `--speculative-algorithm DSPARK` |
| Long-context levers | DCP (`--decode-context-parallel-size`), PCP (text-only) | DCP (`--dcp-size`), prefill CP, HiSparse |
| Known open defects | Responses API (#64793, #64789); indexer ragged spec decode (#64855, ROCm-verified) | `reasoning_effort: none` → 400 (by design) |

Neither column is a measured comparison.

## 13. Qualification plan (proposed, not measured)

Run each step in the execution repository with the same snapshot, both digest-pinned images, and the KServe route; record the engine commit inside each image.

1. **Load and identity.** Startup log must show `modelopt_mixed`, the TRT-LLM NVFP4 MoE backend line, FP8 KV dtype, reported KV token capacity (compare with ≈3.4–3.5M at TP8 and ≈1.8–1.9M per TP4 replica), per-GPU weight memory (compare with §5), and cold-start time against the probe budget.
2. **Correctness, target-only (TP8 first).** Chat-template/token parity between engines on fixed prompts; tool calls (strict JSON schema), reasoning split and `reasoning_effort` low/medium/high; image input; GSM8K (full 1,319) and a long-context retrieval check at the 64K cap; NVFP4 vs FP8 on identical prompts (FP8 SGLang TP8 is the only verified B300 cell). Acceptance margins must be supplied by the user before any NVFP4 adoption decision.
3. **DSpark.** Greedy output equality on a fixed set (lossless claim), quality deltas vs target-only, natural acceptance length on the intended workload, KV capacity loss.
4. **Throughput and latency.** TP8 vs 2×TP4 per engine at equal offered load and context distribution: TTFT/TPOT p50/p99, output tok/s per node, KV utilization, preemptions/queueing, error rate; measured through the KServe route, with engine-pod measurements only to attribute route overhead. Controls in [benchmark decision criteria](../../../reports/optimization.md#benchmark-decisions-and-measurement-contract).

## 14. Open gaps and the evidence that would close them

| Gap | Evidence needed |
| --- | --- |
| Engine commit, CUDA, FlashInfer, DeepGEMM, `mistral-common` versions inside both images | Image manifest/config pull and in-container version dump |
| Actual SM103 kernels for block-FP8 linears (both engines) and SGLang FP8 GEMM runner | Startup logs on B300 |
| Per-GPU resident memory and KV capacity on B300 | Engine startup logs on the node |
| B300 NVFP4 TP4 viability in either engine; SGLang NVFP4 TP8 on B300 | A load + correctness run (step 1–2) |
| Whether vLLM #64855 affects the Large 4 CUDA indexer path in the image | Source inspection of the image's `sparse_attn_indexer.py` / spec-decode quality A/B |
| Whether NVFP4 FP8 tensors equal FP8 export bytes; whether the draft bytes are identical | Payload hashes of the relevant tensors |
| Publisher NVFP4 evaluation conditions | Mistral statement of hardware, engine, sample counts |
| Installed KServe version, resource kind, gateway path, node host RAM for `/dev/shm` | Cluster inventory |

[Serving decisions](serving.md) · [Precision](precision.md) · [Architecture](architecture.md) · [Sources](sources.md) · [Configuration catalog](../../../catalog/configurations.json)
