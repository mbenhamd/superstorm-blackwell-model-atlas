# DeepSeek V4 Flash 0731: precision and provenance

## November 20 export contracts

**RedHatAI/DeepSeek-V4-Flash-0731-NVFP4** (`94ade0e65a07`). Compressed-tensors format combines group-16 NVFP4 routed experts and FP8 block-128 selected attention/shared-expert linears. The index totals 164,602,731,950 bytes and lists target layers 0–42 plus embeddings, output and normalization. It has no mtp.*, dspark.* or draft tensor group, and the tree lists no additional draft shard. The config still carries dspark_* fields. Use the exporter’s TP8 target-only profile. [configuration](https://huggingface.co/RedHatAI/DeepSeek-V4-Flash-0731-NVFP4/raw/94ade0e65a074c992844ec55dbcba5dca9d1cdfc/config.json) [tensor index](https://huggingface.co/RedHatAI/DeepSeek-V4-Flash-0731-NVFP4/resolve/94ade0e65a074c992844ec55dbcba5dca9d1cdfc/model.safetensors.index.json) [exporter card](https://huggingface.co/RedHatAI/DeepSeek-V4-Flash-0731-NVFP4/raw/94ade0e65a074c992844ec55dbcba5dca9d1cdfc/README.md)

A complete census of the publisher-hosted safetensors headers reconciles each export with its own pinned file tree. The tensor byte counts include scales and fixed routing tensors. The complete-file column also counts the JSON header and eight-byte length prefix of each shard.

| Exact 0731 artifact | Tensor count / shards | Target tensor bytes | Draft tensor bytes | Total tensor bytes | Complete shard bytes |
| --- | ---: | ---: | ---: | ---: | ---: |
| Native DeepSeek | 72,317 / 48 | 156,015,698,140 | 10,862,838,300 | 166,878,536,440 | 166,886,535,336 |
| NVIDIA NVFP4 | 138,365 / 48 | 164,673,005,788 | 10,862,838,300 | 175,535,844,088 | 175,550,788,904 |
| Red Hat NVFP4 | 133,660 / 9 | 164,602,731,950 | 0 | 164,602,731,950 | 164,617,890,813 |

The NVIDIA index declares **166,878,536,440 B**, the native index value. The NVIDIA header spans exceed that declaration by **8,657,307,648 B**. All 4,705 native and NVIDIA `mtp.*` tensor names occupy exactly shards 46–48, and the corresponding LFS SHA-256 IDs match on all three files. Their draft bytes are identical. Red Hat’s header spans agree with its declared total. These serialized sizes establish storage costs. Resident HBM additionally depends on loading, replication, repacking, cache and runtime allocations. [Native file tree](https://huggingface.co/api/models/deepseek-ai/DeepSeek-V4-Flash-0731/tree/7872f01b1d1fe23eabc4c98b48bffcef5a386062?recursive=true&limit=1000) [NVIDIA file tree](https://huggingface.co/api/models/nvidia/DeepSeek-V4-Flash-0731-NVFP4/tree/f1caa71142bd0be02f728c79f75042ac1e461579?recursive=true&limit=1000) [Red Hat file tree](https://huggingface.co/api/models/RedHatAI/DeepSeek-V4-Flash-0731-NVFP4/tree/94ade0e65a074c992844ec55dbcba5dca9d1cdfc?recursive=true&limit=1000) [Header census identities](sources.md)

Reverified 2026-10-16 (UTC). The native pin remains `7872f01b1d1fe23eabc4c98b48bffcef5a386062`; the separate NVIDIA export below was also inspected. No checkpoint was loaded locally.

| Variant | Exact artifact | Precision evidence |
| --- | --- | --- |
| native | `deepseek-ai/DeepSeek-V4-Flash-0731` | Root config sets `expert_dtype=fp4` and separately declares FP8 `e4m3` with `ue8m0` scales and 128×128 weight blocks |
| NVIDIA NVFP4 | `nvidia/DeepSeek-V4-Flash-0731-NVFP4` at `f1caa71142bd0be02f728c79f75042ac1e461579` | Routed target experts use NVFP4 weight/activation groups of 16; attention, shared experts, head and `mtp.*` are excluded from this conversion; runtime unqualified locally |

## Interpretation

The official artifact is mixed precision. Its reference loader packs two FP4 expert values per byte and uses one E8M0 scale per 32 expert values. The 128×128 blocks in the root quantization config describe the FP8 path, not those FP4 expert groups. Other tensors can retain higher precision. This is not an all-FP8 checkpoint, and four-bit expert storage alone does not identify an NVFP4 export. [Root config](https://huggingface.co/deepseek-ai/DeepSeek-V4-Flash-0731/raw/7872f01b1d1fe23eabc4c98b48bffcef5a386062/config.json), [reference implementation](https://huggingface.co/deepseek-ai/DeepSeek-V4-Flash-0731/blob/7872f01b1d1fe23eabc4c98b48bffcef5a386062/inference/model.py).

The vLLM recipe's optional FP4 indexer cache changes a separate attention-cache representation. Establish the exact build's effective setting and an explicitly qualified off/on control before measuring retrieval quality and performance. Omission of a flag does not prove that the feature is off. The checkpoint's FP4 expert weights do not mandate that cache setting. [vLLM recipe](https://recipes.vllm.ai/deepseek-ai/DeepSeek-V4-Flash?features=tool_calling,reasoning&hardware=b300).

Engine execution precision can differ from serialized precision. Select the intended expert backend and inspect its actual load/repacking path before comparing memory or speed. SGLang documents `flashinfer_mxfp4` for the exact 0731 FP4 route; the atlas's vLLM candidate follows the documented `deep_gemm_mega_moe` route. These names are not evidence that both execute the same weight and activation arithmetic. [Publisher serving examples](https://huggingface.co/deepseek-ai/DeepSeek-V4-Flash-0731/blob/7872f01b1d1fe23eabc4c98b48bffcef5a386062/README.md).

## The NVIDIA export is a separate qualification

The exact NVIDIA card documents **TP8 target-only** commands for both engines; its SGLang backend is `flashinfer_trtllm_routed`, not the native recipe's `flashinfer_mxfp4`. It names B200 test hardware. DSpark is retained, but the card expressly excludes speculative decoding from release validation. Neither those preserved tensors nor the native four-GB300 DSpark result verifies NVFP4 + DSpark on four B300 GPUs. [NVIDIA 0731 card](https://huggingface.co/nvidia/DeepSeek-V4-Flash-0731-NVFP4/raw/f1caa71142bd0be02f728c79f75042ac1e461579/README.md).

Here, retained DSpark means **not further quantized by this export**. The `mtp.*` exclusion preserves its original mixed tensors; the native reference draft inherits MoE experts with `expert_dtype=fp4`. Calling all draft weights BF16 would be incorrect. The target's group-16 NVFP4 metadata coexists with the retained FP8 metadata and exclusions. [NVIDIA config](https://huggingface.co/nvidia/DeepSeek-V4-Flash-0731-NVFP4/raw/f1caa71142bd0be02f728c79f75042ac1e461579/config.json), [native reference source](https://huggingface.co/deepseek-ai/DeepSeek-V4-Flash-0731/blob/7872f01b1d1fe23eabc4c98b48bffcef5a386062/inference/model.py).

NVIDIA describes an MXFP4-to-NVFP4 weight cast plus calibrated activation ranges and says the checkpoint becomes slightly larger as the scale density doubles. This is not an extra 2× weight-memory reduction over an already four-bit native release. The Model Optimizer 0.46.0 exporter qualifies its exact-preservation property: blocks within the E4M3 scale window (`k_max - k_j <= 17`, with special handling for zero blocks) are counted as lossless, and it reports out-of-range counts. Export statistics or tensor checks are needed before treating every released weight as an independently verified lossless cast. Activation quantization and kernel arithmetic still require quality comparison. [Conversion description](https://huggingface.co/nvidia/DeepSeek-V4-Flash-0731-NVFP4/raw/f1caa71142bd0be02f728c79f75042ac1e461579/README.md), [immutable exporter](https://raw.githubusercontent.com/NVIDIA/Model-Optimizer/43fd41a58d52c4e6e5dec1d1ff5989ecc737ae1a/examples/deepseek/deepseek_v4/quantize_to_nvfp4.py).

## Deployment rule

Pin the model and tokenizer revisions, quantization configuration, runtime commit and image digest together. Root BF16 metadata can coexist with quantized weights. Inspect serialized tensors, scales, excluded modules, activation precision and runtime repacking. Casting a quantized checkpoint to BF16 does not reconstruct an original BF16 reference.

Compare target-only quality before changing cache precision or enabling DSpark. The [precision analysis](../../../reports/precision-and-kernels.md) explains the formats, and the [serving report](serving.md) keeps publisher recipes separate from local experiments.

## License provenance

The pinned LICENSE file is MIT. The same revision's model card explicitly applies that license to the repository and model weights. This verifies the named artifact's stated terms; it does not establish terms for separately named derivatives. No model weights are bundled here. [LICENSE](https://huggingface.co/deepseek-ai/DeepSeek-V4-Flash-0731/blob/7872f01b1d1fe23eabc4c98b48bffcef5a386062/LICENSE), [model card](https://huggingface.co/deepseek-ai/DeepSeek-V4-Flash-0731/blob/7872f01b1d1fe23eabc4c98b48bffcef5a386062/README.md).
