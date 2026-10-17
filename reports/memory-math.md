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

For GLM BF16, the full-count illustration is **1,506,659,880,960 bytes**; the pinned weight index reports **1,506,659,919,872 bytes** because the checkpoint is not literally uniform BF16. Both are about 1.507 decimal TB. Four advertised 288 GB GPUs provide only 1.152 TB, so this BF16 payload rules out TP4 with full GPU residency before caches. TP8 is the conventional capacity candidate among TP1/2/4/8; this arithmetic does not prove that TP8 is the only possible sharding arrangement or that an engine can load it. Serialized bytes, modules loaded, temporary repacking and final per-rank residency remain separate quantities. The main model without the separately counted MTP is still about 1.487 TB under uniform BF16. [glm-5.3-BF16-INDEX](https://huggingface.co/zai-org/GLM-5.3-BF16/resolve/abf42e6c0e53bc29a875511301e7b7fcd220315b/model.safetensors.index.json) [GLM parameter accounting](../companies/z-ai/glm-5.3/architecture.md)

Qwen Flash Next’s 125B + 51B + 4B subtotal covers the publisher’s main/n-gram/MTP quantities; it does not separately count vision. DeepSeek’s vLLM recipe uses a 284B family headline while SGLang’s 0731 cookbook says 304B. The different scopes have not been reconciled into an exact tensor census, so the table leaves that row unset. The hypothetical precision columns do not assert that those artifact variants exist. [Qwen accounting](../companies/alibaba-qwen/qwen3.8-flash-next/architecture.md) [DeepSeek accounting](../companies/deepseek/deepseek-v4-flash-0731/architecture.md)

### FP8 capacity examples do not specify a deployment

A **hypothetical** uniformly FP8 70B or 72B parameter payload is respectively **70 or 72 decimal GB** (about 65.19 or 67.06 GiB). This is one byte per parameter, before scales, higher precision exclusions and resident repacking. It is not a claim that a particular 72B checkpoint exists or occupies exactly 72 GB at runtime. On the advertised 288 GB reference, `288 − 72 = 216 GB` is only a payload subtraction. Assigning 200 GB to KV would leave 16 GB for every other allocation and headroom under that simplified model; no such reserve is guaranteed. The [hardware comparison](../hardware/B300-8GPU.md#capacity-bandwidth-and-fp8-peaks) explains the advertised-capacity assumptions.

For a separate **671B uniform-FP8 illustration**, the ideal weight payload is 671 GB. The table considers full GPU residency and perfect weight distribution, with no other allocations:

| Advertised per-GPU capacity used | Arithmetic minimum `ceil(671 / capacity)` | First capacity candidate among 1/2/4/8 GPUs | Candidate aggregate capacity minus 671 GB |
| --- | --- | --- | --- |
| B300: 288 GB | 3 | 4 | 481 GB |
| DGX B200 basis: 180 GB | 4 | 4 | 49 GB |
| Blackwell chip-maximum basis: 192 GB | 4 | 4 | 97 GB |
| H200: 141 GB | 5 | 8 | 457 GB |

The capacity inputs retain their publisher scopes. [FP8H-B300-GUIDE](https://docs.nvidia.com/dgx/dgxb300-user-guide/introduction-to-dgxb300.html), [FP8H-B200-GUIDE](https://docs.nvidia.com/dgx/dgxb200-user-guide/introduction-to-dgxb200.html), [FP8H-BWULTRA](https://developer.nvidia.com/blog/inside-nvidia-blackwell-ultra-the-chip-powering-the-ai-factory-era/), [FP8H-H200](https://www.nvidia.com/en-us/data-center/h200/).

Four B300s are therefore a plausible weight-capacity candidate. “Eight H200s are required” follows only after restricting this illustration to 1/2/4/8-way choices; the payload-only arithmetic minimum is five, and four H200s offer only 564 GB. Neither three B300s nor five H200s is thereby a supported sharding configuration. Four B300s and eight H200s have similar advertised aggregate memory (1,152 versus 1,128 GB), but different compute and communication resources. TP4, EP4 and TP4 combined with EP are different process-group arrangements: expert placement, replicated modules, cache geometry and runtime peaks determine whether a real checkpoint fits. The residual column is not available KV memory or a guarantee of comfortable operation.

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

### Turning an FP8 cache budget into token slots

For an explicitly **illustrative** dense GQA geometry of 80 layers, eight KV heads and head dimension 128, one FP8 cache token costs `2 × 80 × 8 × 128 × 1 = 163,840 bytes` (**160 KiB**). An independently established **200 decimal GB KV budget** therefore holds at most `floor(200,000,000,000 / 163,840) = 1,220,703` payload token slots before scales, page rounding and other cache metadata. BF16 doubles the element payload and halves this ideal token capacity. The calculation assumes the same effective one-byte storage for both K and V; an FP8 weight export does not select that cache format.

Those 1.22 million slots are an **aggregate over concurrently cached sequence tokens**, not an authorized 1.22-million-token context or a throughput prediction. With unequal sequence lengths, replace `tokens_per_sequence × concurrent_sequences` by the sum of cached lengths; prompt tokens and generated tokens both occupy slots. Actual allocator behavior, prefix sharing, eviction, per-rank sharding and supported model context constrain the result.

The atlas's pinned configurations give different payloads, freshly rechecked on October 16, 2026:

| Pinned model geometry | FP8 bytes per cached token, aggregate | FP8 payload at 262,144 tokens, one sequence |
| --- | --- | --- |
| Mistral Medium 3.5: 88 full-attention layers, eight KV heads, dimension 128 | 180,224 bytes (176 KiB) | 44 GiB |
| Qwen 3.8 27B: 16 full-attention layers, four KV heads, dimension 256 | 32,768 bytes (32 KiB) | 8 GiB, plus recurrent state |

Both inspected text configurations set `max_position_embeddings` to **262,144**. These values define the cited configuration scope; spare cache memory alone neither raises that context limit nor establishes acceptable long-context quality. The table assumes a compatible FP8 KV backend and excludes auxiliary state and cache metadata. [FP8H-MISTRAL-CFG](https://huggingface.co/mistralai/Mistral-Medium-3.5-128B/resolve/22b2b868a15677cfa6061277ed2f653d1349a9ab/config.json), [FP8H-QWEN-CFG](https://huggingface.co/Qwen/Qwen3.8-27B/resolve/1d4bf0f2ff6012fd82039f2fa52739d0dd7c60c0/config.json).

Using the Qwen geometry above, **256 independent, non-shared full-length histories require 256 × 8 GiB = 2 TiB** of full-attention FP8 payload per TP1 replica, before recurrent state or weights. That exceeds one B300. A concurrency cap of 256 and a context cap of 262,144 are separate ceilings; their presence in one command does not guarantee admission of their product. Prefix sharing, shorter live histories and scheduling can change actual occupancy, but must be counted explicitly.

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

Budget seven distinct allocation groups before adding safety headroom: target weights and their scales/repacked copies; draft/MTP weights; token KV, attention indices and compressed caches; recurrent/conv state and all snapshots; temporary activations; graph/kernel/library/allocator overhead; communication and expert-routing buffers. Avoid double-counting a workspace already included in a measured graph peak. Measure the largest rank, not just the node average; tensor replication, unequal expert placement and auxiliary modules can prevent an even split.

Measure post-load free memory, graph-capture peak, KV token capacity, state-slot capacity and maximum running requests separately. Increase request length with batch fixed, then batch with length fixed. Repeat after changing speculation, cache dtype or multimodal input shape. Record the peak during load/repacking as well as steady state, and test cancellation/eviction paths under load. A seven-part ledger is an accounting framework; the engine logs and allocator measurements establish the actual values.

## Executor fractions are not reserved memory

For illustration only, take the advertised memory as 288 decimal GB per GPU:

| Fraction | Fraction × 288 GB | Arithmetic complement per GPU | Complement over eight GPUs |
| --- | --- | --- | --- |
| 0.88 | 253.44 GB | 34.56 GB | 276.48 GB |
| 0.90 | 259.20 GB | 28.80 GB | 230.40 GB |
| 0.92 | 264.96 GB | 23.04 GB | 184.32 GB |

These complements are **not a hard reservation** or guaranteed free memory. Substitute the actual driver-visible capacity and units, account for other processes, and observe the engine's runtime peak. Do not add the complement to an already measured safety margin a second time.

At vLLM **0.31.0**, commit `db9527a46873454610df6dbedf79a36d6bf1a7f6`, `gpu_memory_utilization` is a per-instance executor budget; its source default is **0.92**. The startup helper computes `ceil(total_device_memory × fraction)` and checks available memory. The worker subtracts profiled non-KV memory and any applied graph estimate to size the cache. Thus `0.88` is an explicit experimental choice, and it does not give 88% of memory to KV alone. An explicit `kv_cache_memory_bytes` overrides automatic cache sizing, so record it too. [RR-ENG-V-STABLE-CACHE-PIN](https://github.com/vllm-project/vllm/blob/db9527a46873454610df6dbedf79a36d6bf1a7f6/vllm/config/cache.py) [RR-ENG-V-STABLE-UTILS](https://github.com/vllm-project/vllm/blob/db9527a46873454610df6dbedf79a36d6bf1a7f6/vllm/v1/worker/utils.py) [RR-ENG-V-STABLE-GPU_WORKER-PIN](https://github.com/vllm-project/vllm/blob/db9527a46873454610df6dbedf79a36d6bf1a7f6/vllm/v1/worker/gpu_worker.py)

At SGLang **0.5.21**, commit `e00930c5489053f26d86b179cee0d087f846acbb`, the inspected allocator starts from post-load free memory, subtracts `pre_model_load_memory × (1 − mem_fraction_static)` and a multimodal reserve, then handles recurrent-state budgets where applicable. Already resident target and draft weights therefore reduce cache capacity. This differs from vLLM's total-device executor calculation. Equal numeric fractions do not establish equal cache, runtime headroom or concurrency; compare effective token/state capacities and observed peaks. [RR-ENG-G-STABLE-KV_CACHE_CONFIGURATOR](https://github.com/sgl-project/sglang/blob/e00930c5489053f26d86b179cee0d087f846acbb/python/sglang/srt/mem_cache/kv_cache_configurator.py)

Conditional reserves also matter: the vLLM worker applies a multimodal IPC reserve after its automatic cache calculation; SGLang's hybrid post-capture path floors runtime slack at its configured pre-capture activation reserve. The simple fraction formulas do not include every branch-specific deduction. The pinned worker and allocator sources above define those branches.

The formulas describe payloads under their stated assumptions. A universal hybrid-cache estimate cannot be derived from parameter count and context length alone.

## Qwen27: admission caps versus native-context payload

For the pinned 16 full-attention layers, 4 KV heads and 256-dimensional heads, ordinary KV costs 65,536 bytes/token in BF16 or 32,768 in FP8 at TP1. A 262,144-token independent history therefore uses 16 GiB or 8 GiB respectively. **16 BF16 histories and 32 FP8 histories both require 256 GiB of payload**, excluding weights, recurrent state, graphs and all other allocations. A literal 288 GB reference GPU with a 0.90 executor fraction supplies about 241.4 GiB under that simplified budget. These settings cannot guarantee all histories reach the cap concurrently. `max-num-seqs` and `max-model-len` are distinct controls; shared prefixes can reduce physical cache use but cannot be assumed for unique histories. Actual reported HBM and allocator behavior determine capacity. [qwen3.8-27b-CFG](https://huggingface.co/Qwen/Qwen3.8-27B/raw/1d4bf0f2ff6012fd82039f2fa52739d0dd7c60c0/config.json)

This also explains why changing the original examples from 32 FP8 sequences to 16 BF16 sequences does not isolate backend latency. Use matched admission/batching first, then explore the capacity tradeoff separately. [v0.31 comparison](../companies/alibaba-qwen/qwen3.8-27b/serving.md).
