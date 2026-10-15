# GLM 5.3 Flash: validation ledger

| Check | Status in this ZIP |
| --- | --- |
| Publisher identity and named base repository | Rechecked online 2026-10-15; immutable base revision recorded |
| Selected architecture fields | Every recorded field compared with the pinned publisher config |
| Entire checkpoint tensor census | Not performed; Hub metadata and index totals inspected |
| Precision variants | Both official variants and exact RedHat derivative pinned; cards, configs and indices reviewed |
| State-matrix arithmetic | 142,606,336 bytes = 136 MiB under the stated FP32 assumption; not a measured allocation |
| Model tensor payload download | Not performed; no weights bundled |
| GPU load / generation | Not performed |
| 8×B300 throughput / latency | Not measured |
| Exact latest-nightly container artifact | Not downloaded, digest-verified or executed |
| Application correctness and quality | Tests to run locally, not claimed complete |

## Model-specific regression cases

Compare target-only operation (omit speculation flags) with 1/3/5 draft steps; TP4 versus TP8; independent replicas versus 4+4 disaggregation; the supported KV/backend pairs (FP8 + TRT-LLM DSA versus BF16 + TileLang DSA in SGLang CUDA); controlled KDA pool sizes. Add multi-image and long multi-turn tests with cancellation, context-cache reuse and state rollback. Treat SGLang PD as a separate preview probe: its cookbook reports dummy-weight mechanical validation only and requires speculation off; real-weight correctness remains open.

The RedHat quantization configuration is now inspected at an immutable revision: main routed experts use NVFP4 and MTP routed experts use FP8. Other exporters require their own configuration audit. Quality, loader memory, the best KDA/KV split and the disaggregation crossover still need local measurements.

Use the [benchmark protocol](../../../benchmarks/PROTOCOL.md) and [result schema](../../../benchmarks/result.schema.json). Empty results mean not measured; they do not mean zero performance. Record failures as data rather than removing them from the throughput denominator.
