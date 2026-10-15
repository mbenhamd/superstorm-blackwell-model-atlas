# Kimi K3: validation ledger

Metadata and source audit repeated on 2026-10-15 (UTC). Base revision: `f831ab66814297da540d832a5235f8e904f29d06`.

| Check | Evidence obtained |
| --- | --- |
| Publisher identity and exact repository | Immutable card and config retrieved successfully; revision resolved through Hugging Face API |
| Curated architecture fields | Compared with pinned source fields; publisher headlines distinguished from config extractions |
| Variant and draft pins | NVIDIA, Inferact and RadixArk immutable card/config revisions retrieved; see [sources](sources.md) |
| Format and licensing | Base exclusions, mixed NVIDIA quantization and distinct license references checked |
| Runtime evidence | SGLang compatibility merge belongs to v0.5.21 source; NVIDIA patched vLLM path documented; images not tested |
| Memory arithmetic | 69 × 96 × 128 × 128 × 4 = 434,110,464 bytes = 414 MiB; hypothetical FP8 weight comparison recomputed |
| Entire checkpoint tensor census | Not performed |
| Model weights | Not downloaded |
| GPU load / generation | Not performed |
| 8×B300 throughput / latency / memory | Not measured |
| Exact image digest and runtime dependencies | Not downloaded or validated |
| Application correctness and quality | Regression cases below remain to be run |

## Model-specific regression cases

Sweep target-only versus 3/5/7-token drafting with fixed client sampling on real coding and multi-turn prompts. Measure draft/verification cost, accepted tokens, state-pool capacity, TTFT and tail token latency. Compare 16K/64K/128K before 1M; test rejection rollback, cancellation, prefix reuse and eviction. Preserve the model-required reasoning and tool history.

## Remaining uncertainty

Exact OEM topology; all-FP8 artifact availability; image/kernel/patch provenance; usable long-context concurrency; native-versus-NVFP4 quality; natural DSpark acceptance. Inferact’s peak card also needs clarification of its hardware-count versus TP16 wording.

Use the [benchmark protocol](../../../benchmarks/PROTOCOL.md) and [result schema](../../../benchmarks/result.schema.json). Empty results mean not measured. Retain failures and the conditions that produced them alongside performance data.
