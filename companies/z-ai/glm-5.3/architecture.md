# GLM 5.3: architecture

## Data flow

Tokens → dense prefix → MLA latent cache + DSA index selection → routed/shared experts → repeat → output; optional MTP → target verification.

## How the parts work together

The configuration describes MLA with a separate sparse-attention indexer. The model first constructs representations that make token-history storage cheaper than retaining a separate full key/value vector for every query head. The indexer then selects a limited subset of history for the more expensive attention operation. Compression of what is stored and sparsification of what is read are distinct optimizations.

A dense prefix is followed by routed MoE layers. Shared experts provide a common feed-forward contribution while selected routed experts specialize the token transformation. The router uses its own numerical precision and score function; expert quantization is not permission to quantize router decisions without validation.

The index-selection frequency exposes reuse across layers. Reusing index selections can avoid repeated work, but correctness depends on the implementation’s layer boundaries and index cache. It is not equivalent to asking every layer to select a fresh arbitrary top-k set.

The next-token-prediction extension can propose multiple steps for speculative serving. It does not convert the main model into a dense small model. Generation remains a target-model process with draft verification and cache bookkeeping.

The architecture facts above are drawn from the publisher card and configuration; the workload consequences are analytical interpretation. [glm-5.3-CARD](https://huggingface.co/zai-org/GLM-5.3) [glm-5.3-CFG](https://huggingface.co/zai-org/GLM-5.3/raw/main/config.json)

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


Source for the extraction: [glm-5.3-CFG](https://huggingface.co/zai-org/GLM-5.3/raw/main/config.json). Headline counts, modality descriptions and advertised extended context are additionally drawn from [glm-5.3-CARD](https://huggingface.co/zai-org/GLM-5.3). A `transformers_version` metadata field is not by itself proof of a minimum compatible package version.

## Memory and performance consequences

The approximately 743B main-model count in the engine recipe and the 753B figure displayed for the RedHat checkpoint have different apparent accounting scopes. This atlas does not silently equate them or assert an exact explanation without tensor-level accounting. Use checkpoint bytes and the loader’s allocated-memory report for planning.

At this scale, FP8 weights can fit across the eight-GPU node while leaving substantial space compared with K3, but a 1M-token configuration still needs a KV, sparse-indexer, graph and concurrency budget. Reducing a scheduling limit can reduce peak workspace; it is not a mathematical substitute for proving that one maximum-length request fits.

The numeric examples are calculations from stated dimensions and assumptions, not measured allocations. [Memory mathematics](../../../reports/memory-math.md) explains the formulas and their limits. [glm-5.3-CARD](https://huggingface.co/zai-org/GLM-5.3) [glm-5.3-CFG](https://huggingface.co/zai-org/GLM-5.3/raw/main/config.json) [HW](https://docs.nvidia.com/dgx/dgxb300-user-guide/introduction-to-dgxb300.html)

## What this report does not establish

Exact reason for 743B versus 753B accounting; exact BF16 single-node usable capacity; exporter-specific quality under your prompts; stable-image inclusion of every recent fix; SGLang performance relative to vLLM on this OEM node.

The public artifacts do not disclose every training-data, optimization or implementation detail. This report does not fill missing details with assumptions or present a complete formal reconstruction of private training.
