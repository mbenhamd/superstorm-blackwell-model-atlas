# GLM 5.3: architecture

## Data flow

Tokens → embeddings → 78 attention/feed-forward blocks → output head. Every main block uses MLA with DSA; the first three feed-forward blocks are dense and the remaining 75 use routed/shared experts. The separate MTP layer proposes tokens for target verification.

## How the parts work together

The configuration describes MLA with a separate sparse-attention indexer. The model first constructs representations that make token-history storage cheaper than retaining a separate full key/value vector for every query head. The indexer then selects a limited subset of history for the more expensive attention operation. Compression of what is stored and sparsification of what is read are distinct optimizations.

A dense prefix is followed by routed MoE layers. Shared experts provide a common feed-forward contribution while selected routed experts specialize the token transformation. The router uses its own numerical precision and score function; expert quantization is not permission to quantize router decisions without validation.

The index-selection frequency exposes reuse across layers. Reusing index selections can avoid repeated work, but correctness depends on the implementation’s layer boundaries and index cache. It is not equivalent to asking every layer to select a fresh arbitrary top-k set.

The explicit `indexer_types` array resolves that schedule: zero-based layers 0, 1, 2 and 6, 10, …, 74 perform full index selection; the other 57 layers reuse selections. Thus `index_topk_freq=4` does not describe four-token chunks. `index_share_for_mtp_iteration=true` additionally permits reuse across draft iterations; the SGLang recipe limits that optimization to draft top-k one. Selecting at most 2,048 entries for sparse attention does not make the complete history, index scoring or serving memory constant-sized. [glm-5.3-CFG](https://huggingface.co/zai-org/GLM-5.3/raw/ba32f8c19c8738e2c57c71798c601d477a7bf844/config.json) [glm-5.3-GR](https://docs.sglang.io/cookbook/autoregressive/GLM/GLM-5.3)

The multi-token-prediction (MTP) extension can propose multiple steps for speculative serving. It does not convert the main model into a dense small model. Generation remains a target-model process with draft verification and cache bookkeeping.

The architecture facts above are drawn from the publisher card and configuration; the workload consequences are analytical interpretation. [glm-5.3-CARD](https://huggingface.co/zai-org/GLM-5.3/raw/ba32f8c19c8738e2c57c71798c601d477a7bf844/README.md) [glm-5.3-CFG](https://huggingface.co/zai-org/GLM-5.3/raw/ba32f8c19c8738e2c57c71798c601d477a7bf844/config.json)

## Configuration extraction

This is a **selected, normalized projection**, not a byte-for-byte copy of the complete config. Field labels have been made comparable across models. Layer indices explicitly state zero-based or one-based conventions.

| Property | Value |
| --- | --- |
| architecture_class | GlmMoeDsaForCausalLM |
| model_type | glm_moe_dsa |
| layers | 78 |
| dense_prefix_layers | 3 |
| hidden_size | 6144 |
| dense_intermediate_size | 12288 |
| moe_intermediate_size | 2048 |
| routed_experts | 256 |
| experts_per_token | 8 |
| shared_experts | 1 |
| attention_heads | 64 |
| q_lora_rank | 2048 |
| kv_lora_rank | 512 |
| qk_nope_head_dim | 192 |
| qk_rope_head_dim | 64 |
| v_head_dim | 256 |
| index_heads | 32 |
| index_head_dim | 128 |
| index_topk | 2048 |
| index_selection_frequency | 4 |
| nextn_layers | 1 |
| max_position_embeddings | 1048576 |
| vocab_size | 154880 |
| router_dtype | float32 |
| router_score | sigmoid |
| router_scale | 2.5 |
| quant_method | fp8 |
| fp8_format | e4m3 |
| weight_block_size | 128, 128 |
| activation_scheme | dynamic |


Source for the extraction, rechecked on 2026-10-16 at `ba32f8c19c8738e2c57c71798c601d477a7bf844`: [glm-5.3-CFG](https://huggingface.co/zai-org/GLM-5.3/raw/ba32f8c19c8738e2c57c71798c601d477a7bf844/config.json). Headline counts, modality descriptions and advertised extended context are additionally drawn from [glm-5.3-CARD](https://huggingface.co/zai-org/GLM-5.3/raw/ba32f8c19c8738e2c57c71798c601d477a7bf844/README.md). A `transformers_version` metadata field is not by itself proof of a minimum compatible package version.

## Memory and performance consequences

The parameter scopes can now be reconciled. The pinned official FP8 and BF16 Hub metadata each report 753,329,940,480 parameters. The BF16 index maps 791 tensors to the extra layer `model.layers.78`; HTTP range reads of their five safetensors headers give 9,952,920,576 parameters. Subtracting that MTP layer gives 743,377,019,904 main-model parameters, consistent with the recipe's approximate 743B headline. The 39B active figure remains a recipe headline, not an independently counted active path. This reconciles named tensors in the stored artifacts; it does not independently verify unique training parameters, deduplicate tied/shared weights or constitute a complete tensor census. [glm-5.3-META](https://huggingface.co/api/models/zai-org/GLM-5.3/revision/ba32f8c19c8738e2c57c71798c601d477a7bf844) [glm-5.3-BF16-INDEX](https://huggingface.co/zai-org/GLM-5.3-BF16/resolve/abf42e6c0e53bc29a875511301e7b7fcd220315b/model.safetensors.index.json) [Header retrievals](sources.md)

The FP8 index reports 755,617,140,416 serialized tensor bytes (755.62 decimal GB); the BF16 index reports 1,506,659,919,872 bytes (1,506.66 GB). These include the stored checkpoint's precision mix and are not CUDA load measurements. Both payloads are below the reference node's advertised 8 × 288 GB aggregate capacity, but per-rank allocation, KV/indexer caches, graph capture, temporary buffers and desired concurrency determine whether a launch works. A lower scheduling limit alone does not prove that one maximum-length request fits. [glm-5.3-INDEX](https://huggingface.co/zai-org/GLM-5.3/resolve/ba32f8c19c8738e2c57c71798c601d477a7bf844/model.safetensors.index.json) [glm-5.3-BF16-INDEX](https://huggingface.co/zai-org/GLM-5.3-BF16/resolve/abf42e6c0e53bc29a875511301e7b7fcd220315b/model.safetensors.index.json)

The numeric examples are calculations from stated dimensions and assumptions, not measured allocations. [Memory mathematics](../../../reports/memory-math.md) explains the formulas and their limits. [glm-5.3-CARD](https://huggingface.co/zai-org/GLM-5.3/raw/ba32f8c19c8738e2c57c71798c601d477a7bf844/README.md) [glm-5.3-CFG](https://huggingface.co/zai-org/GLM-5.3/raw/ba32f8c19c8738e2c57c71798c601d477a7bf844/config.json) [HW](https://docs.nvidia.com/dgx/dgxb300-user-guide/introduction-to-dgxb300.html)

## What this report does not establish

Actual per-rank load and cache capacity on this node; exporter-specific quality under the application prompts; inclusion of required fixes in the selected image; and the workload crossover between vLLM and SGLang remain unmeasured. The 743B/753B accounting is now reconciled from pinned metadata.

The public artifacts do not disclose every training-data, optimization or implementation detail. This report does not fill missing details with assumptions or present a complete formal reconstruction of private training.
