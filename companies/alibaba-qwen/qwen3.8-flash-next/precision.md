# Qwen 3.8 Flash Next: precision and provenance

| Variant | Exact artifact | Actual precision contract | Evidence |
| --- | --- | --- | --- |
| bf16 | Qwen/Qwen3.8-Flash-Next | BF16 reference with large n-gram embeddings | verified base |
| fp8 | Qwen/Qwen3.8-Flash-Next-FP8 | Mixed FP8 export | referenced by NVIDIA and engine recipe |
| nvfp4 | nvidia/Qwen3.8-Flash-Next-NVFP4 | Main routed experts NVFP4; MTP experts and PLE FP8; attention/shared BF16 | verified NVIDIA derivative |


## Interpretation

The NVIDIA export uses W4A4 NVFP4 for main routed experts. Attention, shared experts and other main components remain BF16; MTP routed experts use block FP8; the PLE table uses per-tensor FP8. Thus the word NVFP4 names the dominant optimization, not every tensor.

The card still describes MTP support as dependent on vLLM PR #55513. That PR was merged on September 8, so the historical pending-fix warning must be updated rather than copied verbatim. It remains necessary to verify that the installed image actually contains the fix. On TP8, the recipe uses EP so the MTP expert width remains compatible with its FP8 block alignment.

[qwen3.8-flash-next-CARD](https://huggingface.co/Qwen/Qwen3.8-Flash-Next) [qwen3.8-flash-next-NV](https://huggingface.co/nvidia/Qwen3.8-Flash-Next-NVFP4) [qwen3.8-flash-next-VR](https://recipes.vllm.ai/Qwen/Qwen3.8-Flash-Next) [QPR](https://github.com/vllm-project/vllm/pull/55513)

## Deployment rule

Pin the model revision, tokenizer/processor revision, quantization configuration, runtime commit and image digest together. A root BF16 `dtype` can coexist with quantized weights. The real contract includes serialized tensor types, scales, grouping, excluded modules, activation precision and runtime repacking. Do not cast a quantized checkpoint to BF16 and call it the original BF16 reference.

For every candidate, compare target-only quality against the appropriate reference before enabling lower-precision KV or speculation. [Precision primer](../../../reports/precision-and-kernels.md) distinguishes NVFP4, MXFP4, FP8 and BF16. [NV4](https://developer.nvidia.com/blog/introducing-nvfp4-for-efficient-and-accurate-low-precision-inference/) [TE](https://docs.nvidia.com/deeplearning/transformer-engine/examples/fp8_primer.html)

## License provenance

Qwen Community License 1.0; NVIDIA derivative also names NVIDIA Open Model License. This is a provenance flag, not legal clearance. The ZIP contains no model weights. Original model terms and derivative exporter terms remain separate from this repository’s original code and prose.
