# DeepSeek V4 Flash 0731

**Reverified 2026-10-15 (UTC).** V4 Flash family; compressed/sparse attention, mHC, built-in DSpark.

The July 31 checkpoint is the target of this report. Do not silently substitute the preview, the unsuffixed repository, or another release when resolving a launch command. [deepseek-v4-flash-0731-CARD](https://huggingface.co/deepseek-ai/DeepSeek-V4-Flash-0731/blob/7872f01b1d1fe23eabc4c98b48bffcef5a386062/README.md) [deepseek-v4-flash-0731-CFG](https://huggingface.co/deepseek-ai/DeepSeek-V4-Flash-0731/raw/7872f01b1d1fe23eabc4c98b48bffcef5a386062/config.json)

**First serving candidate:** vLLM TP1/DP4+EP baseline and SGLang documented TP4 comparator; qualify eight-GPU adaptations. This is a reasoned deployment starting point, not a measured winner on your hardware.

[Architecture](architecture.md) · [Precision and variants](precision.md) · [Serving decisions](serving.md) · [Validation](validation.md) · [Sources](sources.md) · [Machine-readable record](model.json)

## The mental model

The archive keeps the most recent pages nearby, condensed summaries of older pages, and an index that chooses what to reopen. A writing assistant can suggest a phrase, but the main author checks it using the same archive and state.

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
