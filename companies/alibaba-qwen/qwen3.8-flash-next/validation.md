# Qwen 3.8 Flash Next: validation ledger

| Check | Status in this ZIP |
| --- | --- |
| Publisher identity and all three named checkpoints | Cards and repository APIs retrieved on 2026-10-15 UTC |
| Immutable revisions | Base, official FP8 and NVIDIA export resolved and metadata retrieved |
| Selected architecture fields | Rechecked against pinned base config; derived/card-only fields labelled |
| Quantization metadata | FP8 exclusions, NVFP4 main experts, FP8 PLE and separate MTP map inspected |
| SGLang B300 NVIDIA recipe | Pinned TP1 source inspected; upstream explicitly marks it unverified |
| Memory arithmetic | Rounded 125 + 51 + 4 = 180B language-model scope; FP8 table estimate approximately 51 GB |
| Entire checkpoint tensor census | Not performed |
| Model-weight download | Not performed; no weights bundled |
| GPU load / generation | Not performed |
| 8×B300 throughput / latency | Not measured |
| Exact latest-nightly container artifact | Not downloaded or digest-verified |
| Application correctness and quality | Tests to run locally, not claimed complete |

## Model-specific regression cases

These are proposed hardware checks, not completed tests. Compare the SGLang TP1 probe and vLLM TP8 target-only baseline with total GPU use and effective dtypes recorded, then TP4 capacity experiments and TP8+EP MTP. Track n-gram placement, lookup stalls, recurrent-state allocation, indexer time and total node goodput. Verify thinking and non-thinking controls against the pinned publisher template; the SGLang cookbook prose is inconsistent on that behavior.

B300 load, quality and performance for the documented SGLang NVIDIA TP1 recipe; n-gram placement costs; full checkpoint tensor-byte census; production throughput under realistic prefix reuse.

Use the [benchmark protocol](../../../benchmarks/PROTOCOL.md) and [result schema](../../../benchmarks/result.schema.json). Empty results mean not measured; they do not mean zero performance. Record failures as data rather than removing them from the throughput denominator.
