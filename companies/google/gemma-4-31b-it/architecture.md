# Gemma 4 31B IT: architecture

## Data flow

Vision/text → [five local sliding layers → one global layer] ×10 with dense MLPs → tied output head + logit soft-cap → sampling.

## How the parts work together

Five local sliding-attention layers are followed by one global layer. Local attention keeps recent context within a bounded window, while global layers provide long-distance interaction. This substantially changes the cache shape relative to 60 uniform full-attention layers.

Local and global attention have different KV-head counts and head dimensions. The configuration also marks a key/value-sharing behavior. Consequently, a generic twice-keys-times-values estimate can misrepresent the implementation’s physical cache. Inspect the actual allocator and shared representation before claiming an exact byte count.

The feed-forward blocks are dense and use the configured GELU approximation. Tied embeddings and output-head behavior matter both for loading and for quantization exclusions. Final logit soft-capping changes how scores reach the sampler; it must remain in the generation path.

Image features are processed through the vision tower before text generation. The presence of audio token identifiers elsewhere in a shared family configuration is not proof of an audio encoder in this specific variant. Capability must be checked at the concrete model, processor and runtime level.

The architecture facts above are drawn from the publisher card and configuration; the workload consequences are analytical interpretation. [gemma-4-31b-it-CARD](https://huggingface.co/google/gemma-4-31B-it) [gemma-4-31b-it-CFG](https://huggingface.co/google/gemma-4-31B-it/raw/main/config.json)

## Configuration extraction

This is a **selected, normalized projection**, not a byte-for-byte copy of the complete config. Field labels have been made comparable across models. Layer indices explicitly state zero-based or one-based conventions.

| Property | Value |
| --- | --- |
| architecture_class | Gemma4ForConditionalGeneration |
| model_type | gemma4 |
| layers | 60 |
| hidden_size | 5376 |
| intermediate_size | 21504 |
| enable_moe_block | False |
| local_attention_layers | 50 |
| global_attention_layers | 10 |
| attention_heads | 32 |
| local_kv_heads | 16 |
| local_head_dim | 256 |
| global_kv_heads | 4 |
| global_head_dim | 512 |
| attention_k_eq_v | True |
| sliding_window | 1024 |
| max_position_embeddings | 262144 |
| vocab_size | 262144 |
| tie_word_embeddings | True |
| activation | gelu_pytorch_tanh |
| final_logit_softcapping | 30 |
| full_rope_theta | 1000000 |
| full_partial_rotary_factor | 0.25 |
| local_rope_theta | 10000 |
| num_kv_shared_layers | 0 |
| audio_config | null (explicitly in configuration or projection) |
| vision_hidden_size | 1152 |
| vision_head_dim | 72 |
| vision_intermediate_size | 4304 |
| vision_default_output_length | 280 |


Source for the extraction: [gemma-4-31b-it-CFG](https://huggingface.co/google/gemma-4-31B-it/raw/main/config.json). Headline counts, modality descriptions and advertised extended context are additionally drawn from [gemma-4-31b-it-CARD](https://huggingface.co/google/gemma-4-31B-it). A `transformers_version` metadata field is not by itself proof of a minimum compatible package version.

## Memory and performance consequences

Its modest weight size makes TP1 an important baseline on B300. Low precision may free room for longer inputs or more replicas, but it is not necessary merely to fit the model. A TP8 deployment can pay communication costs that independent replicas avoid.

Local and global cache pools need compatible budgeting. A user who sends many maximum-length requests can exhaust global cache even though most layers use a short window. Vision preprocessing adds its own transient memory; count image size and number, not merely the number of HTTP requests.

The numeric examples are calculations from stated dimensions and assumptions, not measured allocations. [Memory mathematics](../../../reports/memory-math.md) explains the formulas and their limits. [gemma-4-31b-it-CARD](https://huggingface.co/google/gemma-4-31B-it) [gemma-4-31b-it-CFG](https://huggingface.co/google/gemma-4-31B-it/raw/main/config.json) [HW](https://docs.nvidia.com/dgx/dgxb300-user-guide/introduction-to-dgxb300.html)

## What this report does not establish

Physical KV allocation under attention_k_eq_v in the selected engine; exact export-level SGLang compatibility; correct tool template at the final image revision; local B300 quality and latency.

The public artifacts do not disclose every training-data, optimization or implementation detail. This report does not fill missing details with assumptions or present a complete formal reconstruction of private training.
