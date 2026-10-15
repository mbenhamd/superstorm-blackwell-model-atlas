# Qwen 3.8 27B: precision and provenance

| Variant | Exact artifact | Actual precision contract | Evidence |
| --- | --- | --- | --- |
| bf16 | Qwen/Qwen3.8-27B | BF16 | verified base |
| fp8 | Qwen/Qwen3.8-27B-FP8 | Fine-grained FP8 | verified official derivative |
| nvfp4 | nvidia/Qwen3.8-27B-NVFP4 | NVFP4 MLP/head + FP8 attention; ModelOpt 0.48.0 | verified NVIDIA mixed derivative |


## Interpretation

Keep three distinct baselines: original BF16, official FP8 and NVIDIA NVFP4. The NVIDIA artifact is not uniformly four-bit: its MLPs and language head use NVFP4, while self-attention and linear-attention use FP8. Its publisher reports ModelOpt 0.48.0 and local-Hessian calibration.

Because the model already fits on one B300, the reason to try NVFP4 is not simply feasibility. It may reduce bandwidth or permit more cache capacity, but quantization and kernel-launch overhead can offset that gain at low batch sizes. Benchmark the actual workload and retain the BF16 run as the quality reference.

[qwen3.8-27b-CARD](https://huggingface.co/Qwen/Qwen3.8-27B) [qwen3.8-27b-NV](https://huggingface.co/nvidia/Qwen3.8-27B-NVFP4) [qwen3.8-27b-FP8](https://huggingface.co/Qwen/Qwen3.8-27B-FP8) [qwen3.8-27b-VR](https://recipes.vllm.ai/Qwen/Qwen3.8-27B)

## Deployment rule

Pin the model revision, tokenizer/processor revision, quantization configuration, runtime commit and image digest together. A root BF16 `dtype` can coexist with quantized weights. The real contract includes serialized tensor types, scales, grouping, excluded modules, activation precision and runtime repacking. Do not cast a quantized checkpoint to BF16 and call it the original BF16 reference.

For every candidate, compare target-only quality against the appropriate reference before enabling lower-precision KV or speculation. [Precision primer](../../../reports/precision-and-kernels.md) distinguishes NVFP4, MXFP4, FP8 and BF16. [NV4](https://developer.nvidia.com/blog/introducing-nvfp4-for-efficient-and-accurate-low-precision-inference/) [TE](https://docs.nvidia.com/deeplearning/transformer-engine/examples/fp8_primer.html)

## License provenance

Apache-2.0 on base; also review derivative terms. This is a provenance flag, not legal clearance. The ZIP contains no model weights. Original model terms and derivative exporter terms remain separate from this repository’s original code and prose.
