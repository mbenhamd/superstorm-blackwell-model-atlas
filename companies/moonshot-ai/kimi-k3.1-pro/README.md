# Kimi K3.1 Pro

**Latest scoped recheck: November 6, 2026 (UTC).** First atlas review of this family. The publisher repository head is pinned at `d9e99b0792a5e93b78ea9bea62a68167e36ddd9e`. Its card, configuration, license, full safetensors index and one shard header were retrieved and compared field by field with the retained [Kimi K3](../kimi-k3/README.md) pin. **Neither the latest stable releases (vLLM v0.33.0, SGLang v0.5.23) nor the earlier baselines (v0.32.0, v0.5.22) contain K3.1 support.** vLLM support exists only in open PRs and a `kimi-k31` image. SGLang basic support merged to main on 2026-11-04 (`61a3c7f2`) and plain decode context parallelism on 2026-11-06 (`188cf7da`), both after the v0.5.23 tag; PD and DFLASH remain on the `kimi-k3.1-day-0` branch. KServe remains the required deployment layer; its installed version is unknown. No B300 execution was performed. See [serving](serving.md#november-6-engine-support-status) and [Hugging Face README snapshots](#hugging-face-readme-snapshots).

Moonshot describes K3.1 Pro as a post-trained Kimi K3. The serialized checkpoint keeps every K3 dimension except one: the 24 gated full-attention layers gain a DeepSeek-Sparse-Attention (DSA) lightning indexer that selects 2,048 history tokens per query. The card renames these layers from "Gated MLA" to "Gated DSA". The change affects attention kernels, KV-cache layout and engine support. Weight storage and precision format are unaffected. [kimi-k3.1-pro-CARD](https://huggingface.co/moonshotai/Kimi-K3.1-Pro/blob/d9e99b0792a5e93b78ea9bea62a68167e36ddd9e/README.md) [kimi-k3.1-pro-CFG](https://huggingface.co/moonshotai/Kimi-K3.1-Pro/raw/d9e99b0792a5e93b78ea9bea62a68167e36ddd9e/config.json)

**First serving candidate (unbenchmarked):** native MXFP4 target, TP8 on one eight-GPU B300 KServe group, target-only. Use the vLLM project `kimi-k31` image or the LMSYS SGLang day-0 image/main build, pinned by digest. Add DCP8 only for KV-capacity-bound workloads. Qualify each engine-specific draft separately. No NVIDIA or other NVFP4/FP8 export exists.

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

- Engine release inclusion: no stable vLLM or SGLang release contains K3.1, and the atlas baselines cannot load it.
- Image-digest ancestry of the `kimi-k31` builds.
- DSA indexer and sparse-MLA kernel dispatch on SM103.
- Actual per-rank residency and KV/state capacity after load.
- Natural (not synthetic) draft acceptance for the target workload.
- Long-context quality under FP8 or NVFP4 KV and top-2048 selection.
- The unpublished base revision `535833b1` used to build the RadixArk draft.

[Return to repository index](../../../README.md)

## Hugging Face README snapshots

These are unmodified README bytes fetched from immutable Hugging Face revisions on November 6, 2026. The publisher target and the additional drafts remain distinct. As of 2026-11-06 no NVIDIA or other NVFP4/FP8 export of K3.1 Pro usable by vLLM or SGLang exists on the Hub; community low-bit quantizations in MLX, EXL3 and GGUF formats (for example `inferencerlabs/Kimi-K3.1-Pro-MLXse`, `local-inference-lab/Kimi-K3.1-Pro-EXL3-2bit`) are out of scope and were not reviewed. [kimi-k3.1-pro-HUB-SEARCH](https://huggingface.co/api/models?search=Kimi-K3.1&limit=200) Original relative links and images are preserved; use the pinned upstream view to resolve assets. Publisher and author benchmarks retain their original scope. Upstream terms apply; copying a card does not qualify its model or configuration.

| Artifact | Local README | Pinned upstream README |
| --- | --- | --- |
| Publisher target: `moonshotai/Kimi-K3.1-Pro` | [README](huggingface/README.md) | [d9e99b0792a5](https://huggingface.co/moonshotai/Kimi-K3.1-Pro/blob/d9e99b0792a5e93b78ea9bea62a68167e36ddd9e/README.md) |
| Additional artifact (vLLM recipe draft, preview): `Inferact/Kimi-K3.1-Pro-DSpark-preview` | [README](huggingface/additional/Inferact--Kimi-K3.1-Pro-DSpark-preview/README.md) | [6a2ef20a05ef](https://huggingface.co/Inferact/Kimi-K3.1-Pro-DSpark-preview/blob/6a2ef20a05efe88aabbf9ecaa12d020c3b0edf94/README.md) |
| Additional artifact (SGLang cookbook draft, preview): `RadixArk/Kimi-K3.1-Dflash2-Preview` | [README](huggingface/additional/RadixArk--Kimi-K3.1-Dflash2-Preview/README.md) | [ea257b38a8ee](https://huggingface.co/RadixArk/Kimi-K3.1-Dflash2-Preview/blob/ea257b38a8ee755b65287bb8ccd0938b519ce26b/README.md) |
| Additional artifact (third-party draft): `LithosAI/Kimi-K3.1-Pro-DSpark` | [README](huggingface/additional/LithosAI--Kimi-K3.1-Pro-DSpark/README.md) | [d791d217d1cc](https://huggingface.co/LithosAI/Kimi-K3.1-Pro-DSpark/blob/d791d217d1cc679e07877721761bfcc09d70d514/README.md) |

Revision, retrieval time and SHA-256 are recorded through each card's source ID in [sources.json](../../../evidence/sources.json) and the [model catalog](../../../catalog/models.json).
