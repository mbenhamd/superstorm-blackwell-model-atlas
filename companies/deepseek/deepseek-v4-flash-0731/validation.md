# DeepSeek V4 Flash 0731: validation ledger

Metadata and source audit repeated on 2026-10-15 (UTC). Base revision: `7872f01b1d1fe23eabc4c98b48bffcef5a386062`.

| Check | Evidence obtained |
| --- | --- |
| Publisher identity and exact repository | Immutable card and config retrieved successfully; revision resolved through Hugging Face API |
| Curated architecture fields | Compared with pinned source fields; publisher headlines distinguished from config extractions |
| Reference inference | Full compression schedule and three DSpark stages checked against immutable config and source; top-level nextn metadata differs |
| Format and licensing | FP4 expert/group32 scaling distinguished from FP8/block128; MIT file and card scope checked |
| Runtime evidence | Exact 0731 paths documented by both engines; SGLang reports TP4 on 4×GB300/v0.5.16; local eight-GPU profiles untested |
| Parameter accounting | 284B preview-family and 304B 0731 cookbook headlines are not reconciled into an exact tensor count |
| Entire checkpoint tensor census | Not performed |
| Model weights | Not downloaded |
| GPU load / generation | Not performed |
| 8×B300 throughput / latency / memory | Not measured |
| Exact image digest and runtime dependencies | Not downloaded or validated |
| Application correctness and quality | Regression cases below remain to be run |

## Model-specific regression cases

Compare target-only with bundled DSpark using identical prompts and sampling. Test four-GPU versus eight-GPU layouts, cache precision and 16K/64K/128K prompts. Check reasoning fields, tool calls, streaming, EOS and state after cancellation. Validate parser names for each engine. Qualify requests beyond the local 64K cap separately, including high/max effort output budgets.

## Remaining uncertainty

Exact main-plus-draft parameter accounting; selected image and kernel provenance; local B300 capacity, throughput and application correctness; qualification of eight-GPU adaptations.

Use the [benchmark protocol](../../../benchmarks/PROTOCOL.md) and [result schema](../../../benchmarks/result.schema.json). Empty results mean not measured. Retain failures and the conditions that produced them alongside performance data.
