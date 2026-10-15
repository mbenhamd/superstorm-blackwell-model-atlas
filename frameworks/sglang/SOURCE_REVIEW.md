# SGLang: focused source review

## Version ledger

Latest stable release rechecked on October 15, 2026: **v0.5.21**, published October 2. Its NVIDIA image is documented as CUDA 13. The inspected source snapshot is `877be2974aa151a984e52822c028276c2b1e9303`, committed October 15 at 20:34:49 UTC for CI waiting behavior. [GREL](https://github.com/sgl-project/sglang/releases/tag/v0.5.21) [GHEAD](https://github.com/sgl-project/sglang/commit/877be2974aa151a984e52822c028276c2b1e9303)

A separate main-branch lookup at 21:52 UTC returned `91f6ef23223d8415724b1bbfab415bb5977fca0c`, committed at 21:11:51 UTC for DeepSeek V4.1 request-window KV copies. Both source files below were retrieved at that revision and were byte-identical to the inspected snapshot. No nightly wheel or image was executed; published nightly metadata is recorded separately in [nightly readiness](../../reports/nightly-readiness.md). [GMAIN](https://github.com/sgl-project/sglang/commit/91f6ef23223d8415724b1bbfab415bb5977fca0c)

## Actual code ranges inspected

| File | Range | Observation |
| --- | --- | --- |
| `python/sglang/srt/models/registry.py` | 1–159, entire file | EntryClass discovery, import-failure logging, registration and fallback normalization |
| `python/sglang/srt/layers/quantization/modelopt_quant.py` | 1–240 | FP4 GEMM backend dispatch, W4A4/W4A16 distinction, alignment/padding helpers |
| PR #35077 | description and merge metadata | Kimi mixed NVFP4/FP8 compatibility and scope of author validation |

[GREG](https://github.com/sgl-project/sglang/blob/877be2974aa151a984e52822c028276c2b1e9303/python/sglang/srt/models/registry.py) [GQUANT](https://github.com/sgl-project/sglang/blob/877be2974aa151a984e52822c028276c2b1e9303/python/sglang/srt/layers/quantization/modelopt_quant.py) [KIMIPR](https://github.com/sgl-project/sglang/pull/35077)

## Why this is more than a model-name check

The registry can discover model classes from default or external packages. Unless strict import behavior is requested, module import failures are logged and skipped. A fallback implementation may be considered when the requested architecture is not directly normalized. Capture the actual resolved class and warnings, especially when comparing a stable image with a nightly. This is not a claim that a fallback is always wrong; it is a reason not to confuse fallback with the intended optimized path. [GREG](https://github.com/sgl-project/sglang/blob/877be2974aa151a984e52822c028276c2b1e9303/python/sglang/srt/models/registry.py)

The inspected quantization code separates FP4 GEMM variants and delegates to available FlashInfer functions. Packed weights require backend-dependent alignment. Kimi’s compatibility fix additionally handles its activation scale contract and FP8 block-scale projections. A successful import of `sglang` cannot establish those artifact-specific requirements. [GQUANT](https://github.com/sgl-project/sglang/blob/877be2974aa151a984e52822c028276c2b1e9303/python/sglang/srt/layers/quantization/modelopt_quant.py) [KIMIPR](https://github.com/sgl-project/sglang/pull/35077)

PR #35077 merged on August 19, and its merge commit is an ancestor of the v0.5.21 source tag. Its author reports a TP8 correctness evaluation on **eight GB300 GPUs**, with 197/200 GSM8K answers correct, and explicitly reports no speed measurement. This establishes release-source inclusion and a scoped author test; it does not establish B300 throughput or qualify every image and kernel combination. The current Kimi cookbook still specifies a development image. [GREL-KIMI-ANCESTRY](https://github.com/sgl-project/sglang/compare/5f128395910dafb98c34083dc26cb790c7674d34...v0.5.21) [KIMIPR](https://github.com/sgl-project/sglang/pull/35077) [kimi-k3-GR](https://docs.sglang.io/cookbook/autoregressive/Moonshotai/Kimi-K3)

## Recent release points worth retesting

Release 0.5.21 describes Rust-core prefix-cache changes, Kimi prefill work and CUDA graph fixes, GLM Flash replay-state work, Qwen mixed-precision expert paths and numerical-accuracy fixes. These are release-note claims, not independently reproduced speedups. They justify regression testing the workload after an upgrade rather than assuming monotonic improvement. [GREL](https://github.com/sgl-project/sglang/releases/tag/v0.5.21)

## Hybrid state and speculation

The Qwen cookbook exposes state slots, speculative intermediates and a distinct replay-ring path. The GLM Flash cookbook warns that a generic state-to-KV split is not a workload-specific optimum. Kimi’s cookbook distinguishes supported, measured and extrapolated topology choices. Keep these model-specific constraints instead of copying one universal “best SGLang flags” block. [qwen3.8-27b-GR](https://docs.sglang.io/cookbook/autoregressive/Qwen/Qwen3.8-27B) [glm-5.3-flash-GR](https://docs.sglang.io/cookbook/autoregressive/GLM/GLM-5.3-Flash) [kimi-k3-GR](https://docs.sglang.io/cookbook/autoregressive/Moonshotai/Kimi-K3)

Target-only correctness, natural speculative acceptance and cancellation/rollback tests precede throughput tuning. The engine’s default state dtype and `auto` KV behavior can vary with checkpoint metadata, so record effective values at boot.
