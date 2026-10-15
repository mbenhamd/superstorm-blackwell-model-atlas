# Kimi K3

**As of 2026-10-15.** 2.8T total / 104B active; hybrid KDA + gated MLA; latent MoE.

Treat K3 as a large hybrid system, not as a conventional trillion-parameter Transformer with a smaller file format. The ordinary release is already a low-precision, quantization-aware-trained artifact. The NVIDIA NVFP4 release is a different mixed-format artifact with a different loading and kernel contract. [kimi-k3-CARD](https://huggingface.co/moonshotai/Kimi-K3) [kimi-k3-CFG](https://huggingface.co/moonshotai/Kimi-K3/raw/main/config.json)

**First serving candidate:** SGLang first for NVIDIA mixed NVFP4; vLLM and SGLang race for native MXFP4. This is a reasoned deployment starting point, not a measured winner on your hardware.

[Architecture](architecture.md) · [Precision and variants](precision.md) · [Serving decisions](serving.md) · [Validation](validation.md) · [Sources](sources.md) · [Machine-readable record](model.json)

## The mental model

A very large consulting firm keeps short working notes at most desks and periodically consults the detailed archive. A dispatcher sends each problem to a few specialists, but every specialist’s reference material still occupies the building. The draft assistant proposes the next several words; the lead consultant must check them before release.

## Practical identity

| Property | Value |
| --- | --- |
| Exact base repository | moonshotai/Kimi-K3 |
| Native positional limit | 1,048,576 tokens |
| Initial TP candidate | 8 |
| Base revision pin | Not resolved immutably; resolve before deployment |
| License scope | Kimi custom license (review exact revision) |
| Verification level | Publisher configuration and cards reviewed; not loaded or benchmarked on hardware |


The positional limit is not a promise of that many usable tokens under arbitrary batching, image load or cache precision. [kimi-k3-CARD](https://huggingface.co/moonshotai/Kimi-K3) [kimi-k3-CFG](https://huggingface.co/moonshotai/Kimi-K3/raw/main/config.json)

## The most important unresolved checks

Exact B300 SXM6-AC OEM topology; all-FP8 artifact availability; exact installed-image ancestry of mixed-format fixes; maximum safe long-context concurrency; native-versus-NVFP4 quality on your tools and languages; actual DSpark acceptance on your workload.

[Return to repository index](../../../README.md)

For the speculative integration and current development-image caveats, see [DSpark and state sizing](dspark.md).
