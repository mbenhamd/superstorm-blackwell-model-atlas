# GLM 5.3: precision and provenance

All four artifacts below were checked at immutable revisions on 2026-10-15. A reviewed card/config is evidence of the serialization contract, not proof of successful GPU execution.

| Variant | Pinned artifact | Precision contract from configuration | Index tensor bytes |
| --- | --- | --- | --- |
| fp8 | [zai-org/GLM-5.3](https://huggingface.co/zai-org/GLM-5.3/raw/ba32f8c19c8738e2c57c71798c601d477a7bf844/config.json) | Block FP8 E4M3, 128×128 weight blocks, dynamic activations, explicit exclusions | 755,617,140,416 |
| bf16 | [zai-org/GLM-5.3-BF16](https://huggingface.co/zai-org/GLM-5.3-BF16/raw/abf42e6c0e53bc29a875511301e7b7fcd220315b/config.json) | BF16 reference with a small FP32 component; no quantization config | 1,506,659,919,872 |
| nvfp4 | [RedHatAI/GLM-5.3-NVFP4](https://huggingface.co/RedHatAI/GLM-5.3-NVFP4/raw/c8917e4258572c405575855ff53effe58c17a38e/config.json) | compressed-tensors NVFP4 W4A4 on main routed-expert linears, group size 16; MTP and other modules excluded | 464,824,469,712 |
| nvfp4-inferact | [Inferact/GLM-5.3-NVFP4](https://huggingface.co/Inferact/GLM-5.3-NVFP4/raw/ce67b36f3669192b5bb233819f0fda6c8a9837f8/config.json) | ModelOpt NVFP4 on main routed experts, group size 16; MTP excluded; exporter-specific calibration metadata | 464,822,832,448 |

The byte figures are each index's `metadata.total_size`, not measured HBM allocations or complete repository download sizes. Full revisions and index links are in [sources](sources.md) and [model.json](model.json). The near-equal RedHat and Inferact payload sizes do not establish equal calibration or quality. RedHat explicitly excludes `model.layers.78` with a regex; Inferact lists its MTP expert module among the exclusions. Thus the NVFP4 scope does not include the stored MTP expert weights.

## Quality evidence

RedHat reports IFEval prompt-level strict accuracy of 85.70% for NVFP4 versus 89.77% for its local FP8 baseline, a **4.07 percentage-point** difference. Its evaluation uses the same harness/serving stack, FP8 KV, temperature 1.0 and 4×B200; these are exporter results, not reproduced B300 measurements. They establish that blanket lossless-quantization language is inappropriate, without isolating every source of the difference. [glm-5.3-NV](https://huggingface.co/RedHatAI/GLM-5.3-NVFP4/raw/c8917e4258572c405575855ff53effe58c17a38e/README.md)

Test instruction following, tool argument fidelity, retrieval and multilingual output on the application workload. Keep the reasoning effort and conversation template identical across precision variants.

## Deployment rule

Pin the model, tokenizer/processor, quantization config, engine commit and container digest together. A BF16 root `dtype` can coexist with quantized tensors. Serialized tensor types, scales, grouping, exclusions, activation precision and loader repacking jointly determine the execution contract. Casting an FP8 checkpoint to BF16 does not recover the original BF16 weights.

Establish target-only quality before adding lower-precision KV or speculation. [Precision primer](../../../reports/precision-and-kernels.md) explains the format distinctions.

## License provenance

The pinned publisher file is titled GLM-5.3 License. Record it as a custom license and inspect its conditions for the intended use; do not infer terms from another GLM release. The RedHat card identifies the same license name. No model tensor payloads are bundled here. [glm-5.3-LICENSE](https://huggingface.co/zai-org/GLM-5.3/raw/ba32f8c19c8738e2c57c71798c601d477a7bf844/LICENSE)
