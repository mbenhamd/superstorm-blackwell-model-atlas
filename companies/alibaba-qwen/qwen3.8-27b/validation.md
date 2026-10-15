# Qwen 3.8 27B: validation ledger

| Check | Status in this ZIP |
| --- | --- |
| Publisher identity and all three named checkpoints | Cards and repository APIs retrieved on 2026-10-15 UTC |
| Immutable revisions | Base, official FP8 and NVIDIA export resolved and metadata retrieved |
| Selected architecture fields | Rechecked against pinned base config; derived/card-only fields labelled |
| Quantization metadata | FP8 exclusions and NVIDIA module maps inspected; ModelOpt version conflict recorded |
| Memory arithmetic | 54 GB rounded BF16 language-weight estimate; 16 GiB conventional KV; 144 MiB matrix state, under stated assumptions |
| Entire checkpoint tensor census | Not performed |
| Model-weight download | Not performed; no weights bundled |
| GPU load / generation | Not performed |
| 8×B300 throughput / latency | Not measured |
| Exact latest-nightly container artifact | Not downloaded or digest-verified |
| Application correctness and quality | Tests to run locally, not claimed complete |

## Model-specific regression cases

These are proposed hardware checks, not completed tests. The metadata audit did not install an engine or execute generation.

Measure TP1/2/4 with 1/8/32/128 concurrent requests; BF16/FP8/mixed NVFP4; 4K/32K/128K contexts; text-only versus image inputs; MTP off versus supported depths. Keep request payloads and thinking effort frozen.

Actual TP1 NVFP4 kernel efficiency on this B300 firmware/container combination; optimal hybrid-cache split; useful quality at the extended context; performance under the user’s language and tool distributions.

Use the [benchmark protocol](../../../benchmarks/PROTOCOL.md) and [result schema](../../../benchmarks/result.schema.json). Empty results mean not measured; they do not mean zero performance. Record failures as data rather than removing them from the throughput denominator.
