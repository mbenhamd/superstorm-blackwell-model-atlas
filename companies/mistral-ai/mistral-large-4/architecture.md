# Mistral Large 4: architecture

The head of `mistralai/Mistral-Large-4-1T-A52B` resolved to `af26e7869af601441d5cdf75a1272469ddc3d059` (last modified 2026-11-02T18:30:59Z) on 2026-11-06. The public history has five commits starting with "Initial release" `9bc535781e2938f0cc827614ba863070ccf44591` (2026-10-29T14:11:16Z); later commits change only README text and `assets/technical_report.pdf`. `config.json`, `params.json`, `generation_config.json`, LICENSE, chat template and the consolidated index are byte-identical at the initial-release commit and the pin, and all 54 weight-shard LFS object IDs are unchanged. [mistral-large-4-API](https://huggingface.co/api/models/mistralai/Mistral-Large-4-1T-A52B/revision/main) [mistral-large-4-COMMITS](https://huggingface.co/api/models/mistralai/Mistral-Large-4-1T-A52B/commits/main) [mistral-large-4-TREE](https://huggingface.co/api/models/mistralai/Mistral-Large-4-1T-A52B/tree/af26e7869af601441d5cdf75a1272469ddc3d059?recursive=true)

## Data flow

Text / Pixtral-style vision (30 layers) → patch-merge projector → layer 0 dense FFN, layers 1–71 MoE (128 routed, top-4, plus 1 shared) → each layer: MLA + DSA-style indexer (own or shared top-2048 selection) → output head with logit soft-cap 30 → Mistral tokenizer (tekken) reasoning/tool protocol. An embedded DSpark draft (3 dense MLA layers, Markov RNN head) reads target activations from layers 1, 18, 36, 54 and 71.

## How the parts work together

**Attention.** Every layer is `indexed_attention`: multi-head latent attention with 64 query heads, `kv_lora_rank` 512, and value dimension 128. Three of every four layers use RoPE with a 64-element rotary key (`wkv_a_with_mqa` output 576 = 512 latent + 64 RoPE); every fourth layer (indices 3, 7, …, 71) is NoPE, serialized with a 512-wide `wkv_a_with_mqa` and a wider `wkv_b` (16,384 rows = 64 heads × (128 key + 128 value)). This NoPE/RoPE split is established from tensor shapes in the safetensors headers, not from prose. [mistral-large-4-HEADERS](https://huggingface.co/mistralai/Mistral-Large-4-1T-A52B/tree/af26e7869af601441d5cdf75a1272469ddc3d059)

**Sparse selection.** A key indexer (32 heads, head dimension 128, top-k 2048, FP8 indexer flag in `params.json`) selects which cached tokens each query attends to. `indexer_types` marks 44 layers `full` and 28 layers `shared`; shared layers carry no indexer tensors and reuse an earlier selection. The engine docs call this "DSA sparse attention"; the atlas uses "DSA-style" because the exact equivalence to DeepSeek's DSA kernel contract is engine-asserted, not publisher-documented. [mistral-large-4-PARAMS](https://huggingface.co/mistralai/Mistral-Large-4-1T-A52B/raw/af26e7869af601441d5cdf75a1272469ddc3d059/params.json)

**Cross-layer KV sharing.** `kv_source_layers` maps layers 39, 43, 47, 51, 55, 59, 63, 67 and 71 to layer 35. These nine NoPE layers have no `wkv_a_with_mqa` or `kv_a_norm` tensors; they read layer 35's cache. Pipeline-parallel splits must keep layer 35 with its readers (both engines document `*_PP_LAYER_PARTITION=35,37` for two stages), and SGLang rejects `--enable-kv-cache-sharding` with this model. [mistral-large-4-SGL-COOKBOOK-SRC](https://raw.githubusercontent.com/sgl-project/sglang/80eedfaf2fb34e392eaacdbb78a7cff92d6b647d/docs/cookbook/autoregressive/Mistral/Mistral-Large-4.mdx) [mistral-large-4-VLLM-RECIPE](https://raw.githubusercontent.com/vllm-project/vllm/6c15c6cc5380b7d2d6052144f96889bf6c5d2e7c/recipes/models/mistralai/Mistral-Large-4-1T-A52B.yaml)

**Positional scheme.** The YaRN configuration extends a 512-token window by 2,048 to 1,048,576 positions, with θ = 10,000, β-fast = 32, β-slow = 1 and attention factor 1.0. In vLLM v0.34.0, scalable softmax multiplies each head’s query by `s × ln(position + 1) + b`. LeRoPE applies `exp(alpha)` to both the interpolated and extrapolated inverse rotary frequencies. The 32 learned coefficients are shared across layers, and the YaRN blending ramp uses the original frequencies. [Release query scaling](https://raw.githubusercontent.com/vllm-project/vllm/62d4bc3c7e33b1b6c906e233e6af2d3506c482ca/vllm/models/mistral/nvidia/ssmax.py) [Release rotary embedding](https://raw.githubusercontent.com/vllm-project/vllm/62d4bc3c7e33b1b6c906e233e6af2d3506c482ca/vllm/models/mistral/common/rope.py)

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
| Architecture | Mistral3ForConditionalGeneration, dense | MistralLarge4ForConditionalGeneration, MoE | vLLM v0.34.0 includes Large 4 via its Mistral-native/Pixtral path. SGLang v0.5.23 lacks the Large 4 model class |
| Layers / hidden | 88 / 12,288 | 72 / 6,144 | Narrower residual stream |
| FFN | dense 28,672 | layer 0 dense 24,576; 71 MoE layers, 128×6,144 top-4 + shared | Expert parallelism becomes an option; all-to-all or TP-MoE cost |
| Attention | GQA 96 q / 8 kv, head 128 | MLA, 64 heads, latent 512 + RoPE 64; NoPE every 4th | Logical latent widths 576 or 512 versus 2,048. The v0.34.0 Large 4 implementation pads NoPE owners to 576 |
| Sparse attention | none (`sliding_window` null) | top-2048 indexer, 44 own / 28 shared | Decode attention cost bounded by 2,048 selected tokens; indexer keys add cache |
| KV sharing | none | 9 layers reuse layer 35 | 63 layers hold KV; PP partition constraint |
| Context | 262,144 (YaRN 64 × 4,096, θ 1e6) | 1,048,576 (YaRN 2048 × 512, θ 1e4) | vLLM recipe validated to 262,144; SGLang cookbook states no validated maximum |
| Vocabulary | 131,072 | 204,800 | Larger embedding/head (1.26B each) |
| Logit soft-cap | not set | 30.0 | Kernel/sampler must apply it |
| Vision | Pixtral 48 L, 1,664 hidden, head 104 | Pixtral-style 30 L, 2,048 hidden, head 128 | Different encoder; same 1,540 px, patch 14, merge 2 |
| Weight quantization | static per-tensor FP8, no blocks | dynamic FP8, 128×128 blocks, UE8M0 scales | Block-FP8 (DeepGEMM-class) kernels, not per-tensor |
| Serialized tensor bytes | 133,605,834,656 per layout (two layouts) | 1,060,548,427,328 (one layout) | 7.94× larger; FP8 requires TP8 at the assumed 85% HBM limit |
| Speculative draft | separate EAGLE repo, 2 GQA layers | embedded DSpark, 3 MLA layers, BF16 | No target/draft revision pairing; draft memory always downloaded |
| Reasoning effort | none / high | low / medium / high (default high); `none` rejected by SGLang | Client contract changes |
| Tokenizer dependency | mistral_common ≥ 1.11.1 (card) | mistral_common[image] ≥ 1.13.0 (engine recipes) | Older images cannot load `tekken.json` |
| License | Modified MIT; US$20M monthly-revenue restriction | Ecosystem Open-Weight; MaaS commercial-license condition | Different commercial trigger; see [precision.md](precision.md#license-provenance) |

## Memory and performance consequences

Weights: 1,060,548,427,328 bytes = 1,060.55 GB = 987.71 GiB for FP8; 610,030,457,408 bytes = 610.03 GB = 568.14 GiB for NVFP4. Even sharding over eight GPUs gives 132.57 GB (123.46 GiB) and 76.25 GB (71.02 GiB) per GPU before replicated components (vision, possibly embeddings/head and draft depending on the engine), runtime buffers and KV. Engine documents report, each in its own unit, FP8 weights of ~128 GiB per GPU at TP8 (vLLM recipe) and about 129 GiB (SGLang command matrix), and NVFP4 weights of ~76 GiB per GPU at TP8 (vLLM recipe) and about 73 GB (SGLang, stated as half of the 145.8 GB measured at TP4 on GB300). The SGLang 73 GB figure is a halving, not a TP8 measurement, and falls below the even-shard payload of 76.25 GB before replicated components; the engine statements are therefore not like-for-like, and none is an atlas measurement. At the reference 85% fraction of 288 GB, the budget is 244.8 GB per rank. An even FP8 TP4 shard alone needs 265.14 GB, whereas the analogous NVFP4 TP4 shard needs 152.51 GB before replication and runtime allocations. [B300 reference](https://docs.nvidia.com/dgx/dgxb300-user-guide/introduction-to-dgxb300.html) A component classification of the NVFP4 headers that counts the indexer, router, `wkv_a_with_mqa`, norms and vision on every rank (vLLM PR layer types) gives 80.24 GB (74.73 GiB) per GPU at TP8 and 155.32 GB (144.66 GiB) at TP4 without the draft; the SGLang 145.8 figure agrees with the latter if read as GiB. See [NVFP4 dossier](nvfp4.md#5-memory-weights-per-gpu-and-kv-room).

**vLLM v0.34.0 cache payload.** The checkpoint’s projections imply 54 RoPE owners with 576 values and nine NoPE owners with 512, or 35,712 logical latent values per token. The release pads each NoPE owner with 64 zero RoPE values and reuses layer 35 for the nine readers. All 63 owners therefore store 576 positions per token. With BF16 latent entries this is 72,576 B per token per rank at ordinary TP. With sparse FlashMLA and `fp8_ds_mla`, the 656-byte row includes 512 FP8 values, four FP32 scales and 64 BF16 RoPE values, giving 41,328 B. Each of the 44 full indexers stores a replicated 128-byte FP8 key plus one four-byte scale, adding 5,808 B. Combined totals are **78,384 B for BF16 latent + FP8 indexer** and **47,136 B for FP8 latent + FP8 indexer**. [NoPE padding and sharing](https://raw.githubusercontent.com/vllm-project/vllm/62d4bc3c7e33b1b6c906e233e6af2d3506c482ca/vllm/models/mistral/nvidia/attention.py) [Indexer row layout](https://raw.githubusercontent.com/vllm-project/vllm/62d4bc3c7e33b1b6c906e233e6af2d3506c482ca/vllm/models/mistral/nvidia/indexer.py) [FlashMLA cache layout](https://raw.githubusercontent.com/vllm-project/vllm/62d4bc3c7e33b1b6c906e233e6af2d3506c482ca/vllm/v1/attention/backend.py) [Sparse FlashMLA backend](https://raw.githubusercontent.com/vllm-project/vllm/62d4bc3c7e33b1b6c906e233e6af2d3506c482ca/vllm/v1/attention/backends/mla/flashmla_sparse.py)

| Tokens per sequence | BF16 latent | FP8 latent | FP8 indexer | BF16 latent + indexer | FP8 latent + indexer |
| ---: | ---: | ---: | ---: | ---: | ---: |
| 32,768 | 2.21 GiB | 1.26 GiB | 0.18 GiB | 2.39 GiB | 1.44 GiB |
| 131,072 | 8.86 GiB | 5.04 GiB | 0.71 GiB | 9.57 GiB | 5.75 GiB |
| 262,144 | 17.72 GiB | 10.09 GiB | 1.42 GiB | 19.14 GiB | 11.51 GiB |
| 1,048,576 | 70.88 GiB | 40.36 GiB | 5.67 GiB | 76.55 GiB | 46.03 GiB |

At TP8, Medium 3.5 shards its eight GQA KV heads to one per rank (45,056 BF16 B/token). Large 4 replicates the latent and indexer rows in ordinary TP. For a sizing example, (0.85 × 288 GB − 132.57 GB of evenly sharded FP8 checkpoint payload) ÷ 47,136 B/token ≈ 2.38M aggregate tokens per rank. Replicated weights, paging, graph pools, other runtime allocations and the service context cap reduce availability. The historic SGLang figure was about 2.49M on B300 and the vLLM recipe reported 2.38M on GB300. Those configurations have different memory accounting. [Tagged vLLM recipe](https://raw.githubusercontent.com/vllm-project/vllm/62d4bc3c7e33b1b6c906e233e6af2d3506c482ca/recipes/models/mistralai/Mistral-Large-4-1T-A52B.yaml) [SGLang cookbook matrix](https://raw.githubusercontent.com/sgl-project/sglang/9fc0e2a6ba197f19f00165327adbb7c48cdf8281/docs/src/snippets/configs/mistralai/mistral-large-4.jsx)

[Memory mathematics](../../../reports/memory-math.md) explains the formulas and their limits.

## What this report does not establish

The SGLang development image’s physical cache layout, both engines’ resident memory and admitted sequences under KServe, and quality at 1M tokens still need measurement or exact-image inspection. The October preview’s architecture remains unknown. The technical report PDF (`assets/technical_report.pdf`, updated 2026-11-02) was listed but not reviewed in this pass.
