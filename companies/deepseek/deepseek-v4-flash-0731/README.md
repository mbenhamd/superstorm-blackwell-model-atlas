# DeepSeek V4 Flash 0731

**Latest scoped recheck: October 26, 2026 (UTC).** Stable references remain **vLLM v0.32.0** and **SGLang v0.5.22**, under required KServe (upstream v0.21.0; installed version unknown). All concrete catalog variants still match their retained revisions. Current publisher cards/configurations and selected engine restrictions were rechecked; no B300 execution was performed. See [current serving assessment](serving.md#october-26-stable-release-recheck) and [Hugging Face README snapshots](#hugging-face-readme-snapshots).

**Reverified 2026-10-15 (UTC).** V4 Flash family; compressed/sparse attention, mHC, built-in DSpark.

The July 31 checkpoint is the target of this report. Do not silently substitute the preview, the unsuffixed repository, or another release when resolving a launch command. [deepseek-v4-flash-0731-CARD](https://huggingface.co/deepseek-ai/DeepSeek-V4-Flash-0731/blob/7872f01b1d1fe23eabc4c98b48bffcef5a386062/README.md) [deepseek-v4-flash-0731-CFG](https://huggingface.co/deepseek-ai/DeepSeek-V4-Flash-0731/raw/7872f01b1d1fe23eabc4c98b48bffcef5a386062/config.json)

**First serving candidate:** vLLM TP1/DP4+EP baseline and SGLang documented TP4 comparator; qualify eight-GPU adaptations. This is an unbenchmarked candidate for the target B300 node; relative performance remains workload-dependent.

[Architecture](architecture.md) · [Precision and variants](precision.md) · [Serving decisions](serving.md) · [Sources](sources.md) · [Model catalog](../../../catalog/models.json)

## Architecture and serving implications

Attention combines recent-window state with compressed, selected history. Routed experts and mHC add model-specific execution requirements; bundled DSpark introduces proposal and verification state. Cache sizing and speculative integration must follow the exact July-31 checkpoint and engine path. See [architecture](architecture.md) and [serving constraints](serving.md).

## Practical identity

| Property | Value |
| --- | --- |
| Exact base repository | deepseek-ai/DeepSeek-V4-Flash-0731 |
| Configured positional limit | 1,048,576 tokens |
| Initial vLLM topology | TP1 / DP4 with expert parallelism; DP8 is an unbenchmarked adaptation |
| Base revision pin | `7872f01b1d1fe23eabc4c98b48bffcef5a386062` |
| License scope | MIT; pinned LICENSE and model-card scope reviewed |
| Verification level | Immutable publisher files reviewed; both engines documented upstream; no local GPU test |


The positional limit is not a promise of that many usable tokens under arbitrary batching or cache precision. [deepseek-v4-flash-0731-CARD](https://huggingface.co/deepseek-ai/DeepSeek-V4-Flash-0731/blob/7872f01b1d1fe23eabc4c98b48bffcef5a386062/README.md) [deepseek-v4-flash-0731-CFG](https://huggingface.co/deepseek-ai/DeepSeek-V4-Flash-0731/raw/7872f01b1d1fe23eabc4c98b48bffcef5a386062/config.json)

## The most important unresolved checks

Exact main-plus-draft parameter accounting; selected image and kernel provenance; local B300 capacity, throughput and application correctness; qualification of the local eight-GPU adaptations.

[Return to repository index](../../../README.md)

## Hugging Face README snapshots

These are unmodified README bytes fetched from immutable Hugging Face revisions on October 26. The publisher target, catalog exports and additional drafts/candidates remain distinct. Original relative links and images are preserved; use the pinned upstream view to resolve assets. Publisher benchmarks and launch examples retain their original scope, including older or development images. Apply the atlas serving assessment for KServe/B300. Upstream terms apply; copying a card does not qualify its model or configuration.

| Artifact | Local README | Pinned upstream README |
| --- | --- | --- |
| Publisher target: `deepseek-ai/DeepSeek-V4-Flash-0731` | [README](huggingface/README.md) | [7872f01b1d1f](https://huggingface.co/deepseek-ai/DeepSeek-V4-Flash-0731/blob/7872f01b1d1fe23eabc4c98b48bffcef5a386062/README.md) |
| Additional artifact (separate compatibility scope): `nvidia/DeepSeek-V4-Flash-0731-NVFP4` | [README](huggingface/additional/nvidia--DeepSeek-V4-Flash-0731-NVFP4/README.md) | [f1caa71142bd](https://huggingface.co/nvidia/DeepSeek-V4-Flash-0731-NVFP4/blob/f1caa71142bd0be02f728c79f75042ac1e461579/README.md) |

Revision, retrieval time and SHA-256 are recorded through each card’s source ID in [sources.json](../../../evidence/sources.json) and the [model catalog](../../../catalog/models.json).
