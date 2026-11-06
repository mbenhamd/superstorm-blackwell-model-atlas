# Muse Glimmer 30B

**Latest scoped recheck: November 6, 2026 (UTC).** This is the atlas's first review of this family. The publisher repository head is pinned at `cec94fcfd6512f2cfe708138c32533b346ea4f69`. Its card, configuration, generation and processor configs, license, chat template, index and both shard headers were retrieved. **Both stable engine baselines contain model support:** vLLM v0.33.0 (support since v0.28.0) and SGLang v0.5.23 (since v0.5.18; NVIDIA-export loader fix since v0.5.20). Neither engine's recipe lists B300 as verified hardware. KServe remains the required deployment layer; its installed version is unknown. No B300 execution was performed. See [serving](serving.md#november-6-engine-support-status) and [Hugging Face README snapshots](#hugging-face-readme-snapshots).

**As of 2026-11-06.** Dense multimodal model with 29.78B serialized parameters: 52 text layers in a [3 sliding (2,048) + 1 global NoPE] pattern, GQA with 32 query and 2 KV heads, and a 1.85B ViT perception encoder.

Meta Superintelligence Lab's card describes a 30B dense causal transformer with a perception encoder. The card says it was distilled from Muse Spark for local agentic use and released under Apache 2.0 in August 2026. The card lists text and image input and text output. The processor also defines a video path, which the card describes as frame-by-frame and not optimized. The separate `-assistant` repository is a DFlash block-diffusion **speculative-decoding drafter** (block size 16), not a chat model. [muse-glimmer-30b-CARD](https://huggingface.co/meta-models/Muse-Glimmer-30B/blob/cec94fcfd6512f2cfe708138c32533b346ea4f69/README.md) [muse-glimmer-30b-CFG](https://huggingface.co/meta-models/Muse-Glimmer-30B/raw/cec94fcfd6512f2cfe708138c32533b346ea4f69/config.json) [muse-glimmer-30b-DRAFT-CFG](https://huggingface.co/meta-models/Muse-Glimmer-30B-assistant/raw/c676cce91658f9568aaf264a416211e2782735b7/config.json)

**First serving candidate (unbenchmarked):** vLLM v0.33.0 TP1 BF16 target-only, one replica per B300 behind KServe, with an SGLang v0.5.23 TP1 challenger. Then compare these as separate experiments: the DFlash assistant, Red Hat FP8-block, and NVIDIA's mixed W4A16-NVFP4/FP8 export. Only TP1 and TP2 shard the two KV heads without replication, and SGLang refuses quantized checkpoints above TP2.

[Architecture](architecture.md) · [Precision and variants](precision.md) · [Serving decisions](serving.md) · [Sources](sources.md) · [Model catalog](../../../catalog/models.json)

## Compared with the closest catalog models

No predecessor family is in the catalog. The nearest dense ~30B multimodal records are [Gemma 4 31B IT](../../google/gemma-4-31b-it/README.md) and [Qwen3.8 27B](../../alibaba-qwen/qwen3.8-27b/README.md). Values below come from each model's own pinned config.

| Field | Muse Glimmer 30B | Gemma 4 31B IT | Qwen3.8 27B |
| --- | --- | --- | --- |
| Text layers; hidden | 52; 6656 | 60; 5376 | 64; 5120 |
| Attention mix | 39 sliding (2,048) + 13 global NoPE | 50 sliding (1,024) + 10 global | 48 linear + 16 full |
| KV heads × head dim | 2 × 128 everywhere | 16 × 256 local; 4 × 512 global | 4 × 256 on full layers |
| Native positions | 131,072 | 262,144 | 262,144 |
| Vocabulary; head | 202,048; untied | 262,144; tied | 248,320; untied |
| Speculative companion | separate 5-layer DFlash drafter | separate 4-layer assistant | bundled 1 NextN layer |

Serving consequence: Muse has the smallest per-token cache of the three (13,312 BF16 bytes per token across its 13 global layers, derived). It also has the narrowest tensor-parallel sharding, with two KV heads. See [architecture](architecture.md#comparison-with-the-closest-catalog-models). [gemma-4-31b-it-CFG](https://huggingface.co/google/gemma-4-31B-it/raw/842da3794eaa0b77d5f08bae87a17459d91ff475/config.json) [qwen3.8-27b-CFG](https://huggingface.co/Qwen/Qwen3.8-27B/raw/1d4bf0f2ff6012fd82039f2fa52739d0dd7c60c0/config.json)

## Practical identity

| Property | Value |
| --- | --- |
| Exact base repository | meta-models/Muse-Glimmer-30B |
| Base revision pin | `cec94fcfd6512f2cfe708138c32533b346ea4f69` |
| Repository created / weights commit | 2026-08-09 / `46ac57a4` (2026-08-10) |
| Architecture class | `MuseGlimmerForConditionalGeneration` (dense; text + image in; video via frames) |
| Serialized parameters | 29,776,626,688 BF16 (card: "~29.6B including vision encoder") |
| Native positional limit | 131,072 tokens (card: "131,072+") |
| Initial TP candidate | 1 |
| Official drafter | `meta-models/Muse-Glimmer-30B-assistant` @ `c676cce9` (DFlash, 5 layers, block 16) |
| License scope | Apache-2.0; pinned `LICENSE` is byte-identical to the apache.org text; `USAGE_POLICY.md` shipped alongside |
| Verification level | Pinned cards, configs, index and headers inspected; engine source at release tags inspected; no model load or B300 benchmark |
| AA Intelligence Index v5.0.1 (third-party) | high: 6.341 (v5.0 6.341). AA-Briefcase Elo 477.83 is below the 500 normalization floor, so that component contributes zero. Not reproduced; not tied to this revision or any export. [Details](../../../reports/intelligence-index.md) [AA-MODEL-MUSE-GLIMMER](https://artificialanalysis.ai/models/muse-glimmer) |

The positional limit does not guarantee usable context under arbitrary batching, image load or cache precision. [muse-glimmer-30b-INDEX](https://huggingface.co/meta-models/Muse-Glimmer-30B/raw/cec94fcfd6512f2cfe708138c32533b346ea4f69/model.safetensors.index.json) [muse-glimmer-30b-LICENSE](https://huggingface.co/meta-models/Muse-Glimmer-30B/blob/cec94fcfd6512f2cfe708138c32533b346ea4f69/LICENSE)

## Third-party metadata cross-check

The Artificial Analysis model page (retrieved 2026-11-06T08:34:19Z; [AA-MODEL-MUSE-GLIMMER](https://artificialanalysis.ai/models/muse-glimmer)) gives:

- 30B parameters;
- context 131,072;
- text and image input true; video and speech input false;
- Apache 2.0;
- release date 2026-08-10.

Against the publisher:

- Context and license agree.
- "30B" rounds the card's "~29.6B" and the serialized 29.78B.
- The release date matches the weights commit (2026-08-10); the repository was created 2026-08-09.
- Video "false" agrees with the card's advertised modalities. The processor and both engines nonetheless accept video, so "false" means not advertised, not unsupported.

## The most important unresolved checks

- the DFlash target-layer index convention in vLLM v0.33.0, which has silently broken acceptance before in SGLang;
- the effective SM103 attention backend and sliding-window eviction;
- the protocol assets each export bundles: the NVIDIA, Red Hat and Inferact exports carry the superseded `114f55eb…` chat template, and all four exports (including RadixArk, whose template is current) ship greedy generation configs without the publisher's 1.0/0.95/64 sampling; supply the base template and explicit sampling, then test tool and reasoning output ([details](precision.md#protocol-assets-bundled-by-each-export));
- the 29.6B versus 29.78B parameter-count gap;
- local B300 quality, latency and throughput.

[Return to repository index](../../../README.md)

## Hugging Face README snapshots

These are unmodified README bytes fetched from immutable Hugging Face revisions on November 6. The publisher target, catalog exports and the drafter remain distinct artifacts. Original relative links are preserved; use the pinned upstream view to resolve assets. Publisher benchmarks and launch examples keep their original scope, including consumer GPUs, B200 and model-specific images. Copying a card does not qualify its model or configuration.

| Artifact | Local README | Pinned upstream README |
| --- | --- | --- |
| Publisher target: `meta-models/Muse-Glimmer-30B` | [README](huggingface/README.md) | [cec94fcfd651](https://huggingface.co/meta-models/Muse-Glimmer-30B/blob/cec94fcfd6512f2cfe708138c32533b346ea4f69/README.md) |
| Official DFlash drafter: `meta-models/Muse-Glimmer-30B-assistant` | [README](huggingface/additional/meta-models--Muse-Glimmer-30B-assistant/README.md) | [c676cce91658](https://huggingface.co/meta-models/Muse-Glimmer-30B-assistant/blob/c676cce91658f9568aaf264a416211e2782735b7/README.md) |
| Catalog export: nvidia-nvfp4: `nvidia/Muse-Glimmer-30B-NVFP4` | [README](huggingface/additional/nvidia--Muse-Glimmer-30B-NVFP4/README.md) | [478183745177](https://huggingface.co/nvidia/Muse-Glimmer-30B-NVFP4/blob/47818374517751c48c55cde2621594926b1888b6/README.md) |
| Catalog export: fp8: `RedHatAI/Muse-Glimmer-30B-FP8-block` | [README](huggingface/additional/RedHatAI--Muse-Glimmer-30B-FP8-block/README.md) | [1deb4641ff84](https://huggingface.co/RedHatAI/Muse-Glimmer-30B-FP8-block/blob/1deb4641ff84f9a728dd11b27cac1f6a02a9ed14/README.md) |
| Catalog export: nvfp4-inferact: `Inferact/Muse-Glimmer-30B-NVFP4-W4A4` | [README](huggingface/additional/Inferact--Muse-Glimmer-30B-NVFP4-W4A4/README.md) | [d35cb79050f4](https://huggingface.co/Inferact/Muse-Glimmer-30B-NVFP4-W4A4/blob/d35cb79050f419c457611b1cee5c5d15b176f285/README.md) |
| Catalog export: radixark-nvfp4: `RadixArk/Muse-Glimmer-NVFP4` | [README](huggingface/additional/RadixArk--Muse-Glimmer-NVFP4/README.md) | [1416629950af](https://huggingface.co/RadixArk/Muse-Glimmer-NVFP4/blob/1416629950afdfb276618fd4810103681dd10f4a/README.md) |

`meta-models/Muse-Glimmer-30B-GGUF` and `-ExecuTorch-PTE` are consumer-device formats (llama.cpp and ExecuTorch). They were identified and pinned in metadata only; their cards are not snapshotted. Revision, retrieval time and SHA-256 are recorded through each card's source ID in [sources.json](../../../evidence/sources.json) and the [model catalog](../../../catalog/models.json).
