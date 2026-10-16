# Qwen 3.8 Flash Next: architecture

## Data flow

Text/image/video inputs → vision processing where needed + token embeddings → 12 groups of three GDN/MoE layers and one QSA/MoE layer → output. Gated residual branches span the backbone; n-gram/PLE features enter at its second layer. MTP adds an optional serving path.

## How the parts work together

The backbone combines three recurrent Gated DeltaNet layers with a sparse-attention layer in each four-layer group. Qwen describes a selection budget of 512 four-token micro-blocks, or 2,048 tokens. That budget limits selected attention history; it is not the model's context limit or a complete cache-size formula. The output remains autoregressive.

A large n-gram embedding table provides an additional lookup path for local token patterns. It changes the balance between arithmetic and table access. The PLE configuration identifies where that representation is injected; treating it as an ordinary vocabulary embedding or dropping it because it is not in the 125B headline would change the model.

The main MoE selects ten routed experts plus one shared expert. Alongside it, the publisher describes four residual branches with data-dependent read gates and per-branch write gates. The configuration field `hc_count` alone does not establish equivalence to another model family's hyper-connection mechanism.

When MTP is enabled, its loader must respect its own expert precision, which differs from the main routed experts in NVIDIA's export. A target-only load cannot establish that this speculative path works.

The architecture facts above are drawn from the publisher card and configuration; the workload consequences are analytical interpretation. [qwen3.8-flash-next-CARD](https://huggingface.co/Qwen/Qwen3.8-Flash-Next/raw/de4b8e4d43b917e7706784d8bb445c9af86a3540/README.md) [qwen3.8-flash-next-CFG](https://huggingface.co/Qwen/Qwen3.8-Flash-Next/raw/de4b8e4d43b917e7706784d8bb445c9af86a3540/config.json)

## Configuration extraction

This is a **selected, normalized projection**, not a byte-for-byte copy of the complete config. Counts are derived from `text_config.layer_types`; its twelve `full_attention` labels implement QSA according to the publisher card. `rotary_dim` is `head_dim × partial_rotary_factor`, and the two linear head dimensions both equal 128. The shared-expert count and extended-context claim come from the card. `ple_layer_ids: [2]` denotes the second backbone layer; the NVIDIA quantization map names its zero-based tensor path `layers.1.ple`. [qwen3.8-flash-next-NV-CFG](https://huggingface.co/nvidia/Qwen3.8-Flash-Next-NVFP4/raw/fc694b54fb0174e0913e6adf86691ef85a4ead47/config.json)

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
| ple_layer_ids (one-based) | [2] |
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


Source for the extraction: [qwen3.8-flash-next-CFG](https://huggingface.co/Qwen/Qwen3.8-Flash-Next/raw/de4b8e4d43b917e7706784d8bb445c9af86a3540/config.json). Headline counts, modality descriptions and advertised extended context are additionally drawn from [qwen3.8-flash-next-CARD](https://huggingface.co/Qwen/Qwen3.8-Flash-Next/raw/de4b8e4d43b917e7706784d8bb445c9af86a3540/README.md). A `transformers_version` metadata field is not by itself proof of a minimum compatible package version.

## Memory and performance consequences

The publisher's rounded language-model accounting is 125B main + 51B n-gram + 4B MTP, approximately 180B in that scope. This sum is not an exact tensor census and does not separately account for the vision encoder. The 6B activated headline applies to the main path; it should not be divided by this combined scope to claim a precisely defined sparsity ratio.

NVIDIA's quantization metadata marks the n-gram embedding as FP8. Applying one byte to the rounded 51B headline gives approximately 51 GB (47.5 GiB), before scales, padding and placement effects. The main experts' four-bit arithmetic does not cover this component. Measure table placement, lookup locality, transfer bandwidth and tail latency when comparing host offload with GPU residency. [qwen3.8-flash-next-NV-QUANT](https://huggingface.co/nvidia/Qwen3.8-Flash-Next-NVFP4/raw/fc694b54fb0174e0913e6adf86691ef85a4ead47/hf_quant_config.json)

The 36 GDN recurrent matrices contribute `36 × 48 × 128 × 128 × 4` bytes, or 108 MiB per FP32 state slot before convolution state, sharding, snapshots and allocator overhead. BF16 halves that matrix payload; it also changes numerical behavior. QSA still needs retained history and indexer data from which to select its 2,048-token working set. The selection budget cannot be substituted for stored history length in a memory estimate. [qwen3.8-flash-next-CFG](https://huggingface.co/Qwen/Qwen3.8-Flash-Next/raw/de4b8e4d43b917e7706784d8bb445c9af86a3540/config.json), [RR-QWEN-VLLM-PIN-INDEXER](https://raw.githubusercontent.com/vllm-project/vllm/f8460ef23659afd69046a81529ec2295e4c3f686/vllm/models/qwen4_exp/nvidia/indexer_qsa.py).

The inspected vLLM NVIDIA path also allocates a separate PLE convolution state and marks its state specification as TP-replicated. Enabling native MTP retains an additional multi-stream hidden buffer proportional to the maximum batched tokens, four residual streams, hidden width and activation bytes. A target-only loader filters `mtp.` weights; stored checkpoint size, target residency and MTP-enabled residency consequently have different scopes. [RR-QWEN-VLLM-PIN-NVIDIA](https://raw.githubusercontent.com/vllm-project/vllm/f8460ef23659afd69046a81529ec2295e4c3f686/vllm/models/qwen4_exp/nvidia/model.py)

The numeric examples are calculations from stated dimensions and assumptions, not measured allocations. [Memory mathematics](../../../reports/memory-math.md) explains the formulas and their limits. [qwen3.8-flash-next-CARD](https://huggingface.co/Qwen/Qwen3.8-Flash-Next/raw/de4b8e4d43b917e7706784d8bb445c9af86a3540/README.md) [qwen3.8-flash-next-CFG](https://huggingface.co/Qwen/Qwen3.8-Flash-Next/raw/de4b8e4d43b917e7706784d8bb445c9af86a3540/config.json) [HW](https://docs.nvidia.com/dgx/dgxb300-user-guide/introduction-to-dgxb300.html)

## What this report does not establish

B300 load, quality and performance for the documented SGLang NVIDIA TP1 recipe; n-gram placement costs; full checkpoint tensor-byte census; production throughput under realistic prefix reuse.

The public artifacts do not disclose every training-data, optimization or implementation detail. This report does not fill missing details with assumptions or present a complete formal reconstruction of private training.
