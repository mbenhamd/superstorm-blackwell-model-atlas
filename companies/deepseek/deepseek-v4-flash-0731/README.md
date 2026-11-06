# DeepSeek V4 Flash 0731

**Latest scoped recheck: November 6, 2026 (UTC).** Latest stable releases are **vLLM v0.33.0** and **SGLang v0.5.23**, under required KServe (upstream v0.21.0 unchanged; installed version unknown). November 6 Hub head recheck: 1 of 1 concrete variants equal retained pins (README/configuration not re-downloaded). Release notes, selected source and publisher recipes were reviewed at the release commits; no B300 execution was performed. See the [November 6 release update](serving.md#november-6-stable-releases-vllm-v0330-and-sglang-v0523), the retained [October 26 recheck](serving.md#october-26-stable-release-recheck) and [Hugging Face README snapshots](#hugging-face-readme-snapshots).

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
| AA Intelligence Index v5.0.1 (third-party) | max: null (v5.0 null). Null means incomplete AA coverage. AA marks the release deprecated (successor `deepseek-v4-1-flash` → `deepseek-v4-1-flash-1017`). [DeepSeek V4.1 Flash 1017](../deepseek-v4.1-flash-1017/README.md) is a separate catalog family with a different architecture class (32.590 in v5.0.1); its score is not substituted. Not reproduced; not tied to this revision or any export. [Details](../../../reports/intelligence-index.md) [AA-MODEL-DEEPSEEK-V4-FLASH](https://artificialanalysis.ai/models/deepseek-v4-flash) |


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
