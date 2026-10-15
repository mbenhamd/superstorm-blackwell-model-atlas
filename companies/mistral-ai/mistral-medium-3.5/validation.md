# Mistral Medium 3.5: validation ledger

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

Measure TP1 if it fits your chosen workload, TP2, TP4 and TP8; native FP8 with matched KV precision; 4K/32K/128K prompts; one versus multiple images; reasoning none versus high as separate workloads; corrected-config regression cases.

Installed-image compatibility of the corrected configuration; exact selected-layout bytes; SGLang static-FP8 support for this artifact; maximum safe concurrency and best TP width; no audited NVFP4 variant.

Use the [benchmark protocol](../../../benchmarks/PROTOCOL.md) and [result schema](../../../benchmarks/result.schema.json). Empty results mean not measured; they do not mean zero performance. Record failures as data rather than removing them from the throughput denominator.
