# Mistral Large 4: architecture

The head of `mistralai/Mistral-Large-4-1T-A52B` resolved to `af26e7869af601441d5cdf75a1272469ddc3d059` (last modified 2026-11-02T18:30:59Z) on 2026-11-06. The public history has five commits starting with "Initial release" `9bc535781e2938f0cc827614ba863070ccf44591` (2026-10-29T14:11:16Z); later commits change only README text and `assets/technical_report.pdf`. `config.json`, `params.json`, `generation_config.json`, LICENSE, chat template and the consolidated index are byte-identical at the initial-release commit and the pin, and all 54 weight-shard LFS object IDs are unchanged. [mistral-large-4-API](https://huggingface.co/api/models/mistralai/Mistral-Large-4-1T-A52B/revision/main) [mistral-large-4-COMMITS](https://huggingface.co/api/models/mistralai/Mistral-Large-4-1T-A52B/commits/main) [mistral-large-4-TREE](https://huggingface.co/api/models/mistralai/Mistral-Large-4-1T-A52B/tree/af26e7869af601441d5cdf75a1272469ddc3d059?recursive=true)

## Data flow

Text / Pixtral-style vision (30 layers) → patch-merge projector → layer 0 dense FFN, layers 1–71 MoE (128 routed, top-4, plus 1 shared) → each layer: MLA + DSA-style indexer (own or shared top-2048 selection) → output head with logit soft-cap 30 → Mistral tokenizer (tekken) reasoning/tool protocol. An embedded DSpark draft (3 dense MLA layers, Markov RNN head) reads target activations from layers 1, 18, 36, 54 and 71.

## How the parts work together

**Attention.** Every layer is `indexed_attention`: multi-head latent attention with 64 query heads, `kv_lora_rank` 512, and value dimension 128. Three of every four layers use RoPE with a 64-element rotary key (`wkv_a_with_mqa` output 576 = 512 latent + 64 RoPE); every fourth layer (indices 3, 7, …, 71) is NoPE, serialized with a 512-wide `wkv_a_with_mqa` and a wider `wkv_b` (16,384 rows = 64 heads × (128 key + 128 value)). This NoPE/RoPE split is established from tensor shapes in the safetensors headers, not from prose. [mistral-large-4-HEADERS](https://huggingface.co/mistralai/Mistral-Large-4-1T-A52B/tree/af26e7869af601441d5cdf75a1272469ddc3d059)

**Sparse selection.** A key indexer (32 heads, head dimension 128, top-k 2048, FP8 indexer flag in `params.json`) selects which cached tokens each query attends to. `indexer_types` marks 44 layers `full` and 28 layers `shared`; shared layers carry no indexer tensors and reuse an earlier selection. The engine docs call this "DSA sparse attention"; the atlas uses "DSA-style" because the exact equivalence to DeepSeek's DSA kernel contract is engine-asserted, not publisher-documented. [mistral-large-4-PARAMS](https://huggingface.co/mistralai/Mistral-Large-4-1T-A52B/raw/af26e7869af601441d5cdf75a1272469ddc3d059/params.json)

**Cross-layer KV sharing.** `kv_source_layers` maps layers 39, 43, 47, 51, 55, 59, 63, 67 and 71 to layer 35. These nine NoPE layers have no `wkv_a_with_mqa` or `kv_a_norm` tensors; they read layer 35's cache. Pipeline-parallel splits must keep layer 35 with its readers (both engines document `*_PP_LAYER_PARTITION=35,37` for two stages), and SGLang rejects `--enable-kv-cache-sharding` with this model. [mistral-large-4-SGL-COOKBOOK-SRC](https://raw.githubusercontent.com/sgl-project/sglang/80eedfaf2fb34e392eaacdbb78a7cff92d6b647d/docs/cookbook/autoregressive/Mistral/Mistral-Large-4.mdx) [mistral-large-4-VLLM-RECIPE](https://raw.githubusercontent.com/vllm-project/vllm/6c15c6cc5380b7d2d6052144f96889bf6c5d2e7c/recipes/models/mistralai/Mistral-Large-4-1T-A52B.yaml)

**Positional scheme.** YaRN with factor 2048 over a 512-position original window, `rope_theta` 10,000, `beta_fast` 32, `beta_slow` 1, `attention_factor` 1.0 (`params.json`: `apply_scale: false`), plus `ssmax_scaling` and `lerope` flags in `params.json` whose semantics are not documented in the card. 512 × 2048 = 1,048,576 = `max_position_embeddings`.

**MoE.** Layer 0 is dense (intermediate 24,576). Layers 1–71 have 128 routed SwiGLU experts of intermediate 6,144, top-4, one shared expert of the same width, `n_group` 1, `routed_scaling_factor` 1.0.

**Packaging.** The repository ships only the Mistral-native layout: 54 `consolidated-*.safetensors` shards, `params.json`, `tekken.json`. A Transformers `config.json` is present, but `transformers_weights` points to `consolidated.safetensors.index.json`; there is no second `model-*.safetensors` layout to double-count (unlike Medium 3.5). The NVFP4 repository has no `config.json` at all. [mistral-large-4-CFG](https://huggingface.co/mistralai/Mistral-Large-4-1T-A52B/raw/af26e7869af601441d5cdf75a1272469ddc3d059/config.json) [mistral-large-4-NVFP4-TREE](https://huggingface.co/api/models/mistralai/Mistral-Large-4-1T-A52B-NVFP4/tree/bb6d00fe249b0e876f0cffc6b85014be02de3e68?recursive=true)

## Configuration extraction

Selected, normalized projection of the pinned `config.json` (`text_config` unless noted). Not a byte-for-byte copy; layer indices are zero-based.

| Property | Value |
| --- | --- |
| architecture_class | MistralLarge4ForConditionalGeneration |
| model_type / text_model_type | mistral_large4 / mistral_large4_text |
| layers | 72 |
| hidden_size | 6144 |
| intermediate_size (dense layer 0) | 24576 |
| first_k_dense_replace | 1 |
| moe_intermediate_size | 6144 |
| n_routed_experts / num_experts_per_tok / n_shared_experts | 128 / 4 / 1 |
| n_group / topk_group / routed_scaling_factor | 1 / 1 / 1.0 |
| num_attention_heads / num_key_value_heads | 64 / 64 (MLA nominal; KV cache is the latent) |
| kv_lora_rank | 512 |
| q_lora_rank | null (`params.json`) |
| qk_nope_head_dim / qk_rope_head_dim / qk_head_dim / v_head_dim | 64 / 64 / 128 / 128 |
| head_dim | 64 (config.json); `params.json` states 128 — see note |
| index_n_heads / index_head_dim / index_topk | 32 / 128 / 2048 |
| indexer_types | 44 `full`, 28 `shared` (shared at 17–18, 21–22, …, 69–70) |
| no_rope_layers | every fourth layer NoPE (indices 3, 7, …, 71: 18 layers) |
| kv_source_layers | layers 39, 43, …, 71 → 35 (9 layers) |
| max_position_embeddings | 1048576 |
| vocab_size | 204800 |
| tie_word_embeddings | false |
| final_logit_softcapping | 30.0 |
| activation / rms_norm_eps | silu / 1e-05 |
| rope_type / factor / original_max_position_embeddings / rope_theta | yarn / 2048 / 512 / 10000.0 |
| beta_fast / beta_slow / attention_factor | 32 / 1 / 1.0 |
| vision_model_type / layers / hidden / heads / head_dim / intermediate | pixtral / 30 / 2048 / 16 / 128 / 6144 |
| vision_image_size / patch_size / spatial_merge_size | 1540 / 14 / 2 |
| quant_method / activation_scheme / weight_block_size | fp8 / dynamic / [128, 128] |
| excluded_quant_modules | model.vision_tower, model.multi_modal_projector, lm_head, kv_b_proj, indexer.wk, indexer.weights_proj, kv_a_proj_with_mqa |
| params.json quantization | fp8_e4m3 weights, BLOCK 128×128, dynamic BLOCK activations, `use_ue8m0_for_qscales: true` |
| params.json dsa flags | `fp8_indexer: true`, `fp8_kv_cache: true` |
| params.json mtp | 3 layers, depth 3, draft window 2048, target activation layers 1/18/36/54/71, DSpark Markov rank 512, RNN head |
| generation_config | temperature 1.0, top_p 0.95, do_sample true, max_length 1048576 |

**`head_dim` note.** `config.json` writes `head_dim: 64` and `qk_head_dim: 128`; `params.json` writes `head_dim: 128`. Header shapes (`wq` 8,192 = 64 heads × 128) agree with a 128-element query/key head in RoPE layers (64 NoPE + 64 RoPE). The 64 in `config.json` is a Transformers field convention, not a different model; do not size anything from it. [mistral-large-4-CFG](https://huggingface.co/mistralai/Mistral-Large-4-1T-A52B/raw/af26e7869af601441d5cdf75a1272469ddc3d059/config.json) [mistral-large-4-PARAMS](https://huggingface.co/mistralai/Mistral-Large-4-1T-A52B/raw/af26e7869af601441d5cdf75a1272469ddc3d059/params.json) [mistral-large-4-GENCFG](https://huggingface.co/mistralai/Mistral-Large-4-1T-A52B/raw/af26e7869af601441d5cdf75a1272469ddc3d059/generation_config.json)

## Parameter census

Derived from the 54 safetensors headers at the pin (element counts; F32 block-scale tensors excluded). The census counts serialized elements; it is not a unique-parameter audit.

| Component | Elements | Serialized dtype |
| --- | ---: | --- |
| Routed experts (71 × 128 × 3 × 6144 × 6144) | 1,029,181,538,304 | FP8 E4M3 |
| Shared experts (71) | 8,040,480,768 | FP8 E4M3 |
| Dense FFN (layer 0) | 452,984,832 | FP8 E4M3 |
| Attention (wq, wo FP8; wkv_a, wkv_b, norms BF16) | 7,957,946,880 | FP8 + BF16 |
| Indexer (wq_b FP8; wk, weights_proj BF16) | 1,151,104,768 | FP8 + BF16 |
| Router gates | 55,836,672 | BF16 |
| Token embedding / output head | 1,258,291,200 each | BF16 |
| Vision encoder + adapter + patch merger | 1,704,218,624 | BF16 |
| DSpark draft (`mtp_dspark.*`) | 2,099,969,024 | BF16 |
| Per-layer `attention_norm` and `ffn_norm` (72 × 2 × 6,144), final `norm`, `lerope.alpha` (32) | 890,912 | BF16 |
| **Total** | **1,053,161,553,184** | |

Without the draft: 1,051.06B; without draft and vision: 1,049.36B. The Mistral docs page states "1.05T total parameters, and a 1.6B vision encoder"; the census agrees with 1.05T. Derived active elements per token (text path): 4 × 71 routed experts (32,161,923,072) + shared + dense + attention + indexer + router + norms = 49,821,167,904; adding embedding and output head gives 52,337,750,304. This is consistent with the card's "49 billion active … (52 billion including embeddings and output layers)" (49.8B and 52.3B derived); the card does not state its counting rule (for example whether indexer and router parameters are included), so the 0.8B gap is unexplained rather than contradictory. [mistral-large-4-HEADERS](https://huggingface.co/mistralai/Mistral-Large-4-1T-A52B/tree/af26e7869af601441d5cdf75a1272469ddc3d059) [mistral-large-4-DOCS](https://docs.mistral.ai/models/mistral-large-4-0)

## Comparison with Mistral Medium 3.5

Values from each pinned `config.json`; Medium 3.5 values are from [mistral-medium-3.5-CFG](https://huggingface.co/mistralai/Mistral-Medium-3.5-128B/raw/22b2b868a15677cfa6061277ed2f653d1349a9ab/config.json) and are not copied into the Large 4 record.

| Field | Medium 3.5 (`22b2b868`) | Large 4 (`af26e786`) | Serving consequence |
| --- | --- | --- | --- |
| Architecture | Mistral3ForConditionalGeneration, dense | MistralLarge4ForConditionalGeneration, MoE | New model class; absent from all released engines |
| Layers / hidden | 88 / 12,288 | 72 / 6,144 | Narrower residual stream |
| FFN | dense 28,672 | layer 0 dense 24,576; 71 MoE layers, 128×6,144 top-4 + shared | Expert parallelism becomes an option; all-to-all or TP-MoE cost |
| Attention | GQA 96 q / 8 kv, head 128 | MLA, 64 heads, latent 512 + RoPE 64; NoPE every 4th | KV per token per layer 576 (or 512) elements vs 2,048 |
| Sparse attention | none (`sliding_window` null) | top-2048 indexer, 44 own / 28 shared | Decode attention cost bounded by 2,048 selected tokens; indexer keys add cache |
| KV sharing | none | 9 layers reuse layer 35 | 63 layers hold KV; PP partition constraint |
| Context | 262,144 (YaRN 64 × 4,096, θ 1e6) | 1,048,576 (YaRN 2048 × 512, θ 1e4) | vLLM recipe validated to 262,144; SGLang cookbook states no validated maximum |
| Vocabulary | 131,072 | 204,800 | Larger embedding/head (1.26B each) |
| Logit soft-cap | not set | 30.0 | Kernel/sampler must apply it |
| Vision | Pixtral 48 L, 1,664 hidden, head 104 | Pixtral-style 30 L, 2,048 hidden, head 128 | Different encoder; same 1,540 px, patch 14, merge 2 |
| Weight quantization | static per-tensor FP8, no blocks | dynamic FP8, 128×128 blocks, UE8M0 scales | Block-FP8 (DeepGEMM-class) kernels, not per-tensor |
| Serialized tensor bytes | 133,605,834,656 per layout (two layouts) | 1,060,548,427,328 (one layout) | 7.94× larger; FP8 fits only TP8 on 8×B300 |
| Speculative draft | separate EAGLE repo, 2 GQA layers | embedded DSpark, 3 MLA layers, BF16 | No target/draft revision pairing; draft memory always downloaded |
| Reasoning effort | none / high | low / medium / high (default high); `none` rejected by SGLang | Client contract changes |
| Tokenizer dependency | mistral_common ≥ 1.11.1 (card) | mistral_common[image] ≥ 1.13.0 (engine recipes) | Older images cannot load `tekken.json` |
| License | Modified MIT; US$20M monthly-revenue restriction | Ecosystem Open-Weight; MaaS commercial-license condition | Different commercial trigger; see [precision.md](precision.md#license-provenance) |

## Memory and performance consequences

Weights: 1,060,548,427,328 bytes = 1,060.55 GB = 987.71 GiB for FP8; 610,030,457,408 bytes = 610.03 GB = 568.14 GiB for NVFP4. Even sharding over eight GPUs gives 132.57 GB (123.46 GiB) and 76.25 GB (71.02 GiB) per GPU before replicated components (vision, possibly embeddings/head and draft depending on the engine), runtime buffers and KV. Engine documents report, each in its own unit, FP8 weights of ~128 GiB per GPU at TP8 (vLLM recipe) and about 129 GiB (SGLang command matrix), and NVFP4 weights of ~76 GiB per GPU at TP8 (vLLM recipe) and about 73 GB (SGLang, stated as half of the 145.8 GB measured at TP4 on GB300). The SGLang 73 GB figure is a halving, not a TP8 measurement, and falls below the even-shard payload of 76.25 GB before replicated components; the engine statements are therefore not like-for-like, and none is an atlas measurement. Against a nominal 288 GB per B300 [HW](https://docs.nvidia.com/dgx/dgxb300-user-guide/introduction-to-dgxb300.html), FP8 at TP4 (~265 GB/GPU of weights) is infeasible; NVFP4 at TP4 (~152.5 GB/GPU; SGLang reports 145.8 GB measured on GB300) is plausible. A component classification of the NVFP4 headers that counts the indexer, router, `wkv_a_with_mqa`, norms and vision on every rank (vLLM PR layer types) gives 80.24 GB (74.73 GiB) per GPU at TP8 and 155.32 GB (144.66 GiB) at TP4 without the draft; the SGLang 145.8 figure agrees with the latter if read as GiB. See [NVFP4 dossier](nvfp4.md#5-memory-weights-per-gpu-and-kv-room).

KV (derived; element payload only, per sequence, excluding paging, alignment, scales and engine overhead): with cross-layer sharing exploited, 54 RoPE layers × 576 + 9 NoPE source layers × 512 = 35,712 latent elements per token.

| Tokens per sequence | BF16 latent, sharing exploited | BF16, no sharing (72 × 576) | FP8 `fp8_ds_mla`-style 656 B/layer × 63 (hypothesis) | FP8 indexer keys, 44 × 132 B (hypothesis) |
| ---: | ---: | ---: | ---: | ---: |
| 32,768 | 2.18 GiB | 2.53 GiB | 1.26 GiB | 0.18 GiB |
| 131,072 | 8.72 GiB | 10.12 GiB | 5.04 GiB | 0.71 GiB |
| 262,144 | 17.44 GiB | 20.25 GiB | 10.09 GiB | 1.42 GiB |
| 1,048,576 | 69.75 GiB | 81.00 GiB | 40.36 GiB | 5.67 GiB |

Under plain TP every rank stores the full latent, so these figures are **per GPU**, not per node. By contrast, Medium 3.5's eight GQA KV heads shard to one head per rank at TP8 (45,056 BF16 bytes per token per rank vs 71,424 here). Large 4's smaller global KV therefore does not translate into more tokens per GPU unless decode context parallelism (DCP) or data-parallel attention is used. Cross-check: (0.85 × 288 GB − 132.57 GB) ≈ 112 GB per rank ÷ (41,328 + 5,808) B ≈ 2.38M tokens, consistent with the SGLang cookbook's "about 2.49M" FP8 KV tokens on 8×B300 and vLLM's 2.38M on GB300 FP8 TP8. This agreement supports the per-token model; it is not a local measurement. [mistral-large-4-SGL-COOKBOOK-SRC](https://raw.githubusercontent.com/sgl-project/sglang/80eedfaf2fb34e392eaacdbb78a7cff92d6b647d/docs/cookbook/autoregressive/Mistral/Mistral-Large-4.mdx) [mistral-large-4-VLLM-RECIPE](https://raw.githubusercontent.com/vllm-project/vllm/6c15c6cc5380b7d2d6052144f96889bf6c5d2e7c/recipes/models/mistralai/Mistral-Large-4-1T-A52B.yaml)

[Memory mathematics](../../../reports/memory-math.md) explains the formulas and their limits.

## What this report does not establish

Exact per-layer cache layout used by each engine for NoPE layers and indexer keys; the semantics of `ssmax_scaling` and `lerope`; runtime memory beyond the weight payload; architectural identity of the October preview; quality at 1M tokens. The technical report PDF (`assets/technical_report.pdf`, updated 2026-11-02) was listed but not reviewed in this pass.
