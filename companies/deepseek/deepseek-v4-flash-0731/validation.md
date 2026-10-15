# DeepSeek V4 Flash 0731: validation ledger

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

Compare target-only with native DSpark, natural acceptance, and identical prompts. Test 4-GPU versus 8-GPU EP layouts, index-cache precision and 16K/64K/128K prompts. Validate tool calls, reasoning boundaries, EOS handling and the first token after a cancelled speculative request.

Exact total and active parameter scope for this checkpoint; source-to-image provenance of the selected backend; full raw compression schedule is not archived; no local B300 capacity or throughput results; exact SGLang 0731 integration not certified.

Use the [benchmark protocol](../../../benchmarks/PROTOCOL.md) and [result schema](../../../benchmarks/result.schema.json). Empty results mean not measured; they do not mean zero performance. Record failures as data rather than removing them from the throughput denominator.
