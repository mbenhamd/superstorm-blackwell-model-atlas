# Precision, serialization and kernels

## A precision name is not a deployment contract

| Term | Meaning | Common mistake |
| --- | --- | --- |
| BF16 | 16-bit floating representation with broad exponent range | Calling dequantized FP4 weights the original BF16 model |
| FP8 | Eight-bit floating family, often E4M3 for inference | Ignoring block, channel, tensor and dynamic-activation schemes |
| MXFP8 | Microscaled FP8 with shared block scale | Treating it as the same packing as ordinary FP8 |
| MXFP4 | Four-bit values with microscaling, typically 32-value blocks | Renaming it NVFP4 |
| NVFP4 | Four-bit values, 16-value scaling and outer scaling | Assuming all tensors in an NVFP4 checkpoint are four-bit |
| W4A4 | Four-bit weights and activations for the affected operators | Assuming routers, KV cache and vision are also four-bit |
| W4A16 | Four-bit weights with higher-precision activations | Expecting the same compute path as W4A4 |
| Weight-only FP8 | Weights compressed; activation treatment is loader/kernel-specific | Assuming its exporter label fixes runtime activation precision |

The representations and scale distinctions are documented by NVIDIA. E2M1, E4M3 and E8M0 refer to exponent/mantissa layouts, not model sizes. [NV4](https://developer.nvidia.com/blog/introducing-nvfp4-for-efficient-and-accurate-low-precision-inference/) [TE](https://docs.nvidia.com/deeplearning/transformer-engine/examples/fp8_primer.html) [TE4](https://docs.nvidia.com/deeplearning/transformer-engine/features/low_precision_training/nvfp4/nvfp4.html) [CUDNN](https://docs.nvidia.com/deeplearning/cudnn/latest/operations/BlockScaling.html)

## Four layers of compatibility

**Numeric format:** bit layout, scale data types and granularity. **Serialized representation:** tensor names, packed shapes, exclusions, exporter metadata. **Mathematical operator:** activation, bias, normalization, router weighting, clamping and residual behavior. **Runtime implementation:** supported kernel, alignment, repacking, sharding and target GPU architecture.

A failure at any layer can break the result. In the inspected SGLang code, FP4 GEMM selects different W4A4 and W4A16 paths and checks whether FlashInfer functionality is available. Padding rules differ across kernel families. In the Kimi fixes, correct scale loading and SiTU activation behavior are as important as selecting four-bit matrix multiplication. [GQUANT](https://github.com/sgl-project/sglang/blob/877be2974aa151a984e52822c028276c2b1e9303/python/sglang/srt/layers/quantization/modelopt_quant.py) [KIMIPR](https://github.com/sgl-project/sglang/pull/35077) [KIMIVPR](https://github.com/vllm-project/vllm/pull/52406)

## Exporter differences in this catalog

Kimi native MXFP4 is distinct from NVIDIA mixed NVFP4/FP8. RedHat GLM NVFP4 uses compressed-tensors for routed experts. NVIDIA Qwen 27B mixes NVFP4 MLP/head with FP8 attention. NVIDIA Flash Next additionally retains BF16 components and an FP8 n-gram table. RedHat Gemma excludes vision, embeddings and head from its Transformer-block quantization. Mistral uses a static-activation FP8 scheme. See each model’s `precision.md` for primary citations and exact artifact IDs; no universal NVFP4 loader flag is safe across this set.

## FP8 KV is independent

Weight precision changes model operations. KV precision changes stored attention history. Recurrent-state precision changes an additional state representation. Test these separately: baseline weights + baseline cache; low-precision weights + unchanged cache; then lower-precision cache/state. Otherwise an accuracy difference cannot be assigned to its cause.

The SGLang Qwen recipe gives a concrete metadata trap: some derivative exports default `auto` KV to FP8, whereas NVIDIA’s export leaves it BF16 without an explicit setting. Matching command text with `auto` therefore does not necessarily match effective precision. [qwen3.8-27b-GR](https://docs.sglang.io/cookbook/autoregressive/Qwen/Qwen3.8-27B)

## Why four-bit can win, and why it can lose

A lower-byte representation may reduce weight bandwidth and let a larger useful batch or cache fit. It can also introduce scale handling, conversion, padding, calibration error and backend constraints. At low concurrency, synchronization and launch overhead may dominate the saved arithmetic. At long context, attention-history traffic can dominate expert weights. These are reasons to measure, not reasons to reject quantization.

The decision metric is successful, quality-accepted work under a latency objective. A faster kernel with a regression in tool arguments or retrieval is not a production improvement. Publisher results can establish plausibility, but they do not certify your prompts, image distribution, sampling settings or software bill of materials.

## Calibration and quality gates

Use a representative holdout with coding, tool use, instruction following, multilingual questions, long context and vision where supported. Freeze the tokenizer, chat serialization and reasoning effort. Include repeated seeds for stochastic tests and paired comparisons. Report absolute differences, sample sizes and uncertainty rather than only a rounded “recovery” percentage.

A native quantization-aware-trained release and a post-training quantized derivative are not the same intervention. Do not attribute the former’s quality to an exporter conversion that was never evaluated. [kimi-k3-CARD](https://huggingface.co/moonshotai/Kimi-K3) [qwen3.8-27b-NV](https://huggingface.co/nvidia/Qwen3.8-27B-NVFP4) [glm-5.3-NV](https://huggingface.co/RedHatAI/GLM-5.3-NVFP4)
