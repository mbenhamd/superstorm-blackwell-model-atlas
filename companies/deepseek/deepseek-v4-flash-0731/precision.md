# DeepSeek V4 Flash 0731: precision and provenance

| Variant | Exact artifact | Actual precision contract | Evidence |
| --- | --- | --- | --- |
| native | deepseek-ai/DeepSeek-V4-Flash-0731 | FP4 experts plus FP8-configured components; not an all-FP8 model | verified exact 0731 config |


## Interpretation

The official artifact is mixed precision. FP4 expert storage and UE8M0/block-scale metadata must match the intended loader and expert kernel. It should not be relabeled NVFP4 merely because both formats use four-bit values.

The source recipe exposes an optional FP4 indexer cache. That is an additional accuracy/performance trade, not a necessary consequence of the expert weight format. Keep it off for the first correctness comparison, then test index selection stability and long-context retrieval when enabling it.

[deepseek-v4-flash-0731-CARD](https://huggingface.co/deepseek-ai/DeepSeek-V4-Flash-0731) [deepseek-v4-flash-0731-VR](https://recipes.vllm.ai/deepseek-ai/DeepSeek-V4-Flash?features=tool_calling,reasoning&hardware=b300)

## Deployment rule

Pin the model revision, tokenizer/processor revision, quantization configuration, runtime commit and image digest together. A root BF16 `dtype` can coexist with quantized weights. The real contract includes serialized tensor types, scales, grouping, excluded modules, activation precision and runtime repacking. Do not cast a quantized checkpoint to BF16 and call it the original BF16 reference.

For every candidate, compare target-only quality against the appropriate reference before enabling lower-precision KV or speculation. [Precision primer](../../../reports/precision-and-kernels.md) distinguishes NVFP4, MXFP4, FP8 and BF16. [NV4](https://developer.nvidia.com/blog/introducing-nvfp4-for-efficient-and-accurate-low-precision-inference/) [TE](https://docs.nvidia.com/deeplearning/transformer-engine/examples/fp8_primer.html)

## License provenance

MIT metadata; exact 0731 license file should be pinned before redistribution. This is a provenance flag, not legal clearance. The ZIP contains no model weights. Original model terms and derivative exporter terms remain separate from this repository’s original code and prose.
