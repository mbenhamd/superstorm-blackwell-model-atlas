# Mistral AI

## [Mistral Medium 3.5](mistral-medium-3.5/README.md)
Dense 128B; 88 language layers, GQA, Pixtral vision; static FP8 export. The [model report](mistral-medium-3.5/README.md) pins the corrected configuration and distinguishes publisher recipes from unmeasured B300 experiments.

Canonical repository: `mistralai/Mistral-Medium-3.5-128B`. The NVIDIA mixed NVFP4/FP8 export (`nvidia/Mistral-Medium-3.5-128B-NVFP4` @ `b8c66d2098edd8c9c26bde2b2ff41b5967e111ae`) is catalog variant `nvfp4`; vLLM v0.33.0 loads it by source reading, SGLang v0.5.23 does not. See the [NVFP4 dossier](mistral-medium-3.5/nvfp4.md); no B300 execution.

## [Mistral Large 4](mistral-large-4/README.md)

Sparse MoE, about 1.05T serialized parameters / 49B active by publisher statement; 72 layers, MLA with a top-2048 indexer, cross-layer KV sharing, 128 routed experts (top-4) plus one shared expert, Pixtral-style vision and an embedded DSpark draft. FP8 and official NVFP4 exports.

Canonical repository: `mistralai/Mistral-Large-4-1T-A52B`, pinned at `af26e7869af601441d5cdf75a1272469ddc3d059` on 2026-11-06.

No stable vLLM or SGLang release contains model support; publisher images and unmerged PRs only. See the [serving report](mistral-large-4/serving.md).

Quantized exports remain under the architecture’s original company. NVIDIA and RedHat are checkpoint exporters, not a second invented model family.
