# Mistral Medium 3.5: architecture

The report's abbreviated revision `22b2b86` was resolved again on 2026-10-16: the Hugging Face revision API returns the full atlas pin `22b2b868a15677cfa6061277ed2f653d1349a9ab`, also the current target revision. The short-pin uncertainty is closed for this retrieval; runs must still record the full SHA. [RR-GM-MISTRAL-SHORT](https://huggingface.co/api/models/mistralai/Mistral-Medium-3.5-128B/revision/22b2b86), [RR-GM-MISTRAL-PIN](https://huggingface.co/api/models/mistralai/Mistral-Medium-3.5-128B/revision/22b2b868a15677cfa6061277ed2f653d1349a9ab).

## Data flow

Text / Pixtral vision → projector → 88 dense GQA blocks with YaRN → output head → Mistral encoding/tool/reasoning protocol.

## How the parts work together

The language network uses dense feed-forward blocks and grouped-query attention. Many query heads share a smaller set of key/value heads. Unlike the hybrid models in this catalog, its text configuration does not declare a sliding window; full token history therefore drives attention-cache growth across the language layers.

The positional configuration extends a 4,096-position reference using YaRN with factor 64. The publisher identifies a concrete correction in commit `c4be198050fb5789774a55b92ed697becfbf20ae`: `mscale_all_dim` changed from 1.0 to 0.0. The pinned base config contains 0.0. The publisher warns that derivatives built with the earlier config can inherit degraded long-context behavior. [mistral-medium-3.5-FIXCFG](https://huggingface.co/mistralai/Mistral-Medium-3.5-128B/commit/c4be198050fb5789774a55b92ed697becfbf20ae)

The Pixtral vision encoder and multimodal projector process image inputs. Their precision exclusions are part of the official FP8 export, so the whole checkpoint is not homogeneous FP8. The text architecture class, vision architecture and tokenizer/encoding stack together define a valid model load.

The official repository contains both consolidated-format and Transformers-style weight shards. These are alternate representations, not six disjoint pieces of one larger model. Downloading both layouts approximately doubles weight download/storage volume. Startup transfer depends on which layout the loader reads; retaining both on disk does not imply loading both into GPU memory.

The architecture facts above are drawn from the publisher card and configuration; the workload consequences are analytical interpretation. [mistral-medium-3.5-CARD](https://huggingface.co/mistralai/Mistral-Medium-3.5-128B/blob/22b2b868a15677cfa6061277ed2f653d1349a9ab/README.md) [mistral-medium-3.5-CFG](https://huggingface.co/mistralai/Mistral-Medium-3.5-128B/raw/22b2b868a15677cfa6061277ed2f653d1349a9ab/config.json)

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
| sliding_window | null (explicit in the pinned configuration) |
| max_position_embeddings | 262144 |
| vocab_size | 131072 |
| tie_word_embeddings | False |
| activation | silu |
| rms_norm_eps | 1e-05 |
| rope_type | yarn |
| rope_factor | 64 |
| rope_mscale | 1.0 |
| rope_mscale_all_dim | 0.0 (corrected value) |
| rope_beta_fast | 4.0 |
| rope_beta_slow | 1.0 |
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
| weight_block_size | null (explicit in the pinned configuration) |
| excluded_quant_modules | vision_tower, multi_modal_projector, lm_head |


Source for the extraction: [mistral-medium-3.5-CFG](https://huggingface.co/mistralai/Mistral-Medium-3.5-128B/raw/22b2b868a15677cfa6061277ed2f653d1349a9ab/config.json). Headline counts, modality descriptions and advertised extended context are additionally drawn from [mistral-medium-3.5-CARD](https://huggingface.co/mistralai/Mistral-Medium-3.5-128B/blob/22b2b868a15677cfa6061277ed2f653d1349a9ab/README.md). A `transformers_version` metadata field is not by itself proof of a minimum compatible package version.

## Memory and performance consequences

At the pinned revision, each of the Transformers and consolidated indexes reports `metadata.total_size = 133605834656` bytes: about 133.606 decimal GB or 124.430 GiB of tensor payload per alternative layout. The sum across both alternatives is 267.212 GB and must not be used as the weight size of one loaded model. Index payload sizes exclude safetensors headers, auxiliary files and runtime allocations. [mistral-medium-3.5-HF-INDEX](https://huggingface.co/mistralai/Mistral-Medium-3.5-128B/raw/22b2b868a15677cfa6061277ed2f653d1349a9ab/model.safetensors.index.json) [mistral-medium-3.5-NATIVE-INDEX](https://huggingface.co/mistralai/Mistral-Medium-3.5-128B/raw/22b2b868a15677cfa6061277ed2f653d1349a9ab/consolidated.safetensors.index.json)

For one 262,144-token sequence, separate BF16 keys and values give `2 × 88 layers × 8 KV heads × 128 elements × 2 bytes × 262144 tokens = 94,489,280,512 bytes = 88 GiB` across the model. At 32,768 tokens the same ideal element payload is 11 GiB. These calculations exclude padding, any head replication, cache scales and engine overhead. FP8 KV would halve the element payload if supported and validated; quantized weights do not automatically imply FP8 KV.

| Total cached tokens per sequence | Ideal BF16 KV across the model |
| ---: | ---: |
| 32,768 | 11 GiB |
| 65,536 | 22 GiB |
| 131,072 | 44 GiB |
| 262,144 | 88 GiB |

These are derived payloads, not cache reservations. Sixteen full 32,768-token sequences would require 176 GiB of KV before weights; adding the 124.430 GiB index payload already exceeds a nominal 288 GB B300. An active-request limit of 32 therefore cannot be read as capacity for 32 simultaneously full contexts on TP1.

A single B300 can plausibly accommodate the FP8 weights and a constrained short-context workload, but this is not a long-context/concurrency guarantee. Establish correctness with the publisher’s TP8 example, then compare TP2, TP4 and a constrained TP1 probe under the same workload and total GPU budget.

The fresh SGLang cookbook states a TP2 Blackwell requirement and reports validation on four H200s. Treat TP1 as an additional capacity experiment outside that recipe; do not replace its recommendation with file-size arithmetic. The physical node and exact loader must settle whether the constrained case works. [mistral-medium-3.5-GR](https://docs.sglang.io/cookbook/autoregressive/Mistral/Mistral-Medium-3.5).

The numeric examples are calculations from stated dimensions and assumptions, not measured allocations. [Memory mathematics](../../../reports/memory-math.md) explains the formulas and their limits. [mistral-medium-3.5-CARD](https://huggingface.co/mistralai/Mistral-Medium-3.5-128B/blob/22b2b868a15677cfa6061277ed2f653d1349a9ab/README.md) [mistral-medium-3.5-CFG](https://huggingface.co/mistralai/Mistral-Medium-3.5-128B/raw/22b2b868a15677cfa6061277ed2f653d1349a9ab/config.json) [HW](https://docs.nvidia.com/dgx/dgxb300-user-guide/introduction-to-dgxb300.html)

## What this report does not establish

Installed-image and B300 compatibility at the pinned corrected revision; runtime memory beyond the reported weight payload; maximum safe concurrency and best TP width; no audited NVFP4 variant. SGLang support is documented upstream, but has not been run locally.

The public artifacts do not disclose every training-data, optimization or implementation detail. This report does not fill missing details with assumptions or present a complete formal reconstruction of private training.
