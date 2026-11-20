# DeepSeek V4.1 Flash 1017

**November 20, 2026.** The native head 08c8657f adds a chat template, the only path changed from serving pin 1bae0e10. The two revisions share weights, tokenizer files and config. A different default serialization can still change application behavior. Current engine references are vLLM v0.34.0 and SGLang v0.5.23 under required KServe. [November 20 serving review](serving.md#november-20-engine-and-benchmark-review)

DeepSeek V4.1 Flash 1017 is a weight update of DeepSeek V4.1 Flash: same `config.json`, reference inference code, encoding helpers, tokenizer and safetensors index bytes, with all 48 weight shards replaced. It is a different architecture class from DeepSeek V4 Flash 0731 (`DeepseekV41ForCausalLM`, causal encoder-decoder, ratio-2/ratio-1 shared compressed KV, Engram n-gram memory, a vision encoder and a 128-expert DSpark draft). Do not substitute the 0731 record, the unsuffixed V4.1 repository or a derivative when resolving a launch command. [deepseek-v4.1-flash-1017-CARD](https://huggingface.co/deepseek-ai/DeepSeek-V4.1-Flash-1017/blob/1bae0e1088993b9b82de08f59de5be5a34e42170/README.md) [deepseek-v4.1-flash-1017-CFG](https://huggingface.co/deepseek-ai/DeepSeek-V4.1-Flash-1017/raw/1bae0e1088993b9b82de08f59de5be5a34e42170/config.json) [deepseek-v4.1-flash-1017-TREE](https://huggingface.co/api/models/deepseek-ai/DeepSeek-V4.1-Flash-1017/tree/1bae0e1088993b9b82de08f59de5be5a34e42170?recursive=true)

**First serving comparison.** Compare the native 1017 target on vLLM v0.34.0 TP2 and SGLang TP4/EP4 through KServe, at equal total GPU allocation and host Engram budget. The NVIDIA 1017 NVFP4 export requires post-release packed-Engram support in both engines. [Precision evidence](precision.md)

[Architecture](architecture.md) · [Precision and variants](precision.md) · [Serving decisions](serving.md) · [Sources](sources.md) · [Model catalog](../../../catalog/models.json)

## Architecture and serving implications

The 40-layer text stack is published as a 20-layer causal encoder plus a 20-layer decoder whose global KV is produced once, at layer 20, from the encoder's final hidden state. Only layers 2, 8, 14 and 20 write compressed KV (ratio 2 for layers 2–19, ratio 1 for layers 20–39); eight layers run an FP4 indexer, and layer 20 builds a candidate pool for later indexers. Engram adds two FP8 hash tables totalling 768,022,850 rows × 256 values; they dominate non-expert storage and drive the placement flags in both engines. Image inputs pass through a 32-layer BF16 ViT and a two-layer aligner and select a separate MoE routing bias. See [architecture](architecture.md) and [serving constraints](serving.md).

## Practical identity

| Property | Value |
| --- | --- |
| Exact base repository | deepseek-ai/DeepSeek-V4.1-Flash-1017 |
| Base revision pin | `1bae0e1088993b9b82de08f59de5be5a34e42170` (current `main` on 2026-11-06; commit "Release DeepSeek-V4.1-Flash-1017", 2026-10-17T05:46:55Z) |
| Predecessor (superseded, separate weights) | deepseek-ai/DeepSeek-V4.1-Flash at `314113f8a7dadb388215396ba5fbee2c610a04d6`; byte-identical `config.json`, index, inference and encoding files; all 48 shard LFS object IDs differ |
| Architecture class | `DeepseekV41ForCausalLM` / `deepseek_v41` (0731 is `DeepseekV4ForCausalLM` / `deepseek_v4`) |
| Modalities | Text and image input, text output (config `vision_config`, `image_token_id` 129264, reference ViT) |
| Configured positional limit | 1,048,576 tokens (YaRN factor 16 over 65,536) |
| Serialized checkpoint | Tensor payload 510,286,023,000 bytes (≈475.24 GiB; index `total_size`, equal to the header census); the 48 shard files total 510,296,708,312 bytes (≈475.25 GiB) including safetensors headers. Serialized storage, not resident memory. [deepseek-v4.1-flash-1017-TREE](https://huggingface.co/api/models/deepseek-ai/DeepSeek-V4.1-Flash-1017/tree/1bae0e1088993b9b82de08f59de5be5a34e42170?recursive=true) |
| Publisher parameter headline | Not stated on the 1017 card. The V4.1 Flash card states 552B backbone, 8B activated in prefill and 16B in decode, plus 196B Engram; the derived header census reconciles 552B as backbone only (see [architecture](architecture.md#parameter-accounting)) |
| Bundled draft | Three DSpark stages under `mtp.*` (128 routed experts each, 3 active, block size 5); no separate draft repository |
| Initial vLLM topology | Recipe B300 cell TP2 with Engram host offload (vLLM's default; HBM-resident tables need `cpu_offload:false`); DEP8 comparator; both unbenchmarked here |
| License scope | MIT; pinned LICENSE and card statement covering repository and weights |
| Verification level | Immutable publisher files and headers reviewed; engine support source-inspected; no local GPU test |
| AA Intelligence Index v5.0.1 (third-party) | max: 32.590 (v5.0 32.490); high: 28.644 (evaluated under v5.0, value not captured); non-reasoning: 18.513 (v5.0 18.513). [DeepSeek V4 Flash 0731](../deepseek-v4-flash-0731/README.md) has no AA composite and is not compared through this score. Not reproduced; not tied to this revision or any export. [Details](../../../reports/intelligence-index.md) [AA-MODEL-DEEPSEEK-V4-1-FLASH-1017](https://artificialanalysis.ai/models/deepseek-v4-1-flash-1017) [AA-MODEL-DEEPSEEK-V4-1-FLASH-1017-HIGH](https://artificialanalysis.ai/models/deepseek-v4-1-flash-1017-high) [AA-MODEL-DEEPSEEK-V4-1-FLASH-1017-NON-REASONING](https://artificialanalysis.ai/models/deepseek-v4-1-flash-1017-non-reasoning) |

The positional limit is not a promise of that many usable tokens under arbitrary batching or cache precision. The 1017 card recommends `max_tokens` ≥ 256K and a 1M context window. [deepseek-v4.1-flash-1017-CARD](https://huggingface.co/deepseek-ai/DeepSeek-V4.1-Flash-1017/blob/1bae0e1088993b9b82de08f59de5be5a34e42170/README.md) [deepseek-v4.1-flash-1017-INDEX](https://huggingface.co/deepseek-ai/DeepSeek-V4.1-Flash-1017/resolve/1bae0e1088993b9b82de08f59de5be5a34e42170/model.safetensors.index.json) [deepseek-v4.1-flash-1017-V41-CARD](https://huggingface.co/deepseek-ai/DeepSeek-V4.1-Flash/blob/314113f8a7dadb388215396ba5fbee2c610a04d6/README.md)

## Lineage

| Release | Repository / revision | Relationship |
| --- | --- | --- |
| DeepSeek V4 Flash 0731 | `deepseek-ai/DeepSeek-V4-Flash-0731` @ `7872f01b1d1f` | Different architecture (`deepseek_v4`, 43 layers, 256 experts, ratio-4/128 compression, hash layers, text only); see [0731 family](../deepseek-v4-flash-0731/README.md) |
| DeepSeek V4.1 Flash (launch 2026-09-10; AA marks deprecated) | `deepseek-ai/DeepSeek-V4.1-Flash` @ `314113f8a7da` | Same configuration and index as 1017; weights unchanged from launch commit `517ef625` through `314113f8`; later commits changed reference inference/encoding code and added `chat_template.jinja` through repository pull request #68 |
| DeepSeek V4.1 Flash 1017 (2026-10-17) | `deepseek-ai/DeepSeek-V4.1-Flash-1017` @ `1bae0e108899` | Publisher: "minor update" to V4.1 Flash with new weights. Jinja was added after this pin at `08c8657f` |

Artificial Analysis lineage and labels are third-party metadata; see [intelligence index](../../../reports/intelligence-index.md). [AA-MODEL-DEEPSEEK-V4-1-FLASH](https://artificialanalysis.ai/models/deepseek-v4-1-flash) [deepseek-v4.1-flash-1017-V41-API](https://huggingface.co/api/models/deepseek-ai/DeepSeek-V4.1-Flash/commits/main)

## The most important unresolved checks

The selected vLLM v0.34.0 and SGLang v0.5.23 images still need exact 1017 validation on SM103. The vLLM graph fix #59986 reached v0.34.0 with CPU tests. Multi-rank adaptive DSpark also needs the post-tag rank-consensus fix #62769. Use fixed-width speculation for the release comparator. Its B300 mixed-batch reproducer, Engram host memory per replica, resolved KV precision, DSpark acceptance, template/renderer parity and KServe endpoint goodput remain open. [Graph fix and validation](https://github.com/vllm-project/vllm/pull/59986)

[Return to repository index](../../../README.md)

## Hugging Face README snapshots

These are unmodified README bytes fetched from immutable Hugging Face revisions on November 6, 2026. The publisher target, the NVIDIA export and the superseded predecessor remain distinct. Original relative links and images are preserved; use the pinned upstream view to resolve assets. Publisher benchmarks and launch examples retain their original scope, including GB300 hardware and development engine builds. Upstream terms apply; copying a card does not qualify its model or configuration.

| Artifact | Local README | Pinned upstream README |
| --- | --- | --- |
| Publisher target: `deepseek-ai/DeepSeek-V4.1-Flash-1017` | [README](huggingface/README.md) | [1bae0e108899](https://huggingface.co/deepseek-ai/DeepSeek-V4.1-Flash-1017/blob/1bae0e1088993b9b82de08f59de5be5a34e42170/README.md) |
| Additional artifact (separate compatibility scope): `nvidia/DeepSeek-V4.1-Flash-1017-NVFP4` | [README](huggingface/additional/nvidia--DeepSeek-V4.1-Flash-1017-NVFP4/README.md) | [3ae9c0d3fbbe](https://huggingface.co/nvidia/DeepSeek-V4.1-Flash-1017-NVFP4/blob/3ae9c0d3fbbea5370bd06e679d22044db15883f1/README.md) |
| Predecessor reference (different weights): `deepseek-ai/DeepSeek-V4.1-Flash` | [README](huggingface/additional/deepseek-ai--DeepSeek-V4.1-Flash/README.md) | [314113f8a7da](https://huggingface.co/deepseek-ai/DeepSeek-V4.1-Flash/blob/314113f8a7dadb388215396ba5fbee2c610a04d6/README.md) |

Revision, retrieval time and SHA-256 are recorded through each card's source ID in [sources.json](../../../evidence/sources.json) and the [model catalog](../../../catalog/models.json).
