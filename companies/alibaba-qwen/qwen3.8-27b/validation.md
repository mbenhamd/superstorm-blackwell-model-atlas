# Qwen 3.8 27B: validation ledger

| Check | Status in this ZIP |
| --- | --- |
| Publisher identity and named base repository | Reviewed online |
| Selected architecture fields | Extracted from cited card/config |
| Entire checkpoint tensor census | Not performed |
| Model-weight download | Not performed; no weights bundled |
| GPU load / generation | Not performed |
| 8×B300 throughput / latency | Not measured |
| Exact latest-nightly container artifact | Not downloaded or digest-verified |
| Application correctness and quality | Tests to run locally, not claimed complete |

## Model-specific regression cases

Measure TP1/2/4 with 1/8/32/128 concurrent requests; BF16/FP8/mixed NVFP4; 4K/32K/128K contexts; text-only versus image inputs; MTP off versus supported depths. Keep request payloads and thinking effort frozen.

Actual TP1 NVFP4 kernel efficiency on this B300 firmware/container combination; optimal hybrid-cache split; useful quality at the extended context; performance under the user’s language and tool distributions.

Use the [benchmark protocol](../../../benchmarks/PROTOCOL.md) and [result schema](../../../benchmarks/result.schema.json). Empty results mean not measured; they do not mean zero performance. Record failures as data rather than removing them from the throughput denominator.
