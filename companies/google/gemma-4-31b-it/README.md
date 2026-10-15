# Gemma 4 31B IT

**As of 2026-10-15.** Dense multimodal 31B; 5 sliding layers per global-attention layer.

The 31B instruction-tuned variant is dense. Its configuration explicitly disables MoE and has no audio encoder configuration, despite some generic examples listing an audio input limit. [gemma-4-31b-it-CARD](https://huggingface.co/google/gemma-4-31B-it/blob/842da3794eaa0b77d5f08bae87a17459d91ff475/README.md) [gemma-4-31b-it-CFG](https://huggingface.co/google/gemma-4-31B-it/raw/842da3794eaa0b77d5f08bae87a17459d91ff475/config.json)

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
| Base revision pin | `842da3794eaa0b77d5f08bae87a17459d91ff475` |
| License scope | Apache-2.0 in the Google base and Red Hat derivative cards; Google license page reviewed |
| Verification level | Pinned cards, configs and file metadata rechecked; no model load or B300 benchmark |


The positional limit is not a promise of that many usable tokens under arbitrary batching, image load or cache precision. [gemma-4-31b-it-CARD](https://huggingface.co/google/gemma-4-31B-it/blob/842da3794eaa0b77d5f08bae87a17459d91ff475/README.md) [gemma-4-31b-it-CFG](https://huggingface.co/google/gemma-4-31B-it/raw/842da3794eaa0b77d5f08bae87a17459d91ff475/config.json)

## The most important unresolved checks

Physical KV allocation under attention_k_eq_v in the selected engine; exact export-level SGLang compatibility; correct tool template at the final image revision; local B300 quality and latency.

[Return to repository index](../../../README.md)
