# GLM 5.3 Flash: validation ledger

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

Sweep 0/1/3/5 draft steps; TP4 versus TP8; independent replicas versus 4+4 disaggregation; KV FP8 versus higher precision; controlled KDA pool sizes. Add multi-image and long multi-turn tests with cancellation, context-cache reuse and state rollback.

The exact RedHat NVFP4 tensor-level recipe was not separately inspected; do not treat its format as identical to NVIDIA/RadixArk. The optimal state split and disaggregation crossover need local measurements.

Use the [benchmark protocol](../../../benchmarks/PROTOCOL.md) and [result schema](../../../benchmarks/result.schema.json). Empty results mean not measured; they do not mean zero performance. Record failures as data rather than removing them from the throughput denominator.
