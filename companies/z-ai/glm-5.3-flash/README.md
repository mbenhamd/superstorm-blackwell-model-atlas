# GLM 5.3 Flash

**As of 2026-10-15.** 320B total / 18B active; KDA + NoPE sparse MLA + mHC; multimodal.

Flash is a different multimodal hybrid base, not merely a faster decoding option for GLM 5.3. Its combined recurrent-state and sparse-attention behavior creates different allocation and correctness requirements. [glm-5.3-flash-CARD](https://huggingface.co/zai-org/GLM-5.3-Flash) [glm-5.3-flash-CFG](https://huggingface.co/zai-org/GLM-5.3-Flash/raw/main/config.json)

**First serving candidate:** SGLang Blackwell FP8 initial candidate; vLLM FP8 and NVFP4 head-to-head. This is a reasoned deployment starting point, not a measured winner on your hardware.

[Architecture](architecture.md) · [Precision and variants](precision.md) · [Serving decisions](serving.md) · [Validation](validation.md) · [Sources](sources.md) · [Machine-readable record](model.json)

## The mental model

Imagine a team using a short running notebook, occasional archive lookups and four coordinated whiteboards. The whiteboards make collaboration richer, but moving their contents correctly matters as much as moving the archive records.

## Practical identity

| Property | Value |
| --- | --- |
| Exact base repository | zai-org/GLM-5.3-Flash |
| Native positional limit | 1,048,576 tokens |
| Initial TP candidate | 4 |
| Base revision pin | Not resolved immutably; resolve before deployment |
| License scope | Use the exact GLM-5.3-Flash license at the selected revision |
| Verification level | Publisher configuration and cards reviewed; not loaded or benchmarked on hardware |


The positional limit is not a promise of that many usable tokens under arbitrary batching, image load or cache precision. [glm-5.3-flash-CARD](https://huggingface.co/zai-org/GLM-5.3-Flash) [glm-5.3-flash-CFG](https://huggingface.co/zai-org/GLM-5.3-Flash/raw/main/config.json)

## The most important unresolved checks

The exact RedHat NVFP4 tensor-level recipe was not separately inspected; do not treat its format as identical to NVIDIA/RadixArk. The optimal state split and disaggregation crossover need local measurements.

[Return to repository index](../../../README.md)
