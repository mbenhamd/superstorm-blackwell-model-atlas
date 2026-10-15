# Gemma 4 31B IT: precision and provenance

| Variant | Exact artifact | Actual precision contract | Evidence |
| --- | --- | --- | --- |
| bf16 | google/gemma-4-31B-it | BF16 | verified official base |
| fp8 | RedHatAI/gemma-4-31B-it-FP8-block | W8A8, 128×128 weight blocks, dynamic activation groups of 128 | verified RedHat derivative |
| nvfp4 | RedHatAI/gemma-4-31B-it-NVFP4 | Transformer block W4A4 group 16; vision/embedding/head retain precision | verified RedHat derivative |


## Interpretation

RedHat’s FP8-block export uses block-scaled weights and dynamic grouped activation quantization. Its NVFP4 export uses group-size-16 quantization within Transformer blocks. The vision tower, embeddings and output head are retained at their original precision in those published recipes.

The publisher’s approximate fourfold parameter-bit reduction is not an exact fourfold reduction of the complete model’s runtime footprint. Unquantized components, scales, CUDA graphs and KV cache remain. Keep the original BF16 checkpoint as the reference for text, vision and tool tests.

[gemma-4-31b-it-CARD](https://huggingface.co/google/gemma-4-31B-it) [gemma-4-31b-it-NV](https://huggingface.co/RedHatAI/gemma-4-31B-it-NVFP4) [gemma-4-31b-it-FP8](https://huggingface.co/RedHatAI/gemma-4-31B-it-FP8-block)

## Deployment rule

Pin the model revision, tokenizer/processor revision, quantization configuration, runtime commit and image digest together. A root BF16 `dtype` can coexist with quantized weights. The real contract includes serialized tensor types, scales, grouping, excluded modules, activation precision and runtime repacking. Do not cast a quantized checkpoint to BF16 and call it the original BF16 reference.

For every candidate, compare target-only quality against the appropriate reference before enabling lower-precision KV or speculation. [Precision primer](../../../reports/precision-and-kernels.md) distinguishes NVFP4, MXFP4, FP8 and BF16. [NV4](https://developer.nvidia.com/blog/introducing-nvfp4-for-efficient-and-accurate-low-precision-inference/) [TE](https://docs.nvidia.com/deeplearning/transformer-engine/examples/fp8_primer.html)

## License provenance

Apache-2.0 metadata observed on RedHat derivative; confirm base and derivative files. This is a provenance flag, not legal clearance. The ZIP contains no model weights. Original model terms and derivative exporter terms remain separate from this repository’s original code and prose.
