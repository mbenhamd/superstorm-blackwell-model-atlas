# GLM 5.3

**Latest scoped recheck: October 26, 2026 (UTC).** Stable references remain **vLLM v0.32.0** and **SGLang v0.5.22**, under required KServe (upstream v0.21.0; installed version unknown). All concrete catalog variants still match their retained revisions. Current publisher cards/configurations and selected engine restrictions were rechecked; no B300 execution was performed. See [current serving assessment](serving.md#october-26-stable-release-recheck) and [Hugging Face README snapshots](#hugging-face-readme-snapshots).

**As of 2026-10-16.** Approximately 743B main / 39B active in the vLLM recipe; 753.33B including serialized MTP. NVIDIA instead headlines 753B / 40B active. The active-count scopes are not independently reconciled. MLA with DSA; native FP8 packaging. [TOPG-GLM-VLLM](https://recipes.vllm.ai/zai-org/GLM-5.3) [TOPG-GLM-NVIDIA-CARD](https://huggingface.co/nvidia/GLM-5.3-NVFP4/raw/e3b8f9f2fad29727dfa95e766c5cac18ea1414bf/README.md)

GLM 5.3 is the text-oriented sparse-MLA member of this pair. It should not inherit GLM 5.3 Flash’s KDA, vision, or mHC assumptions merely because their names share a version number. [glm-5.3-CARD](https://huggingface.co/zai-org/GLM-5.3/raw/ba32f8c19c8738e2c57c71798c601d477a7bf844/README.md) [glm-5.3-CFG](https://huggingface.co/zai-org/GLM-5.3/raw/ba32f8c19c8738e2c57c71798c601d477a7bf844/config.json)

**First serving candidate:** vLLM FP8 and RedHat/Inferact NVFP4 first; SGLang challenger. This is an unbenchmarked candidate for the target B300 node; relative performance remains workload-dependent.

[Architecture](architecture.md) · [Precision and variants](precision.md) · [Serving decisions](serving.md) · [Sources](sources.md) · [Model catalog](../../../catalog/models.json)

## Architecture and serving implications

MLA compresses attention-history representations; DSA selects entries for attention computation. These mechanisms have different effects on storage and execution. The sparse indexer, routed/shared experts and MTP require separate precision and memory accounting. See [architecture and index reuse](architecture.md), [export differences](precision.md) and [serving tradeoffs](serving.md).

## Practical identity

| Property | Value |
| --- | --- |
| Exact base repository | zai-org/GLM-5.3 |
| Native positional limit | 1,048,576 tokens |
| Initial TP candidate | 8 |
| Base revision pin | `ba32f8c19c8738e2c57c71798c601d477a7bf844` |
| License scope | GLM-5.3 custom license (not inferred from previous GLM releases) |
| Verification level | Current main resolves to the retained pin; publisher card, config, template, license and checkpoint metadata rechecked on 2026-10-16; no GPU load or benchmark |


The positional limit is not a promise of that many usable tokens under arbitrary batching or cache precision. [glm-5.3-CARD](https://huggingface.co/zai-org/GLM-5.3/raw/ba32f8c19c8738e2c57c71798c601d477a7bf844/README.md) [glm-5.3-CFG](https://huggingface.co/zai-org/GLM-5.3/raw/ba32f8c19c8738e2c57c71798c601d477a7bf844/config.json)

The publisher's CyberGym leadership claim belongs to this flagship. Its pinned card reports 84.5 under a specified Claude Code harness, maximum reasoning effort and a single pass over 1,507 tasks with unlimited per-task time. This is publisher evidence; independent leaderboard leadership, local B300 speed and application quality are not established by that claim. [TOPG-GLM-CARD](https://huggingface.co/zai-org/GLM-5.3/raw/ba32f8c19c8738e2c57c71798c601d477a7bf844/README.md)

## The most important unresolved checks

Actual per-rank load and cache capacity on this node; exporter-specific quality under the application prompts; inclusion of required fixes in the selected image; and the workload crossover between vLLM and SGLang remain unmeasured. The 743B/753B accounting is now reconciled. See [architecture](architecture.md) for the pinned metadata calculation.

[Return to repository index](../../../README.md)

## Hugging Face README snapshots

These are unmodified README bytes fetched from immutable Hugging Face revisions on October 26. The publisher target, catalog exports and additional drafts/candidates remain distinct. Original relative links and images are preserved; use the pinned upstream view to resolve assets. Publisher benchmarks and launch examples retain their original scope, including older or development images. Apply the atlas serving assessment for KServe/B300. Upstream terms apply; copying a card does not qualify its model or configuration.

| Artifact | Local README | Pinned upstream README |
| --- | --- | --- |
| Publisher target: `zai-org/GLM-5.3` | [README](huggingface/README.md) | [ba32f8c19c87](https://huggingface.co/zai-org/GLM-5.3/blob/ba32f8c19c8738e2c57c71798c601d477a7bf844/README.md) |
| Catalog export: bf16: `zai-org/GLM-5.3-BF16` | [README](huggingface/bf16/README.md) | [abf42e6c0e53](https://huggingface.co/zai-org/GLM-5.3-BF16/blob/abf42e6c0e53bc29a875511301e7b7fcd220315b/README.md) |
| Catalog export: nvfp4: `RedHatAI/GLM-5.3-NVFP4` | [README](huggingface/nvfp4/README.md) | [c8917e425857](https://huggingface.co/RedHatAI/GLM-5.3-NVFP4/blob/c8917e4258572c405575855ff53effe58c17a38e/README.md) |
| Catalog export: nvfp4-inferact: `Inferact/GLM-5.3-NVFP4` | [README](huggingface/nvfp4-inferact/README.md) | [ce67b36f3669](https://huggingface.co/Inferact/GLM-5.3-NVFP4/blob/ce67b36f3669192b5bb233819f0fda6c8a9837f8/README.md) |
| Additional artifact (separate compatibility scope): `nvidia/GLM-5.3-NVFP4` | [README](huggingface/additional/nvidia--GLM-5.3-NVFP4/README.md) | [e3b8f9f2fad2](https://huggingface.co/nvidia/GLM-5.3-NVFP4/blob/e3b8f9f2fad29727dfa95e766c5cac18ea1414bf/README.md) |

Revision, retrieval time and SHA-256 are recorded through each card’s source ID in [sources.json](../../../evidence/sources.json) and the [model catalog](../../../catalog/models.json).
