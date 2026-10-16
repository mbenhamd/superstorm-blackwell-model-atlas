# Kimi K3: architecture

Fresh report review: **2026-10-16 (UTC)**. The report's base revision `c5d1dd4c428bd1ce8b88c5044f3b6ccde9e3b721` resolves and appears in the publisher's current commit history. Its `config.json` is byte-identical to the retained atlas pin `f831ab66814297da540d832a5235f8e904f29d06`; the card and encoding history have changed. This verifies the listed architecture fields across those snapshots, not equality of every weight or helper file. [Alternate config](https://huggingface.co/moonshotai/Kimi-K3/raw/c5d1dd4c428bd1ce8b88c5044f3b6ccde9e3b721/config.json), [publisher history](https://huggingface.co/api/models/moonshotai/Kimi-K3/commits/main).

## Data flow

Text / vision features → KDA or gated MLA → attention-residual mixing → dense or latent MoE → repeat → output head; optional DSpark proposes → target verifies → commit accepted state.

## How the parts work together

The text backbone alternates frequent Kimi Delta Attention (KDA) updates with periodic gated multi-head latent attention (MLA). KDA carries a recurrent summary forward; the MLA layers retain access to token history through compressed attention representations. This combination makes the model neither ordinary full attention everywhere nor a constant-memory model everywhere. A long conversation still consumes token-cache memory in the MLA layers.

The feed-forward path is a latent mixture of experts. Routing selects specialists, but the specialist computation is represented in a narrower latent space rather than treating every expert as a full-width dense feed-forward network. The dense prefix, shared experts, routers, normalization, and residual machinery still perform work. The number of selected experts therefore does not by itself determine end-to-end FLOPs or latency.

The configuration also exposes block attention-residual organization. Do not substitute a plain residual-add implementation simply because tensor shapes happen to agree. Likewise, SiTU is not interchangeable with a default SwiGLU activation: the checkpoint-dependent activation and scaling must survive expert dispatch, quantization, fusion, and reduction.

Image or video processing adds a vision encoder and transport path before language inference. Its memory and CPU-transfer overhead must be budgeted separately from text tokens. A text-only benchmark does not certify multimodal throughput.

The architecture facts above are drawn from the publisher card and configuration; the workload consequences are analytical interpretation. [kimi-k3-CARD](https://huggingface.co/moonshotai/Kimi-K3/blob/f831ab66814297da540d832a5235f8e904f29d06/README.md) [kimi-k3-CFG](https://huggingface.co/moonshotai/Kimi-K3/raw/f831ab66814297da540d832a5235f8e904f29d06/config.json)

## Configuration extraction

This is a **selected, normalized projection**, not a byte-for-byte copy of the complete config. Field labels have been made comparable across models. Layer indices explicitly state zero-based or one-based conventions.

| Property | Value |
| --- | --- |
| architecture_class | KimiK3ForConditionalGeneration |
| text_class | KimiLinearForCausalLM |
| layers | 93 |
| dense_prefix_layers | 1 |
| hidden_size | 7168 |
| dense_intermediate_size | 33792 |
| latent_moe_dim | 3584 |
| moe_intermediate_size | 3072 |
| routed_experts | 896 |
| experts_per_token | 16 |
| shared_experts | 2 |
| attention_heads | 96 |
| kv_lora_rank | 512 |
| kda_layers | 69 |
| mla_layers | 24 |
| full_attention_layer_indices_1based | 4, 8, 12, 16, 20, 24, 28, 32, 36, 40, 44, 48, 52, 56, 60, 64, 68, 72, 76, 80, 84, 88, 92, 93 |
| kda_head_dim | 128 |
| kda_conv_width | 4 |
| activation | SiTU / SiTU-GLU |
| activation_situ_beta / activation_situ_linear_beta | 4.0 / 25.0 |
| num_nextn_predict_layers | 0 |
| attn_res_block_size | 12 |
| max_position_embeddings | 1048576 |
| vision_encoder | MoonViT-V2 |
| vision_parameters_millions | 401 |
| vocab_size | 163840 |


Most rows are config extractions; the vision encoder name and 401M count come from the publisher card, and SiTU-GLU is the card’s activation label. The 24 MLA and 69 KDA counts agree with the config’s explicit layer lists.

`num_nextn_predict_layers=0` supports the narrow conclusion that this target config does not declare an attached native next-token prediction stack. It does **not** rule out external speculative decoding. The documented paths use separate Inferact DSpark, RadixArk DSpark or Modal DFlash checkpoints with their own attention, features and verification requirements. These are distinct from a built-in MTP head and from each other. The [serving report](serving.md) identifies the pairs and their evidence boundaries.

Source for the extraction: [kimi-k3-CFG](https://huggingface.co/moonshotai/Kimi-K3/raw/f831ab66814297da540d832a5235f8e904f29d06/config.json). Headline counts, modality descriptions and advertised extended context are additionally drawn from [kimi-k3-CARD](https://huggingface.co/moonshotai/Kimi-K3/blob/f831ab66814297da540d832a5235f8e904f29d06/README.md). A `transformers_version` metadata field is not by itself proof of a minimum compatible package version.

## Memory and performance consequences

The often-cited **up to 75% KV-cache reduction** comes from the earlier **Kimi Linear 48B-total / 3B-active** study against full MLA, not a K3 B300 allocation measurement. The current paper is arXiv **2510.26692v2, November 1, 2025**. K3's 69 KDA / 24 MLA split reduces the number of history-storing layers, but total cache savings also depend on MLA representation, dtype, recurrent-state slots and speculative snapshots. Do not apply 75% to the entire K3 runtime memory budget. [Kimi Linear paper, v2](https://arxiv.org/abs/2510.26692v2), [K3 configuration](https://huggingface.co/moonshotai/Kimi-K3/raw/f831ab66814297da540d832a5235f8e904f29d06/config.json).

The state pool is a separate concurrency limit from the MLA KV pool. Adding DCP can improve one pool without sharding the recurrent state in the same way. In a head-sharded thought experiment, 69 layers × 96 heads × 128 × 128 FP32 entries is exactly 434,110,464 bytes (414 MiB) of matrix state per sequence before convolution state, speculative snapshots, padding, and implementation-specific sharing. This is an illustrative formula, not an allocator measurement. Divide only by a parallelism dimension that the actual implementation uses to shard those heads.

Attention Residuals also retain intermediate residual streams during a forward pass; those activations and MoE communication buffers are separate from persistent KDA state. SGLang's pool model includes ordinary cache/overlap slots and speculative verification slots. In its DCP path, target MLA token cache is sharded while RadixArk draft KV remains replicated. Thus weight capacity, token-cache capacity and concurrent state slots can each become the limiting resource at a different workload shape. [SGLang K3 pool model](https://docs.sglang.io/cookbook/autoregressive/Moonshotai/Kimi-K3), [v0.5.21 K3 implementation](https://raw.githubusercontent.com/sgl-project/sglang/e00930c5489053f26d86b179cee0d087f846acbb/python/sglang/srt/models/kimi_k3.py).

Using the rounded publisher count, a hypothetical all-FP8 2.8T model needs approximately 2.8 TB (decimal) for idealized weights alone. That does not fit into the advertised 2.304 TB aggregate of eight B300 GPUs. Native MXFP4 and the mixed NVFP4 export change that conclusion, but usable KV and state capacity must still be established after loading and CUDA graph capture.

The numeric examples are calculations from stated dimensions and assumptions, not measured allocations. [Memory mathematics](../../../reports/memory-math.md) explains the formulas and their limits. [kimi-k3-CARD](https://huggingface.co/moonshotai/Kimi-K3/blob/f831ab66814297da540d832a5235f8e904f29d06/README.md) [kimi-k3-CFG](https://huggingface.co/moonshotai/Kimi-K3/raw/f831ab66814297da540d832a5235f8e904f29d06/config.json) [HW](https://docs.nvidia.com/dgx/dgxb300-user-guide/introduction-to-dgxb300.html)

## What this report does not establish

Exact B300 SXM6-AC OEM topology; all-FP8 artifact availability; exact installed-image ancestry of mixed-format fixes; maximum safe long-context concurrency; native-versus-NVFP4 quality on your tools and languages; actual DSpark acceptance on your workload.

The public artifacts do not disclose every training-data, optimization or implementation detail. This report does not fill missing details with assumptions or present a complete formal reconstruction of private training.
