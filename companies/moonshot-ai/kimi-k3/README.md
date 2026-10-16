# Kimi K3

**Reverified 2026-10-16 (UTC).** Publisher reports 2.8T total / 104B active; hybrid KDA + gated MLA; latent MoE. The current publisher and NVIDIA repository heads still match the retained immutable revisions. [Publisher identity](https://huggingface.co/api/models/moonshotai/Kimi-K3), [NVIDIA identity](https://huggingface.co/api/models/nvidia/Kimi-K3-NVFP4).

Treat K3 as a large hybrid system, not as a conventional trillion-parameter Transformer with a smaller file format. The ordinary release is already a low-precision, quantization-aware-trained artifact. The NVIDIA NVFP4 release is a different mixed-format artifact with a different loading and kernel contract. [kimi-k3-CARD](https://huggingface.co/moonshotai/Kimi-K3/blob/f831ab66814297da540d832a5235f8e904f29d06/README.md) [kimi-k3-CFG](https://huggingface.co/moonshotai/Kimi-K3/raw/f831ab66814297da540d832a5235f8e904f29d06/config.json)

**First serving candidate:** SGLang initial candidate for NVIDIA mixed NVFP4; compare vLLM and SGLang for native MXFP4. This is an unbenchmarked candidate for the target B300 node; relative performance remains workload-dependent.

Native MXFP4 already makes single-node weight storage plausible; NVIDIA NVFP4 is a separate option. The [precision report](precision.md) separates checkpoint bytes from residency, and the [serving report](serving.md) explains why the published AgentX throughput figures do not measure fresh output-token capacity or this NVIDIA export.

[Architecture](architecture.md) · [Precision and variants](precision.md) · [Serving decisions](serving.md) · [Sources](sources.md) · [Model catalog](../../../catalog/models.json)

## Architecture and serving implications

KDA layers maintain recurrent state, gated MLA layers retain compressed token history, and latent MoE layers execute routed and shared expert computation. The complete expert set remains part of weight storage. Optional DSpark adds a distinct target/draft compatibility contract and additional state. See [architecture](architecture.md), [precision and residency](precision.md) and [DSpark integration](dspark.md).

## Practical identity

| Property | Value |
| --- | --- |
| Exact base repository | moonshotai/Kimi-K3 |
| Configured positional limit | 1,048,576 tokens |
| Initial TP candidate | 8 |
| Base revision pin | `f831ab66814297da540d832a5235f8e904f29d06` |
| License scope | Kimi K3 License; pinned file reviewed |
| Verification level | Immutable publisher card/config/license retrieved; no local GPU load or benchmark |


The positional limit is not a promise of that many usable tokens under arbitrary batching, image load or cache precision. [kimi-k3-CARD](https://huggingface.co/moonshotai/Kimi-K3/blob/f831ab66814297da540d832a5235f8e904f29d06/README.md) [kimi-k3-CFG](https://huggingface.co/moonshotai/Kimi-K3/raw/f831ab66814297da540d832a5235f8e904f29d06/config.json)

## The most important unresolved checks

Exact B300 SXM6-AC OEM topology; all-FP8 artifact availability; exact installed-image ancestry of mixed-format fixes; maximum safe long-context concurrency; native-versus-NVFP4 quality for the target tool/language distribution; actual DSpark acceptance for the target workload.

[Return to repository index](../../../README.md)

For the speculative integration and current development-image caveats, see [DSpark and state sizing](dspark.md).
