# Gemma 4 31B IT: precision and provenance

| Variant | Exact artifact | Actual precision contract | Evidence |
| --- | --- | --- | --- |
| bf16 | google/gemma-4-31B-it | BF16 | Pinned publisher card/config inspected |
| fp8 | RedHatAI/gemma-4-31B-it-FP8-block | W8A8, 128×128 weight blocks, dynamic activation groups of 128 | Pinned exporter card/config inspected |
| nvfp4 | RedHatAI/gemma-4-31B-it-NVFP4 | Text Linear W4A4 group 16, local activation scaling; vision/embedding/head retain precision | Pinned exporter card/config inspected |

Fresh metadata on 2026-10-16 still resolves BF16 to `842da3794eaa0b77d5f08bae87a17459d91ff475`, FP8 to `d7242548c457ab4b45bd3adb8937f2659af4739d` and NVFP4 to `5df75ccad9b74546f5be758a2a68acc2e16bbc9b`. The supplied older BF16 revision has unchanged retrieved model configuration and weight-object metadata but different protocol assets; see [architecture](architecture.md). The exporter cards name the base repository without establishing that their evaluation reference used either of these exact base revisions.

## Published quality is task dependent

Red Hat's pinned cards report these **publisher measurements with thinking enabled**; they have not been reproduced here. Differences are percentage points, with each card's Google baseline as the denominator for its recovery column.

| BFCLv4 category | Google baseline | FP8-block | FP8 change | NVFP4 | NVFP4 change |
| --- | ---: | ---: | ---: | ---: | ---: |
| Overall | 70.77% | 67.59% | −3.18 | 71.24% | +0.47 |
| Single Turn | 84.99% | 85.15% | +0.16 | 84.92% | −0.07 |
| Multi-Turn | 66.25% | 67.62% | +1.37 | 68.50% | +2.25 |
| Agentic | 65.82% | 56.53% | −9.29 | 64.50% | −1.32 |

For FP8 Agentic, `56.53 / 65.82 = 85.89%` recovery means a 14.11% relative reduction, not a 9.29% relative reduction. Close instruction/reasoning scores do not erase this tool-workflow regression. These tables also do not establish that NVFP4 causally improves overall quality: paired item outputs and uncertainty are absent. [gemma-4-31b-it-FP8](https://huggingface.co/RedHatAI/gemma-4-31B-it-FP8-block/raw/d7242548c457ab4b45bd3adb8937f2659af4739d/README.md), [gemma-4-31b-it-NV](https://huggingface.co/RedHatAI/gemma-4-31B-it-NVFP4/raw/5df75ccad9b74546f5be758a2a68acc2e16bbc9b/README.md).

BFCLv4's documented overall formula weights Agentic 40%, Multi-Turn 30%, Live 10%, Non-Live 10% and Hallucination 10%. The four exporter rows therefore cannot be averaged to recover Overall. Its card does not pin the evaluator commit, item counts, external search state or evaluated base SHA, so the benchmark site's current 5,088 scored cases cannot be assumed to be that run's denominator. Require per-category sample counts and item-level results in a reproduction. [RR-GM-BFCL-METHOD](https://gorilla.cs.berkeley.edu/blogs/15_bfcl_v4_web_search.html).

The cards describe repeated seeds and provide a text-only server command, but their lighteval examples request 65,536 output tokens against a 32,768 total-token server cap. A reproduction must resolve input-plus-output budgeting, rejection/truncation behavior and thinking mode explicitly. It must also pin the template and parser, evaluator/data revisions and base/quantized models. Any repaired budget is a documented new experiment, not an exact reproduction. [optimization guide](../../../reports/optimization.md).


## Interpretation

Red Hat’s FP8-block configuration declares `compressed-tensors`, 128×128 weight blocks and dynamic activation groups of 128. The NVFP4 configuration declares `nvfp4-pack-quantized`, group size 16 and local activation scaling. The published recipes preserve vision, embeddings and the output head at their original precision. These descriptions identify the export contract; no weight tensors were loaded in this audit. [gemma-4-31b-it-FP8-CFG](https://huggingface.co/RedHatAI/gemma-4-31B-it-FP8-block/raw/d7242548c457ab4b45bd3adb8937f2659af4739d/config.json) [gemma-4-31b-it-NV-CFG](https://huggingface.co/RedHatAI/gemma-4-31B-it-NVFP4/raw/5df75ccad9b74546f5be758a2a68acc2e16bbc9b/config.json)

The pinned tree metadata lists the following safetensors file totals, including headers. These are reported artifact sizes, not downloaded-byte measurements or GPU memory readings.

| Artifact | Listed weight-file bytes | Decimal GB | Source |
| --- | ---: | ---: | --- |
| Google BF16 | 62,546,338,248 | 62.546 | [BASE-TREE](https://huggingface.co/api/models/google/gemma-4-31B-it/tree/842da3794eaa0b77d5f08bae87a17459d91ff475?recursive=false&expand=false) |
| Red Hat FP8-block | 33,263,238,928 | 33.263 | [FP8-TREE](https://huggingface.co/api/models/RedHatAI/gemma-4-31B-it-FP8-block/tree/d7242548c457ab4b45bd3adb8937f2659af4739d?recursive=false&expand=false) |
| Red Hat NVFP4 | 23,265,401,144 | 23.265 | [NV-TREE](https://huggingface.co/api/models/RedHatAI/gemma-4-31B-it-NVFP4/tree/5df75ccad9b74546f5be758a2a68acc2e16bbc9b?recursive=false&expand=false) |

Dividing the listed BF16 file total by the NVFP4 total gives about 2.69×, so the exporter’s fourfold parameter-bit reduction does not describe the complete artifact size. Scales and higher precision components remain, and runtime caches and workspaces add further memory. Keep the pinned BF16 checkpoint as the reference for text, vision and tool tests.

[gemma-4-31b-it-CARD](https://huggingface.co/google/gemma-4-31B-it/blob/842da3794eaa0b77d5f08bae87a17459d91ff475/README.md) [gemma-4-31b-it-NV](https://huggingface.co/RedHatAI/gemma-4-31B-it-NVFP4/blob/5df75ccad9b74546f5be758a2a68acc2e16bbc9b/README.md) [gemma-4-31b-it-FP8](https://huggingface.co/RedHatAI/gemma-4-31B-it-FP8-block/blob/d7242548c457ab4b45bd3adb8937f2659af4739d/README.md)

## Deployment rule

Pin the model revision, tokenizer/processor revision, quantization configuration, runtime commit and image digest together. A root BF16 `dtype` can coexist with quantized weights. The real contract includes serialized tensor types, scales, grouping, excluded modules, activation precision and runtime repacking. Do not cast a quantized checkpoint to BF16 and call it the original BF16 reference.

For every candidate, compare target-only quality against the appropriate reference before enabling lower-precision KV or speculation. [Precision primer](../../../reports/precision-and-kernels.md) distinguishes NVFP4, MXFP4, FP8 and BF16. [NV4](https://developer.nvidia.com/blog/introducing-nvfp4-for-efficient-and-accurate-low-precision-inference/) [TE](https://docs.nvidia.com/deeplearning/transformer-engine/examples/fp8_primer.html)

## License provenance

The pinned Google base card and both Red Hat cards identify Apache-2.0 and link to Google’s [Gemma Apache 2.0 license page](https://ai.google.dev/gemma/apache_2), rechecked on 2026-10-15. This records the published license identity. The ZIP contains no model weights. Original model terms and derivative exporter terms remain separate from this repository’s original code and prose.
