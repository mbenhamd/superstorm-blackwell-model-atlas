# Gemma 4 31B IT

**As of 2026-10-15.** Dense multimodal 31B; 5 sliding layers per global-attention layer.

The 31B instruction-tuned variant is dense. Its configuration explicitly disables MoE and has no audio encoder configuration, despite some generic examples listing an audio input limit. [gemma-4-31b-it-CARD](https://huggingface.co/google/gemma-4-31B-it) [gemma-4-31b-it-CFG](https://huggingface.co/google/gemma-4-31B-it/raw/main/config.json)

**First serving candidate:** vLLM TP1 BF16/FP8/NVFP4 comparison; SGLang challenger with export-level probe. This is a reasoned deployment starting point, not a measured winner on your hardware.

[Architecture](architecture.md) · [Precision and variants](precision.md) · [Serving decisions](serving.md) · [Validation](validation.md) · [Sources](sources.md) · [Machine-readable record](model.json)

## The mental model

An editor reads the nearby paragraph most of the time and periodically scans the entire manuscript. The same dictionary serves both reading and writing. A label on a shared control panel does not mean this particular machine has a microphone attached.

## Practical identity

| Property | Value |
| --- | --- |
| Exact base repository | google/gemma-4-31B-it |
| Native positional limit | 262,144 tokens |
| Initial TP candidate | 1 |
| Base revision pin | Not resolved immutably; resolve before deployment |
| License scope | Apache-2.0 metadata observed on RedHat derivative; confirm base and derivative files |
| Verification level | Publisher configuration and cards reviewed; not loaded or benchmarked on hardware |


The positional limit is not a promise of that many usable tokens under arbitrary batching, image load or cache precision. [gemma-4-31b-it-CARD](https://huggingface.co/google/gemma-4-31B-it) [gemma-4-31b-it-CFG](https://huggingface.co/google/gemma-4-31B-it/raw/main/config.json)

## The most important unresolved checks

Physical KV allocation under attention_k_eq_v in the selected engine; exact export-level SGLang compatibility; correct tool template at the final image revision; local B300 quality and latency.

[Return to repository index](../../../README.md)
