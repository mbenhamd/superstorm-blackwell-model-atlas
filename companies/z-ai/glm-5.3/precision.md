# GLM 5.3: precision and provenance

The four catalogued artifacts below were rechecked at immutable revisions on 2026-10-16. A reviewed card/config is evidence of the serialization contract, not proof of successful GPU execution. The separately inspected NVIDIA candidate follows the table and has no supplied launch profile.

| Variant | Pinned artifact | Precision contract from configuration | Index tensor bytes |
| --- | --- | --- | --- |
| fp8 | [zai-org/GLM-5.3](https://huggingface.co/zai-org/GLM-5.3/raw/ba32f8c19c8738e2c57c71798c601d477a7bf844/config.json) | Block FP8 E4M3, 128×128 weight blocks, dynamic activations, explicit exclusions | 755,617,140,416 |
| bf16 | [zai-org/GLM-5.3-BF16](https://huggingface.co/zai-org/GLM-5.3-BF16/raw/abf42e6c0e53bc29a875511301e7b7fcd220315b/config.json) | BF16 reference with a small FP32 component; no quantization config | 1,506,659,919,872 |
| nvfp4 | [RedHatAI/GLM-5.3-NVFP4](https://huggingface.co/RedHatAI/GLM-5.3-NVFP4/raw/c8917e4258572c405575855ff53effe58c17a38e/config.json) | compressed-tensors NVFP4 W4A4 on main routed-expert linears, group size 16; MTP and other modules excluded | 464,824,469,712 |
| nvfp4-inferact | [Inferact/GLM-5.3-NVFP4](https://huggingface.co/Inferact/GLM-5.3-NVFP4/raw/ce67b36f3669192b5bb233819f0fda6c8a9837f8/config.json) | ModelOpt NVFP4 on main routed experts, group size 16; MTP excluded; exporter-specific calibration metadata | 464,822,832,448 |

The byte figures are each index's `metadata.total_size`, not measured HBM allocations or complete repository download sizes. Full revisions and index links are in [sources](sources.md) and [model catalog](../../../catalog/models.json). The near-equal RedHat and Inferact payload sizes do not establish equal calibration or quality. RedHat explicitly excludes `model.layers.78` with a regex; Inferact lists its MTP expert module among the exclusions. Thus the NVFP4 scope does not include the stored MTP expert weights.

## NVIDIA candidate and snapshot reconciliation

[`nvidia/GLM-5.3-NVFP4`](https://huggingface.co/nvidia/GLM-5.3-NVFP4/tree/e3b8f9f2fad29727dfa95e766c5cac18ea1414bf), revision `e3b8f9f2fad29727dfa95e766c5cac18ea1414bf`, is a distinct, uncatalogued candidate. Its index reports **464,115,789,896 bytes**. Its ModelOpt `MIXED_PRECISION` config declares FP8 weights/activations for the dense-prefix MLPs in layers 0–2 and NVFP4 weights/activations, group size 16, for routed experts in layers 3–77. Both quantization metadata files exclude `model.layers.78*`; the index contains 791 MTP tensor names, but their exact stored dtypes were not independently checked through tensor headers in this review. The metadata also declares an FP8 KV scheme; confirm the effective runtime dtype. The mixed scope differs from RedHat and Inferact. [RR-GLM-NVIDIA-CFG](https://huggingface.co/nvidia/GLM-5.3-NVFP4/raw/e3b8f9f2fad29727dfa95e766c5cac18ea1414bf/config.json) [RR-GLM-NVIDIA-HFQUANT](https://huggingface.co/nvidia/GLM-5.3-NVFP4/raw/e3b8f9f2fad29727dfa95e766c5cac18ea1414bf/hf_quant_config.json) [RR-GLM-NVIDIA-INDEX](https://huggingface.co/nvidia/GLM-5.3-NVFP4/resolve/e3b8f9f2fad29727dfa95e766c5cac18ea1414bf/model.safetensors.index.json)

The NVIDIA card reports Model Optimizer 0.47.0, while the metadata producer field is `0.0.0`; neither is a serving-engine pin. Its paired scores use SGLang on B300, TP8 across **two four-GPU nodes**, a 400,000-token server context and explicit long reasoning budgets. These are publisher quality results. They do not establish single-node throughput, a production default, or superiority to RedHat under a different evaluation. [RR-GLM-NVIDIA-CARD](https://huggingface.co/nvidia/GLM-5.3-NVFP4/raw/e3b8f9f2fad29727dfa95e766c5cac18ea1414bf/README.md)

The export retains the explicit MLA dimensions `qk_nope_head_dim=192`, `qk_rope_head_dim=64`, `v_head_dim=256` and `kv_lora_rank=512`, but its generic `head_dim=64` differs from the publisher config's 192. Resolve the loader's use of these fields for the selected build; do not infer a new attention architecture or silently normalize the export. Packed Hub counts likewise cannot replace the original parameter accounting. [RR-GLM-NVIDIA-CFG](https://huggingface.co/nvidia/GLM-5.3-NVFP4/raw/e3b8f9f2fad29727dfa95e766c5cac18ea1414bf/config.json)

The report-supplied native `aca966e4e02791568aa6a4ced368624b3d897f42`, BF16 `304b8051cfb2b260b61ce0cbe330e02a98e73639` and RedHat `ea2f938e221d5550c4c85dc5dcdfecc834f7cd9e` revisions all resolve. Their inspected configs match the retained pins; native/BF16 cards also match, and the RedHat card has a performance-caption edit. This establishes metadata continuity, not tensor-payload identity. The BF16 repository belongs to `zai-org`; it is the publisher reference. Inferact's retained `ce67b36f3669192b5bb233819f0fda6c8a9837f8` is also resolvable. Revision evidence: [RR-GLM-BASE-ALTERNATE](https://huggingface.co/api/models/zai-org/GLM-5.3/revision/aca966e4e02791568aa6a4ced368624b3d897f42), [RR-GLM-BF16-ALTERNATE](https://huggingface.co/api/models/zai-org/GLM-5.3-BF16/revision/304b8051cfb2b260b61ce0cbe330e02a98e73639), [RR-GLM-REDHAT-ALTERNATE](https://huggingface.co/api/models/RedHatAI/GLM-5.3-NVFP4/revision/ea2f938e221d5550c4c85dc5dcdfecc834f7cd9e).

## Quality evidence

RedHat reports IFEval prompt-level strict accuracy of 85.70% for NVFP4 versus 89.77% for its local FP8 baseline, a **4.07 percentage-point** difference. Its evaluation uses the same harness/serving stack, FP8 KV, temperature 1.0 and 4×B200; these are exporter results, not reproduced B300 measurements. They establish that blanket lossless-quantization language is inappropriate, without isolating every source of the difference. [glm-5.3-NV](https://huggingface.co/RedHatAI/GLM-5.3-NVFP4/raw/c8917e4258572c405575855ff53effe58c17a38e/README.md)

Test instruction following, tool argument fidelity, retrieval and multilingual output on the application workload. Keep the reasoning effort and conversation template identical across precision variants.

## Deployment rule

Pin the model, tokenizer/processor, quantization config, engine commit and container digest together. A BF16 root `dtype` can coexist with quantized tensors. Serialized tensor types, scales, grouping, exclusions, activation precision and loader repacking jointly determine the execution contract. Casting an FP8 checkpoint to BF16 does not recover the original BF16 weights.

Establish target-only quality before adding lower-precision KV or speculation. [Precision primer](../../../reports/precision-and-kernels.md) explains the format distinctions.

## License provenance

The pinned publisher file is titled GLM-5.3 License. Record it as a custom license and inspect its conditions for the intended use; do not infer terms from another GLM release. The RedHat card identifies the same license name. NVIDIA's card additionally names the NVIDIA Open Model Agreement and retains the base license conditions; its terms must be tracked separately. No model tensor payloads are bundled here. [glm-5.3-LICENSE](https://huggingface.co/zai-org/GLM-5.3/raw/ba32f8c19c8738e2c57c71798c601d477a7bf844/LICENSE) [RR-GLM-NVIDIA-CARD](https://huggingface.co/nvidia/GLM-5.3-NVFP4/raw/e3b8f9f2fad29727dfa95e766c5cac18ea1414bf/README.md)
