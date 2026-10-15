# DeepSeek V4 Flash 0731: precision and provenance

Reverified 2026-10-15 (UTC) at `7872f01b1d1fe23eabc4c98b48bffcef5a386062`. No checkpoint was loaded locally.

| Variant | Exact artifact | Precision evidence |
| --- | --- | --- |
| native | `deepseek-ai/DeepSeek-V4-Flash-0731` | Root config sets `expert_dtype=fp4` and separately declares FP8 `e4m3` with `ue8m0` scales and 128×128 weight blocks |

## Interpretation

The official artifact is mixed precision. Its reference loader packs two FP4 expert values per byte and uses one E8M0 scale per 32 expert values. The 128×128 blocks in the root quantization config describe the FP8 path, not those FP4 expert groups. Other tensors can retain higher precision. This is not an all-FP8 checkpoint, and four-bit expert storage alone does not identify an NVFP4 export. [Root config](https://huggingface.co/deepseek-ai/DeepSeek-V4-Flash-0731/raw/7872f01b1d1fe23eabc4c98b48bffcef5a386062/config.json), [reference implementation](https://huggingface.co/deepseek-ai/DeepSeek-V4-Flash-0731/blob/7872f01b1d1fe23eabc4c98b48bffcef5a386062/inference/model.py).

The vLLM recipe's optional FP4 indexer cache changes a separate attention-cache representation. Keep it off during the initial correctness comparison, then measure retrieval quality and performance when enabling it. The checkpoint's FP4 expert weights do not mandate that cache setting. [vLLM recipe](https://recipes.vllm.ai/deepseek-ai/DeepSeek-V4-Flash?features=tool_calling,reasoning&hardware=b300).

Engine execution precision can differ from serialized precision. Select the intended expert backend and inspect its actual load/repacking path before comparing memory or speed. SGLang documents `flashinfer_mxfp4` for the exact 0731 FP4 route; the atlas's vLLM candidate follows the documented `deep_gemm_mega_moe` route. These names are not evidence that both execute the same weight and activation arithmetic. [Publisher serving examples](https://huggingface.co/deepseek-ai/DeepSeek-V4-Flash-0731/blob/7872f01b1d1fe23eabc4c98b48bffcef5a386062/README.md).

## Deployment rule

Pin the model and tokenizer revisions, quantization configuration, runtime commit and image digest together. Root BF16 metadata can coexist with quantized weights. Inspect serialized tensors, scales, excluded modules, activation precision and runtime repacking. Casting a quantized checkpoint to BF16 does not reconstruct an original BF16 reference.

Compare target-only quality before changing cache precision or enabling DSpark. The [precision primer](../../../reports/precision-and-kernels.md) explains the formats, and the [serving report](serving.md) keeps publisher recipes separate from local experiments.

## License provenance

The pinned LICENSE file is MIT. The same revision's model card explicitly applies that license to the repository and model weights. This verifies the named artifact's stated terms; it does not establish terms for separately named derivatives. No model weights are bundled here. [LICENSE](https://huggingface.co/deepseek-ai/DeepSeek-V4-Flash-0731/blob/7872f01b1d1fe23eabc4c98b48bffcef5a386062/LICENSE), [model card](https://huggingface.co/deepseek-ai/DeepSeek-V4-Flash-0731/blob/7872f01b1d1fe23eabc4c98b48bffcef5a386062/README.md).
