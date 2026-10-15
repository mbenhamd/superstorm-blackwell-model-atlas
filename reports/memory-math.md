# Memory mathematics, with boundaries

## Uniform weight payload illustrations

For `P` parameters represented uniformly at `b` bits, the ideal payload is `P × b / 8` bytes. These columns exclude scales, alignment, mixed precision, any modules outside the stated count, and runtime memory. Rounded publisher headlines are approximate accounting inputs, not exact tensor counts or strict memory lower bounds. All table sizes use decimal GB.

| Model | Accounting basis | Uniform BF16 GB | Uniform FP8 GB | Uniform raw 4-bit GB |
| --- | --- | --- | --- | --- |
| Kimi K3 | Rounded 2800B headline | 5,600.0 | 2,800.0 | 1,400.0 |
| GLM 5.3 | 753.32994048B checkpoint, including serialized MTP | 1,506.7 | 753.3 | 376.7 |
| GLM 5.3 Flash | 321.32303139B Hub metadata count | 642.6 | 321.3 | 160.7 |
| DeepSeek V4 Flash 0731 | Exact target-plus-draft count unresolved | — | — | — |
| Qwen 3.8 27B | Rounded 27B language-model headline | 54.0 | 27.0 | 13.5 |
| Qwen 3.8 Flash Next | Rounded 180B main/n-gram/MTP subtotal | 360.0 | 180.0 | 90.0 |
| Gemma 4 31B IT | Rounded 31B headline | 62.0 | 31.0 | 15.5 |
| Mistral Medium 3.5 | Rounded 128B headline | 256.0 | 128.0 | 64.0 |


The [catalog](../catalog/models.json) distinguishes these scopes. GLM 5.3’s 753,329,940,480 reported parameters include 9,952,920,576 MTP parameters identified from the pinned BF16 shard headers, leaving 743,377,019,904 for the main model. Its familiar 743B headline therefore cannot describe the whole checkpoint. Flash’s 320B publisher headline is rounded; the Hub metadata reports 321,323,031,390. These metadata counts and derived illustrations are not measured GPU allocations. [glm-5.3-META](https://huggingface.co/api/models/zai-org/GLM-5.3/revision/ba32f8c19c8738e2c57c71798c601d477a7bf844) [GLM parameter accounting](../companies/z-ai/glm-5.3/architecture.md) [glm-5.3-flash-META](https://huggingface.co/api/models/zai-org/GLM-5.3-Flash/revision/46a050bec13002ad29ee795c16e61cf4fa3c4a9c)

Qwen Flash Next’s 125B + 51B + 4B subtotal covers the publisher’s main/n-gram/MTP quantities; it does not separately count vision. DeepSeek’s vLLM recipe uses a 284B family headline while SGLang’s 0731 cookbook says 304B. The different scopes have not been reconciled into an exact tensor census, so the table leaves that row unset. The hypothetical precision columns do not assert that those artifact variants exist. [Qwen accounting](../companies/alibaba-qwen/qwen3.8-flash-next/architecture.md) [DeepSeek accounting](../companies/deepseek/deepseek-v4-flash-0731/architecture.md)

## Scale overhead

For an ideal one-dimensional payload, MXFP4 with one byte of scale per 32 four-bit values consumes `0.5 + 1/32 = 0.53125` bytes per value. NVFP4 with one byte per 16 values consumes `0.5625` bytes per value before the outer tensor scale. These correspond to 4.25 and 4.5 effective bits for those parts. Real exports can add padding, layouts and mixed modules. The Transformer Engine training recipe also describes 16×16 weight scaling; the one-dimensional estimate here must not be applied to every NVFP4 recipe. [NV4](https://developer.nvidia.com/blog/introducing-nvfp4-for-efficient-and-accurate-low-precision-inference/) [TE4](https://docs.nvidia.com/deeplearning/transformer-engine/features/low_precision_training/nvfp4/nvfp4.html) [CUDNN](https://docs.nvidia.com/deeplearning/cudnn/latest/operations/BlockScaling.html)

For Qwen Flash Next, the approximately 51B n-gram table is FP8 in the NVIDIA derivative, so its ideal value payload is around 51 GB before scales and padding. Four-bit estimates that omit that table are incomplete. [qwen3.8-flash-next-NV](https://huggingface.co/nvidia/Qwen3.8-Flash-Next-NVFP4/blob/fc694b54fb0174e0913e6adf86691ef85a4ead47/README.md)

## Uniform GQA cache

For an unpadded, non-shared cache with separate K and V:

```text
KV bytes = 2 × layers × KV_heads × head_dim
           × tokens_per_sequence × concurrent_sequences × bytes_per_element
```

Use it only where those assumptions hold. At 262,144 tokens and one sequence, Mistral’s `2 × 88 × 8 × 128 × 262144 × 2` gives **88 GiB**. Qwen 27B’s `2 × 16 × 4 × 256 × 262144 × 2` gives **16 GiB** for its full-attention layers, plus separate linear state. These are aggregate, unsharded BF16 payloads; the engine determines per-rank allocation and any replication. A factor-of-two precision change affects element payload, not necessarily every allocation. [mistral-medium-3.5-CFG](https://huggingface.co/mistralai/Mistral-Medium-3.5-128B/blob/22b2b868a15677cfa6061277ed2f653d1349a9ab/config.json) [qwen3.8-27b-CFG](https://huggingface.co/Qwen/Qwen3.8-27B/raw/1d4bf0f2ff6012fd82039f2fa52739d0dd7c60c0/config.json)

Do not apply this formula unchanged to Kimi MLA, DeepSeek compressed attention, GLM sparse indexers or Gemma’s heterogeneous local/global and key/value-sharing behavior. A head count in config is not an allocator specification. [kimi-k3-CFG](https://huggingface.co/moonshotai/Kimi-K3/raw/f831ab66814297da540d832a5235f8e904f29d06/config.json) [deepseek-v4-flash-0731-CFG](https://huggingface.co/deepseek-ai/DeepSeek-V4-Flash-0731/raw/7872f01b1d1fe23eabc4c98b48bffcef5a386062/config.json) [gemma-4-31b-it-CFG](https://huggingface.co/google/gemma-4-31B-it/raw/842da3794eaa0b77d5f08bae87a17459d91ff475/config.json)

## Recurrent state

A simple per-sequence matrix-state illustration is:

```text
matrix bytes = linear_layers × value_heads × key_dim × value_dim × state_bytes
```

Under that layout assumption, with FP32 state and one sequence:

| Model | Linear layers × value heads × key dimension × value dimension × bytes | Matrix payload |
| --- | --- | --- |
| Kimi K3 | `69 × 96 × 128 × 128 × 4` | 414 MiB |
| GLM 5.3 Flash | `34 × 64 × 128 × 128 × 4` | 136 MiB |
| Qwen 3.8 27B | `48 × 48 × 128 × 128 × 4` | 144 MiB |
| Qwen 3.8 Flash Next | `36 × 48 × 128 × 128 × 4` | 108 MiB |

These are aggregate matrix-only illustrations before sharding; they exclude convolution, padding and extra slots. The published Qwen cookbook’s fuller state-slot estimate is therefore larger. [kimi-k3-CFG](https://huggingface.co/moonshotai/Kimi-K3/raw/f831ab66814297da540d832a5235f8e904f29d06/config.json) [glm-5.3-flash-CFG](https://huggingface.co/zai-org/GLM-5.3-Flash/raw/46a050bec13002ad29ee795c16e61cf4fa3c4a9c/config.json) [qwen3.8-27b-CFG](https://huggingface.co/Qwen/Qwen3.8-27B/raw/1d4bf0f2ff6012fd82039f2fa52739d0dd7c60c0/config.json) [qwen3.8-flash-next-CFG](https://huggingface.co/Qwen/Qwen3.8-Flash-Next/raw/de4b8e4d43b917e7706784d8bb445c9af86a3540/config.json) [qwen3.8-27b-GR](https://docs.sglang.io/cookbook/autoregressive/Qwen/Qwen3.8-27B)

A state pool may reserve multiple slots per running request for prefix checkpoints, overlapping work and draft verification. The SGLang Qwen recipe distinguishes ordinary state slots from speculative intermediate buffers and replay-ring implementations. Use actual slot counts and boot logs; never multiply a generic “default concurrency” by only one matrix. [qwen3.8-27b-GR](https://docs.sglang.io/cookbook/autoregressive/Qwen/Qwen3.8-27B)

## Practical capacity workflow

Measure post-load free memory, graph-capture peak, KV token capacity, state-slot capacity and maximum running requests separately. Increase request length with batch fixed, then batch with length fixed. Repeat after changing speculation, cache dtype or multimodal input shape. Leave a documented safety margin and test cancellation/eviction paths under load.

Run `python scripts/memory.py --help` for the tested analytic calculator. It refuses to present a universal hybrid-cache estimate and labels all numbers as payload estimates.
