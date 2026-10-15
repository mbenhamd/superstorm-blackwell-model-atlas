# Qwen 3.8 Flash Next: precision and provenance

| Variant | Exact artifact | Actual precision contract | Evidence |
| --- | --- | --- | --- |
| bf16 | Qwen/Qwen3.8-Flash-Next | BF16 declared by text config | Publisher card and pinned config inspected |
| fp8 | Qwen/Qwen3.8-Flash-Next-FP8 | FP8 routed experts and PLE embedding; attention/shared experts excluded | Publisher card and pinned config inspected |
| nvfp4 | nvidia/Qwen3.8-Flash-Next-NVFP4 | Main routed experts NVFP4; MTP experts and PLE FP8; attention/shared BF16 per publisher | NVIDIA card and pinned quantization metadata inspected |


## Interpretation

The official FP8 config declares dynamic activations and 128×128 weight blocks, excludes attention/shared-expert modules, and explicitly includes the PLE n-gram embedding. The card and config were directly inspected at revision `236dfdf285828023ca3bcd3f37366c58a3469b13`. [qwen3.8-flash-next-FP8-CFG](https://huggingface.co/Qwen/Qwen3.8-Flash-Next-FP8/raw/236dfdf285828023ca3bcd3f37366c58a3469b13/config.json)

NVIDIA describes W4A4 NVFP4 for the main routed experts, BF16 attention/shared components, 128×128 block FP8 for MTP routed experts, and per-tensor FP8 for the PLE embedding. The pinned maps confirm 48 NVFP4 expert-module entries, one FP8 PLE entry and one block-FP8 MTP entry. They use different MTP algorithm labels: `FP8_PB_WO` in `config.json` and `FP8_BLOCK_SCALES` in `hf_quant_config.json`. Record both files rather than replacing them with a single inferred format label. [qwen3.8-flash-next-NV-CFG](https://huggingface.co/nvidia/Qwen3.8-Flash-Next-NVFP4/raw/fc694b54fb0174e0913e6adf86691ef85a4ead47/config.json) [qwen3.8-flash-next-NV-QUANT](https://huggingface.co/nvidia/Qwen3.8-Flash-Next-NVFP4/raw/fc694b54fb0174e0913e6adf86691ef85a4ead47/hf_quant_config.json)

The card names vLLM commit `d4d703caf908786416585ceb1f369e2e0363358b` for target-only support and PR #55513 for MTP. GitHub confirms that PR merged on September 8, 2026 as `60ad959b6f1a5c8f602edbd608c8decbc0788c50`. The installed image must contain the relevant changes. NVIDIA's TP8 MTP example enables expert parallelism: the 640-wide expert intermediate dimension divided by eight would be 80, which does not satisfy a 128-wide block boundary. This explains the documented constraint; it is not a local load test.

[qwen3.8-flash-next-CARD](https://huggingface.co/Qwen/Qwen3.8-Flash-Next/raw/de4b8e4d43b917e7706784d8bb445c9af86a3540/README.md) [qwen3.8-flash-next-NV](https://huggingface.co/nvidia/Qwen3.8-Flash-Next-NVFP4/raw/fc694b54fb0174e0913e6adf86691ef85a4ead47/README.md) [qwen3.8-flash-next-VR](https://recipes.vllm.ai/Qwen/Qwen3.8-Flash-Next) [QPR](https://github.com/vllm-project/vllm/pull/55513)

## Deployment rule

Pin the model revision, tokenizer/processor revision, quantization configuration, runtime commit and image digest together. A root BF16 `dtype` can coexist with quantized weights. The real contract includes serialized tensor types, scales, grouping, excluded modules, activation precision and runtime repacking. Do not cast a quantized checkpoint to BF16 and call it the original BF16 reference.

For every candidate, compare target-only quality against the appropriate reference before enabling lower-precision KV or speculation. [Precision primer](../../../reports/precision-and-kernels.md) distinguishes NVFP4, MXFP4, FP8 and BF16. [NV4](https://developer.nvidia.com/blog/introducing-nvfp4-for-efficient-and-accurate-low-precision-inference/) [TE](https://docs.nvidia.com/deeplearning/transformer-engine/examples/fp8_primer.html)

## License provenance

Qwen Community License 1.0; NVIDIA derivative also names NVIDIA Open Model License. This is a provenance flag, not legal clearance. The ZIP contains no model weights. Original model terms and derivative exporter terms remain separate from this repository’s original code and prose.
