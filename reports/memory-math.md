# Memory mathematics, with boundaries

## Ideal weight floors

For `P` parameters represented uniformly at `b` bits, the ideal payload is `P × b / 8` bytes. This deliberately excludes scales, alignment, higher-precision modules, vision, auxiliary modules when not counted, and runtime memory. It is not an actual checkpoint-size table.

| Model | Accounting basis | Uniform BF16 GB | Uniform FP8 GB | Uniform raw 4-bit GB |
| --- | --- | --- | --- | --- |
| Kimi K3 | 2800B | 5,600.0 | 2,800.0 | 1,400.0 |
| GLM 5.3 | 743B | 1,486.0 | 743.0 | 371.5 |
| GLM 5.3 Flash | 320B | 640.0 | 320.0 | 160.0 |
| DeepSeek V4 Flash 0731 | 284B family; exact auxiliary scope unset | 568.0 | 284.0 | 142.0 |
| Qwen 3.8 27B | 27B | 54.0 | 27.0 | 13.5 |
| Qwen 3.8 Flash Next | 180B | 360.0 | 180.0 | 90.0 |
| Gemma 4 31B IT | 31B | 62.0 | 31.0 | 15.5 |
| Mistral Medium 3.5 | 128B | 256.0 | 128.0 | 64.0 |


These are calculations from the model-specific headline scopes in [the catalog](../catalog/models.json). Qwen Flash Next’s 180B subtotal includes the separately advertised main/n-gram/MTP quantities; GLM 5.3’s main count differs from the RedHat displayed checkpoint figure; DeepSeek’s family headline does not establish an exact auxiliary census. The hypothetical columns do not assert the existence of those artifact variants.

## Scale overhead

For an ideal one-dimensional payload, MXFP4 with one byte of scale per 32 four-bit values consumes `0.5 + 1/32 = 0.53125` bytes per value. NVFP4 with one byte per 16 values consumes `0.5625` bytes per value before the outer tensor scale. These correspond to 4.25 and 4.5 effective bits for those parts. Real exports can add padding, layouts and mixed modules. [NV4](https://developer.nvidia.com/blog/introducing-nvfp4-for-efficient-and-accurate-low-precision-inference/) [TE4](https://docs.nvidia.com/deeplearning/transformer-engine/features/low_precision_training/nvfp4/nvfp4.html) [CUDNN](https://docs.nvidia.com/deeplearning/cudnn/latest/operations/BlockScaling.html)

For Qwen Flash Next, the 51B n-gram table is FP8 in the NVIDIA derivative, so its ideal payload alone is around 51 GB. Four-bit estimates that omit that table are fundamentally incomplete. [qwen3.8-flash-next-NV](https://huggingface.co/nvidia/Qwen3.8-Flash-Next-NVFP4)

## Uniform GQA cache

For an unpadded, non-shared cache with separate K and V:

```text
KV bytes = 2 × layers × KV_heads × head_dim
           × tokens_per_sequence × concurrent_sequences × bytes_per_element
```

Use it only where those assumptions hold. Mistral’s published configuration gives an illustrative 88 GiB BF16 payload for one 262,144-token request. Qwen 27B’s 16 full-attention layers give 16 GiB at that length, plus its separate linear state. A factor-of-two precision change affects element payload, not necessarily every allocation. [mistral-medium-3.5-CFG](https://huggingface.co/mistralai/Mistral-Medium-3.5-128B/blob/main/config.json) [qwen3.8-27b-CFG](https://huggingface.co/Qwen/Qwen3.8-27B/raw/main/config.json)

Do not apply this formula unchanged to Kimi MLA, DeepSeek compressed attention, GLM sparse indexers or Gemma’s heterogeneous local/global and key/value-sharing behavior. A head count in config is not an allocator specification. [kimi-k3-CFG](https://huggingface.co/moonshotai/Kimi-K3/raw/main/config.json) [deepseek-v4-flash-0731-CFG](https://huggingface.co/deepseek-ai/DeepSeek-V4-Flash-0731/raw/main/config.json) [gemma-4-31b-it-CFG](https://huggingface.co/google/gemma-4-31B-it/raw/main/config.json)

## Recurrent state

A simple per-sequence matrix-state illustration is:

```text
matrix bytes = linear_layers × value_heads × key_dim × value_dim × state_bytes
```

Under this explicit layout assumption and FP32 state, the matrix-only quantities are Kimi 414 MiB, GLM Flash 136 MiB, Qwen 27B 144 MiB and Qwen Flash Next 108 MiB. They exclude convolution, padding and extra state slots. The published Qwen cookbook’s fuller state-slot estimate is therefore larger than the bare matrix calculation. [kimi-k3-CFG](https://huggingface.co/moonshotai/Kimi-K3/raw/main/config.json) [glm-5.3-flash-CFG](https://huggingface.co/zai-org/GLM-5.3-Flash/raw/main/config.json) [qwen3.8-27b-CFG](https://huggingface.co/Qwen/Qwen3.8-27B/raw/main/config.json) [qwen3.8-flash-next-CFG](https://huggingface.co/Qwen/Qwen3.8-Flash-Next/raw/de4b8e4d43b917e7706784d8bb445c9af86a3540/config.json) [qwen3.8-27b-GR](https://docs.sglang.io/cookbook/autoregressive/Qwen/Qwen3.8-27B)

A state pool may reserve multiple slots per running request for prefix checkpoints, overlapping work and draft verification. The SGLang Qwen recipe distinguishes ordinary state slots from speculative intermediate buffers and replay-ring implementations. Use actual slot counts and boot logs; never multiply a generic “default concurrency” by only one matrix. [qwen3.8-27b-GR](https://docs.sglang.io/cookbook/autoregressive/Qwen/Qwen3.8-27B)

## Practical capacity workflow

Measure post-load free memory, graph-capture peak, KV token capacity, state-slot capacity and maximum running requests separately. Increase request length with batch fixed, then batch with length fixed. Repeat after changing speculation, cache dtype or multimodal input shape. Leave a documented safety margin and test cancellation/eviction paths under load.

Run `python scripts/memory.py --help` for the tested analytic calculator. It refuses to present a universal hybrid-cache estimate and labels all numbers as payload estimates.
