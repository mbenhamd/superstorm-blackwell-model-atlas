# Alibaba Qwen

## [Qwen 3.8 27B](qwen3.8-27b/README.md)
Dense 27B language model; Gated DeltaNet + gated full attention; multimodal

Canonical repository: `Qwen/Qwen3.8-27B`. Base, official FP8 and NVIDIA mixed-export metadata were rechecked at immutable revisions on 2026-10-15 UTC; see the [source record](qwen3.8-27b/sources.md). The NVIDIA exporter-version discrepancy remains explicit.

## [Qwen 3.8 Flash Next](qwen3.8-flash-next/README.md)
Publisher's rounded language-model accounting: 125B main + 51B n-gram + 4B MTP; 6B active main; GDN + QSA. This is not an exact whole-checkpoint count.

Canonical repository: `Qwen/Qwen3.8-Flash-Next`. Base, official FP8 and NVIDIA mixed-export metadata were rechecked at immutable revisions on 2026-10-15 UTC; see the [source record](qwen3.8-flash-next/sources.md). The NVIDIA vLLM TP8 baseline and SGLang's documented TP1 candidate remain unmeasured on the target B300 node.

Quantized exports remain under the architecture’s original company. NVIDIA and RedHat are checkpoint exporters, not a second invented model family.
