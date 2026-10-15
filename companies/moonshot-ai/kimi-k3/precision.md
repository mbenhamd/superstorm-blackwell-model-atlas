# Kimi K3: precision and provenance

| Variant | Exact artifact | Actual precision contract | Evidence |
| --- | --- | --- | --- |
| native | moonshotai/Kimi-K3 | MXFP4 weights / MXFP8 activations; mixed non-expert precision | verified publisher release |
| nvfp4 | nvidia/Kimi-K3-NVFP4 | NVFP4 experts + FP8_PB_WO attention + retained higher precision | verified NVIDIA derivative; backend-specific fixes |
| fp8 | UNVERIFIED / no artifact selected | Hypothetical all-FP8 target | Requested name not verified; 2.8 TB ideal weights exceeds one 8×B300 node |


## Interpretation

The native release uses MXFP4/MXFP8. NVIDIA’s derivative stores routed experts in NVFP4 and selected attention projections in weight-only block FP8. It is approximately 1.6 TB according to its publisher. Converting between these artifacts is not a command-line spelling change.

The SGLang compatibility change handles SiTU scaling, mixed FP8 dispatch, logical block-scale layouts, MLA absorption, and tiny fused projections. It was merged on August 19. The complementary vLLM attention-padding PR #52406 remains open at the retrieval date. An open PR does not prove that every alternative implementation is broken, but it prevents this atlas from asserting that an unpatched generic vLLM image is certified for this exact NVIDIA export.

[kimi-k3-CARD](https://huggingface.co/moonshotai/Kimi-K3) [kimi-k3-NV](https://huggingface.co/nvidia/Kimi-K3-NVFP4) [kimi-k3-VR](https://recipes.vllm.ai/moonshotai/Kimi-K3) [KIMIPR](https://github.com/sgl-project/sglang/pull/35077) [KIMIVPR](https://github.com/vllm-project/vllm/pull/52406)

## Deployment rule

Pin the model revision, tokenizer/processor revision, quantization configuration, runtime commit and image digest together. A root BF16 `dtype` can coexist with quantized weights. The real contract includes serialized tensor types, scales, grouping, excluded modules, activation precision and runtime repacking. Do not cast a quantized checkpoint to BF16 and call it the original BF16 reference.

For every candidate, compare target-only quality against the appropriate reference before enabling lower-precision KV or speculation. [Precision primer](../../../reports/precision-and-kernels.md) distinguishes NVFP4, MXFP4, FP8 and BF16. [NV4](https://developer.nvidia.com/blog/introducing-nvfp4-for-efficient-and-accurate-low-precision-inference/) [TE](https://docs.nvidia.com/deeplearning/transformer-engine/examples/fp8_primer.html)

## License provenance

Kimi custom license (review exact revision). This is a provenance flag, not legal clearance. The ZIP contains no model weights. Original model terms and derivative exporter terms remain separate from this repository’s original code and prose.
