# Meta

## [Muse Glimmer 30B](muse-glimmer-30b/README.md)

Dense multimodal model: 52 layers, hidden size 6656, three sliding-window (2,048) layers per global layer with no positional encoding on the global layers, 32 query / 2 KV heads, logit soft-cap 20; 29.78B BF16 parameters in the weight-file headers (card: about 29.6B), 131,072-token context. A separate DFlash drafter (`meta-models/Muse-Glimmer-30B-assistant`) is published for speculative decoding.

Canonical repository: `meta-models/Muse-Glimmer-30B`, pinned at `cec94fcfd6512f2cfe708138c32533b346ea4f69` on 2026-11-06. Licence: Apache-2.0.

Both latest stable engines contain model support (vLLM since v0.28.0, SGLang since v0.5.18); neither publisher configuration lists B300 as verified. NVIDIA, Red Hat, Inferact and RadixArk exports are recorded separately in the [precision report](muse-glimmer-30b/precision.md). See the [serving report](muse-glimmer-30b/serving.md).

Quantized exports remain under the architecture's original company. NVIDIA, Red Hat, Inferact and RadixArk are checkpoint exporters, not separate model families.
