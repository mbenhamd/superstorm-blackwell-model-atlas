# Qwen 3.8 27B: architecture

## Data flow

Vision/text → [GDN → GDN → GDN → gated full attention] × 16, with dense MLPs → output head; optional MTP.

## How the parts work together

Three Gated DeltaNet layers are followed by a gated full-attention layer, repeated through the text backbone. The linear-attention path maintains a recurrent matrix state with a short convolutional component. Full-attention layers retain ordinary token-history cache. Consequently, the model has both a context-dependent cache and a concurrency-dependent state pool.

The key and value head counts in the linear path differ. The full-attention path has its own query-head count, KV-head count and head dimension. Deriving head dimensions by dividing hidden width by a familiar head count would produce the wrong shapes here; use the explicit configuration.

The feed-forward network is dense, not MoE. Every token traverses those linears; there is no expert-parallel switch that turns it into a sparsely activated 27B model. The vision encoder is shared infrastructure for image/video inputs, with spatial merging and temporal patching before language processing.

MTP is an optional additional serving path. It changes scheduling and temporary-state needs, not the base model’s dense-versus-MoE identity. The official context extension beyond the native window is not evidence that every engine, quantization and workload preserves useful accuracy at that length.

The architecture facts above are drawn from the publisher card and configuration; the workload consequences are analytical interpretation. [qwen3.8-27b-CARD](https://huggingface.co/Qwen/Qwen3.8-27B) [qwen3.8-27b-CFG](https://huggingface.co/Qwen/Qwen3.8-27B/raw/main/config.json)

## Configuration extraction

This is a **selected, normalized projection**, not a byte-for-byte copy of the complete config. Field labels have been made comparable across models. Layer indices explicitly state zero-based or one-based conventions.

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


Source for the extraction: [qwen3.8-27b-CFG](https://huggingface.co/Qwen/Qwen3.8-27B/raw/main/config.json). Headline counts, modality descriptions and advertised extended context are additionally drawn from [qwen3.8-27b-CARD](https://huggingface.co/Qwen/Qwen3.8-27B). A `transformers_version` metadata field is not by itself proof of a minimum compatible package version.

## Memory and performance consequences

A TP1 process is a serious first candidate on a 288 GB GPU: the ideal BF16 language-weight floor is only 54 GB before vision, auxiliary modules and overhead. Eight independent replicas can be compared with one TP8 process for total node goodput. The right answer still depends on concurrency, context and latency requirements.

For the 16 full-attention layers, a conventional unpadded BF16 KV payload estimate is 16 GiB per native 262,144-token sequence. The recurrent path additionally has an illustrative 144 MiB matrix-state payload per sequence if the published heads and FP32 state are represented directly. Actual allocators may pool, pad or share these differently.

The numeric examples are calculations from stated dimensions and assumptions, not measured allocations. [Memory mathematics](../../../reports/memory-math.md) explains the formulas and their limits. [qwen3.8-27b-CARD](https://huggingface.co/Qwen/Qwen3.8-27B) [qwen3.8-27b-CFG](https://huggingface.co/Qwen/Qwen3.8-27B/raw/main/config.json) [HW](https://docs.nvidia.com/dgx/dgxb300-user-guide/introduction-to-dgxb300.html)

## What this report does not establish

Actual TP1 NVFP4 kernel efficiency on this B300 firmware/container combination; optimal hybrid-cache split; useful quality at the extended context; performance under the user’s language and tool distributions.

The public artifacts do not disclose every training-data, optimization or implementation detail. This report does not fill missing details with assumptions or present a complete formal reconstruction of private training.
