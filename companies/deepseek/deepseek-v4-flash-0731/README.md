# DeepSeek V4 Flash 0731

**As of 2026-10-15.** V4 Flash family; compressed/sparse attention, mHC, built-in DSpark.

The July 31 checkpoint is the target of this report. Do not silently substitute the preview, the unsuffixed repository, or a later V4.1 Flash when resolving a launch command. [deepseek-v4-flash-0731-CARD](https://huggingface.co/deepseek-ai/DeepSeek-V4-Flash-0731) [deepseek-v4-flash-0731-CFG](https://huggingface.co/deepseek-ai/DeepSeek-V4-Flash-0731/raw/main/config.json)

**First serving candidate:** vLLM native mixed-format baseline; SGLang alternative after exact 0731 protocol check. This is a reasoned deployment starting point, not a measured winner on your hardware.

[Architecture](architecture.md) · [Precision and variants](precision.md) · [Serving decisions](serving.md) · [Validation](validation.md) · [Sources](sources.md) · [Machine-readable record](model.json)

## The mental model

The archive keeps the most recent pages nearby, condensed summaries of older pages, and an index that chooses what to reopen. A writing assistant can suggest a phrase, but the main author checks it using the same archive and state.

## Practical identity

| Property | Value |
| --- | --- |
| Exact base repository | deepseek-ai/DeepSeek-V4-Flash-0731 |
| Native positional limit | 1,048,576 tokens |
| Initial TP candidate | 8 |
| Base revision pin | Not resolved immutably; resolve before deployment |
| License scope | MIT metadata; exact 0731 license file should be pinned before redistribution |
| Verification level | Publisher configuration and cards reviewed; not loaded or benchmarked on hardware |


The positional limit is not a promise of that many usable tokens under arbitrary batching, image load or cache precision. [deepseek-v4-flash-0731-CARD](https://huggingface.co/deepseek-ai/DeepSeek-V4-Flash-0731) [deepseek-v4-flash-0731-CFG](https://huggingface.co/deepseek-ai/DeepSeek-V4-Flash-0731/raw/main/config.json)

## The most important unresolved checks

Exact total and active parameter scope for this checkpoint; source-to-image provenance of the selected backend; full raw compression schedule is not archived; no local B300 capacity or throughput results; exact SGLang 0731 integration not certified.

[Return to repository index](../../../README.md)
