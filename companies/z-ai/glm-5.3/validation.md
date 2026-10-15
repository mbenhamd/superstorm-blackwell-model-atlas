# GLM 5.3: validation ledger

| Check | Status in this ZIP |
| --- | --- |
| Publisher identity and named base repository | Rechecked online 2026-10-15; immutable base revision recorded |
| Selected architecture fields | Every recorded field compared with the pinned publisher config |
| Entire checkpoint tensor census | Not performed; Hub metadata and index totals inspected |
| Main/MTP accounting | 791 extra-layer tensor shapes checked across five BF16 safetensors headers; no tensor payloads fetched |
| Precision variants | All four named artifacts pinned; cards, configs and indices reviewed |
| Model tensor payload download | Not performed; no weights bundled |
| GPU load / generation | Not performed |
| 8×B300 throughput / latency | Not measured |
| Exact latest-nightly container artifact | Not downloaded, digest-verified or executed |
| Application correctness and quality | Tests to run locally, not claimed complete |

## Model-specific regression cases

Compare FP8 TP8; NVFP4 TP4; NVFP4 TP8; two isolated TP4 replicas; and MTP off versus 1/3/5 proposals. Report total node goodput, not only one replica’s tokens/second. Verify the same reasoning effort and retained conversation fields.

Actual per-rank load and cache capacity on this node; exporter-specific quality under the application prompts; inclusion of required fixes in the selected image; and the workload crossover between vLLM and SGLang remain unmeasured. The 743B/753B accounting is now reconciled. See [architecture](architecture.md) for the pinned metadata calculation.

Use the [benchmark protocol](../../../benchmarks/PROTOCOL.md) and [result schema](../../../benchmarks/result.schema.json). Empty results mean not measured; they do not mean zero performance. Record failures as data rather than removing them from the throughput denominator.
