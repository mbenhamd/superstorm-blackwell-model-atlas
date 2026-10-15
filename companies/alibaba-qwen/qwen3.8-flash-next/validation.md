# Qwen 3.8 Flash Next: validation ledger

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

Compare TP4 target-only, TP8 target-only, TP8+EP with one-token MTP, and alternative proposal depths after accuracy checks. Track n-gram allocation, lookup stalls, recurrent-state allocation, indexer time and total node goodput.

Exact NVIDIA-export SGLang compatibility; end-to-end performance of n-gram placement choices; full checkpoint tensor-byte census; production throughput under realistic prefix reuse.

Use the [benchmark protocol](../../../benchmarks/PROTOCOL.md) and [result schema](../../../benchmarks/result.schema.json). Empty results mean not measured; they do not mean zero performance. Record failures as data rather than removing them from the throughput denominator.
