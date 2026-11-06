# Muse Glimmer 30B: architecture

## Identity checked on 2026-11-06

The publisher repository `meta-models/Muse-Glimmer-30B` was created on 2026-08-09. Its head resolves to `cec94fcfd6512f2cfe708138c32533b346ea4f69` (2026-10-22, "Create .eval_results folder and add mmi results"). The weights entered the repository in commit `46ac57a4502be771dc743ac85866351c5629ca71` (2026-08-10). The two tree listings were compared. Between `46ac57a4` and the pin, only these changed:

- `README.md`;
- `generation_config.json` (sampling defaults added on 2026-08-10);
- `chat_template.jinja` (2026-08-11, "Fixing duplicate reasoning effort");
- the added `LICENSE`, `USAGE_POLICY.md` and `.eval_results/mmi.yaml`.

Both safetensors LFS objects, the index, `config.json`, `processor_config.json` and the tokenizer files are identical. Weight identity has therefore been stable since 2026-08-10, while the protocol and sampling assets have not. [muse-glimmer-30b-API](https://huggingface.co/api/models/meta-models/Muse-Glimmer-30B) [muse-glimmer-30b-COMMITS](https://huggingface.co/api/models/meta-models/Muse-Glimmer-30B/commits/main) [muse-glimmer-30b-TREE](https://huggingface.co/api/models/meta-models/Muse-Glimmer-30B/tree/cec94fcfd6512f2cfe708138c32533b346ea4f69?recursive=true&expand=false) [muse-glimmer-30b-TREE-46AC](https://huggingface.co/api/models/meta-models/Muse-Glimmer-30B/tree/46ac57a4502be771dc743ac85866351c5629ca71?recursive=true&expand=false)

The paper is arXiv 2610.24628 ("Muse Glimmer 30B: An On-Device Agentic Model"). Version 1 was submitted on 2026-10-17, and version 3 (2026-10-23) is the latest. Only the abstract and submission history were read for this review; the paper body was not used as a source for any value below. [muse-glimmer-30b-PAPER](https://arxiv.org/abs/2610.24628v3)

## Data flow

Image or video frames → ViT perception encoder (50 layers; 37 windowed, 13 full attention) → 2×2 pixel-shuffle merge → two-layer adapter and projection into the 6,656-wide text space → 52 dense decoder layers in the pattern [sliding, sliding, sliding, global] ×13 → untied output head → logit pre-scale and tanh soft-cap → sampling.

## Mechanisms

**Dense decoder.** Every text layer has a SwiGLU MLP (`hidden_activation: silu`, intermediate size 19,968). There are no router, expert or MoE fields in the configuration, and the index contains no expert tensors. Each decoded token therefore passes through all 52 attention and MLP blocks. [muse-glimmer-30b-CFG](https://huggingface.co/meta-models/Muse-Glimmer-30B/raw/cec94fcfd6512f2cfe708138c32533b346ea4f69/config.json) [muse-glimmer-30b-INDEX](https://huggingface.co/meta-models/Muse-Glimmer-30B/raw/cec94fcfd6512f2cfe708138c32533b346ea4f69/model.safetensors.index.json)

**Interleaved local/global attention.** Layers 3, 7, …, 51 (zero-based, 13 layers) are `full_attention`. The other 39 are `sliding_attention` with a 2,048-token window. `layer_rope_theta` is 500,000 on every sliding layer and 0 on every full layer. The card states "RoPE (θ = 500,000), local layers only". The global layers therefore carry no rotary position signal: this is NoPE global attention. vLLM's model docstring calls the layout iRoPE and applies RoPE NEOX-style. SGLang derives `no_rope_layers` from the zero thetas. [muse-glimmer-30b-CFG](https://huggingface.co/meta-models/Muse-Glimmer-30B/raw/cec94fcfd6512f2cfe708138c32533b346ea4f69/config.json) [muse-glimmer-30b-CARD](https://huggingface.co/meta-models/Muse-Glimmer-30B/blob/cec94fcfd6512f2cfe708138c32533b346ea4f69/README.md) [muse-glimmer-30b-V-MODEL](https://raw.githubusercontent.com/vllm-project/vllm/4ba787ec9959e566d3b587a796dff07673324da5/vllm/model_executor/models/muse_glimmer.py) [muse-glimmer-30b-S-CONFIG](https://raw.githubusercontent.com/sgl-project/sglang/297e54fd105e974cdf401e5b4d20253a22c16f90/python/sglang/srt/configs/muse_glimmer.py)

**Narrow GQA.** There are 32 query heads and 2 KV heads (16:1), all with head dimension 128. The two geometries are the same on local and global layers, unlike Gemma 4, whose local and global layers use different head geometries.

**Gated attention and QK-norm.** Each layer has a `self_attn.gate_proj` tensor of shape [4096, 6656]. vLLM describes it as a per-head sigmoid output gate. The card states "Gated attention: Yes". `config.json` contains no field for the gate or for QK-norm: both come from engine defaults (`use_attn_output_gate=True` and `use_qk_norm=True` in SGLang's config class). QK-norm is weightless, so tensor presence cannot confirm it; vLLM documents it as fp32, applied before RoPE, followed by a query pre-scale of `qk_scale_factor / sqrt(head_dim)` with `qk_scale_factor` 3.87. **Source inspection only.** [muse-glimmer-30b-HDR](https://huggingface.co/meta-models/Muse-Glimmer-30B/resolve/cec94fcfd6512f2cfe708138c32533b346ea4f69/model-00001-of-00002.safetensors) [muse-glimmer-30b-V-MODEL](https://raw.githubusercontent.com/vllm-project/vllm/4ba787ec9959e566d3b587a796dff07673324da5/vllm/model_executor/models/muse_glimmer.py)

**Output path.** `lm_head` is untied (`tie_word_embeddings: false`; separate [202048, 6656] tensors). Logits are multiplied by `output_multiplier` (0.19611613513818404) and then tanh soft-capped at 20.0. Both operations must stay in the engine path.

**Multimodal inputs.** The card lists "Input: text + image, Output: text" and says audio is unsupported. The pinned `processor_config.json` also defines a `MuseGlimmerVideoProcessor` (2 fps, up to 96 frames, 144 tokens per frame group), and `config.json` defines `video_token_id` 200091. Both vLLM v0.33.0 and SGLang implement the video path. The card's limitations section says video "is processed as individual frames" and is not explicitly optimized. Video is a processor-supported, publisher-unoptimized input, not an advertised modality. [muse-glimmer-30b-PROC](https://huggingface.co/meta-models/Muse-Glimmer-30B/raw/cec94fcfd6512f2cfe708138c32533b346ea4f69/processor_config.json)

## Configuration extraction

This is a **selected, normalized projection** of the pinned `config.json`. Layer counts are tallies of the serialized `layer_types` lists.

| Property | Value |
| --- | --- |
| architecture_class | MuseGlimmerForConditionalGeneration |
| model_type / text model_type | muse_glimmer / muse_glimmer_text |
| layers | 52 |
| hidden_size | 6656 |
| intermediate_size | 19968 |
| hidden_activation | silu |
| sliding_attention_layers / full_attention_layers | 39 / 13 (full at zero-based 3, 7, …, 51) |
| attention_heads / kv_heads / head_dim | 32 / 2 / 128 |
| sliding_window | 2048 |
| layer_rope_theta | 500000 on sliding layers; 0 on full layers |
| rope_parameters | rope_theta 500000, rope_type default |
| max_position_embeddings | 131072 |
| vocab_size | 202048 |
| tie_word_embeddings | false |
| final_logit_softcapping | 20.0 |
| output_multiplier | 0.19611613513818404 |
| qk_scale_factor | 3.87 |
| rms_norm_eps / post_norm_eps | 1e-05 / 1e-08 |
| attention_bias | false |
| image_token_id / video_token_id | 200092 / 200091 |
| projector_hidden_size / out_hidden_size / projector_hidden_act | 4096 / 6144 / gelu |
| vision layers (window / full) | 50 (37 / 13) |
| vision hidden / heads / intermediate | 1536 / 16 / 8960 |
| vision patch / merge / temporal patch | 14 / 2 / 2 |
| dtype / transformers_version | bfloat16 / 5.15.0.dev0 |

[muse-glimmer-30b-CFG](https://huggingface.co/meta-models/Muse-Glimmer-30B/raw/cec94fcfd6512f2cfe708138c32533b346ea4f69/config.json). `transformers_version` 5.15.0.dev0 is a development build. It is metadata, not proof of a minimum compatible release. vLLM v0.33.0 imports `MuseGlimmerConfig` and `MuseGlimmerProcessor` from `transformers`, so the image's Transformers build is part of the loader contract.

## Parameter census

Both shard headers were range-read; no tensor payload was downloaded. All 1,436 tensors are BF16, totalling 29,776,626,688 elements and 59,553,253,376 tensor bytes, matching the index metadata. **Derived from serialized headers:**

| Component | Elements | Share |
| --- | ---: | ---: |
| Text MLPs (52 × gate/up/down) | 20,733,493,248 | 69.6% |
| Text attention (q, k, v, o, gate) | 4,430,233,600 | 14.9% |
| Input embedding | 1,344,831,488 | 4.5% |
| Untied `lm_head` | 1,344,831,488 | 4.5% |
| Norms | 1,391,104 | <0.01% |
| Vision tower | 1,852,639,744 | 6.2% |
| Vision adapter + projection | 69,206,016 | 0.2% |
| **Total** | **29,776,626,688** | |

The text decoder holds 27,854,780,928 elements (25,165,117,952 excluding embedding and head). The card states "~29.6B (including vision encoder)" and "~1.8B" for the encoder. The serialized total is 29.78B, about 0.18B above the card; the vision tower alone is 1.85B. This review does not resolve the gap. The likely cause is rounding or a different counting rule, but that is unverified. The catalog records the serialized count and leaves `active_b` null: the publisher states "dense" without stating an active-parameter figure. [muse-glimmer-30b-HDR](https://huggingface.co/meta-models/Muse-Glimmer-30B/resolve/cec94fcfd6512f2cfe708138c32533b346ea4f69/model-00001-of-00002.safetensors) [muse-glimmer-30b-INDEX](https://huggingface.co/meta-models/Muse-Glimmer-30B/raw/cec94fcfd6512f2cfe708138c32533b346ea4f69/model.safetensors.index.json)

## KV-cache geometry (derived)

Per layer and per token, BF16 K+V = 2 tensors × 2 KV heads × 128 × 2 bytes = **1,024 bytes**.

| Scope | Bytes per token | At 131,072 tokens (one sequence) |
| --- | ---: | ---: |
| 13 global layers | 13,312 | 1,744,830,464 (≈1.745 GB) |
| 39 sliding layers, bounded by a 2,048-token window | 39,936 up to the window | ≤81,788,928 (≈0.082 GB) |
| All 52 layers if an allocator ignores the window | 53,248 | 6,979,321,856 (≈6.98 GB) |

With a window-aware hybrid allocator, long-context KV cost is dominated by the 13 global layers. FP8 KV halves these figures. These are formulas, not engine allocations. Block rounding, the engine's sliding-window implementation (SGLang passes `sliding_window - 1`), prefix-cache retention and per-rank replication change the physical numbers. [Memory mathematics](../../../reports/memory-math.md) explains the limits.

## Tensor-parallel consequences on 8×B300

**Mechanism.** Two KV heads divide evenly only at TP1 and TP2. At TP4 and TP8, vLLM and SGLang replicate KV heads (`tp_size % num_kv_heads == 0`): each rank keeps one head, so every KV head is stored 2× (TP4) or 4× (TP8) across the group. In SGLang v0.5.23, any quantized checkpoint (`quant_config` not `None`) builds unfused q/k/v projections and raises an error when `num_key_value_heads < tp_size`. **For SGLang, quantized exports are therefore limited to TP1 or TP2.** [muse-glimmer-30b-V-MODEL](https://raw.githubusercontent.com/vllm-project/vllm/4ba787ec9959e566d3b587a796dff07673324da5/vllm/model_executor/models/muse_glimmer.py) [muse-glimmer-30b-S-MODEL](https://raw.githubusercontent.com/sgl-project/sglang/297e54fd105e974cdf401e5b4d20253a22c16f90/python/sglang/srt/models/muse_glimmer.py)

**Capacity.** BF16 serialized files total 59.55 GB, about 20.7% of one advertised 288 GB B300. One GPU holds the target, the separate 5.11 GB DFlash assistant and a large KV pool. [HW](https://docs.nvidia.com/dgx/dgxb300-user-guide/introduction-to-dgxb300.html)

**Topology hypotheses (unmeasured):**

| Layout | Expected benefit | Cost / failure condition |
| --- | --- | --- |
| TP1 × 8 replicas (data parallel behind KServe) | No per-layer all-reduce; eight independent KV pools; best aggregate throughput candidate for short/medium agent turns | Per-request decode speed is bounded by one GPU's HBM bandwidth: each step streams about 53.0 GB of BF16 decoder weights (attention + MLP + `lm_head`; the embedding table is a lookup and the vision tower is idle during decode), plus KV. Eight weight copies; needs router and cache affinity across replicas |
| TP2 × 4 | Halves per-GPU weight reads per step; KV heads split without replication; still valid for SGLang quantized exports | Two all-reduces per layer over NVLink; four replicas instead of eight |
| TP4 × 2 (vLLM recipe launch shape on GB300) | Lower per-request latency for long prefill or batch-1 decode | KV heads replicated 2×; more collectives; SGLang quantized exports cannot load |
| TP8 × 1 | Lowest per-token compute per GPU | KV replicated 4×; collective cost on a 30B dense model is unlikely to pay off except for latency-only tests |

The vLLM recipe's TP4 launch line on GB300 is a recipe statement, not a B300 measurement. [muse-glimmer-30b-V-RECIPE](https://raw.githubusercontent.com/vllm-project/vllm/4ba787ec9959e566d3b587a796dff07673324da5/recipes/models/meta-models/Muse-Glimmer-30B.yaml)

## Separate DFlash assistant

`meta-models/Muse-Glimmer-30B-assistant` at `c676cce91658f9568aaf264a416211e2782735b7` is a **speculative-decoding drafter**, not an instruction-tuned assistant model. Evidence from its config and card:

- the architecture is `MuseGlimmerAssistantModel`, `model_type` `muse_glimmer_assistant`;
- `block_size` is 16 and `mask_token_id` is 201818;
- it has 5 sliding-attention layers (window 2,048) with 32 query / 8 KV heads, head dim 128;
- `target_layer_ids` is [1, 13, 25, 37, 49];
- the card's title is "Muse Glimmer - DFlash" and calls it a block-diffusion drafter.

[muse-glimmer-30b-DRAFT-CFG](https://huggingface.co/meta-models/Muse-Glimmer-30B-assistant/raw/c676cce91658f9568aaf264a416211e2782735b7/config.json) [muse-glimmer-30b-DRAFT-CARD](https://huggingface.co/meta-models/Muse-Glimmer-30B-assistant/blob/c676cce91658f9568aaf264a416211e2782735b7/README.md)

Its header holds 2,555,985,152 BF16 elements in one 5,111,976,608-byte file. There is no embedding or LM head: the drafter uses the target's. `encoder.fc.weight` is [6656, 33280], which maps five concatenated target hidden states (5 × 6,656) into the draft. The draft has QK-norm weights and no attention output gate. A per-token draft KV cost is 5 × 8 × 128 × 2 × 2 = 20,480 bytes, bounded by its window. [muse-glimmer-30b-DRAFT-HDR](https://huggingface.co/meta-models/Muse-Glimmer-30B-assistant/resolve/c676cce91658f9568aaf264a416211e2782735b7/model.safetensors)

**Layer-index convention is a known failure mode.** SGLang's regression test records two silent bugs from integrating this checkpoint:

1. vendor weight names were not mapped, leaving `fc` and `hidden_norm` at random initialization;
2. `target_layer_ids` used a different convention from the engine's capture (HF output-of-layer versus llama.cpp input-of-layer), so every captured layer was off by one.

Together they collapsed acceptance to about 1.0 without changing GSM8K accuracy. vLLM v0.33.0 maps the same vendor weight names in `qwen3_dflash.py`. Its target captures layer outputs at index `layer_idx + 1`. Whether this matches the draft's training convention was not established here; measure acceptance length before trusting any speedup. [muse-glimmer-30b-S-DFLASH-TEST](https://raw.githubusercontent.com/sgl-project/sglang/297e54fd105e974cdf401e5b4d20253a22c16f90/test/registered/spec/dflash/test_muse_glimmer_dflash_assistant_gsm8k.py) [muse-glimmer-30b-V-DFLASH](https://raw.githubusercontent.com/vllm-project/vllm/4ba787ec9959e566d3b587a796dff07673324da5/vllm/model_executor/models/qwen3_dflash.py)

## Comparison with the closest catalog models

No predecessor family exists in the catalog. The comparison below uses field values from each model's own pinned configuration. Gemma 4 31B IT is pinned at `842da379` and Qwen3.8 27B at `1d4bf0f2`; both configs were re-fetched on 2026-11-06 with unchanged SHA-256. Gemma's rounded vision count comes from its paper, not its config. [gemma-4-31b-it-CFG](https://huggingface.co/google/gemma-4-31B-it/raw/842da3794eaa0b77d5f08bae87a17459d91ff475/config.json) [qwen3.8-27b-CFG](https://huggingface.co/Qwen/Qwen3.8-27B/raw/1d4bf0f2ff6012fd82039f2fa52739d0dd7c60c0/config.json) [TOPM-GEMMA-PAPER](https://arxiv.org/html/2607.02770v2#S1.T1)

| Field | Muse Glimmer 30B | Gemma 4 31B IT | Qwen3.8 27B | Serving consequence |
| --- | --- | --- | --- | --- |
| Text layers | 52 | 60 | 64 | Fewer, wider Muse layers |
| hidden / intermediate | 6656 / 19968 | 5376 / 21504 | 5120 / 17408 | Muse is the widest model |
| Attention mix | 39 sliding (2,048) + 13 full NoPE | 50 sliding (1,024) + 10 full | 48 linear (Gated DeltaNet) + 16 full | Muse and Gemma use windowed KV; Qwen uses recurrent state |
| Q / KV heads, head dim | 32 / 2, 128 everywhere | 32 / 16 (hd256) local; 4 (hd512) global | 24 / 4, hd256 on full layers | Muse uses hd128, which FA4 on Blackwell supports; Gemma's hd512 does not |
| Global-layer positions | none (θ=0) | partial RoPE 0.25, θ 1e6 | mRoPE, partial 0.25, θ 1e7 | — |
| Attention output gate | yes (tensor present) | no field | `attn_output_gate: true` | — |
| max_position_embeddings | 131,072 | 262,144 | 262,144 | Muse has half the native window |
| vocab / tied head | 202,048 / untied | 262,144 / tied | 248,320 / untied | — |
| Logit soft-cap | 20.0 with pre-multiplier | 30 | none | — |
| Vision | 50-layer ViT, width 1536, ≈1.85B serialized | width 1152 (rounded ≈0.55B in paper) | 27 layers, width 1152 | Muse has the largest vision tower |
| Native MTP / draft | separate 5-layer DFlash drafter | separate 4-layer assistant | 1 bundled NextN layer | Each needs a different speculative path |
| Global KV bytes/token (BF16, derived) | 13,312 (13 × 2 × 128 × 2 × 2) | 40,960–81,920 depending on k_eq_v storage | 65,536 plus fixed recurrent state | Muse has the smallest per-token cache of the three |
| License | Apache-2.0 | Apache-2.0 | Apache-2.0 | — |

Interpretation: Muse Glimmer's 2-KV-head, hd128 GQA gives it the cheapest long-context cache of the three. The same narrow GQA limits clean tensor-parallel sharding to TP≤2. Gemma's dual head geometry and Qwen's linear-attention state impose kernel constraints that Muse avoids. Per-token decoder weight reads do not favour Muse: its 25.17B non-embedding text elements (header census) are fewer than Gemma 4 31B's 29.29B (rounded einsum count in the Gemma technical report; about 29.29B derived from the pinned Gemma config), and no exact non-embedding census of Qwen3.8 27B is recorded for comparison. All three stream all decoder weights on every decode step, so single-stream decode is weight-bandwidth-bound for each. [TOPM-GEMMA-PAPER](https://arxiv.org/html/2607.02770v2#S1.T1) [gemma-4-31b-it-CFG](https://huggingface.co/google/gemma-4-31B-it/raw/842da3794eaa0b77d5f08bae87a17459d91ff475/config.json)

## Related Meta models (context only)

The `meta-models` organization lists six repositories: the four Muse Glimmer repositories (base, assistant, GGUF, ExecuTorch PTE) and `Muse-Spark-Open-816B-A42B` with its NVFP4 export (created 2026-09-15). No "Muse Wonder" repository was found. The card says Muse Glimmer was "distilled from Muse Spark". This family record does not establish lineage beyond that sentence and adds no Spark records. [muse-glimmer-30b-ORG](https://huggingface.co/api/models?author=meta-models&limit=100)

## What this report does not establish

It does not establish:

- the physical KV allocation and sliding-window eviction in either engine on SM103;
- which DFlash layer-index convention vLLM v0.33.0 applies to this drafter;
- the cause of the 29.6B versus 29.78B parameter-count gap;
- any B300 latency, throughput or quality.
