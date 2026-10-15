# Gemma 4 31B IT: validation ledger

| Check | Status in this ZIP |
| --- | --- |
| Publisher identity and named base repository | Rechecked 2026-10-15 against the pinned publisher card |
| Base / derivative revision pins | Resolved for all three artifacts; see [sources](sources.md) |
| Selected architecture fields | Compared with the pinned base config; projected text fields match both derivatives |
| Quantization configuration and file sizes | Pinned exporter configs and tree metadata checked; no tensors downloaded |
| Entire checkpoint tensor census | Not performed |
| Model-weight download | Not performed; no weights bundled |
| GPU load / generation | Not performed |
| 8×B300 throughput / latency | Not measured |
| Exact latest-nightly container artifact | Not downloaded or digest-verified |
| Application correctness and quality | Tests to run locally, not claimed complete |

## Model-specific regression cases

Compare TP1 BF16/FP8/NVFP4 at matched context and batch; verify global/local cache accounting; test thinking on/off separately; include image grounding, tool-call JSON, long-distance retrieval and concurrent cancellations.

Physical KV allocation under attention_k_eq_v in the selected engine; exact export-level SGLang compatibility; correct tool template at the final image revision; local B300 quality and latency.

Use the [benchmark protocol](../../../benchmarks/PROTOCOL.md) and [result schema](../../../benchmarks/result.schema.json). Empty results mean not measured; they do not mean zero performance. Record failures as data rather than removing them from the throughput denominator.
