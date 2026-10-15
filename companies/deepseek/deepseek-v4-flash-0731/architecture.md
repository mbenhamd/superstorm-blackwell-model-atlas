# DeepSeek V4 Flash 0731: architecture

## Data flow

Tokens → recent-window + compressed selected history → mHC streams → hash/routed experts → output; bundled DSpark features → proposals → target verifies.

## How the parts work together

The configuration exposes several interacting mechanisms: compressed attention representations, indexed sparse retrieval, a short sliding window, multiple hyper-connected streams, and routed experts. Its compression schedule alternates different compression ratios after the initial uncompressed layers. Draft-related entries also appear in the serialized schedule, so its length must not be used as the main layer count.

The local window protects access to recent tokens while the compressed and selected representations provide longer-range access. A sparse index budget is a selection budget, not the model’s maximum context length. The maximum positional setting and the available GPU cache are again separate constraints.

The model uses a specific router score function and scaling, plus bounded SwiGLU behavior. A generic MoE wrapper that changes the gate normalization or clipping would alter inference even if every checkpoint tensor loaded successfully.

The release bundles DSpark-related structure, including selected target-layer features and a Markov component. The configured block size, an engine’s proposal count, and the number of tokens emitted after verification are different quantities. Never “correct” the checkpoint’s block setting to match an example CLI argument without checking that implementation’s semantics.

The architecture facts above are drawn from the publisher card and configuration; the workload consequences are analytical interpretation. [deepseek-v4-flash-0731-CARD](https://huggingface.co/deepseek-ai/DeepSeek-V4-Flash-0731) [deepseek-v4-flash-0731-CFG](https://huggingface.co/deepseek-ai/DeepSeek-V4-Flash-0731/raw/main/config.json)

## Configuration extraction

This is a **selected, normalized projection**, not a byte-for-byte copy of the complete config. Field labels have been made comparable across models. Layer indices explicitly state zero-based or one-based conventions.

| Property | Value |
| --- | --- |
| architecture_class | DeepseekV4ForCausalLM |
| model_type | deepseek_v4 |
| layers | 43 |
| hidden_size | 4096 |
| attention_heads | 64 |
| num_key_value_heads | 1 |
| head_dim | 512 |
| routed_experts | 256 |
| experts_per_token | 6 |
| shared_experts | 1 |
| moe_intermediate_size | 2048 |
| expert_dtype | fp4 |
| quant_method | fp8 |
| quant_format | e4m3 |
| scale_format | ue8m0 |
| weight_block_size | 128, 128 |
| hc_mult | 4 |
| hc_sinkhorn_iters | 20 |
| index_heads | 64 |
| index_head_dim | 128 |
| index_topk | 512 |
| num_hash_layers | 3 |
| nextn_layers | 1 |
| o_groups | 8 |
| o_lora_rank | 1024 |
| q_lora_rank | 1024 |
| qk_rope_head_dim | 64 |
| sliding_window | 128 |
| max_position_embeddings | 1048576 |
| rope_type | yarn |
| rope_factor | 16 |
| original_max_position_embeddings | 65536 |
| rope_theta | 10000 |
| compress_rope_theta | 160000 |
| router_score | sqrtsoftplus |
| router_scale | 1.5 |
| swiglu_limit | 10 |
| vocab_size | 129280 |
| dspark_block_size | 5 |
| dspark_target_layer_ids | 40, 41, 42 |
| dspark_markov_rank | 256 |
| compression_schedule_description | First two uncompressed, then alternating ratios 4 and 128; configuration also contains draft entries |


Source for the extraction: [deepseek-v4-flash-0731-CFG](https://huggingface.co/deepseek-ai/DeepSeek-V4-Flash-0731/raw/main/config.json). Headline counts, modality descriptions and advertised extended context are additionally drawn from [deepseek-v4-flash-0731-CARD](https://huggingface.co/deepseek-ai/DeepSeek-V4-Flash-0731). A `transformers_version` metadata field is not by itself proof of a minimum compatible package version.

## Memory and performance consequences

Do not read quant_method=fp8 as an all-FP8 model: the same configuration explicitly sets expert_dtype=fp4. Likewise, a single generic GQA formula does not represent all compressed caches, indexes, windows and draft state in this architecture.

This report deliberately leaves exact July-31 total-parameter accounting unset in the machine-readable catalog. Common family-level parameter figures are not a substitute for counting this checkpoint’s main, auxiliary and speculative tensors. Architecture dimensions remain populated from the exact configuration.

The numeric examples are calculations from stated dimensions and assumptions, not measured allocations. [Memory mathematics](../../../reports/memory-math.md) explains the formulas and their limits. [deepseek-v4-flash-0731-CARD](https://huggingface.co/deepseek-ai/DeepSeek-V4-Flash-0731) [deepseek-v4-flash-0731-CFG](https://huggingface.co/deepseek-ai/DeepSeek-V4-Flash-0731/raw/main/config.json) [HW](https://docs.nvidia.com/dgx/dgxb300-user-guide/introduction-to-dgxb300.html)

## What this report does not establish

Exact total and active parameter scope for this checkpoint; source-to-image provenance of the selected backend; full raw compression schedule is not archived; no local B300 capacity or throughput results; exact SGLang 0731 integration not certified.

The public artifacts do not disclose every training-data, optimization or implementation detail. This report does not fill missing details with assumptions or present a complete formal reconstruction of private training.
