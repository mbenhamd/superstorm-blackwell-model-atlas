# Qwen 3.8 27B: precision and provenance

| Variant | Exact artifact | Actual precision contract | Evidence |
| --- | --- | --- | --- |
| bf16 | Qwen/Qwen3.8-27B | BF16 declared by text config | Publisher card and pinned config inspected |
| fp8 | Qwen/Qwen3.8-27B-FP8 | E4M3 FP8 with 128×128 weight blocks and excluded modules | Publisher card and pinned config inspected |
| nvfp4 | nvidia/Qwen3.8-27B-NVFP4 | NVFP4 MLP/head + FP8 attention projections; MTP excluded from quantization map | NVIDIA card and pinned quantization metadata inspected |


## Interpretation

Keep the BF16, official FP8 and NVIDIA mixed export as separate comparisons. The official FP8 config declares dynamic activations and 128×128 weight blocks; its exclusion list includes the vision tower, language head and selected recurrent components. The NVIDIA map assigns NVFP4 to 193 MLP/head module entries and FP8 to 208 attention projection entries, and excludes `mtp*`. These are metadata entries, not a tensor-byte census. [qwen3.8-27b-FP8-CFG](https://huggingface.co/Qwen/Qwen3.8-27B-FP8/raw/017b9c7af6b5689d5dd426a76e0bc077eb5ca20a/config.json) [qwen3.8-27b-NV-CFG](https://huggingface.co/nvidia/Qwen3.8-27B-NVFP4/raw/482ca0f3832238542f8f5295dde86b5f22711d80/config.json)

**Producer-version conflict:** NVIDIA's card names ModelOpt 0.48.0 and local-Hessian calibration, but both pinned `config.json` and `hf_quant_config.json` record producer version `0.47.0.dev80+g913f5e224`. The audit cannot reconcile the exporter version from these artifacts; preserve both observations when reproducing the checkpoint. [qwen3.8-27b-NV-QUANT](https://huggingface.co/nvidia/Qwen3.8-27B-NVFP4/raw/482ca0f3832238542f8f5295dde86b5f22711d80/hf_quant_config.json)

The rounded weight arithmetic makes one B300 a plausible starting point; startup fit at the requested workload remains untested. NVFP4 may reduce bandwidth or permit more cache capacity, but quantization and kernel-launch overhead can offset that gain at low batch sizes. Benchmark the actual workload and retain BF16 as the quality reference.

[qwen3.8-27b-CARD](https://huggingface.co/Qwen/Qwen3.8-27B/raw/1d4bf0f2ff6012fd82039f2fa52739d0dd7c60c0/README.md) [qwen3.8-27b-NV](https://huggingface.co/nvidia/Qwen3.8-27B-NVFP4/raw/482ca0f3832238542f8f5295dde86b5f22711d80/README.md) [qwen3.8-27b-FP8](https://huggingface.co/Qwen/Qwen3.8-27B-FP8/raw/017b9c7af6b5689d5dd426a76e0bc077eb5ca20a/README.md) [qwen3.8-27b-VR](https://recipes.vllm.ai/Qwen/Qwen3.8-27B)

## Deployment rule

Pin the model revision, tokenizer/processor revision, quantization configuration, runtime commit and image digest together. A root BF16 `dtype` can coexist with quantized weights. The real contract includes serialized tensor types, scales, grouping, excluded modules, activation precision and runtime repacking. Do not cast a quantized checkpoint to BF16 and call it the original BF16 reference.

For every candidate, compare target-only quality against the appropriate reference before enabling lower-precision KV or speculation. [Precision primer](../../../reports/precision-and-kernels.md) distinguishes NVFP4, MXFP4, FP8 and BF16. [NV4](https://developer.nvidia.com/blog/introducing-nvfp4-for-efficient-and-accurate-low-precision-inference/) [TE](https://docs.nvidia.com/deeplearning/transformer-engine/examples/fp8_primer.html)

## License provenance

Apache-2.0 on base; also review derivative terms. This is a provenance flag, not legal clearance. The ZIP contains no model weights. Original model terms and derivative exporter terms remain separate from this repository’s original code and prose.
