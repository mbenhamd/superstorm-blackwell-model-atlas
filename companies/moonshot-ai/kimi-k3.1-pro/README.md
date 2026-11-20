# Kimi K3.1 Pro

**November 20, 2026.** The native revision remains d9e99b07. NVIDIA now publishes a separate mixed NVFP4 checkpoint. Inferact’s non-preview DSpark is also available. Current engine references are vLLM v0.34.0 and SGLang v0.5.23 under required KServe. [November 20 serving review](serving.md#november-20-engine-and-benchmark-review)

Moonshot describes K3.1 Pro as a post-trained Kimi K3. The serialized checkpoint keeps every K3 dimension except one: the 24 gated full-attention layers gain a DeepSeek-Sparse-Attention (DSA) lightning indexer that selects 2,048 history tokens per query. The card renames these layers from "Gated MLA" to "Gated DSA". The change affects attention kernels, KV-cache layout and engine support. Weight storage and precision format are unaffected. [kimi-k3.1-pro-CARD](https://huggingface.co/moonshotai/Kimi-K3.1-Pro/blob/d9e99b0792a5e93b78ea9bea62a68167e36ddd9e/README.md) [kimi-k3.1-pro-CFG](https://huggingface.co/moonshotai/Kimi-K3.1-Pro/raw/d9e99b0792a5e93b78ea9bea62a68167e36ddd9e/config.json)

**First serving comparison.** Qualify native MXFP4 TP8 target-only on a K3.1-capable development build under KServe. Neither stable engine serves K3.1. Compare the NVIDIA mixed NVFP4 target separately on its exporter-documented development images. [Precision evidence](precision.md)

[Architecture](architecture.md) · [Precision and variants](precision.md) · [Serving decisions](serving.md) · [Sources](sources.md) · [Model catalog](../../../catalog/models.json)

## What changed from Kimi K3

| Field | Kimi K3 (`f831ab66`) | Kimi K3.1 Pro (`d9e99b07`) | Serving consequence |
| --- | --- | --- | --- |
| Architecture class / `model_type` | `KimiK3ForConditionalGeneration` / `kimi_k3` | `KimiK31ForConditionalGeneration` / `kimi_k31` | Requires a new engine registry entry. K3 support does not load K3.1. |
| Full-attention layers | 24 gated MLA (dense over history) | Same 24 layers. `dsa_config` adds an indexer with 32 heads, head dim 128, no RoPE, top-k 2,048 and frequency 1 | Sparse MLA kernels plus an indexer-key cache. Per-token cache grows; per-step attention over long history is bounded by top-k. |
| Layers, KDA/MLA split, experts, latent dim, heads, vocabulary, context | 93; 69 KDA / 24 MLA; 896 routed / 16 active / 2 shared; 3,584; 96; 163,840; 1,048,576 | Identical | No change in weight-sharding topology |
| Attention-residual block size, SiTU constants | 12; 4.0 / 25.0 | Identical | Same activation contract |
| Quantization | compressed-tensors MXFP4 group 32, routed experts; `input_activations` null | Identical format. The ignore list now names router gate and latent projections, which K3 already stored in BF16 | No format change; the same MoE kernels apply |
| Indexer tensors | none | 24 × 7,438,592 = 178,526,208 BF16 parameters × 2 B = 357,052,416 bytes | +0.023% serialized bytes |
| Vision tower, processor, tokenizer, chat encoder | MoonViT-V2 (401M per card) | Identical config and processor. Tokenizer model and encoder logic are unchanged | Same `kimi_k3` parsers |
| License | Kimi K3 License | Kimi K3.1-Pro License; only the title and attribution name differ | Same commercial thresholds |

[kimi-k3.1-pro-CFG](https://huggingface.co/moonshotai/Kimi-K3.1-Pro/raw/d9e99b0792a5e93b78ea9bea62a68167e36ddd9e/config.json) [kimi-k3-CFG](https://huggingface.co/moonshotai/Kimi-K3/raw/f831ab66814297da540d832a5235f8e904f29d06/config.json) [kimi-k3.1-pro-INDEX](https://huggingface.co/moonshotai/Kimi-K3.1-Pro/resolve/d9e99b0792a5e93b78ea9bea62a68167e36ddd9e/model.safetensors.index.json) [kimi-k3.1-pro-HDR-00004](https://huggingface.co/moonshotai/Kimi-K3.1-Pro/resolve/d9e99b0792a5e93b78ea9bea62a68167e36ddd9e/model-00004-of-000096.safetensors) [kimi-k3.1-pro-LICENSE](https://huggingface.co/moonshotai/Kimi-K3.1-Pro/blob/d9e99b0792a5e93b78ea9bea62a68167e36ddd9e/LICENSE)

## Practical identity

| Property | Value |
| --- | --- |
| Exact base repository | moonshotai/Kimi-K3.1-Pro |
| Configured positional limit | 1,048,576 tokens |
| Initial TP candidate | 8 |
| Base revision pin | `d9e99b0792a5e93b78ea9bea62a68167e36ddd9e` |
| Serialized tensor bytes (index) | 1,561,217,377,280 bytes (1,454.00 GiB) |
| License scope | Kimi K3.1-Pro License; pinned file reviewed |
| Verification level | Immutable publisher card/config/license/index retrieved, plus one shard header; no local GPU load or benchmark |
| AA Intelligence Index v5.0.1 (third-party) | max: 46.453 (v5.0 46.003). AA weights link equals this repository; AA records no revision, precision or endpoint. Predecessor [Kimi K3](../kimi-k3/README.md) is scored separately. Not reproduced; not tied to this revision or any export. [Details](../../../reports/intelligence-index.md) [AA-MODEL-KIMI-K3-1-PRO](https://artificialanalysis.ai/models/kimi-k3-1-pro) |

The positional limit is not a promise of usable concurrent context. KDA state slots, MLA-plus-indexer KV, draft caches and images each consume separate budgets. [kimi-k3.1-pro-CFG](https://huggingface.co/moonshotai/Kimi-K3.1-Pro/raw/d9e99b0792a5e93b78ea9bea62a68167e36ddd9e/config.json)

## Release identity

Artificial Analysis lists release date 2026-10-23, 2.8T total / 104B active and "Open Weights (Commercial Use Restricted)". These are third-party metadata. The publisher card confirms 2.8T / 104B, and the LICENSE confirms commercial conditions. The Hub repository was created on 2026-11-02. The blog announces same-day API availability with weights "by Nov 4". The date therefore marks API launch, not weight publication. [AA-MODEL-KIMI-K3-1-PRO](https://artificialanalysis.ai/models/kimi-k3-1-pro) [kimi-k3.1-pro-API](https://huggingface.co/api/models/moonshotai/Kimi-K3.1-Pro) [kimi-k3.1-pro-BLOG](https://www.kimi.ai/blog/kimi-k3-1-pro)

## The most important unresolved checks

- vLLM v0.34.0 contains partial K3.1 code. Both stable engines lack a complete serving path.
- Image-digest ancestry of the `kimi-k31` builds.
- DSA indexer and sparse-MLA kernel dispatch on SM103.
- Actual per-rank residency and KV/state capacity after load.
- Natural (not synthetic) draft acceptance for the target workload.
- Long-context quality under FP8 or NVFP4 KV and top-2048 selection.
- The unpublished base revision `535833b1` used to build the RadixArk draft.

[Return to repository index](../../../README.md)

## Hugging Face README snapshots

The first snapshots were retrieved November 6. November 20 adds the NVIDIA mixed export and the non-preview co-published DSpark cards. Original relative links and images are preserved; use the pinned upstream view to resolve assets. Publisher and author benchmarks retain their original scope. Upstream terms apply; copying a card does not qualify its model or configuration.

| Artifact | Local README | Pinned upstream README |
| --- | --- | --- |
| Publisher target: `moonshotai/Kimi-K3.1-Pro` | [README](huggingface/README.md) | [d9e99b0792a5](https://huggingface.co/moonshotai/Kimi-K3.1-Pro/blob/d9e99b0792a5e93b78ea9bea62a68167e36ddd9e/README.md) |
| Additional artifact (vLLM recipe draft, preview): `Inferact/Kimi-K3.1-Pro-DSpark-preview` | [README](huggingface/additional/Inferact--Kimi-K3.1-Pro-DSpark-preview/README.md) | [6a2ef20a05ef](https://huggingface.co/Inferact/Kimi-K3.1-Pro-DSpark-preview/blob/6a2ef20a05efe88aabbf9ecaa12d020c3b0edf94/README.md) |
| Additional artifact (SGLang cookbook draft, preview): `RadixArk/Kimi-K3.1-Dflash2-Preview` | [README](huggingface/additional/RadixArk--Kimi-K3.1-Dflash2-Preview/README.md) | [ea257b38a8ee](https://huggingface.co/RadixArk/Kimi-K3.1-Dflash2-Preview/blob/ea257b38a8ee755b65287bb8ccd0938b519ce26b/README.md) |
| Additional artifact (third-party draft): `LithosAI/Kimi-K3.1-Pro-DSpark` | [README](huggingface/additional/LithosAI--Kimi-K3.1-Pro-DSpark/README.md) | [d791d217d1cc](https://huggingface.co/LithosAI/Kimi-K3.1-Pro-DSpark/blob/d791d217d1cc679e07877721761bfcc09d70d514/README.md) |
| Target export `nvidia/Kimi-K3.1-Pro-NVFP4` | [README](huggingface/nvfp4/README.md) | [3af0462972c9](https://huggingface.co/nvidia/Kimi-K3.1-Pro-NVFP4/blob/3af0462972c9cc07e5ba6e0867b44f961ce95e9b/README.md) |
| Additional DSpark publication `Inferact/Kimi-K3.1-Pro-DSpark` | [README](huggingface/additional/Inferact--Kimi-K3.1-Pro-DSpark/README.md) | [50f5a10c9385](https://huggingface.co/Inferact/Kimi-K3.1-Pro-DSpark/blob/50f5a10c9385fb9a225c534dda8f7a1f5ae87110/README.md) |
| Additional DSpark publication `RedHatAI/Kimi-K3.1-Pro-DSpark` | [README](huggingface/additional/RedHatAI--Kimi-K3.1-Pro-DSpark/README.md) | [fdb8bdea778a](https://huggingface.co/RedHatAI/Kimi-K3.1-Pro-DSpark/blob/fdb8bdea778a5260a9d9fbc7811044de46433959/README.md) |

Revision, retrieval time and SHA-256 are recorded through each card's source ID in [sources.json](../../../evidence/sources.json) and the [model catalog](../../../catalog/models.json).
