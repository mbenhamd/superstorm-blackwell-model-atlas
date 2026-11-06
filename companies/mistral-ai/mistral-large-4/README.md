# Mistral Large 4

**Latest scoped recheck: November 6, 2026 (UTC).** First atlas review of this family. The publisher head `af26e7869af601441d5cdf75a1272469ddc3d059` and the official NVFP4 export head `bb6d00fe249b0e876f0cffc6b85014be02de3e68` were pinned; README, configuration, `params.json`, LICENSE, safetensors index and all safetensors headers (HTTP range reads only) were retrieved and hashed. **No stable vLLM or SGLang release contains Mistral Large 4 model support**: vLLM support exists only in the `vllm/vllm-openai:mistral-large-4` image and an unmerged draft PR; SGLang support exists only in the `lmsysorg/sglang:mistral-large-4` image and an open PR. KServe remains the required deployment layer (installed version unknown). No B300 execution was performed. See [serving](serving.md#november-6-engine-support-status) and [Hugging Face README snapshots](#hugging-face-readme-snapshots). **NVFP4 recheck (2026-11-06T12:45–12:55Z):** both Hub heads unchanged, both local cards byte-identical, vLLM PR #64534 unchanged (draft, head `28a4495d`), SGLang PR #47271 moved to head `eb80b0b6` (still open), both image digests unchanged; the [NVFP4 dossier](nvfp4.md) records the loader path (`modelopt_mixed` in both engines), SM103 kernel selection, per-GPU memory at TP8 and TP4, launch commands for both engines, KServe settings and a qualification plan.

**As of 2026-11-06.** Sparse MoE, about 1.05T serialized parameters / 49B active (52B with embeddings and output head) by publisher statement; 72 layers, MLA with a DSA-style top-2048 indexer, cross-layer KV sharing, 128 routed experts (top-4) plus one shared expert, Pixtral-style vision, embedded DSpark draft; FP8 128×128 block export and official NVFP4 export.

Mistral Large 4 is a trillion-parameter-class multimodal MoE whose resident weights dominate single-node capacity: the FP8 export serializes 1,060,548,427,328 tensor bytes, about eight times Mistral Medium 3.5. On one 8×B300 node the FP8 export needs all eight GPUs; the NVFP4 export (610,030,457,408 bytes) is the only official artifact that admits a four-GPU group. [mistral-large-4-CARD](https://huggingface.co/mistralai/Mistral-Large-4-1T-A52B/raw/af26e7869af601441d5cdf75a1272469ddc3d059/README.md) [mistral-large-4-CFG](https://huggingface.co/mistralai/Mistral-Large-4-1T-A52B/raw/af26e7869af601441d5cdf75a1272469ddc3d059/config.json) [mistral-large-4-INDEX](https://huggingface.co/mistralai/Mistral-Large-4-1T-A52B/resolve/af26e7869af601441d5cdf75a1272469ddc3d059/consolidated.safetensors.index.json)

**First serving candidate:** KServe + the digest-pinned publisher vLLM image, official NVFP4 export, TP8, target-only, `--max-model-len` at or below the recipe's 262,144 validation cap; then the embedded DSpark draft (`num_speculative_tokens: 3`) in the same build. Compare the FP8 export at TP8, two NVFP4 TP4 replicas, and the SGLang image's NVFP4 TP8 cell (unverified on B300) and publisher TP4 command; catalog records `mistral-large-4.nvfp4.vllm.tp8`, `.vllm.tp4`, `.sglang.tp8`, `.sglang.tp4`. This is an unbenchmarked candidate built on a non-release engine image; relative performance remains workload-dependent.

[Architecture](architecture.md) · [Precision and variants](precision.md) · [Serving decisions](serving.md) · [NVFP4 dossier](nvfp4.md) · [Sources](sources.md) · [Model catalog](../../../catalog/models.json)

## Architecture and serving implications

The language stack combines multi-head latent attention (512-element compressed KV latent plus a 64-element RoPE key in RoPE layers), a 32-head top-2048 key indexer on 44 of 72 layers, NoPE attention on every fourth layer, and reuse of layer 35's KV cache by layers 39, 43, …, 71. Latent KV is small per token, but standard tensor parallelism replicates it on every rank; capacity therefore depends on decode context parallelism or data-parallel attention, not on head sharding. Routed experts hold 97.7% of serialized parameters. See [architecture](architecture.md) and [memory/precision accounting](precision.md).

## Practical identity

| Property | Value |
| --- | --- |
| Exact base repository | mistralai/Mistral-Large-4-1T-A52B |
| Official quantized export | mistralai/Mistral-Large-4-1T-A52B-NVFP4 at `bb6d00fe249b0e876f0cffc6b85014be02de3e68` |
| Native positional limit | 1,048,576 tokens (vLLM recipe validated to 262,144; SGLang cookbook leaves `--context-length` unset for the native limit and states no validated maximum) |
| Initial TP candidate | 8 (FP8 requires 8 on this node); NVFP4 TP4 ×2 replicas is a comparison probe (the publisher NVFP4 card gives an SGLang TP4 example; engine-verified NVFP4 TP4 cells are GB300/Vera Rubin, not B300) |
| Base revision pin | `af26e7869af601441d5cdf75a1272469ddc3d059` |
| Speculative draft | Embedded DSpark head inside both checkpoints (3 MLA layers, BF16); no separate draft repository |
| License scope | Mistral Ecosystem Open-Weight License (modified MIT); Model-as-a-Service operators need a separate commercial license; internal use exempt |
| Verification level | Pinned cards, configs, index and tensor headers inspected; no model load or B300 benchmark; engine support only in mutable-tag images |
| AA Intelligence Index v5.0.1 (third-party) | high: 26.125 (v5.0 26.025); medium: 23.128 (v5.0 23.078). Archived values for the deprecated Mistral Large 4 Preview, which occupied the `mistral-large-4` slug only in the 2026-10-29T01:01Z and 02:51Z captures (on `mistral-large-4-preview` from 07:59Z; released model on `mistral-large-4` from 14:59Z), are excluded by name. AA weights link is the base repository, not the NVFP4 export. Not reproduced; not tied to this revision or any export. [Details](../../../reports/intelligence-index.md) [AA-MODEL-MISTRAL-LARGE-4](https://artificialanalysis.ai/models/mistral-large-4) [AA-MODEL-MISTRAL-LARGE-4-MEDIUM](https://artificialanalysis.ai/models/mistral-large-4-medium) |

The positional limit is not a promise of usable tokens under arbitrary batching, image load or cache precision. [mistral-large-4-CARD](https://huggingface.co/mistralai/Mistral-Large-4-1T-A52B/raw/af26e7869af601441d5cdf75a1272469ddc3d059/README.md) [mistral-large-4-LICENSE](https://huggingface.co/mistralai/Mistral-Large-4-1T-A52B/raw/af26e7869af601441d5cdf75a1272469ddc3d059/LICENSE)

## Preview versus release

Mistral announced a public API preview on 2026-10-06 with weights "end of this month"; the open-weight release on 2026-10-29 is described by the publisher as an "improved Mistral Large 4" after "three weeks of additional reinforcement learning". The preview had no published weights or configuration, so architectural identity between preview and release cannot be verified from artifacts; additional RL alone would not imply an architecture change (inference, not evidence). Preview benchmark numbers must not be attributed to the released weights. [mistral-large-4-BLOG-PREVIEW](https://mistral.ai/news/mistral-large-4/) [mistral-large-4-BLOG-OSS](https://mistral.ai/news/mistral-large-4-oss/)

## The most important unresolved checks

No released engine version supports the architecture; runtime identity rests on two mutable Docker tags (digests recorded in [sources](sources.md)). Engine recipe measurements cite an NVFP4 revision `4359ec6` that is not resolvable on the public repository. Runtime memory beyond the weight payload, actual DSpark acceptance on target workloads, 1M-token behavior, KServe startup timeouts against 1,300–1,800 s cold starts, and storage for a 1.06 TB snapshot remain unmeasured.

[Return to repository index](../../../README.md)

## Hugging Face README snapshots

These are unmodified README bytes fetched from immutable Hugging Face revisions on November 6. The publisher target and the official NVFP4 export remain distinct artifacts. Original relative links and images are preserved; use the pinned upstream view to resolve assets. Publisher benchmarks and launch examples retain their original scope, including mutable image tags. Apply the atlas serving assessment for KServe/B300. Upstream terms apply; copying a card does not qualify its model or configuration.

| Artifact | Local README | Pinned upstream README |
| --- | --- | --- |
| Publisher target: `mistralai/Mistral-Large-4-1T-A52B` | [README](huggingface/README.md) | [af26e7869af6](https://huggingface.co/mistralai/Mistral-Large-4-1T-A52B/blob/af26e7869af601441d5cdf75a1272469ddc3d059/README.md) |
| Publisher NVFP4 export (separate compatibility scope): `mistralai/Mistral-Large-4-1T-A52B-NVFP4` | [README](huggingface/additional/mistralai--Mistral-Large-4-1T-A52B-NVFP4/README.md) | [bb6d00fe249b](https://huggingface.co/mistralai/Mistral-Large-4-1T-A52B-NVFP4/blob/bb6d00fe249b0e876f0cffc6b85014be02de3e68/README.md) |

Revision, retrieval time and SHA-256 are recorded through each card's source ID in [sources.json](../../../evidence/sources.json) and the [model catalog](../../../catalog/models.json).

**Byte-identity recheck, 2026-11-06T12:45:13Z:** the raw README at each pinned revision was fetched again and hashed. Base: 19,174 bytes, SHA-256 `498bf4121e75f5582ee276f8ad6c6d96eea78885c878819dd1551c2dd84dc92c`; NVFP4: 7,791 bytes, SHA-256 `25f7c255ebe5f63931061886bdce29d524e0ab505ac13500fd01e2e644c615d8`. Both equal the local copies; both Hub heads still equal the pins. [mistral-large-4-CARD](https://huggingface.co/mistralai/Mistral-Large-4-1T-A52B/raw/af26e7869af601441d5cdf75a1272469ddc3d059/README.md) [mistral-large-4-NVFP4-CARD](https://huggingface.co/mistralai/Mistral-Large-4-1T-A52B-NVFP4/raw/bb6d00fe249b0e876f0cffc6b85014be02de3e68/README.md)
