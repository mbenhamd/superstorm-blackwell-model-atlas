# Kimi K3.1 Pro: precision and provenance

Reviewed 2026-11-06 (UTC) against immutable publisher files. No checkpoint was loaded locally; only the index JSON and one shard header were retrieved.

| Variant | Exact artifact and revision | Precision evidence | Local status |
| --- | --- | --- | --- |
| native | `moonshotai/Kimi-K3.1-Pro` at `d9e99b0792a5e93b78ea9bea62a68167e36ddd9e` | compressed-tensors `mxfp4-pack-quantized`, group 32, `uint8` scales (`scale_dtype torch.uint8`), routed experts only. Attention, DSA indexer, router, latent projections, shared experts, dense MLP, head and vision tower are BF16 | Publisher metadata, index and shard-4 header verified |
| nvfp4 | none | No NVIDIA (or other) NVFP4 export of K3.1 Pro exists on the Hub as of 2026-11-06 | Not available |
| fp8 | none | Hypothetical all-FP8 target ≈ 2.8 TB from the rounded headline | Exceeds the 2.304 TB aggregate of eight 288 GB GPUs |

## Format versus Kimi K3

The quantization block keeps the K3 settings: `format`, `group_size` 32, `num_bits` 4, `scale_dtype torch.uint8`, `input_activations` null and `kv_cache_scheme` null. The ignore list adds two patterns: `block_sparse_moe.gate$` and `block_sparse_moe.routed_expert_(up|down)_proj`. The K3 shard-4 header already stores those tensors in BF16, so the new patterns make the exclusion explicit and do not change the format. Routed-expert packed shapes and scale shapes are the same in both headers. The new DSA indexer tensors are BF16. [kimi-k3.1-pro-CFG](https://huggingface.co/moonshotai/Kimi-K3.1-Pro/raw/d9e99b0792a5e93b78ea9bea62a68167e36ddd9e/config.json) [kimi-k3.1-pro-HDR-00004](https://huggingface.co/moonshotai/Kimi-K3.1-Pro/resolve/d9e99b0792a5e93b78ea9bea62a68167e36ddd9e/model-00004-of-000096.safetensors) [kimi-k3.1-pro-K3-HDR-00004](https://huggingface.co/moonshotai/Kimi-K3/resolve/f831ab66814297da540d832a5235f8e904f29d06/model-00004-of-000096.safetensors)

The card states "MXFP4 weights / MXFP8 activations (quantization-aware training)". The serialized config leaves activation quantization unset. The MXFP8-activation statement therefore describes training, not a runtime activation dtype fixed by the checkpoint. The SGLang default MoE runner is FlashInfer trtllm-gen fused MXFP4; the cookbook's MI355X path names A8W4. Runtime activation precision is an engine/backend property and must be recorded per run. [kimi-k3.1-pro-CARD](https://huggingface.co/moonshotai/Kimi-K3.1-Pro/blob/d9e99b0792a5e93b78ea9bea62a68167e36ddd9e/README.md) [kimi-k3.1-pro-GR](https://docs.sglang.io/cookbook/autoregressive/Moonshotai/Kimi-K3.1-Pro)

## Capacity on one 8×B300 node

| Quantity | Value | Label |
| --- | ---: | --- |
| Index `metadata.total_size` | 1,561,217,377,280 bytes = 1,454.00 GiB | Publisher artifact |
| Change vs K3 index (1,560,860,324,864) | +357,052,416 bytes (+0.023%) | Derived; equals the BF16 indexer exactly |
| NVIDIA reference aggregate HBM | 8 × 288 GB = 2,304 GB | [HW](https://docs.nvidia.com/dgx/dgxb300-user-guide/introduction-to-dgxb300.html) |
| Aggregate minus serialized bytes | ≈ 742.8 GB | Bookkeeping difference, not KV budget |
| Even 8-way split of serialized bytes | ≈ 195.2 GB/GPU of 288 GB, ≈ 92.8 GB/GPU remainder | Derived; assumes uniform sharding, which TP8 does not guarantee for replicated norms, router and vision tower |
| Hypothetical BF16 (2.8T × 2 B) / FP8 (2.8T × 1 B) | ≈ 5.6 TB / ≈ 2.8 TB | Derived; neither fits 2.304 TB |

**Conclusion:** at its native precision the checkpoint fits on one node with TP8. The pinned vLLM recipe and SGLang cookbook both use TP8 as the single-node baseline. No higher-precision variant fits, and no lower-precision NVFP4/FP8 export usable by vLLM or SGLang has been published (community MLX/EXL3/GGUF low-bit quantizations are out of scope). Actual per-rank weights, CUDA graphs, MegaMoE symmetric workspace, KDA state and KV must be measured after load. vLLM reports ~2.6M FP8 KV tokens at TP8 on 8×B300; this is a recipe-author figure, not reproduced. [kimi-k3.1-pro-INDEX](https://huggingface.co/moonshotai/Kimi-K3.1-Pro/resolve/d9e99b0792a5e93b78ea9bea62a68167e36ddd9e/model.safetensors.index.json) [kimi-k3.1-pro-VR](https://recipes.vllm.ai/moonshotai/Kimi-K3.1-Pro)

The Hub API's safetensors tally (2,780,110,363,392 "parameters", including 2,722,740,830,208 U8) counts packed storage elements. It is not a parameter census and does not corroborate the 2.8T headline. [kimi-k3.1-pro-API](https://huggingface.co/api/models/moonshotai/Kimi-K3.1-Pro)

## KV-cache precision options

| Option | Engine | Bytes per token per DSA layer | Evidence |
| --- | --- | --- | --- |
| FlashMLA `fp8_ds_mla` (SGLang default; FP8 forced, page 64) | SGLang | 656 latent + indexer key | Cookbook; PR 48714 |
| TRT-LLM / Prims-TS DSA backends (opt-in) | SGLang | 576 plain FP8 latent; FP8 query; "numerics differ slightly" | Cookbook; PR 48714 (TP8 B300 GSM8K 0.953 vs 0.949, author) |
| FP8 latent | vLLM | 576 | Recipe |
| `nvfp4_ds_mla` | vLLM | 352 latent; indexer keys stay FP8 | Recipe; GSM8K 96.1 vs 96.2 on 8×GB300, long-context accuracy unmeasured |

Any KV change alters the stored history that the indexer and sparse MLA read. Qualify it on long-context retrieval, not GSM8K alone. [kimi-k3.1-pro-GR](https://docs.sglang.io/cookbook/autoregressive/Moonshotai/Kimi-K3.1-Pro) [kimi-k3.1-pro-SPR48714](https://api.github.com/repos/sgl-project/sglang/pulls/48714) [kimi-k3.1-pro-VR-B300-NVFP4KV](https://recipes.vllm.ai/moonshotai/Kimi-K3.1-Pro.md?hardware=b300&strategy=single_node_tp&features=tool_calling,reasoning,nvfp4_kv_cache)

## Deployment rule

Pin the target revision, tokenizer/processor files, engine image digest and draft revision together. The two published K3.1 images are mutable tags; digests observed on 2026-11-06 are recorded in [serving](serving.md#november-6-engine-support-status). Do not substitute a K3 artifact, K3 draft or K3 NVIDIA export: the architecture class, attention kernels and draft feature layers differ.

## License provenance

The pinned LICENSE is the "Kimi K3.1-Pro License". Its text is identical to the Kimi K3 License except for the title and the product name required in section 3. Section 2 covers Model-as-a-Service operators whose combined revenue exceeds US$20M over any consecutive 12 months; they must sign a separate agreement with Moonshot AI before commercial use. Section 3 covers products with more than 100M MAU or more than US$20M monthly revenue; they must display "Kimi K3.1-Pro". Section 4 exempts internal use and access through Moonshot or certified partners. Artificial Analysis labels this "Open Weights (Commercial Use Restricted)", a third-party classification. The LithosAI draft carries the K3.1-Pro License. The RadixArk draft declares Apache-2.0 for its own weights. The Inferact draft card declares no license metadata, although its repository contains a LICENSE file that was not reviewed. [kimi-k3.1-pro-LICENSE](https://huggingface.co/moonshotai/Kimi-K3.1-Pro/blob/d9e99b0792a5e93b78ea9bea62a68167e36ddd9e/LICENSE) [kimi-k3-LICENSE](https://huggingface.co/moonshotai/Kimi-K3/blob/f831ab66814297da540d832a5235f8e904f29d06/LICENSE) [AA-MODEL-KIMI-K3-1-PRO](https://artificialanalysis.ai/models/kimi-k3-1-pro)
