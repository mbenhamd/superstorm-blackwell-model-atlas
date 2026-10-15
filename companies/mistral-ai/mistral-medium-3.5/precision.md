# Mistral Medium 3.5: precision and provenance

| Variant | Exact artifact | Actual precision contract | Evidence |
| --- | --- | --- | --- |
| fp8 | mistralai/Mistral-Medium-3.5-128B | Static FP8 text linears; higher precision exclusions | verified official release |


## Interpretation

The default export uses static-activation FP8 without the 128×128 weight-block scheme used by several other models in the list. Vision, projector and language-head exclusions remain higher precision. Do not force a block-FP8 loader or an unrelated NVFP4 mode onto these files.

This atlas does not invent a Mistral NVFP4 checkpoint: the requested Mistral variant was not specified that way, and no exact NVFP4 derivative was audited. A future conversion must begin from the corrected configuration and validate long-context and multimodal behavior.

[mistral-medium-3.5-CARD](https://huggingface.co/mistralai/Mistral-Medium-3.5-128B)

## Deployment rule

Pin the model revision, tokenizer/processor revision, quantization configuration, runtime commit and image digest together. A root BF16 `dtype` can coexist with quantized weights. The real contract includes serialized tensor types, scales, grouping, excluded modules, activation precision and runtime repacking. Do not cast a quantized checkpoint to BF16 and call it the original BF16 reference.

For every candidate, compare target-only quality against the appropriate reference before enabling lower-precision KV or speculation. [Precision primer](../../../reports/precision-and-kernels.md) distinguishes NVFP4, MXFP4, FP8 and BF16. [NV4](https://developer.nvidia.com/blog/introducing-nvfp4-for-efficient-and-accurate-low-precision-inference/) [TE](https://docs.nvidia.com/deeplearning/transformer-engine/examples/fp8_primer.html)

## License provenance

Publisher custom license / metadata other; not assumed Apache-2.0. This is a provenance flag, not legal clearance. The ZIP contains no model weights. Original model terms and derivative exporter terms remain separate from this repository’s original code and prose.
