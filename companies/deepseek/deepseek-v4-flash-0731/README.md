# DeepSeek V4 Flash 0731

**November 20, 2026.** The native 0731 and NVIDIA 0731 Hub heads match their retained pins. The RedHat 0731 compressed-tensors checkpoint has a distinct target-only tensor inventory. Current engine references are vLLM v0.34.0 and SGLang v0.5.23 under required KServe. [November 20 serving review](serving.md#november-20-engine-and-benchmark-review)

**Reverified 2026-10-15 (UTC).** V4 Flash family; compressed/sparse attention, mHC, built-in DSpark.

The July 31 checkpoint is the target of this report. Do not silently substitute the preview, the unsuffixed repository, or another release when resolving a launch command. [deepseek-v4-flash-0731-CARD](https://huggingface.co/deepseek-ai/DeepSeek-V4-Flash-0731/blob/7872f01b1d1fe23eabc4c98b48bffcef5a386062/README.md) [deepseek-v4-flash-0731-CFG](https://huggingface.co/deepseek-ai/DeepSeek-V4-Flash-0731/raw/7872f01b1d1fe23eabc4c98b48bffcef5a386062/config.json)

**First serving comparison.** Compare native 0731 target-only on vLLM TP1/DP4+EP and SGLang TP4, using two groups of four for matched node throughput. Evaluate NVIDIA and RedHat 0731 NVFP4 as separate target-only export probes. [Precision evidence](precision.md)

[Architecture](architecture.md) · [Precision and variants](precision.md) · [Serving decisions](serving.md) · [Sources](sources.md) · [Model catalog](../../../catalog/models.json)

## Architecture and serving implications

Attention combines recent-window state with compressed, selected history. Routed experts and mHC add model-specific execution requirements; bundled DSpark introduces proposal and verification state. Cache sizing and speculative integration must follow the exact July-31 checkpoint and engine path. See [architecture](architecture.md) and [serving constraints](serving.md).

## Practical identity

| Property | Value |
| --- | --- |
| Exact base repository | deepseek-ai/DeepSeek-V4-Flash-0731 |
| Native target and bundled draft | 284.332B target weights and 19.846B DSpark weights, 304.178B combined. [Header census](architecture.md#target-and-draft-weights) |
| Configured positional limit | 1,048,576 tokens |
| Initial vLLM topology | TP1 / DP4 with expert parallelism; DP8 is an unbenchmarked adaptation |
| Base revision pin | `7872f01b1d1fe23eabc4c98b48bffcef5a386062` |
| License scope | MIT; pinned LICENSE and model-card scope reviewed |
| Verification level | Immutable publisher files reviewed; both engines documented upstream; no local GPU test |
| AA Intelligence Index v5.0.1 (third-party) | max: null (v5.0 null). Null means incomplete AA coverage. AA marks the release deprecated (successor `deepseek-v4-1-flash` → `deepseek-v4-1-flash-1017`). [DeepSeek V4.1 Flash 1017](../deepseek-v4.1-flash-1017/README.md) is a separate catalog family with a different architecture class (32.590 in v5.0.1); its score is not substituted. Not reproduced; not tied to this revision or any export. [Details](../../../reports/intelligence-index.md) [AA-MODEL-DEEPSEEK-V4-FLASH](https://artificialanalysis.ai/models/deepseek-v4-flash) |


The positional limit is not a promise of that many usable tokens under arbitrary batching or cache precision. [deepseek-v4-flash-0731-CARD](https://huggingface.co/deepseek-ai/DeepSeek-V4-Flash-0731/blob/7872f01b1d1fe23eabc4c98b48bffcef5a386062/README.md) [deepseek-v4-flash-0731-CFG](https://huggingface.co/deepseek-ai/DeepSeek-V4-Flash-0731/raw/7872f01b1d1fe23eabc4c98b48bffcef5a386062/config.json)

## The most important unresolved checks

The exact publisher convention for active parameters, kernel selection in the serving image and per-rank runtime memory remain open. Capacity, application quality and throughput through KServe require measurements on the B300 node.

[Return to repository index](../../../README.md)

## Hugging Face README snapshots

The additional November 20 rows link the newly inspected, revision-pinned publisher files.

These are unmodified README bytes fetched from immutable Hugging Face revisions on October 26 and November 20. The publisher target, catalog exports and additional drafts/candidates remain distinct. Original relative links and images are preserved; use the pinned upstream view to resolve assets. Publisher benchmarks and launch examples retain their original scope, including older or development images. Apply the atlas serving assessment for KServe/B300. Upstream terms apply; copying a card does not qualify its model or configuration.

| Artifact | Local README | Pinned upstream README |
| --- | --- | --- |
| Publisher target: `deepseek-ai/DeepSeek-V4-Flash-0731` | [README](huggingface/README.md) | [7872f01b1d1f](https://huggingface.co/deepseek-ai/DeepSeek-V4-Flash-0731/blob/7872f01b1d1fe23eabc4c98b48bffcef5a386062/README.md) |
| Target export (`nvfp4-nvidia`): `nvidia/DeepSeek-V4-Flash-0731-NVFP4` | [README](huggingface/additional/nvidia--DeepSeek-V4-Flash-0731-NVFP4/README.md) | [f1caa71142bd](https://huggingface.co/nvidia/DeepSeek-V4-Flash-0731-NVFP4/blob/f1caa71142bd0be02f728c79f75042ac1e461579/README.md) |
| Target export `RedHatAI/DeepSeek-V4-Flash-0731-NVFP4` | [README](huggingface/nvfp4-redhat/README.md) | [94ade0e65a07](https://huggingface.co/RedHatAI/DeepSeek-V4-Flash-0731-NVFP4/blob/94ade0e65a074c992844ec55dbcba5dca9d1cdfc/README.md) |

Revision, retrieval time and SHA-256 are recorded through each card’s source ID in [sources.json](../../../evidence/sources.json) and the [model catalog](../../../catalog/models.json).
