# Qwen 3.8 27B: sources

Rechecked 2026-10-15 UTC. Publisher metadata was retrieved at the immutable revisions below. No model weights were downloaded or tensor payloads audited. Engine recipe statements remain upstream evidence.

## Checkpoint revisions

| Artifact | Immutable metadata revision |
| --- | --- |
| Qwen/Qwen3.8-27B | `1d4bf0f2ff6012fd82039f2fa52739d0dd7c60c0` |
| Qwen/Qwen3.8-27B-FP8 | `017b9c7af6b5689d5dd426a76e0bc077eb5ca20a` |
| nvidia/Qwen3.8-27B-NVFP4 | `482ca0f3832238542f8f5295dde86b5f22711d80` |

## Source register

### qwen3.8-27b-CARD

[Qwen 3.8 27B publisher model card](https://huggingface.co/Qwen/Qwen3.8-27B/raw/1d4bf0f2ff6012fd82039f2fa52739d0dd7c60c0/README.md)

Retrieved successfully on 2026-10-15 (HTTP 200). Immutable revision `1d4bf0f2ff6012fd82039f2fa52739d0dd7c60c0`. Publisher-owned repository API and immutable raw metadata retrieved successfully; no model weights downloaded.

### qwen3.8-27b-CFG

[Qwen 3.8 27B configuration](https://huggingface.co/Qwen/Qwen3.8-27B/raw/1d4bf0f2ff6012fd82039f2fa52739d0dd7c60c0/config.json)

Retrieved successfully on 2026-10-15 (HTTP 200). Immutable revision `1d4bf0f2ff6012fd82039f2fa52739d0dd7c60c0`. Publisher-owned repository API and immutable raw metadata retrieved successfully; no model weights downloaded.

### qwen3.8-27b-FP8

[Official Qwen 27B FP8 card](https://huggingface.co/Qwen/Qwen3.8-27B-FP8/raw/017b9c7af6b5689d5dd426a76e0bc077eb5ca20a/README.md)

Retrieved successfully on 2026-10-15 (HTTP 200). Immutable revision `017b9c7af6b5689d5dd426a76e0bc077eb5ca20a`. Publisher-owned repository API and immutable raw metadata retrieved successfully; no model weights downloaded.

### qwen3.8-27b-FP8-CFG

[Official Qwen 27B FP8 quantization configuration](https://huggingface.co/Qwen/Qwen3.8-27B-FP8/raw/017b9c7af6b5689d5dd426a76e0bc077eb5ca20a/config.json)

Retrieved successfully on 2026-10-15 (HTTP 200). Immutable revision `017b9c7af6b5689d5dd426a76e0bc077eb5ca20a`. Publisher-owned repository API and immutable raw metadata retrieved successfully; no model weights downloaded.

### qwen3.8-27b-NV

[NVIDIA mixed NVFP4/FP8 Qwen 27B card](https://huggingface.co/nvidia/Qwen3.8-27B-NVFP4/raw/482ca0f3832238542f8f5295dde86b5f22711d80/README.md)

Retrieved successfully on 2026-10-15 (HTTP 200). Immutable revision `482ca0f3832238542f8f5295dde86b5f22711d80`. Publisher-owned repository API and immutable raw metadata retrieved successfully; no model weights downloaded.

### qwen3.8-27b-NV-CFG

[NVIDIA Qwen 27B mixed configuration](https://huggingface.co/nvidia/Qwen3.8-27B-NVFP4/raw/482ca0f3832238542f8f5295dde86b5f22711d80/config.json)

Retrieved successfully on 2026-10-15 (HTTP 200). Immutable revision `482ca0f3832238542f8f5295dde86b5f22711d80`. Publisher-owned repository API and immutable raw metadata retrieved successfully; no model weights downloaded.

### qwen3.8-27b-NV-QUANT

[NVIDIA Qwen 27B quantization metadata](https://huggingface.co/nvidia/Qwen3.8-27B-NVFP4/raw/482ca0f3832238542f8f5295dde86b5f22711d80/hf_quant_config.json)

Retrieved successfully on 2026-10-15 (HTTP 200). Immutable revision `482ca0f3832238542f8f5295dde86b5f22711d80`. Publisher-owned repository API and immutable raw metadata retrieved successfully; no model weights downloaded.

### qwen3.8-27b-VR

[vLLM Qwen 27B recipe](https://recipes.vllm.ai/Qwen/Qwen3.8-27B)

Retrieved successfully on 2026-10-15 (HTTP 200). Mutable page or pull-request record. Current engine documentation retrieved; statements describe upstream documentation or measurements, not local serving validation.

### qwen3.8-27b-GR

[SGLang Qwen 27B cookbook](https://docs.sglang.io/cookbook/autoregressive/Qwen/Qwen3.8-27B)

Retrieved successfully on 2026-10-15 (HTTP 200). Mutable page or pull-request record. Current engine documentation retrieved; statements describe upstream documentation or measurements, not local serving validation.

## Source conflict

The NVIDIA card reports ModelOpt 0.48.0; both pinned quantization metadata files report `0.47.0.dev80+g913f5e224`. This audit records the disagreement without choosing an unsupported exporter version.

See the global [source register](../../../evidence/sources.json) and [limits](../../../LIMITATIONS.md).
