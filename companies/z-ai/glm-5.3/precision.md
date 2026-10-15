# GLM 5.3: precision and provenance

| Variant | Exact artifact | Actual precision contract | Evidence |
| --- | --- | --- | --- |
| fp8 | zai-org/GLM-5.3 | Block FP8 with exclusions | verified official default |
| bf16 | zai-org/GLM-5.3-BF16 | BF16 reference | linked by official engine recipe; not separately audited |
| nvfp4 | RedHatAI/GLM-5.3-NVFP4 | Routed experts W4A4; other layers retained | verified RedHat derivative |
| nvfp4-inferact | Inferact/GLM-5.3-NVFP4 | Expert-only NVFP4; about 465 GB reported | engine recipe evidence; exporter differs |


## Interpretation

The unsuffixed official repository is the FP8 checkpoint. The BF16 reference is in a suffixed repository. RedHat’s NVFP4 derivative targets routed experts and keeps the remaining operators at higher precision, using compressed-tensors. Inferact publishes another NVFP4 export; its recipe and file footprint must not be attributed to the RedHat artifact.

The RedHat evaluation includes a measurable IFEval difference from its local FP8 baseline. Therefore “four-bit without loss” is not an acceptable blanket description. Test instruction following, tool argument fidelity, long-context retrieval and multilingual output, not just a single mathematics score.

[glm-5.3-CARD](https://huggingface.co/zai-org/GLM-5.3) [glm-5.3-NV](https://huggingface.co/RedHatAI/GLM-5.3-NVFP4) [glm-5.3-VR](https://recipes.vllm.ai/zai-org/GLM-5.3)

## Deployment rule

Pin the model revision, tokenizer/processor revision, quantization configuration, runtime commit and image digest together. A root BF16 `dtype` can coexist with quantized weights. The real contract includes serialized tensor types, scales, grouping, excluded modules, activation precision and runtime repacking. Do not cast a quantized checkpoint to BF16 and call it the original BF16 reference.

For every candidate, compare target-only quality against the appropriate reference before enabling lower-precision KV or speculation. [Precision primer](../../../reports/precision-and-kernels.md) distinguishes NVFP4, MXFP4, FP8 and BF16. [NV4](https://developer.nvidia.com/blog/introducing-nvfp4-for-efficient-and-accurate-low-precision-inference/) [TE](https://docs.nvidia.com/deeplearning/transformer-engine/examples/fp8_primer.html)

## License provenance

GLM-5.3 custom license (not inferred from previous GLM releases). This is a provenance flag, not legal clearance. The ZIP contains no model weights. Original model terms and derivative exporter terms remain separate from this repository’s original code and prose.
