# GLM 5.3

**As of 2026-10-15.** Approximately 743B main / 39B active; 753.33B including serialized MTP; MLA with DSA; native FP8 packaging.

GLM 5.3 is the text-oriented sparse-MLA member of this pair. It should not inherit GLM 5.3 Flash’s KDA, vision, or mHC assumptions merely because their names share a version number. [glm-5.3-CARD](https://huggingface.co/zai-org/GLM-5.3/raw/ba32f8c19c8738e2c57c71798c601d477a7bf844/README.md) [glm-5.3-CFG](https://huggingface.co/zai-org/GLM-5.3/raw/ba32f8c19c8738e2c57c71798c601d477a7bf844/config.json)

**First serving candidate:** vLLM FP8 and RedHat/Inferact NVFP4 first; SGLang challenger. This is a reasoned deployment starting point, not a measured winner on your hardware.

[Architecture](architecture.md) · [Precision and variants](precision.md) · [Serving decisions](serving.md) · [Sources](sources.md) · [Model catalog](../../../catalog/models.json)

## The mental model

A specialist library first compresses its catalog entries, then uses a fast librarian to choose the relevant shelves. Reading only selected shelves saves retrieval work; it does not mean the other books can be removed from storage.

## Practical identity

| Property | Value |
| --- | --- |
| Exact base repository | zai-org/GLM-5.3 |
| Native positional limit | 1,048,576 tokens |
| Initial TP candidate | 8 |
| Base revision pin | `ba32f8c19c8738e2c57c71798c601d477a7bf844` |
| License scope | GLM-5.3 custom license (not inferred from previous GLM releases) |
| Verification level | Pinned publisher card, config and checkpoint metadata rechecked on 2026-10-15; no GPU load or benchmark |


The positional limit is not a promise of that many usable tokens under arbitrary batching or cache precision. [glm-5.3-CARD](https://huggingface.co/zai-org/GLM-5.3/raw/ba32f8c19c8738e2c57c71798c601d477a7bf844/README.md) [glm-5.3-CFG](https://huggingface.co/zai-org/GLM-5.3/raw/ba32f8c19c8738e2c57c71798c601d477a7bf844/config.json)

## The most important unresolved checks

Actual per-rank load and cache capacity on this node; exporter-specific quality under the application prompts; inclusion of required fixes in the selected image; and the workload crossover between vLLM and SGLang remain unmeasured. The 743B/753B accounting is now reconciled. See [architecture](architecture.md) for the pinned metadata calculation.

[Return to repository index](../../../README.md)
