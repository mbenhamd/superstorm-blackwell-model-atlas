# Qwen 3.8 27B: architecture

## Data flow

Vision/text → [GDN → GDN → GDN → gated full attention] × 16, with dense MLPs → output head; optional MTP.

## How the parts work together

Three Gated DeltaNet layers are followed by a gated full-attention layer, repeated through the text backbone. The linear-attention path maintains a recurrent matrix state with a short convolutional component. Full-attention layers retain ordinary token-history cache. Consequently, the model has both a context-dependent cache and a concurrency-dependent state pool.

The key and value head counts in the linear path differ. The full-attention path has its own query-head count, KV-head count and head dimension. Deriving head dimensions by dividing hidden width by a familiar head count would produce the wrong shapes here; use the explicit configuration.

The feed-forward network is dense, not MoE. Every token traverses those linears; there is no expert-parallel switch that turns it into a sparsely activated 27B model. The vision encoder is shared infrastructure for image/video inputs, with spatial merging and temporal patching before language processing.

MTP is an optional additional serving path. It changes scheduling and temporary-state needs, not the base model’s dense-versus-MoE identity. The official context extension beyond the native window is not evidence that every engine, quantization and workload preserves useful accuracy at that length.

The architecture facts above are drawn from the publisher card and configuration; the workload consequences are analytical interpretation. [qwen3.8-27b-CARD](https://huggingface.co/Qwen/Qwen3.8-27B/raw/1d4bf0f2ff6012fd82039f2fa52739d0dd7c60c0/README.md) [qwen3.8-27b-CFG](https://huggingface.co/Qwen/Qwen3.8-27B/raw/1d4bf0f2ff6012fd82039f2fa52739d0dd7c60c0/config.json)

## Configuration extraction

This is a **selected, normalized projection**, not a byte-for-byte copy of the complete config. Field labels have been made comparable across models. Layer counts are derived from `text_config.layer_types`; `rotary_dim` is `head_dim × partial_rotary_factor`; `nextn_layers` corresponds to `text_config.mtp_num_hidden_layers`. The extended-context claim comes from the card rather than the config.

| Property | Value |
| --- | --- |
| architecture_class | Qwen3_5ForConditionalGeneration |
| model_type | qwen3_5 |
| layers | 64 |
| hidden_size | 5120 |
| intermediate_size | 17408 |
| linear_attention_layers | 48 |
| full_attention_layers | 16 |
| full_attention_interval | 4 |
| full_attention_heads | 24 |
| full_kv_heads | 4 |
| full_head_dim | 256 |
| rotary_dim | 64 |
| linear_key_heads | 16 |
| linear_value_heads | 48 |
| linear_key_head_dim | 128 |
| linear_value_head_dim | 128 |
| linear_conv_width | 4 |
| mamba_ssm_dtype | float32 |
| nextn_layers | 1 |
| max_position_embeddings | 262144 |
| advertised_extended_context | 1000000 |
| vocab_size | 248320 |
| vision_layers | 27 |
| vision_hidden_size | 1152 |
| vision_heads | 16 |
| vision_intermediate_size | 4304 |
| vision_patch_size | 16 |
| vision_spatial_merge | 2 |
| vision_temporal_patch | 2 |
| vision_output_size | 5120 |


Source for the extraction: [qwen3.8-27b-CFG](https://huggingface.co/Qwen/Qwen3.8-27B/raw/1d4bf0f2ff6012fd82039f2fa52739d0dd7c60c0/config.json). Headline counts, modality descriptions and advertised extended context are additionally drawn from [qwen3.8-27b-CARD](https://huggingface.co/Qwen/Qwen3.8-27B/raw/1d4bf0f2ff6012fd82039f2fa52739d0dd7c60c0/README.md). A `transformers_version` metadata field is not by itself proof of a minimum compatible package version.

## Memory and performance consequences

A TP1 process is a memory-planning candidate on a 288 GB GPU. Multiplying the publisher's rounded 27B language-model headline by two bytes gives approximately 54 GB (50.3 GiB) at BF16. This is not a checkpoint byte census or a strict lower bound; vision, auxiliary modules and runtime allocations need separate accounting. Compare independent replicas with sharded layouts for total node goodput at the same workload and latency target.

For the 16 full-attention layers, conventional unpadded BF16 KV payload is `2 × 16 × 4 × 256 × 262144 × 2` bytes, or 16 GiB per native-length sequence. The recurrent matrix alone is `48 × 48 × 128 × 128 × 4` bytes, or 144 MiB per state slot at FP32. Convolution state, cached snapshots, speculative verification and allocator overhead are additional. Neither calculation measures an engine's complete state pool.

The numeric examples are calculations from stated dimensions and assumptions, not measured allocations. [Memory mathematics](../../../reports/memory-math.md) explains the formulas and their limits. [qwen3.8-27b-CARD](https://huggingface.co/Qwen/Qwen3.8-27B/raw/1d4bf0f2ff6012fd82039f2fa52739d0dd7c60c0/README.md) [qwen3.8-27b-CFG](https://huggingface.co/Qwen/Qwen3.8-27B/raw/1d4bf0f2ff6012fd82039f2fa52739d0dd7c60c0/config.json) [HW](https://docs.nvidia.com/dgx/dgxb300-user-guide/introduction-to-dgxb300.html)

## What this report does not establish

Actual TP1 NVFP4 kernel efficiency on this B300 firmware/container combination; optimal hybrid-cache split; useful quality at the extended context; performance under the user’s language and tool distributions.

The public artifacts do not disclose every training-data, optimization or implementation detail. This report does not fill missing details with assumptions or present a complete formal reconstruction of private training.
