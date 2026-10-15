# GLM 5.3: validation ledger

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

Compare FP8 TP8; NVFP4 TP4; NVFP4 TP8; two isolated TP4 replicas; and MTP off versus 1/3/5 proposals. Report total node goodput, not only one replica’s tokens/second. Verify the same reasoning effort and retained conversation fields.

Exact reason for 743B versus 753B accounting; exact BF16 single-node usable capacity; exporter-specific quality under your prompts; stable-image inclusion of every recent fix; SGLang performance relative to vLLM on this OEM node.

Use the [benchmark protocol](../../../benchmarks/PROTOCOL.md) and [result schema](../../../benchmarks/result.schema.json). Empty results mean not measured; they do not mean zero performance. Record failures as data rather than removing them from the throughput denominator.
