# Qwen 3.8 Flash Next: precision and provenance

| Variant | Exact artifact | Actual precision contract | Evidence |
| --- | --- | --- | --- |
| bf16 | Qwen/Qwen3.8-Flash-Next | BF16 declared by text config | Publisher card and pinned config inspected |
| fp8 | Qwen/Qwen3.8-Flash-Next-FP8 | FP8 routed experts and PLE embedding; attention/shared experts excluded | Publisher card and pinned config inspected |
| nvfp4 | nvidia/Qwen3.8-Flash-Next-NVFP4 | Main routed experts NVFP4; MTP experts and PLE FP8; attention/shared BF16 per publisher | NVIDIA card and pinned quantization metadata inspected |


## Interpretation

The official FP8 config declares dynamic activations and 128×128 weight blocks, excludes attention/shared-expert modules, and explicitly includes the PLE n-gram embedding. The card and config were directly inspected at revision `236dfdf285828023ca3bcd3f37366c58a3469b13`. [qwen3.8-flash-next-FP8-CFG](https://huggingface.co/Qwen/Qwen3.8-Flash-Next-FP8/raw/236dfdf285828023ca3bcd3f37366c58a3469b13/config.json)

The official FP8 file listing contains 131 safetensors shards totaling **185,523,317,458 bytes = 172.782 GiB**. This confirms the vLLM recipe's 172.78 GiB checkpoint figure. Its index reports 185,502,232,570 tensor bytes; file headers account for the different scope. Neither value measures resident HBM, startup peaks or MTP-enabled allocations. [TOPQ-NEXTFP8-TREE](https://huggingface.co/api/models/Qwen/Qwen3.8-Flash-Next-FP8/tree/236dfdf285828023ca3bcd3f37366c58a3469b13?recursive=true&expand=false) [TOPQ-NEXTFP8-INDEX](https://huggingface.co/Qwen/Qwen3.8-Flash-Next-FP8/resolve/236dfdf285828023ca3bcd3f37366c58a3469b13/model.safetensors.index.json)

NVIDIA describes W4A4 NVFP4 for the main routed experts, BF16 attention/shared components, 128×128 block FP8 for MTP routed experts, and per-tensor FP8 for the PLE embedding. The pinned maps confirm 48 NVFP4 expert-module entries, one FP8 PLE entry and one block-FP8 MTP entry. They use different MTP algorithm labels: `FP8_PB_WO` in `config.json` and `FP8_BLOCK_SCALES` in `hf_quant_config.json`. Record both files rather than replacing them with a single inferred format label. [qwen3.8-flash-next-NV-CFG](https://huggingface.co/nvidia/Qwen3.8-Flash-Next-NVFP4/raw/fc694b54fb0174e0913e6adf86691ef85a4ead47/config.json) [qwen3.8-flash-next-NV-QUANT](https://huggingface.co/nvidia/Qwen3.8-Flash-Next-NVFP4/raw/fc694b54fb0174e0913e6adf86691ef85a4ead47/hf_quant_config.json)

These immutable files were rechecked on October 16. The supplied report's 51B-BF16 PLE assumption does not describe this NVIDIA export: its PLE entry is explicitly FP8. A community export's tensor types or TP4 recipe cannot establish either the memory footprint or the runtime layout of `nvidia/Qwen3.8-Flash-Next-NVFP4`. The exact NVIDIA revision remains `fc694b54fb0174e0913e6adf86691ef85a4ead47`. [RR-QWEN-NEXTNV-API](https://huggingface.co/api/models/nvidia/Qwen3.8-Flash-Next-NVFP4)

The card names vLLM commit `d4d703caf908786416585ceb1f369e2e0363358b` for target-only support and PR #55513 for MTP. GitHub confirms that PR merged on September 8, 2026 as `60ad959b6f1a5c8f602edbd608c8decbc0788c50`. The installed image must contain the relevant changes. NVIDIA's TP8 MTP example enables expert parallelism so each placed MTP expert retains its full 640-wide intermediate dimension. A plain TP8 split gives 80 values per rank; a TP4 split gives 160, so neither is naturally aligned to the checkpoint's 128-wide blocks. Current vLLM 0.31.0 source can refine TP4 scales losslessly to a 32-wide grid for compatible Triton kernels, or pad pure-TP shards when an explicitly selected backend requires whole blocks. These source paths qualify the recipe's plain-TP8 warning: alignment is a loader/backend constraint, not a universal prohibition on every current TP8 path. They do not establish a successful load for a particular container or the mixed NVIDIA MTP path. [TOPQ-VLLM-STABLE-FP8-ORACLE](https://raw.githubusercontent.com/vllm-project/vllm/db9527a46873454610df6dbedf79a36d6bf1a7f6/vllm/model_executor/layers/fused_moe/oracle/fp8.py) [TOPQ-VLLM-STABLE-FP8](https://raw.githubusercontent.com/vllm-project/vllm/db9527a46873454610df6dbedf79a36d6bf1a7f6/vllm/model_executor/layers/quantization/fp8.py)

[qwen3.8-flash-next-CARD](https://huggingface.co/Qwen/Qwen3.8-Flash-Next/raw/de4b8e4d43b917e7706784d8bb445c9af86a3540/README.md) [qwen3.8-flash-next-NV](https://huggingface.co/nvidia/Qwen3.8-Flash-Next-NVFP4/raw/fc694b54fb0174e0913e6adf86691ef85a4ead47/README.md) [qwen3.8-flash-next-VR](https://recipes.vllm.ai/Qwen/Qwen3.8-Flash-Next) [QPR](https://github.com/vllm-project/vllm/pull/55513)

## Separate FP4-Local export

`nvidia/Qwen3.8-Flash-Next-FP4-Local` resolves to `b9ce18a6887e18c089fdea8509a33e63429a3300`. It is a separate quantization-aware-distilled model. Its config assigns NVFP4 to the PLE table, W4A16 NVFP4 to MTP experts, and mixed NVFP4/MXFP8 to other components; 48 routed-expert entries use `weight_scale_encoding: csf`. This is a materially different precision and scale-storage contract from the earlier NVIDIA NVFP4 export. [RR-QWEN-LOCAL-API](https://huggingface.co/api/models/nvidia/Qwen3.8-Flash-Next-FP4-Local), [RR-QWEN-LOCAL-CFG](https://huggingface.co/nvidia/Qwen3.8-Flash-Next-FP4-Local/raw/b9ce18a6887e18c089fdea8509a33e63429a3300/config.json).

The card's approximately 96 GiB figure is **disk size**. The weight index declares 102,138,950,916 bytes, about 95.12 GiB, without establishing resident HBM or peak loading memory. NVIDIA attributes its validation to RTX PRO 6000 Blackwell and DGX Spark, with PLE offload in the RTX case. Its card explicitly requires named community containers because upstream support for the compressed scales has not landed. Neither those local-hardware results nor generic upstream NVFP4 support qualifies this checkpoint for B300. It remains a separate compatibility question, not a replacement for the atlas's pinned variant. [RR-QWEN-LOCAL-CARD](https://huggingface.co/nvidia/Qwen3.8-Flash-Next-FP4-Local/raw/b9ce18a6887e18c089fdea8509a33e63429a3300/README.md), [RR-QWEN-LOCAL-RESOLVED-INDEX](https://huggingface.co/nvidia/Qwen3.8-Flash-Next-FP4-Local/resolve/b9ce18a6887e18c089fdea8509a33e63429a3300/model.safetensors.index.json).

## Deployment rule

Pin the model revision, tokenizer/processor revision, quantization configuration, runtime commit and image digest together. A root BF16 `dtype` can coexist with quantized weights. The real contract includes serialized tensor types, scales, grouping, excluded modules, activation precision and runtime repacking. Do not cast a quantized checkpoint to BF16 and call it the original BF16 reference.

For every candidate, compare target-only quality against the appropriate reference before enabling lower-precision KV or speculation. [Precision analysis](../../../reports/precision-and-kernels.md) distinguishes NVFP4, MXFP4, FP8 and BF16. [NV4](https://developer.nvidia.com/blog/introducing-nvfp4-for-efficient-and-accurate-low-precision-inference/) [TE](https://docs.nvidia.com/deeplearning/transformer-engine/examples/fp8_primer.html)

## License provenance

Qwen Community License 1.0; NVIDIA derivative also names NVIDIA Open Model License. This is a provenance flag, not legal clearance. The ZIP contains no model weights. Original model terms and derivative exporter terms remain separate from this repository’s original code and prose.
