# GLM 5.3 Flash: architecture

## Data flow

Vision/text → hybrid attention and MoE blocks with four residual streams → text head. KDA layers maintain recurrent state; sparse MLA layers read selected token history. MTP proposes tokens, and the serving engine must verify them with the target and commit the corresponding accepted state.

## How the parts work together

Most text layers use KDA, while periodic NoPE sparse-MLA layers retrieve selected history. NoPE means that those attention projections do not use the ordinary rotary-position component; it does not mean that the whole model has no way to process sequence structure. The attention indexer includes pooled compression and a tail-selection mechanism.

Manifold-constrained hyper-connections maintain multiple residual streams and constrain how information mixes between them. The repeated Sinkhorn normalization configured for these connections is a specific model operation, not a generic replacement for the RMSNorm layer. Fusing residual communication must preserve that transformation.

The MoE has many more resident experts than each token activates. Its shared path, dense prefix and router remain part of the total compute and memory budget. A vision stack maps images and video frames into the text network’s representation; limiting image count is an admission-control decision as well as a preprocessing decision.

The native MTP layer is served through different APIs in the two engines. SGLang’s current recipe uses the EAGLE algorithm spelling for this native MTP path. That does not mean the model is using an unrelated external EAGLE checkpoint.

The public config supplies substantially more detail than an approximate 300B label: 45 main text layers, a separate next-token-prediction layer, a 24-layer vision encoder and the dimensions below. Preserve the official `text_config.linear_attn_config.gate_lower_bound=-5.0` and the enabled pooled-index tail selection. The RedHat derivative and serving guidance also expose the `linear_lower_bound` alias. Changing either changes model behavior; they are not free memory or speed controls. The four mHC streams are internal residual representations, not four requests or replicas. [glm-5.3-flash-CFG](https://huggingface.co/zai-org/GLM-5.3-Flash/raw/46a050bec13002ad29ee795c16e61cf4fa3c4a9c/config.json)

The architecture facts above are drawn from the publisher card and configuration; the workload consequences are analytical interpretation. [glm-5.3-flash-CARD](https://huggingface.co/zai-org/GLM-5.3-Flash/raw/46a050bec13002ad29ee795c16e61cf4fa3c4a9c/README.md) [glm-5.3-flash-CFG](https://huggingface.co/zai-org/GLM-5.3-Flash/raw/46a050bec13002ad29ee795c16e61cf4fa3c4a9c/config.json)

## Configuration extraction

This is a **selected, normalized projection**, not a byte-for-byte copy of the complete config. Field labels have been made comparable across models. Layer indices explicitly state zero-based or one-based conventions.

| Property | Value |
| --- | --- |
| architecture_class | Glm5NextForConditionalGeneration |
| text_model_type | glm5_next_text |
| layers | 45 |
| dense_prefix_layers | 3 |
| hidden_size | 4096 |
| moe_intermediate_size | 2048 |
| routed_experts | 288 |
| experts_per_token | 8 |
| shared_experts | 1 |
| kda_layers | 34 |
| sparse_mla_layers | 11 |
| full_attention_layer_indices_0based | 3, 7, 11, 15, 19, 23, 27, 31, 35, 39, 43 |
| attention_heads | 64 |
| kda_heads | 64 |
| kda_head_dim | 128 |
| kda_conv_width | 4 |
| q_lora_rank | 1536 |
| kv_lora_rank | 512 |
| qk_nope_head_dim | 256 |
| qk_rope_head_dim | 0 |
| v_head_dim | 256 |
| index_heads | 32 |
| index_head_dim | 128 |
| index_topk | 2048 |
| index_pool_compression | 4 |
| hc_mult | 4 |
| hc_sinkhorn_iters | 20 |
| nextn_layers | 1 |
| max_position_embeddings | 1048576 |
| vocab_size | 154880 |
| router_dtype | float32 |
| router_score | sigmoid |
| swiglu_limit | 10 |
| vision_layers | 24 |
| vision_hidden_size | 1024 |
| vision_heads | 16 |
| vision_patch_size | 14 |
| vision_output_size | 4096 |
| native_precision | FP8 |


Source for the extraction, rechecked on 2026-10-16 at `46a050bec13002ad29ee795c16e61cf4fa3c4a9c`: [glm-5.3-flash-CFG](https://huggingface.co/zai-org/GLM-5.3-Flash/raw/46a050bec13002ad29ee795c16e61cf4fa3c4a9c/config.json). Headline counts, modality descriptions and advertised extended context are additionally drawn from [glm-5.3-flash-CARD](https://huggingface.co/zai-org/GLM-5.3-Flash/raw/46a050bec13002ad29ee795c16e61cf4fa3c4a9c/README.md). A `transformers_version` metadata field is not by itself proof of a minimum compatible package version.

## Memory and performance consequences

The publisher rounds the model to 320B total / 18B active. Pinned Hub metadata for both official precision variants reports 321,323,031,390 parameters; the catalog uses that checkpoint total for weight-only arithmetic. The publisher's active-parameter count has not been independently reconstructed. Packed NVFP4 arrays and their scale tensors cannot be counted as if every stored scalar were an original model parameter. [glm-5.3-flash-META](https://huggingface.co/api/models/zai-org/GLM-5.3-Flash/revision/46a050bec13002ad29ee795c16e61cf4fa3c4a9c)

The official FP8 index reports 328,326,771,576 serialized tensor bytes (328.33 decimal GB); BF16 reports 642,646,653,816 bytes (642.65 GB). Runtime memory also includes caches, recurrent state, temporary buffers and any loader repacking. [glm-5.3-flash-INDEX](https://huggingface.co/zai-org/GLM-5.3-Flash/raw/46a050bec13002ad29ee795c16e61cf4fa3c4a9c/model.safetensors.index.json) [glm-5.3-flash-BF16-INDEX](https://huggingface.co/zai-org/GLM-5.3-Flash-BF16/raw/f9fed3bbc82291073373d67452e9f25317ef7577/model.safetensors.index.json)

Budget recurrent KDA state and sparse token cache independently. SGLang’s cookbook explicitly warns that its default Mamba-to-full-memory ratio is generic. Too little state capacity caps running requests; too much starves token history. Derive a candidate split from real request lengths and boot-log pool sizes instead of blindly maximizing the ratio.

For a simple state-size illustration, 34 × 64 × 128 × 128 × 4 bytes is 142,606,336 bytes = 136 MiB per sequence for the FP32 state matrices alone, excluding convolution state, MTP state and implementation overhead. This is not the final CUDA allocation and cannot be divided by EP or DCP unless the source path shards that state accordingly.

That calculation is for one logical, unsharded state snapshot. Prefix caching, branching and speculative verification can retain additional snapshots. A rejected draft must restore the KDA matrix and convolution history while discarding the rejected sparse-cache writes; copying only token KV cannot restore this hybrid model. Measure the actual per-rank state pool and token pool before deriving concurrency. [glm-5.3-flash-GR](https://docs.sglang.io/cookbook/autoregressive/GLM/GLM-5.3-Flash)

The numeric examples are calculations from stated dimensions and assumptions, not measured allocations. [Memory mathematics](../../../reports/memory-math.md) explains the formulas and their limits. [glm-5.3-flash-CARD](https://huggingface.co/zai-org/GLM-5.3-Flash/raw/46a050bec13002ad29ee795c16e61cf4fa3c4a9c/README.md) [glm-5.3-flash-CFG](https://huggingface.co/zai-org/GLM-5.3-Flash/raw/46a050bec13002ad29ee795c16e61cf4fa3c4a9c/config.json) [HW](https://docs.nvidia.com/dgx/dgxb300-user-guide/introduction-to-dgxb300.html)

## What this report does not establish

The RedHat quantization configuration is now inspected at an immutable revision: main routed experts use NVFP4 and MTP routed experts use FP8. Other exporters require their own configuration audit. Quality, loader memory, the best KDA/KV split and the disaggregation crossover still need local measurements.

The public artifacts do not disclose every training-data, optimization or implementation detail. This report does not fill missing details with assumptions or present a complete formal reconstruction of private training.
