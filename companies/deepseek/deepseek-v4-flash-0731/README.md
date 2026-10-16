# DeepSeek V4 Flash 0731

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
