# Qwen 3.8 Flash Next: architecture

## Data flow

Tokens → vocabulary + n-gram/PLE path → [GDN×3 → QSA] ×12 → gated residual streams + MoE → output; separately quantized MTP branch.

## How the parts work together

The backbone combines three recurrent Gated DeltaNet layers with a sparse-attention layer in each four-layer group. The sparse indexer selects compressed blocks, so its 2,048-token budget corresponds to a different abstraction from a full context length. The output remains autoregressive even though much of the attention work is recurrent or sparse.

A large n-gram embedding table provides an additional lookup path for local token patterns. It changes the balance between arithmetic and table access. The PLE configuration identifies where that representation is injected; treating it as an ordinary vocabulary embedding or dropping it because it is not in the 125B headline would change the model.

The main MoE selects a small subset of many experts. Alongside it, gated low-rank residual streams preserve several information paths. The configuration field hc_count is not enough by itself to label this mechanism identical to DeepSeek’s or GLM’s manifold-constrained hyper-connections. Their actual mixing rules differ.

The MTP module and its own expert precision must be loaded independently of the main routed experts. A mixed quantization loader that assumes one algorithm for every expert layer can pass target-only tests yet fail as soon as speculative decoding is enabled.

The architecture facts above are drawn from the publisher card and configuration; the workload consequences are analytical interpretation. [qwen3.8-flash-next-CARD](https://huggingface.co/Qwen/Qwen3.8-Flash-Next) [qwen3.8-flash-next-CFG](https://huggingface.co/Qwen/Qwen3.8-Flash-Next/raw/de4b8e4d43b917e7706784d8bb445c9af86a3540/config.json)

## Configuration extraction

This is a **selected, normalized projection**, not a byte-for-byte copy of the complete config. Field labels have been made comparable across models. Layer indices explicitly state zero-based or one-based conventions.

| Property | Value |
| --- | --- |
| architecture_class | Qwen4ExpForConditionalGeneration |
| model_type | qwen4_exp |
| layers | 48 |
| hidden_size | 2560 |
| linear_attention_layers | 36 |
| sparse_attention_layers | 12 |
| full_attention_interval | 4 |
| attention_heads | 24 |
| num_key_value_heads | 2 |
| head_dim | 256 |
| rotary_dim | 64 |
| linear_key_heads | 16 |
| linear_value_heads | 48 |
| linear_head_dim | 128 |
| linear_conv_width | 4 |
| mamba_ssm_dtype | float32 |
| routed_experts | 512 |
| experts_per_token | 10 |
| shared_experts | 1 |
| moe_intermediate_size | 640 |
| indexer_budget | 2048 |
| indexer_compress_ratio | 4 |
| indexer_heads | 4 |
| indexer_kv_heads | 1 |
| indexer_head_dim | 128 |
| hc_count | 4 |
| hc_lowrank | 320 |
| ngram_vocab_size_base | 20000000 |
| ngram_size | 3 |
| heads_per_ngram | 8 |
| ple_layer_ids | 2 |
| ple_embed_dim | 2560 |
| split_ngram_parts | 128 |
| mtp_layers | 1 |
| max_position_embeddings | 262144 |
| advertised_extended_context | 1000000 |
| vocab_size | 248320 |
| vision_layers | 27 |
| vision_hidden_size | 1152 |
| vision_heads | 16 |
| vision_patch_size | 16 |
| vision_output_size | 2560 |


Source for the extraction: [qwen3.8-flash-next-CFG](https://huggingface.co/Qwen/Qwen3.8-Flash-Next/raw/de4b8e4d43b917e7706784d8bb445c9af86a3540/config.json). Headline counts, modality descriptions and advertised extended context are additionally drawn from [qwen3.8-flash-next-CARD](https://huggingface.co/Qwen/Qwen3.8-Flash-Next). A `transformers_version` metadata field is not by itself proof of a minimum compatible package version.

## Memory and performance consequences

The advertised accounting is 125B main, 51B n-gram and 4B MTP, approximately 180B in that stated scope. The 6B activated count applies to the main computation and should not be divided by this combined scope to claim a precisely defined sparsity ratio.

In NVIDIA’s NVFP4 export the n-gram table is FP8, not FP4. It therefore contributes roughly 51 GB of ideal payload before table metadata, padding or placement effects. An estimate that multiplies 125B by half a byte misses an entire major memory component. Do not introduce CPU offload without measuring lookup locality, transfer bandwidth and tail latency.

The numeric examples are calculations from stated dimensions and assumptions, not measured allocations. [Memory mathematics](../../../reports/memory-math.md) explains the formulas and their limits. [qwen3.8-flash-next-CARD](https://huggingface.co/Qwen/Qwen3.8-Flash-Next) [qwen3.8-flash-next-CFG](https://huggingface.co/Qwen/Qwen3.8-Flash-Next/raw/de4b8e4d43b917e7706784d8bb445c9af86a3540/config.json) [HW](https://docs.nvidia.com/dgx/dgxb300-user-guide/introduction-to-dgxb300.html)

## What this report does not establish

Exact NVIDIA-export SGLang compatibility; end-to-end performance of n-gram placement choices; full checkpoint tensor-byte census; production throughput under realistic prefix reuse.

The public artifacts do not disclose every training-data, optimization or implementation detail. This report does not fill missing details with assumptions or present a complete formal reconstruction of private training.
