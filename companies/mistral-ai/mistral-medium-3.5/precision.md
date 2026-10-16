# Mistral Medium 3.5: precision and provenance

| Variant | Exact artifact | Actual precision contract | Evidence |
| --- | --- | --- | --- |
| fp8 | mistralai/Mistral-Medium-3.5-128B | Static FP8 text linears; higher precision exclusions | Publisher card/config inspected at `22b2b868a15677cfa6061277ed2f653d1349a9ab` |


## Interpretation

The default export uses static-activation FP8 without the 128×128 weight-block scheme used by several other models in the list. Vision, projector and language-head exclusions remain higher precision. Do not force a block-FP8 loader or an unrelated NVFP4 mode onto these files.

The description “FP8-ish” is too imprecise for this artifact. Fresh inspection on 2026-10-16 confirms `quant_method: fp8`, `activation_scheme: static`, `weight_block_size: null` and `dequantize: false` in the pinned Transformers config; native `params.json` declares `fp8_e4m3` weights with a `TENSOR` activation scheme. A root `dtype: bfloat16`, or the SGLang EAGLE recipe's `--dtype bfloat16`, does not turn these serialized FP8 weights into an original BF16 checkpoint. [mistral-medium-3.5-CFG](https://huggingface.co/mistralai/Mistral-Medium-3.5-128B/raw/22b2b868a15677cfa6061277ed2f653d1349a9ab/config.json), [RR-GM-MISTRAL-PARAMS](https://huggingface.co/mistralai/Mistral-Medium-3.5-128B/raw/22b2b868a15677cfa6061277ed2f653d1349a9ab/params.json).

The matching EAGLE artifact is `mistralai/Mistral-Medium-3.5-128B-EAGLE` at `d31694b0f55b51d4d962b5c3dbf0e03d1f019275`. Its native parameters likewise declare FP8 e4m3 and tensor activation scaling, with two GQA layers and no vision encoder. Its single listed `consolidated.safetensors` is 3,070,358,348 bytes including the header. Neither this file size nor a cookbook memory estimate measures runtime draft overhead, shared buffers or verification workspace. [mistral-medium-3.5-EAGLE-PARAMS](https://huggingface.co/mistralai/Mistral-Medium-3.5-128B-EAGLE/raw/d31694b0f55b51d4d962b5c3dbf0e03d1f019275/params.json), [mistral-medium-3.5-EAGLE-TREE](https://huggingface.co/api/models/mistralai/Mistral-Medium-3.5-128B-EAGLE/tree/d31694b0f55b51d4d962b5c3dbf0e03d1f019275?recursive=false&expand=false).

This atlas does not invent a Mistral NVFP4 checkpoint: the requested Mistral variant was not specified that way, and no exact NVFP4 derivative was audited. A future conversion must begin from the corrected configuration and validate long-context and multimodal behavior.

[mistral-medium-3.5-CARD](https://huggingface.co/mistralai/Mistral-Medium-3.5-128B/blob/22b2b868a15677cfa6061277ed2f653d1349a9ab/README.md)

## Deployment rule

Pin the model revision, tokenizer/processor revision, quantization configuration, runtime commit and image digest together. A root BF16 `dtype` can coexist with quantized weights. The real contract includes serialized tensor types, scales, grouping, excluded modules, activation precision and runtime repacking. Do not cast a quantized checkpoint to BF16 and call it the original BF16 reference.

For every candidate, compare target-only quality against the appropriate reference before enabling lower-precision KV or speculation. [Precision analysis](../../../reports/precision-and-kernels.md) distinguishes NVFP4, MXFP4, FP8 and BF16. [NV4](https://developer.nvidia.com/blog/introducing-nvfp4-for-efficient-and-accurate-low-precision-inference/) [TE](https://docs.nvidia.com/deeplearning/transformer-engine/examples/fp8_primer.html)

## License provenance

The pinned [LICENSE](https://huggingface.co/mistralai/Mistral-Medium-3.5-128B/blob/22b2b868a15677cfa6061277ed2f653d1349a9ab/LICENSE) is titled Modified MIT License. Its revenue clause restricts exercise of the license rights when the company or employer’s global consolidated monthly revenue exceeded US$20 million in the preceding month, and directs affected users to Mistral for commercial licensing. The `other` card metadata does not describe this condition by itself. The ZIP contains no model weights. Original model terms and derivative exporter terms remain separate from this repository’s original code and prose.
