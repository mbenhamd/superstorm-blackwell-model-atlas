# GLM 5.3 Flash: precision and provenance

| Variant | Exact artifact | Actual precision contract | Evidence |
| --- | --- | --- | --- |
| fp8 | zai-org/GLM-5.3-Flash | FP8 default | verified official release |
| bf16 | zai-org/GLM-5.3-Flash-BF16 | BF16 | linked by engine recipe |
| nvfp4 | RedHatAI/GLM-5.3-Flash-NVFP4 | NVFP4 expert derivative | engine recipe evidence; exact config not separately audited |


## Interpretation

The default official model is FP8. The vLLM recipe names RedHat’s NVFP4 expert derivative. SGLang’s current cookbook also names other NVFP4 exporters. Those are evidence of multiple supported development paths, not proof that all files, calibration recipes and backends are interchangeable.

On Blackwell the documented sparse-attention path supports FP8 KV. The cookbook treats Hopper differently, so do not generalize a Hopper workaround to B300 or a B300 launch to H100. Test weight precision and KV precision as separate factors.

[glm-5.3-flash-CARD](https://huggingface.co/zai-org/GLM-5.3-Flash) [glm-5.3-flash-VR](https://recipes.vllm.ai/zai-org/GLM-5.3-Flash)

## Deployment rule

Pin the model revision, tokenizer/processor revision, quantization configuration, runtime commit and image digest together. A root BF16 `dtype` can coexist with quantized weights. The real contract includes serialized tensor types, scales, grouping, excluded modules, activation precision and runtime repacking. Do not cast a quantized checkpoint to BF16 and call it the original BF16 reference.

For every candidate, compare target-only quality against the appropriate reference before enabling lower-precision KV or speculation. [Precision primer](../../../reports/precision-and-kernels.md) distinguishes NVFP4, MXFP4, FP8 and BF16. [NV4](https://developer.nvidia.com/blog/introducing-nvfp4-for-efficient-and-accurate-low-precision-inference/) [TE](https://docs.nvidia.com/deeplearning/transformer-engine/examples/fp8_primer.html)

## License provenance

Use the exact GLM-5.3-Flash license at the selected revision. This is a provenance flag, not legal clearance. The ZIP contains no model weights. Original model terms and derivative exporter terms remain separate from this repository’s original code and prose.
