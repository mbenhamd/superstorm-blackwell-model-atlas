# GLM 5.3

**As of 2026-10-15.** Approximately 743B main / 39B active; MLA with DSA; native FP8 packaging.

GLM 5.3 is the text-oriented sparse-MLA member of this pair. It should not inherit GLM 5.3 Flash’s KDA, vision, or mHC assumptions merely because their names share a version number. [glm-5.3-CARD](https://huggingface.co/zai-org/GLM-5.3) [glm-5.3-CFG](https://huggingface.co/zai-org/GLM-5.3/raw/main/config.json)

**First serving candidate:** vLLM FP8 and RedHat/Inferact NVFP4 first; SGLang challenger. This is a reasoned deployment starting point, not a measured winner on your hardware.

[Architecture](architecture.md) · [Precision and variants](precision.md) · [Serving decisions](serving.md) · [Validation](validation.md) · [Sources](sources.md) · [Machine-readable record](model.json)

## The mental model

A specialist library first compresses its catalog entries, then uses a fast librarian to choose the relevant shelves. Reading only selected shelves saves retrieval work; it does not mean the other books can be removed from storage.

## Practical identity

| Property | Value |
| --- | --- |
| Exact base repository | zai-org/GLM-5.3 |
| Native positional limit | 1,048,576 tokens |
| Initial TP candidate | 8 |
| Base revision pin | Not resolved immutably; resolve before deployment |
| License scope | GLM-5.3 custom license (not inferred from previous GLM releases) |
| Verification level | Publisher configuration and cards reviewed; not loaded or benchmarked on hardware |


The positional limit is not a promise of that many usable tokens under arbitrary batching, image load or cache precision. [glm-5.3-CARD](https://huggingface.co/zai-org/GLM-5.3) [glm-5.3-CFG](https://huggingface.co/zai-org/GLM-5.3/raw/main/config.json)

## The most important unresolved checks

Exact reason for 743B versus 753B accounting; exact BF16 single-node usable capacity; exporter-specific quality under your prompts; stable-image inclusion of every recent fix; SGLang performance relative to vLLM on this OEM node.

[Return to repository index](../../../README.md)
