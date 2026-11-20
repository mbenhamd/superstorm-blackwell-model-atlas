# Moonshot AI

## [Kimi K3](kimi-k3/README.md)

Publisher reports 2.8T total / 104B active; hybrid KDA and gated MLA with latent MoE. The [family report](kimi-k3/architecture.md) distinguishes configuration facts from publisher counts and serving hypotheses.

Canonical repository: `moonshotai/Kimi-K3`, reverified at `f831ab66814297da540d832a5235f8e904f29d06` on 2026-10-15.

NVIDIA's mixed NVFP4 export is a separate checkpoint variant within this family. Its configuration, license provenance and runtime requirements are recorded in the [precision report](kimi-k3/precision.md).

## [Kimi K3.1 Pro](kimi-k3.1-pro/README.md)

Post-trained Kimi K3 with the same 2.8T / 104B publisher headline and K3 dimensions, plus a DSA lightning indexer (top-2048) on the 24 gated full-attention layers. Native MXFP4 routed experts. The serialized weights admit a TP8 capacity probe on one 8×B300 node.

Canonical repository: `moonshotai/Kimi-K3.1-Pro`, pinned at `d9e99b0792a5e93b78ea9bea62a68167e36ddd9e` on 2026-11-06.

vLLM v0.34.0 and SGLang v0.5.23 lack a complete K3.1 serving path. Both main branches include later model work. NVIDIA now publishes a separate mixed NVFP4 export and names development images for both engines. See the [November 20 review](kimi-k3.1-pro/serving.md#november-20-engine-and-benchmark-review).
