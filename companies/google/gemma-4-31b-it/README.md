# Gemma 4 31B IT

**Latest scoped recheck: October 26, 2026 (UTC).** Stable references remain **vLLM v0.32.0** and **SGLang v0.5.22**, under required KServe (upstream v0.21.0; installed version unknown). All concrete catalog variants still match their retained revisions. Current publisher cards/configurations and selected engine restrictions were rechecked; no B300 execution was performed. See [current serving assessment](serving.md#october-26-stable-release-recheck) and [Hugging Face README snapshots](#hugging-face-readme-snapshots).

**As of 2026-10-16.** Dense multimodal 31B; 5 sliding layers per global-attention layer.

The 31B instruction-tuned variant is dense. Its configuration explicitly disables MoE and has no audio encoder configuration, despite some generic examples listing an audio input limit. [gemma-4-31b-it-CARD](https://huggingface.co/google/gemma-4-31B-it/blob/842da3794eaa0b77d5f08bae87a17459d91ff475/README.md) [gemma-4-31b-it-CFG](https://huggingface.co/google/gemma-4-31B-it/raw/842da3794eaa0b77d5f08bae87a17459d91ff475/config.json)

The publisher's rounded component counts are 30.7B for the text model, about 550M for vision and about 500M for a separate drafter. Dense describes the text layers' computation; it does not mean every stored parameter, including vision, is used for every generated token. [TOPM-GEMMA-PAPER](https://arxiv.org/html/2607.02770v2#S1.T1)

**First serving candidate:** vLLM TP1 BF16/FP8/NVFP4 comparison; SGLang challenger with export-level probe. This is an unbenchmarked candidate for the target B300 node; relative performance remains workload-dependent.

The existing Red Hat exports remain the comparison references. [Precision](precision.md) now also distinguishes NVIDIA's ModelOpt export, Unsloth's mixed FP8/NVFP4 export and LilaRest's text-only Turbo export. Turbo's 18.5 GiB and throughput figures describe its publisher's RTX PRO 6000 experiment; they do not establish B300 memory or performance. [Serving](serving.md) explains why the matching assistant, quantization format and attention backend must be qualified together.

[Architecture](architecture.md) · [Precision and variants](precision.md) · [Serving decisions](serving.md) · [Sources](sources.md) · [Model catalog](../../../catalog/models.json)

## Architecture and serving implications

Dense feed-forward blocks accompany interleaved local and global attention layers with different cache geometry. Input embeddings and the output head share weights; vision capability and the separate assistant require variant-specific accounting. Shared family token identifiers do not establish an audio encoder in this checkpoint. See [architecture and assistant integration](architecture.md), [export differences](precision.md) and [backend constraints](serving.md).

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

## Hugging Face README snapshots

These are unmodified README bytes fetched from immutable Hugging Face revisions on October 26. The publisher target, catalog exports and additional drafts/candidates remain distinct. Original relative links and images are preserved; use the pinned upstream view to resolve assets. Publisher benchmarks and launch examples retain their original scope, including older or development images. Apply the atlas serving assessment for KServe/B300. Upstream terms apply; copying a card does not qualify its model or configuration.

| Artifact | Local README | Pinned upstream README |
| --- | --- | --- |
| Publisher target: `google/gemma-4-31B-it` | [README](huggingface/README.md) | [842da3794eaa](https://huggingface.co/google/gemma-4-31B-it/blob/842da3794eaa0b77d5f08bae87a17459d91ff475/README.md) |
| Catalog export: fp8: `RedHatAI/gemma-4-31B-it-FP8-block` | [README](huggingface/fp8/README.md) | [d7242548c457](https://huggingface.co/RedHatAI/gemma-4-31B-it-FP8-block/blob/d7242548c457ab4b45bd3adb8937f2659af4739d/README.md) |
| Catalog export: nvfp4: `RedHatAI/gemma-4-31B-it-NVFP4` | [README](huggingface/nvfp4/README.md) | [5df75ccad9b7](https://huggingface.co/RedHatAI/gemma-4-31B-it-NVFP4/blob/5df75ccad9b74546f5be758a2a68acc2e16bbc9b/README.md) |
| Catalog export: nvidia-nvfp4: `nvidia/Gemma-4-31B-IT-NVFP4` | [README](huggingface/nvidia-nvfp4/README.md) | [4135a98a9b72](https://huggingface.co/nvidia/Gemma-4-31B-IT-NVFP4/blob/4135a98a9b728a548947683219633b25682223ac/README.md) |
| Catalog export: unsloth-nvfp4: `unsloth/gemma-4-31B-it-NVFP4` | [README](huggingface/unsloth-nvfp4/README.md) | [373c00b5ecb0](https://huggingface.co/unsloth/gemma-4-31B-it-NVFP4/blob/373c00b5ecb0a8ee43942b5ca08b93805de8eee4/README.md) |
| Catalog export: nvfp4-turbo: `LilaRest/gemma-4-31B-it-NVFP4-turbo` | [README](huggingface/nvfp4-turbo/README.md) | [782d58ea7f9c](https://huggingface.co/LilaRest/gemma-4-31B-it-NVFP4-turbo/blob/782d58ea7f9cf3a148be86e153f5689a2d73238b/README.md) |
| Additional artifact (separate compatibility scope): `google/gemma-4-31B-it-assistant` | [README](huggingface/additional/google--gemma-4-31B-it-assistant/README.md) | [627c5ec1458b](https://huggingface.co/google/gemma-4-31B-it-assistant/blob/627c5ec1458b9086b841a91e0512fd31fd2fbbf1/README.md) |

Revision, retrieval time and SHA-256 are recorded through each card’s source ID in [sources.json](../../../evidence/sources.json) and the [model catalog](../../../catalog/models.json).
