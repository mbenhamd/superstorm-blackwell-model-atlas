# Qwen 3.8 27B: precision and provenance

| Variant | Exact artifact | Actual precision contract | Evidence |
| --- | --- | --- | --- |
| bf16 | Qwen/Qwen3.8-27B | BF16 declared by text config | Publisher card and pinned config inspected |
| fp8 | Qwen/Qwen3.8-27B-FP8 | E4M3 FP8 with 128×128 weight blocks and excluded modules | Publisher card and pinned config inspected |
| nvfp4 | nvidia/Qwen3.8-27B-NVFP4 | NVFP4 MLP/head + FP8 attention projections; MTP internals excluded; shared output head remains NVFP4 | NVIDIA card and pinned quantization metadata inspected |

The NVIDIA revision is resolved: `482ca0f3832238542f8f5295dde86b5f22711d80`, confirmed again on October 17. The remaining provenance conflict concerns the exporter version below, not a missing checkpoint identity. Base BF16 stays at `1d4bf0f2ff6012fd82039f2fa52739d0dd7c60c0`, and official FP8 at `017b9c7af6b5689d5dd426a76e0bc077eb5ca20a`. The alternative base snapshot in the supplied report changes the chat template; see [architecture](architecture.md). [RR-QWEN-27NV-API](https://huggingface.co/api/models/nvidia/Qwen3.8-27B-NVFP4), [RR-QWEN-27-API](https://huggingface.co/api/models/Qwen/Qwen3.8-27B), [RR-QWEN-27FP8-API](https://huggingface.co/api/models/Qwen/Qwen3.8-27B-FP8).


## File size and quality scope

| Pinned export | Safetensors file total | Binary units |
| --- | ---: | ---: |
| Official FP8 | 30,866,866,928 bytes (30.87 GB) | 28.747 GiB |
| NVIDIA mixed NVFP4 | 21,921,697,280 bytes (21.92 GB) | 20.416 GiB |

The NVIDIA file total is **8.331 GiB (29.0%) smaller** than official FP8. These are sums of the pinned Hub file listings, including safetensors headers. The official FP8 figure may round to 30.9 GB, but not 31 GiB. A 15.5 GB NVFP4 claim does not describe the pinned NVIDIA export. File totals include stored auxiliary modules and do not establish target residency, loader repacking or remaining cache capacity. [TOPQ-27FP8-TREE](https://huggingface.co/api/models/Qwen/Qwen3.8-27B-FP8/tree/017b9c7af6b5689d5dd426a76e0bc077eb5ca20a?recursive=true&expand=false) [TOPQ-27NV-TREE](https://huggingface.co/api/models/nvidia/Qwen3.8-27B-NVFP4/tree/482ca0f3832238542f8f5295dde86b5f22711d80?recursive=true&expand=false)

The NVIDIA card declares text, image and video inputs and includes MMMU-Pro in its BF16/NVFP4 evaluation. NVFP4 therefore is not inherently a text-only variant. The cited evidence does not compare official FP8 against this NVIDIA export at matched `xhigh` effort across text and multimodal workloads; it cannot establish “FP8 for best multimodal quality, NVFP4 for text” as a measured ranking. [TOPQ-27NV-CARD](https://huggingface.co/nvidia/Qwen3.8-27B-NVFP4/raw/482ca0f3832238542f8f5295dde86b5f22711d80/README.md)

## Interpretation

Keep the BF16, official FP8 and NVIDIA mixed export as separate comparisons. The official FP8 config declares dynamic activations and 128×128 weight blocks; its exclusion list includes the vision tower, language head and selected recurrent components. The NVIDIA map assigns NVFP4 to 193 MLP/head module entries and FP8 to 208 attention projection entries, and excludes `mtp*`. These are metadata entries, not a tensor-byte census. [qwen3.8-27b-FP8-CFG](https://huggingface.co/Qwen/Qwen3.8-27B-FP8/raw/017b9c7af6b5689d5dd426a76e0bc077eb5ca20a/config.json) [qwen3.8-27b-NV-CFG](https://huggingface.co/nvidia/Qwen3.8-27B-NVFP4/raw/482ca0f3832238542f8f5295dde86b5f22711d80/config.json)

**Producer-version conflict:** NVIDIA's card names ModelOpt 0.48.0 and local-Hessian calibration, but both pinned `config.json` and `hf_quant_config.json` record producer version `0.47.0.dev80+g913f5e224`. The audit cannot reconcile the exporter version from these artifacts; preserve both observations when reproducing the checkpoint. [qwen3.8-27b-NV-QUANT](https://huggingface.co/nvidia/Qwen3.8-27B-NVFP4/raw/482ca0f3832238542f8f5295dde86b5f22711d80/hf_quant_config.json)

The rounded weight arithmetic makes one B300 a plausible starting point; startup fit at the requested workload remains untested. NVFP4 may reduce bandwidth or permit more cache capacity, but quantization and kernel-launch overhead can offset that gain at low batch sizes. Benchmark the actual workload and retain BF16 as the quality reference.

Native MTP is present in the architecture; `mtp*` being excluded from NVIDIA's quantization map does not mean that MTP tensors are absent. Their storage precision and the engine's draft-loader path remain distinct from the 193 NVFP4 and 208 FP8 target-module entries. Likewise, weight quantization does not set KV or recurrent-state precision: the NVIDIA metadata has no KV quantization algorithm, while its serving examples request FP8 KV explicitly. [qwen3.8-27b-NV-QUANT](https://huggingface.co/nvidia/Qwen3.8-27B-NVFP4/raw/482ca0f3832238542f8f5295dde86b5f22711d80/hf_quant_config.json), [qwen3.8-27b-NV](https://huggingface.co/nvidia/Qwen3.8-27B-NVFP4/raw/482ca0f3832238542f8f5295dde86b5f22711d80/README.md).

[qwen3.8-27b-CARD](https://huggingface.co/Qwen/Qwen3.8-27B/raw/1d4bf0f2ff6012fd82039f2fa52739d0dd7c60c0/README.md) [qwen3.8-27b-NV](https://huggingface.co/nvidia/Qwen3.8-27B-NVFP4/raw/482ca0f3832238542f8f5295dde86b5f22711d80/README.md) [qwen3.8-27b-FP8](https://huggingface.co/Qwen/Qwen3.8-27B-FP8/raw/017b9c7af6b5689d5dd426a76e0bc077eb5ca20a/README.md) [qwen3.8-27b-VR](https://recipes.vllm.ai/Qwen/Qwen3.8-27B)

## What the publisher quality table establishes

| Metric | NVIDIA's BF16 baseline | NVIDIA mixed NVFP4 | Change (percentage points) |
| --- | ---: | ---: | ---: |
| GPQA | 88.92 | 88.01 | −0.91 |
| TerminalBench | 75.56 | 74.02 | −1.54 |
| AA-LCR | 72.63 | 73.38 | +0.75 |
| MMMU-Pro | 75.14 | 74.86 | −0.28 |
| SciCode | 47.93 | 48.41 | +0.48 |
| IFBench | 80.07 | 78.93 | −1.14 |

These are **NVIDIA-reported scores**, not atlas measurements. The card supplies temperature 1.0, top-p 0.95, context 262,144 and a 65,536 generation cap except for TerminalBench. It omits an immutable BF16 baseline revision, matched FP8 results, reasoning effort, uncertainty and the exact evaluated runtime/KV configuration. Its GB300/vLLM statement and mutable nightly TP4 usage example do not certify v0.31.0 or TP1. Official FP8's near-parity statement and generic model table use different reported baselines; ranking exporters across those tables is unjustified. [qwen3.8-27b-NV](https://huggingface.co/nvidia/Qwen3.8-27B-NVFP4/raw/482ca0f3832238542f8f5295dde86b5f22711d80/README.md) [qwen3.8-27b-FP8](https://huggingface.co/Qwen/Qwen3.8-27B-FP8/raw/017b9c7af6b5689d5dd426a76e0bc077eb5ca20a/README.md)

## v0.31.0 execution and precision choice

The release's `ModelOptMixedPrecisionConfig` detects the per-layer map, honors exclusions and selects NVFP4/FP8/unquantized implementations. `--dtype bfloat16` preserves those quantized weights; it does not recreate the BF16 reference. The NVFP4 linear registry evaluates available SM10x kernels independently of the attention-backend setting. All these are source observations; the selected image still needs a real load and quality check. [ATTQ-V-MODELOPT-STABLE](https://raw.githubusercontent.com/vllm-project/vllm/db9527a46873454610df6dbedf79a36d6bf1a7f6/vllm/model_executor/layers/quantization/modelopt.py) [ATTQ-V-LINEAR-STABLE](https://raw.githubusercontent.com/vllm-project/vllm/db9527a46873454610df6dbedf79a36d6bf1a7f6/vllm/model_executor/kernels/linear/__init__.py) [ATTQ-V-NV-FLASHINFER-STABLE](https://raw.githubusercontent.com/vllm-project/vllm/db9527a46873454610df6dbedf79a36d6bf1a7f6/vllm/model_executor/kernels/linear/nvfp4/flashinfer.py)

Use BF16 weights/BF16 KV as the quality anchor, then official FP8 and NVIDIA mixed with the same backend/BF16 KV. NVIDIA mixed can lead efficiency investigation when bandwidth or capacity is the explicit objective. Official FP8 retains higher precision in more paths, but no matched evidence here proves it wins task quality or latency. Change KV to FP8 and enable drafting separately. [Matched v0.31 configurations](serving.md#matched-target-only-configuration-references).

The native NVIDIA MTP internals match the `mtp*` exclusion, while the shared `lm_head` follows its NVFP4 map entry. Official FP8 stores quantized MTP projections with selected exclusions; neither entire drafter should be described as uniformly BF16. KV scales and FP32 GDN state remain separate contracts. [Q31-V-STABLE-QWEN-MTP](https://raw.githubusercontent.com/vllm-project/vllm/db9527a46873454610df6dbedf79a36d6bf1a7f6/vllm/model_executor/models/qwen3_5_mtp.py) [Q31-V-STABLE-MTP-SHARING](https://raw.githubusercontent.com/vllm-project/vllm/db9527a46873454610df6dbedf79a36d6bf1a7f6/vllm/v1/worker/gpu/spec_decode/eagle/utils.py) [TOPQ-27FP8-INDEX](https://huggingface.co/Qwen/Qwen3.8-27B-FP8/resolve/017b9c7af6b5689d5dd426a76e0bc077eb5ca20a/model.safetensors.index.json) [qwen3.8-27b-NV-CFG](https://huggingface.co/nvidia/Qwen3.8-27B-NVFP4/raw/482ca0f3832238542f8f5295dde86b5f22711d80/config.json)

## Deployment rule

Pin the model revision, tokenizer/processor revision, quantization configuration, runtime commit and image digest together. A root BF16 `dtype` can coexist with quantized weights. The real contract includes serialized tensor types, scales, grouping, excluded modules, activation precision and runtime repacking. Do not cast a quantized checkpoint to BF16 and call it the original BF16 reference.

For every candidate, compare target-only quality against the appropriate reference before enabling lower-precision KV or speculation. [Precision analysis](../../../reports/precision-and-kernels.md) distinguishes NVFP4, MXFP4, FP8 and BF16. [NV4](https://developer.nvidia.com/blog/introducing-nvfp4-for-efficient-and-accurate-low-precision-inference/) [TE](https://docs.nvidia.com/deeplearning/transformer-engine/examples/fp8_primer.html)

## License provenance

Apache-2.0 on base; also review derivative terms. This is a provenance flag, not legal clearance. This repository contains no model weights. Original model terms and derivative exporter terms remain separate from this repository’s original code and prose.

## Input-protocol comparison

The pinned exports' standalone chat templates and preprocessor configurations match, but NVIDIA's `tokenizer_config.json` names `<|im_end|>` as the pad token while base/official FP8 name `<|endoftext|>`. All three generation configurations nevertheless specify pad ID 248044. No tokenizer execution here established a behavioral difference. Compare effective serialized token IDs, padding/attention masks and stop behavior before attributing quality changes to quantization; pinning each export's tokenizer is not proof those inputs are identical. [Q31-REVIEW-BF16-TOKENIZER-CONFIG](https://huggingface.co/Qwen/Qwen3.8-27B/raw/1d4bf0f2ff6012fd82039f2fa52739d0dd7c60c0/tokenizer_config.json) [Q31-REVIEW-FP8-TOKENIZER-CONFIG](https://huggingface.co/Qwen/Qwen3.8-27B-FP8/raw/017b9c7af6b5689d5dd426a76e0bc077eb5ca20a/tokenizer_config.json) [Q31-REVIEW-NVFP4-TOKENIZER-CONFIG](https://huggingface.co/nvidia/Qwen3.8-27B-NVFP4/raw/482ca0f3832238542f8f5295dde86b5f22711d80/tokenizer_config.json) [Q31-REVIEW-BF16-GENERATION-CONFIG](https://huggingface.co/Qwen/Qwen3.8-27B/raw/1d4bf0f2ff6012fd82039f2fa52739d0dd7c60c0/generation_config.json) [Q31-REVIEW-FP8-GENERATION-CONFIG](https://huggingface.co/Qwen/Qwen3.8-27B-FP8/raw/017b9c7af6b5689d5dd426a76e0bc077eb5ca20a/generation_config.json) [Q31-REVIEW-NVFP4-GENERATION-CONFIG](https://huggingface.co/nvidia/Qwen3.8-27B-NVFP4/raw/482ca0f3832238542f8f5295dde86b5f22711d80/generation_config.json)

## SGLang 0.5.22: isolate output-head precision

The release cookbook identifies an additional, narrower experiment: compare **two separate RadixArk exports** with the same declared mixed body and different output heads.

| Additional candidate | Immutable revision | Declared output head |
| --- | --- | --- |
| `RadixArk/Qwen3.8-27B-NVFP4` | `319f741cce68d7914884900c138a1fbb70a42f30` | NVFP4, group size 16 |
| `RadixArk/Qwen3.8-27B-NVFP4-BF16-LMHead` | `009632fef96dd349150baa780c984e62e70e91fe` | Original BF16, excluded from quantization |

The publisher says all other tensors are identical; this review checked cards and precision metadata, not tensor payload equality. Both declare FP8 KV metadata, unlike the retained NVIDIA export, so set KV dtype explicitly. These are additional candidates, not replacements for the existing BF16/official FP8/NVIDIA configuration records. [S0522-F-Q27-FP4-HF_QUANT_CONFIG-JSON](https://huggingface.co/RadixArk/Qwen3.8-27B-NVFP4/raw/319f741cce68d7914884900c138a1fbb70a42f30/hf_quant_config.json) [S0522-F-Q27-BF16-HF_QUANT_CONFIG-JSON](https://huggingface.co/RadixArk/Qwen3.8-27B-NVFP4-BF16-LMHead/raw/009632fef96dd349150baa780c984e62e70e91fe/hf_quant_config.json) [S0522-F-Q27-BF16-README-MD](https://huggingface.co/RadixArk/Qwen3.8-27B-NVFP4-BF16-LMHead/raw/009632fef96dd349150baa780c984e62e70e91fe/README.md)

Compare target-only first at TP1 with identical tokenized inputs, main KV, attention backend, FP32 GDN state and sampling. Measure head execution time, HBM and tool/coding quality; then add MTP because output-head behavior can also affect drafting. A generic `--dtype bfloat16` switch does not restore original BF16 head weights from the NVIDIA NVFP4 artifact. Establish matching body/tokenizer provenance before attributing a difference solely to the head. The cookbook's hardware recipes and publisher GB300 validation do not establish a B300 optimum. [S0522-Q-Q35-RECIPES](https://raw.githubusercontent.com/sgl-project/sglang/baa9befa381511cd4d56f83980951e5a45fffc6d/docs/src/snippets/configs/Qwen/qwen3.8-27b.jsx)
