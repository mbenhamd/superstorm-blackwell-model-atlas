# Mistral Medium 3.5: validation ledger

| Check | Status in this ZIP |
| --- | --- |
| Publisher identity and named base repository | Rechecked 2026-10-15 against the pinned publisher card |
| Base revision pin | `22b2b868a15677cfa6061277ed2f653d1349a9ab` |
| Selected architecture fields | Compared with the pinned config, including corrected `mscale_all_dim=0.0` |
| Alternative weight layouts | Both pinned indexes checked; each reports 133,605,834,656 payload bytes |
| vLLM / SGLang documentation | Both publisher recipes checked; no local engine execution |
| Entire checkpoint tensor census | Not performed |
| Model-weight download | Not performed; no weights bundled |
| GPU load / generation | Not performed |
| 8×B300 throughput / latency | Not measured |
| Exact latest-nightly container artifact | Not downloaded or digest-verified |
| Application correctness and quality | Tests to run locally, not claimed complete |

## Model-specific regression cases

Establish TP8 correctness, then measure TP1 if it fits the workload, TP2 and TP4 with a fixed total GPU budget. Keep KV precision matched; cover 4K/32K/128K prompts, one versus multiple images, `reasoning_effort=none` and `high`, and long-context regressions with the corrected YaRN value. Enable and validate the selected engine’s reasoning and tool parsers before treating a profile as a protocol baseline.

Installed-image and B300 compatibility at the pinned corrected revision; runtime memory beyond the reported weight payload; maximum safe concurrency and best TP width; no audited NVFP4 variant. SGLang support is documented upstream, but has not been run locally.

Use the [benchmark protocol](../../../benchmarks/PROTOCOL.md) and [result schema](../../../benchmarks/result.schema.json). Empty results mean not measured; they do not mean zero performance. Record failures as data rather than removing them from the throughput denominator.
