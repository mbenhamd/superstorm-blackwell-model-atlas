# Kimi K3.1 Pro: architecture

Configuration review: **2026-11-06 (UTC)** at publisher revision `d9e99b0792a5e93b78ea9bea62a68167e36ddd9e`. The publisher history has two commits, `6d0a0202` ("Initial commit", 2026-11-02) and `d9e99b07` ("Update encoding_k3.py", 2026-11-05, message "remove invalid medium thinking effort"). The configuration was diffed against the retained Kimi K3 pin `f831ab66814297da540d832a5235f8e904f29d06`. [kimi-k3.1-pro-COMMITS](https://huggingface.co/api/models/moonshotai/Kimi-K3.1-Pro/commits/main)

## Data flow

Text / image features → KDA **or** gated sparse MLA (indexer selects ≤2,048 history tokens) → attention-residual mixing → dense or latent MoE → repeat → output head. With an optional external draft: propose → target verify → commit accepted KDA state.

## What is new: DSA on the gated MLA layers

`text_config.dsa_config.dsa_layers` lists the same 24 one-based indices as `linear_attn_config.full_attn_layers`: 4, 8, …, 92, 93. Each of those layers keeps its K3 MLA projections (`q_lora_rank` 1536, `kv_lora_rank` 512, `qk_nope`/`qk_rope`/`v` head dims 128/64/128, output gate). It also gains a lightning indexer:

| Indexer tensor (per DSA layer) | Shape (shard-4 header) | dtype |
| --- | --- | --- |
| `indexer.wq_b` | [4096, 1536] = 32 heads × 128 from the query LoRA latent | BF16 |
| `indexer.wk` | [128, 7168] (single shared key head) | BF16 |
| `indexer.weights_proj` | [32, 7168] (per-head weights) | BF16 |
| `indexer.k_norm.{weight,bias}` | [128] each (LayerNorm) | BF16 |

The config sets `index_topk` 2048, `index_rope_dim` 0, `index_topk_freq` 1 and `index_skip_topk_offset` 1. The indexer scores every cached token cheaply and passes only the top 2,048 to MLA attention. Per-step attention FLOPs over long histories are therefore bounded, but the indexer still reads one key per cached token. The engine must also retain an indexer-key cache beside the MLA latent cache. The semantics of `index_topk_freq` and `index_skip_topk_offset` are not documented in the card. Their effect is established only by the engine implementation at a given commit. [kimi-k3.1-pro-CFG](https://huggingface.co/moonshotai/Kimi-K3.1-Pro/raw/d9e99b0792a5e93b78ea9bea62a68167e36ddd9e/config.json) [kimi-k3.1-pro-HDR-00004](https://huggingface.co/moonshotai/Kimi-K3.1-Pro/resolve/d9e99b0792a5e93b78ea9bea62a68167e36ddd9e/model-00004-of-000096.safetensors)

The card footnote states the purpose: "we replace the full-attention Gated MLA layers with Gated DeepSeek Sparse Attention (Gated DSA) layers for more efficient long-context modeling". This is a publisher claim. No long-context quality or speed comparison against K3 has been reproduced. [kimi-k3.1-pro-CARD](https://huggingface.co/moonshotai/Kimi-K3.1-Pro/blob/d9e99b0792a5e93b78ea9bea62a68167e36ddd9e/README.md)

## Configuration extraction

This is a **selected, normalized projection**, not a byte-for-byte copy of the config. Layer indices are one-based, as serialized.

| Property | Kimi K3.1 Pro | Same as K3 pin? |
| --- | --- | --- |
| architecture_class / model_type | KimiK31ForConditionalGeneration / kimi_k31 | No (K3: KimiK3ForConditionalGeneration / kimi_k3) |
| text_class | KimiLinearForCausalLM | Yes |
| layers / dense_prefix_layers | 93 / 1 | Yes |
| hidden_size / dense_intermediate_size | 7168 / 33792 | Yes |
| latent_moe_dim (`routed_expert_hidden_size`) / moe_intermediate_size | 3584 / 3072 | Yes |
| routed / per-token / shared experts | 896 / 16 / 2 | Yes |
| router | sigmoid, `noaux_tc`, renormalize, scaling 1.0 | Yes |
| attention_heads / kv_lora_rank / q_lora_rank | 96 / 512 / 1536 | Yes |
| kda_layers / full-attention (DSA) layers | 69 / 24 | Yes (layer lists identical) |
| full_attention_layer_indices_1based | 4, 8, 12, 16, 20, 24, 28, 32, 36, 40, 44, 48, 52, 56, 60, 64, 68, 72, 76, 80, 84, 88, 92, 93 | Yes |
| dsa_index_heads / head_dim / topk / rope_dim | 32 / 128 / 2048 / 0 | **New** |
| kda_head_dim / conv width / gate_lower_bound | 128 / 4 / -5.0 | Yes |
| activation / SiTU beta / linear beta | situ / 4.0 / 25.0 | Yes |
| attn_res_block_size | 12 | Yes |
| num_nextn_predict_layers | 0 | Yes |
| max_position_embeddings | 1048576 | Yes |
| vocab_size | 163840 | Yes |
| vision_config | MoonViT-V2 per card (27 layers, hidden 1024, patch 14, `patchmergerv2` projector) | Yes (block identical) |

The vision encoder name, the 401M vision count and the "SiTU-GLU" label come from the card. All other rows come from config extraction. `num_nextn_predict_layers=0`: the target declares no native MTP stack, so speculative decoding uses external drafts. See [serving](serving.md#draft-artifacts). [kimi-k3.1-pro-CFG](https://huggingface.co/moonshotai/Kimi-K3.1-Pro/raw/d9e99b0792a5e93b78ea9bea62a68167e36ddd9e/config.json) [kimi-k3-CFG](https://huggingface.co/moonshotai/Kimi-K3/raw/f831ab66814297da540d832a5235f8e904f29d06/config.json)

Non-weight files: `generation_config.json` and `preprocessor_config.json` are byte-identical to K3. `tiktoken.model` has the same LFS SHA-256. `tokenization_kimi.py` is AST-identical. `encoding_k3.py` differs only by a docstring spelling. `tokenizer_config.json` drops an empty `extra_special_tokens` object. The chat protocol therefore matches K3: preserved `reasoning_content`/`tool_calls` and `reasoning_effort` low/high/max. The match is the result of the pinned commit: the initial K3.1 encoder (`6d0a0202`) set `_VALID_THINKING_EFFORTS = {"low", "medium", "high", "max"}`, and `d9e99b07` removed `medium`. At the pin, `encoding_k3.py` asserts that a supplied `thinking_effort` is in {low, high, max} when thinking is enabled, so `medium` raises an `AssertionError` in the publisher encoder. vLLM PR 66028 (Rust renderer, open) states "The thinking_effort values for K3.1 are low, medium, high and max", which matches the superseded initial commit. Until an engine renderer is shown to match the pinned encoder, do not expose `reasoning_effort=medium` through the KServe endpoint; the publisher card also lists only low/high/max. [kimi-k3.1-pro-COMMITS](https://huggingface.co/api/models/moonshotai/Kimi-K3.1-Pro/commits/main) [kimi-k3.1-pro-ENCODING-6D0A0202](https://huggingface.co/moonshotai/Kimi-K3.1-Pro/raw/6d0a0202956796543364d666ab19c6ad1a494ee1/encoding_k3.py) [kimi-k3.1-pro-ENCODING](https://huggingface.co/moonshotai/Kimi-K3.1-Pro/raw/d9e99b0792a5e93b78ea9bea62a68167e36ddd9e/encoding_k3.py) [kimi-k3.1-pro-TOKCFG](https://huggingface.co/moonshotai/Kimi-K3.1-Pro/raw/d9e99b0792a5e93b78ea9bea62a68167e36ddd9e/tokenizer_config.json) [kimi-k3.1-pro-VPR66028](https://api.github.com/repos/vllm-project/vllm/pulls/66028)

## Memory and performance consequences

**Weights.** The indexer adds 7,438,592 parameters per DSA layer (4096×1536 + 128×7168 + 32×7168 + 256). Across 24 layers in BF16 this is 357,052,416 bytes. That equals the difference between the two index totals exactly: 1,561,217,377,280 − 1,560,860,324,864. Every other serialized tensor therefore keeps the K3 dtype and size (derived; full-index tensor-family comparison plus shard-4 header). [kimi-k3.1-pro-INDEX](https://huggingface.co/moonshotai/Kimi-K3.1-Pro/resolve/d9e99b0792a5e93b78ea9bea62a68167e36ddd9e/model.safetensors.index.json) [kimi-k3.1-pro-K3-INDEX](https://huggingface.co/moonshotai/Kimi-K3/resolve/f831ab66814297da540d832a5235f8e904f29d06/model.safetensors.index.json)

**Token cache.** SGLang's cookbook gives ~18.9 KB per token for MLA plus indexer KV in its default FlashMLA `fp8_ds_mla` format. The following layout explains that figure; it is a consistency check, not an allocator measurement. 24 layers × (656 B FP8 latent with scales and BF16 RoPE + 132 B FP8 indexer key with scale) = 18,912 B. The 656 B figure comes from SGLang PR 48714. The 132 B per-layer indexer-key figure is a constant in the cookbook's own capacity calculator (`kvBytesPerTokenPerRank = 24*(mlaBytes+132)/dcp`, with `mlaBytes` 656 for `flashmla_kv` and 576 otherwise). It is a calculator constant, not an allocator measurement; its split (128 B FP8 key plus 4 B scale) is an atlas reading. The same layout gives 13,824 B per token for K3's 576 B FP8 MLA cache, so K3.1 needs about 37% more token-cache bytes in this format. vLLM states 576 B per token per layer for its FP8 latent and 352 B under NVFP4 KV, with indexer keys kept in FP8. [kimi-k3.1-pro-GR](https://docs.sglang.io/cookbook/autoregressive/Moonshotai/Kimi-K3.1-Pro) [kimi-k3.1-pro-GR-CELLS](https://docs.sglang.io/cookbook/autoregressive/Moonshotai/Kimi-K3.1-Pro) [kimi-k3.1-pro-SPR48714](https://api.github.com/repos/sgl-project/sglang/pulls/48714) [kimi-k3.1-pro-VR](https://recipes.vllm.ai/moonshotai/Kimi-K3.1-Pro)

**Recurrent state.** The KDA geometry is unchanged from K3. At TP8, 69 layers × 12 local heads × 128 × 128 × 4 B = 54,263,808 B (51.75 MiB) of matrix state per request per rank, before convolution state and speculative snapshots. This agrees with SGLang's stated "~52 MB per request per rank at TP8" and is the concurrency ceiling the cookbook identifies. DCP shards the MLA/indexer cache but not this state. [kimi-k3.1-pro-GR](https://docs.sglang.io/cookbook/autoregressive/Moonshotai/Kimi-K3.1-Pro)

The Kimi Linear paper's up-to-75% cache reduction refers to the 48B/3B study and is not a K3.1 measurement. [TOPK-LINEAR-PAPER-PIN](https://arxiv.org/abs/2510.26692v2)

## What this report does not establish

This review does not establish the DSA kernel numerics or dispatch on SM103 (B300). It does not establish whether `index_skip_topk_offset` is interpreted identically across engines, or long-context retrieval quality relative to K3. It also does not show how much DSA reduces decode latency at the target context lengths. The card's "3T-class" label refers to the 2.8T headline; it is not a separate parameter count.
