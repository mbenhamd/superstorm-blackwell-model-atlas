# Gemma 4 31B IT: architecture

## Data flow

Vision/text → [five local sliding layers → one global layer] ×10 with dense MLPs → tied output head + logit soft-cap → sampling.

## How the parts work together

Five local sliding-attention layers are followed by one global layer. Local attention keeps recent context within a bounded window, while global layers provide long-distance interaction. This substantially changes the cache shape relative to 60 uniform full-attention layers.

Local and global attention have different KV-head counts and head dimensions. The publisher describes unified keys and values in the global layers. This same-layer behavior is distinct from the configuration’s `num_kv_shared_layers: 0`. A formula that allocates separate K and V buffers in every layer is therefore an assumption about storage, not a deduction from the config. Inspect the selected engine’s allocator before claiming an exact physical cache size.

The feed-forward blocks are dense and use the configured GELU approximation. Tied embeddings and output-head behavior matter both for loading and for quantization exclusions. Final logit soft-capping changes how scores reach the sampler; it must remain in the generation path.

Image features are processed through the vision tower before text generation. The presence of audio token identifiers elsewhere in a shared family configuration is not proof of an audio encoder in this specific variant. Capability must be checked at the concrete model, processor and runtime level.

The architecture facts above are drawn from the publisher card and configuration; the workload consequences are analytical interpretation. [gemma-4-31b-it-CARD](https://huggingface.co/google/gemma-4-31B-it/blob/842da3794eaa0b77d5f08bae87a17459d91ff475/README.md) [gemma-4-31b-it-CFG](https://huggingface.co/google/gemma-4-31B-it/raw/842da3794eaa0b77d5f08bae87a17459d91ff475/config.json)

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
| audio_config | null (explicit in the pinned configuration) |
| vision_hidden_size | 1152 |
| vision_head_dim | 72 |
| vision_intermediate_size | 4304 |
| vision_default_output_length | 280 |


Source for the extraction: [gemma-4-31b-it-CFG](https://huggingface.co/google/gemma-4-31B-it/raw/842da3794eaa0b77d5f08bae87a17459d91ff475/config.json). Headline counts, modality descriptions and advertised extended context are additionally drawn from [gemma-4-31b-it-CARD](https://huggingface.co/google/gemma-4-31B-it/blob/842da3794eaa0b77d5f08bae87a17459d91ff475/README.md). A `transformers_version` metadata field is not by itself proof of a minimum compatible package version.

## Memory and performance consequences

The pinned base repository lists 62,546,338,248 bytes of BF16 safetensors files, including file headers (about 62.55 decimal GB). This weight magnitude makes TP1 a reasonable B300 candidate; actual startup headroom still needs measuring. The rounded 31B family label is not an exact tensor census. [gemma-4-31b-it-BASE-TREE](https://huggingface.co/api/models/google/gemma-4-31B-it/tree/842da3794eaa0b77d5f08bae87a17459d91ff475?recursive=false&expand=false)

Lower precision can free memory for more requests or longer inputs. Multiple TP1 replicas use separate GPUs and separate weight copies; they do not create extra GPUs. Compare their aggregate throughput and per-request latency with tensor sharding under the same node budget.

Local and global cache pools need compatible budgeting. A user who sends many maximum-length requests can exhaust global cache even though most layers use a short window. Vision preprocessing adds its own transient memory; count image size and number, not merely the number of HTTP requests.

Repository file metadata and any cache calculations are not measured GPU allocations. [Memory mathematics](../../../reports/memory-math.md) explains the formulas and their limits. [gemma-4-31b-it-CARD](https://huggingface.co/google/gemma-4-31B-it/blob/842da3794eaa0b77d5f08bae87a17459d91ff475/README.md) [gemma-4-31b-it-CFG](https://huggingface.co/google/gemma-4-31B-it/raw/842da3794eaa0b77d5f08bae87a17459d91ff475/config.json) [HW](https://docs.nvidia.com/dgx/dgxb300-user-guide/introduction-to-dgxb300.html)

## What this report does not establish

Physical KV allocation under attention_k_eq_v in the selected engine; exact export-level SGLang compatibility; correct tool template at the final image revision; local B300 quality and latency.

The public artifacts do not disclose every training-data, optimization or implementation detail. This report does not fill missing details with assumptions or present a complete formal reconstruction of private training.
