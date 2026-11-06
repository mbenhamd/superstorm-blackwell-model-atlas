# DeepSeek V4.1 Flash 1017: architecture

Report review: **2026-11-06 (UTC)**. Pinned revision `1bae0e1088993b9b82de08f59de5be5a34e42170` is current `main`. Its `config.json`, `inference/config.json`, `inference/model.py`, `encoding/` files, tokenizer files and `model.safetensors.index.json` are byte-identical to `deepseek-ai/DeepSeek-V4.1-Flash` at `314113f8a7dadb388215396ba5fbee2c610a04d6`; every one of the 48 weight shards has a different LFS object ID. The architecture below therefore applies to both V4.1 Flash releases, while weights, quality and any measured behavior do not transfer between them. [deepseek-v4.1-flash-1017-TREE](https://huggingface.co/api/models/deepseek-ai/DeepSeek-V4.1-Flash-1017/tree/1bae0e1088993b9b82de08f59de5be5a34e42170?recursive=true) [deepseek-v4.1-flash-1017-V41-TREE](https://huggingface.co/api/models/deepseek-ai/DeepSeek-V4.1-Flash/tree/314113f8a7dadb388215396ba5fbee2c610a04d6?recursive=true)

## Data flow

Image patches → 32-layer ViT → 3×3 unshuffle + two-layer aligner → visual embeddings; text tokens → embeddings (+ Engram n-gram lookups at layers 1 and 14) → four mHC streams → layers 0–19 (encoder; ratio-2 compressed KV from sources 2, 8, 14) → layer 20 writes the decoder's ratio-1 global KV and candidate pool → layers 20–39 (decoder) → head; DSpark stages read target-layer features 37–39 → five-token draft block with Markov and confidence heads → target verifies.

## How the parts work together

**Causal encoder-decoder (publisher claim + source consistency).** The V4.1 Flash card describes a 20-layer causal encoder followed by a 20-layer decoder whose global KV is projected from the final encoder hidden states, giving 8B activated parameters per token in prefill and 16B in decode. The reference implementation is consistent with that description: layer 20 is the only KV source for the twenty ratio-1 layers 20–39, and its compressor consumes the encoder output. Prefill savings require an engine that skips decoder computation for prompt positions outside the recent window (SGLang "decoder SWA bounded replay", vLLM `decoder_replay_layers`); the reference generator itself runs every layer. [deepseek-v4.1-flash-1017-V41-CARD](https://huggingface.co/deepseek-ai/DeepSeek-V4.1-Flash/blob/314113f8a7dadb388215396ba5fbee2c610a04d6/README.md) [deepseek-v4.1-flash-1017-INFER-SRC](https://huggingface.co/deepseek-ai/DeepSeek-V4.1-Flash-1017/blob/1bae0e1088993b9b82de08f59de5be5a34e42170/inference/model.py)

**Compressed Sparse Attention 2 (source inspected).** Every layer attends to a 128-token sliding window of its own FP8 KV. A nonzero `compress_ratios[i]` adds up to `index_topk = 512` compressed positions, but "compress_ratio > 0 does not mean the layer compresses its own KV: only kv_source_layers do, the rest read that same cache." Sources 2, 8 and 14 write ratio-2 latents shared forward through layer 19; source 20 writes ratio-1 latents read by layers 20–39. Index sources (2, 8, 14, 20, 24, 28, 32, 36) run their own indexer queries; the other compressed layers reuse the last published top-k. Layer 20 is also the candidate source: it keeps 2,048 blocks of 8 compressed positions, and later index layers score only inside that pool. Layers 0–1 and the three DSpark stages are window-only. The card names the three per-layer modes Full / Reindex / Reuse; the reference code expresses them as KV source, index source and reuse. [deepseek-v4.1-flash-1017-INFER-SRC](https://huggingface.co/deepseek-ai/DeepSeek-V4.1-Flash-1017/blob/1bae0e1088993b9b82de08f59de5be5a34e42170/inference/model.py) [deepseek-v4.1-flash-1017-CFG](https://huggingface.co/deepseek-ai/DeepSeek-V4.1-Flash-1017/raw/1bae0e1088993b9b82de08f59de5be5a34e42170/config.json)

**Single-pass mHC (source inspected).** The residual stream is four copies (`hc_mult=4`); each sublayer computes pre/post/combine coefficients from one projection of the flattened stream and makes the combine matrix doubly stochastic with 20 Sinkhorn iterations. The pre-mix a sublayer computes is consumed by the *next* sublayer, which is the reference form of the card's "Single-Pass mHC". The V4.1 card describes this as revised residual-stream mixing with a Mega-mHC kernel; kernels validated for V4 mHC are therefore not evidence for V4.1.

**Engram conditional memory (source inspected).** Layers 1 and 14 each hold an FP8 table (384,006,168 and 384,016,682 rows × 256, E8M0 scale per 32 values) indexed by hashed 2–4-gram windows over a compressed 99,092-entry token map, with 8 heads of dimension 256. Each lookup is projected to one key per mHC copy plus a shared value; a normalized stream–key dot product gates the write. Image-span tokens are masked out of n-gram hashing. The tables are sparse lookups, not active GEMM parameters, but they occupy about 183.1 GiB of serialized weights (188.8 GiB with scales). [deepseek-v4.1-flash-1017-ENGRAM-SRC](https://huggingface.co/deepseek-ai/DeepSeek-V4.1-Flash-1017/blob/1bae0e1088993b9b82de08f59de5be5a34e42170/inference/engram.py)

**Routing.** 384 routed experts, 6 active, one shared expert, `sqrtsoftplus` scores with `noaux_tc` bias, `routed_scaling_factor=1.5`, `swiglu_limit=10`. Every gate carries both `bias` and `bias_vl`; the reference applies `bias_vl` to image-span tokens. There are no hash-routed layers (0731 had three).

**Vision encoder (source inspected).** BF16 ViT: 32 layers, hidden 1,024, 16 heads, MLP 2,816 (fused w1 of 5,632 rows), patch 14, 2D RoPE (θ = 10,000), 3×3 pixel-unshuffle into a 9,216→5,120→5,120 aligner, at most 1,024 tokens per image, `min_pixels` 295,936 (544²). Learned `image_start`, `image_newline` and `image_end` embeddings delimit spans. The reference asserts that image spans are prefilled in one chunk. [deepseek-v4.1-flash-1017-VISION-SRC](https://huggingface.co/deepseek-ai/DeepSeek-V4.1-Flash-1017/blob/1bae0e1088993b9b82de08f59de5be5a34e42170/inference/vision.py)

**DSpark draft (source inspected).** Root `num_nextn_predict_layers=3` and inference `n_mtp_layers=3` agree (0731's root value 1 did not). Each stage is a window-only block with its own 128-expert / top-3 MoE; stage 0 projects the concatenated, stream-averaged *inputs* of target layers 37, 38 and 39 (zero-based; the reference comment says the head reads the attention input of its target layers, not their output); the last stage carries a rank-256 Markov head and a confidence head. A draft block is seeded with `dspark_noise_token_id=128799` and produces five proposals plus a confidence vector. The reference implements only the draft forward; its speculative loop is out of scope. vLLM's recipe states that V4.1 has no separate MTP module and DSpark is the only speculative method. [deepseek-v4.1-flash-1017-INFER-CFG](https://huggingface.co/deepseek-ai/DeepSeek-V4.1-Flash-1017/raw/1bae0e1088993b9b82de08f59de5be5a34e42170/inference/config.json) [deepseek-v4.1-flash-1017-VR](https://raw.githubusercontent.com/vllm-project/recipes/951d01b445c619868d9cdf8903ccbe2bc960cf0b/models/deepseek-ai/DeepSeek-V4.1-Flash.yaml)

## Configuration extraction

Selected, normalized projection of `config.json` (`text_config` and `vision_config` flattened); not a byte-for-byte copy. Source: [deepseek-v4.1-flash-1017-CFG](https://huggingface.co/deepseek-ai/DeepSeek-V4.1-Flash-1017/raw/1bae0e1088993b9b82de08f59de5be5a34e42170/config.json).

| Property | 1017 value | 0731 value (for comparison) |
| --- | --- | --- |
| architecture_class / model_type | DeepseekV41ForCausalLM / deepseek_v41 (text: deepseek_v41_text) | DeepseekV4ForCausalLM / deepseek_v4 |
| layers | 40 | 43 |
| hidden_size | 5120 | 4096 |
| attention_heads / num_key_value_heads / head_dim | 64 / 1 / 512 | 64 / 1 / 512 |
| q_lora_rank / o_lora_rank / o_groups / qk_rope_head_dim | 1280 / 1024 / 8 / 64 | 1024 / 1024 / 8 / 64 |
| routed_experts / experts_per_token / shared_experts | 384 / 6 / 1 | 256 / 6 / 1 |
| moe_intermediate_size | 2304 | 2048 |
| router | sqrtsoftplus, noaux_tc, norm_topk_prob true, scale 1.5, swiglu_limit 10; separate `bias_vl` for image tokens | sqrtsoftplus, noaux_tc, norm_topk_prob true, scale 1.5, swiglu_limit 10 |
| num_hash_layers | absent | 3 |
| quantization_config | quant_method fp8, activation_scheme dynamic, weight_block_size [32, 32], scale_fmt ue8m0, expert_dtype fp4 | quant_method fp8, fmt e4m3, weight_block_size [128, 128], scale_fmt ue8m0; root expert_dtype fp4 |
| sliding_window | 128 | 128 |
| compress_ratios (43 entries) | 0, 0, eighteen × 2 (layers 2–19), twenty × 1 (layers 20–39), 0, 0, 0 (DSpark stages) | 46 entries: 0, 0, alternating 4/128, then three 0 |
| kv_source_layer_ids | 2, 8, 14, 20 | absent (every compressed layer owns its cache) |
| index_source_layer_ids | 2, 8, 14, 20, 24, 28, 32, 36 | absent |
| index_n_heads / index_head_dim / index_topk | 32 / 128 / 512 | 64 / 128 / 512 |
| candidate_source_layer_id / candidate_topk_blocks / candidate_block_size | 20 / 2048 / 8 | absent |
| hc_mult / hc_sinkhorn_iters / hc_eps | 4 / 20 / 1e-06 | 4 / 20 / 1e-06 |
| engram_layer_ids / engram_num_embeddings | 1, 14 / 384006168, 384016682 | absent |
| engram_max_ngram_size / engram_vocab_size / engram_n_heads / engram_head_dim / engram_compressed_vocab_size / engram_pad_token_id | 4 / 16000000 / 8 / 256 / 99092 / 2 | absent |
| num_nextn_predict_layers | 3 | 1 (reference inference uses 3 stages) |
| dspark_block_size / dspark_noise_token_id / dspark_markov_rank | 5 / 128799 / 256 | 5 / 128799 / 256 |
| dspark_target_layer_ids (zero-based) | 37, 38, 39 | 40, 41, 42 |
| dspark_n_routed_experts / dspark_num_experts_per_tok | 128 / 3 | absent (stages inherit 256 / 6) |
| max_position_embeddings / rope | 1048576; yarn, factor 16, beta_fast 32, beta_slow 1, original 65536; rope_theta 10000; compress_rope_theta 160000 | 1048576; yarn factor 16, original 65536; 10000; 160000 |
| vocab_size / image_token_id / bos / eos / pad | 129280 / 129264 / 0 / 1 / 2 | 129280 / — |
| vision_config | deepseek_v41_vision: 32 layers, hidden 1024, 16 heads, intermediate 2816, patch 14, rope_theta 10000, downsample 3, max_image_tokens 1024, min_pixels 295936, max_wh_ratio null | absent (text only) |
| rms_norm_eps / tie_word_embeddings / dtype / transformers_version | 1e-20 / false / bfloat16 / 5.6.0 | 1e-06 / false / bfloat16 / 4.57.1 |

The 0731 column restates the retained [0731 catalog projection](../deepseek-v4-flash-0731/architecture.md#configuration-extraction) and [deepseek-v4-flash-0731-CFG](https://huggingface.co/deepseek-ai/DeepSeek-V4-Flash-0731/raw/7872f01b1d1fe23eabc4c98b48bffcef5a386062/config.json); no 0731 value is used for the 1017 record. A `transformers_version` field does not establish a minimum compatible package version. The repository contains no `generation_config.json` and no `chat_template.jinja`.

## Parameter accounting

**Derived from the pinned safetensors headers.** All 48 headers (96,085 tensors) were read by HTTP range request; no payload bytes were downloaded. Counting each packed MXFP4 byte as two logical weights and excluding E8M0 scale tensors gives 763,205,315,794 logical elements, identical to the Hugging Face API total. Grouped:

| Group | Logical elements | Note |
| --- | ---: | --- |
| Routed experts, 40 target layers | 543,581,798,400 | MXFP4 (I8-packed) |
| Other target tensors (attention, shared experts, gates, mHC, compressors, indexers, norms) | 6,660,554,864 | Mostly FP8 E4M3 32×32 blocks; some BF16/FP32 |
| Embedding + LM head | 1,323,827,200 | BF16, untied |
| **Backbone subtotal** | **551,566,180,464** | Rounds to the publisher's 552B |
| Engram (tables + projections) | 196,928,504,320 | FP8 tables |
| DSpark stages (`mtp.*`) | 14,225,362,530 | 13,589,544,960 of these are MXFP4 routed experts |
| Vision tower + aligner + image markers | 485,268,480 | BF16 |

This reconciles the publisher's 552B as a backbone figure that excludes Engram, DSpark and vision; it is not total stored parameters. A decode-token estimate of 40 × 6 × (3 × 5,120 × 2,304) = 8,493,465,600 routed weights, plus all other target tensors and the LM head, is ≈15.8B (≈16.5B counting the embedding row table); "16B" fits within these inclusion choices. The 8B prefill figure depends on bounded decoder replay and is not reproduced here. Artificial Analysis's "552B total / 16B active" restates the backbone and decode figures; it is not a total-parameter count. `total_b` and `active_b` remain null in the catalog because the 1017 card itself states neither. [deepseek-v4.1-flash-1017-HEADERS](https://huggingface.co/deepseek-ai/DeepSeek-V4.1-Flash-1017/resolve/1bae0e1088993b9b82de08f59de5be5a34e42170/model-00001-of-00048.safetensors) [deepseek-v4.1-flash-1017-API](https://huggingface.co/api/models/deepseek-ai/DeepSeek-V4.1-Flash-1017)

## Memory and performance consequences

**Serialized storage.** Tensor payload 510,286,023,000 bytes (≈475.24 GiB; index `total_size`, equal to the header census), about 3.06× the 0731 checkpoint's 166,878,536,440 bytes; the 48 shard files total 510,296,708,312 bytes (≈475.25 GiB) because each also carries its safetensors header. [deepseek-v4.1-flash-1017-TREE](https://huggingface.co/api/models/deepseek-ai/DeepSeek-V4.1-Flash-1017/tree/1bae0e1088993b9b82de08f59de5be5a34e42170?recursive=true) vLLM's recipe breakdown (routed + DSpark experts 259.5 GiB, Engram 183.1 GiB, dense FP8 6.9 GiB, BF16/FP32 3.9 GiB, scales 21.9 GiB) is consistent with the header census. [deepseek-v4.1-flash-1017-INDEX](https://huggingface.co/deepseek-ai/DeepSeek-V4.1-Flash-1017/resolve/1bae0e1088993b9b82de08f59de5be5a34e42170/model.safetensors.index.json) [deepseek-v4.1-flash-1017-VR](https://raw.githubusercontent.com/vllm-project/recipes/951d01b445c619868d9cdf8903ccbe2bc960cf0b/models/deepseek-ai/DeepSeek-V4.1-Flash.yaml)

**Global KV per token (derived; matches publisher).** The reference stores compressed latents as FP4 E2M1 with one E4M3 scale per 16 values (512/2 + 512/16 = 288 bytes per latent) and indexer keys as FP4 with one E8M0 scale per 32 (128/2 + 128/32 = 68 bytes). Three ratio-2 sources plus one ratio-1 source give 3 × 288/2 + 288 = 720 bytes of main KV and 3 × 68/2 + 68 = 170 bytes of indexer K: **890 bytes per token**, the figure on the V4.1 card. At 1,048,576 tokens that is ≈0.87 GiB per sequence, plus per-layer 128-token windows and DSpark window state, which do not grow with context. This holds only when the engine stores the compressed cache in FP4; an FP8 compressed cache is larger. [deepseek-v4.1-flash-1017-INFER-SRC](https://huggingface.co/deepseek-ai/DeepSeek-V4.1-Flash-1017/blob/1bae0e1088993b9b82de08f59de5be5a34e42170/inference/model.py)

**Consequence.** For this model, weights and Engram placement — not KV — set the replica size on 288 GB GPUs. Idealized even splits of serialized bytes: ≈255 GB per GPU at TP2 with Engram resident (too close to 288 GB once runtime buffers are counted), ≈154 GB at TP2 with Engram (≈202.8 GB including scales) in host memory, ≈128 GB at TP4 with Engram resident (in vLLM v0.32.0/v0.33.0 only with an explicit `cpu_offload:false`; the default offloads the tables to host memory). Replicated non-expert tensors, indexer logits buffers (the recipe cites `max-num-batched-tokens × max-model-len × 2` bytes) and CUDA-graph pools make real per-rank peaks higher. Host-offloaded Engram moves ≈183–189 GiB per engine instance into pinned host memory, which the B300 node's unknown OEM RAM must accommodate for every co-located replica. [HW](https://docs.nvidia.com/dgx/dgxb300-user-guide/introduction-to-dgxb300.html) [Memory mathematics](../../../reports/memory-math.md)

## What this report does not establish

Numerical equivalence of engine kernels to the reference; actual resident memory per rank on B300; long-context quality at 1M; the 8B prefill figure under each engine's replay path; any 1017-specific quality claim beyond the publisher's table.

The public artifacts do not disclose every training-data, optimization or implementation detail. This report does not fill missing details with assumptions.
