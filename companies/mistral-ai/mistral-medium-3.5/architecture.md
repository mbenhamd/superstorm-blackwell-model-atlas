# Mistral Medium 3.5: architecture

## Data flow

Text / Pixtral vision → projector → 88 dense GQA blocks with YaRN → output head → Mistral encoding/tool/reasoning protocol.

## How the parts work together

The language network uses dense feed-forward blocks and grouped-query attention. Many query heads share a smaller set of key/value heads. Unlike the hybrid models in this catalog, its text configuration does not declare a sliding window; full token history therefore drives attention-cache growth across the language layers.

The positional configuration extends an original short window using YaRN parameters. A later corrected Transformers configuration is explicitly referenced by the publisher. A quantized derivative created before that correction can retain incorrect long-context behavior even when its weights are otherwise faithful.

The Pixtral vision encoder and multimodal projector process image inputs. Their precision exclusions are part of the official FP8 export, so the whole checkpoint is not homogeneous FP8. The text architecture class, vision architecture and tokenizer/encoding stack together define a valid model load.

The official repository contains both consolidated-format and Transformers-style weight shards. These are alternate representations, not six disjoint pieces of one larger model. Downloading both layouts approximately doubles storage and startup transfer without doubling the model’s capability.

The architecture facts above are drawn from the publisher card and configuration; the workload consequences are analytical interpretation. [mistral-medium-3.5-CARD](https://huggingface.co/mistralai/Mistral-Medium-3.5-128B) [mistral-medium-3.5-CFG](https://huggingface.co/mistralai/Mistral-Medium-3.5-128B/blob/main/config.json)

## Configuration extraction

This is a **selected, normalized projection**, not a byte-for-byte copy of the complete config. Field labels have been made comparable across models. Layer indices explicitly state zero-based or one-based conventions.

| Property | Value |
| --- | --- |
| architecture_class | Mistral3ForConditionalGeneration |
| text_model_type | ministral3 |
| layers | 88 |
| hidden_size | 12288 |
| intermediate_size | 28672 |
| attention_heads | 96 |
| num_key_value_heads | 8 |
| head_dim | 128 |
| sliding_window | null (explicitly in configuration or projection) |
| max_position_embeddings | 262144 |
| vocab_size | 131072 |
| tie_word_embeddings | False |
| activation | silu |
| rms_norm_eps | 1e-05 |
| rope_type | yarn |
| rope_factor | 64 |
| rope_theta | 1000000 |
| original_max_position_embeddings | 4096 |
| vision_model_type | pixtral |
| vision_layers | 48 |
| vision_hidden_size | 1664 |
| vision_heads | 16 |
| vision_head_dim | 104 |
| vision_intermediate_size | 8192 |
| vision_image_size | 1540 |
| vision_patch_size | 14 |
| spatial_merge_size | 2 |
| quant_method | fp8 |
| activation_scheme | static |
| weight_block_size | null (explicitly in configuration or projection) |
| excluded_quant_modules | vision_tower, multi_modal_projector, lm_head |


Source for the extraction: [mistral-medium-3.5-CFG](https://huggingface.co/mistralai/Mistral-Medium-3.5-128B/blob/main/config.json). Headline counts, modality descriptions and advertised extended context are additionally drawn from [mistral-medium-3.5-CARD](https://huggingface.co/mistralai/Mistral-Medium-3.5-128B). A `transformers_version` metadata field is not by itself proof of a minimum compatible package version.

## Memory and performance consequences

Use about 134 GB as the publisher-tree weight-layout magnitude, not the roughly 267 GB sum across both layouts. The exact byte count should be read from the selected index. With uniform GQA, an ideal BF16 KV payload for one native 262,144-token sequence is 88 GiB across the model, before padding and engine overhead; FP8 KV would halve the element payload if that path is supported and validated.

A single B300 can plausibly accommodate the FP8 weights and a constrained short-context workload, but this is not a long-context/concurrency guarantee. TP2 and TP4 are sensible candidates; compare them with the publisher’s TP8 example instead of assuming all eight GPUs are always necessary.

The numeric examples are calculations from stated dimensions and assumptions, not measured allocations. [Memory mathematics](../../../reports/memory-math.md) explains the formulas and their limits. [mistral-medium-3.5-CARD](https://huggingface.co/mistralai/Mistral-Medium-3.5-128B) [mistral-medium-3.5-CFG](https://huggingface.co/mistralai/Mistral-Medium-3.5-128B/blob/main/config.json) [HW](https://docs.nvidia.com/dgx/dgxb300-user-guide/introduction-to-dgxb300.html)

## What this report does not establish

Installed-image compatibility of the corrected configuration; exact selected-layout bytes; SGLang static-FP8 support for this artifact; maximum safe concurrency and best TP width; no audited NVFP4 variant.

The public artifacts do not disclose every training-data, optimization or implementation detail. This report does not fill missing details with assumptions or present a complete formal reconstruction of private training.
