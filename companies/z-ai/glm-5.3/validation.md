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

## Decision and prerequisites

**Proposed campaign; no GPU results.** Determine whether an exact NVFP4 export or a different topology improves eight-GPU service capacity while preserving instruction following, coding and long-context retrieval. GLM 5.3 combines MLA with sparse history selection and a large resident MoE; it does not use Flash's KDA recurrent state. Its 2,048-token index budget and selection reuse across layers motivate sparse-cache checks, while its separate MTP layer requires its own load and verification checks. [Architecture](architecture.md), [glm-5.3-CFG](https://huggingface.co/zai-org/GLM-5.3/raw/ba32f8c19c8738e2c57c71798c601d477a7bf844/config.json).

Planning evidence was refreshed on 2026-10-15 UTC (October 16 in Paris). Current publisher card/config bytes match the pinned base revision, and current repository revisions match the four artifacts in [model.json](model.json). This refresh does not qualify an engine image. Copy the [experiment manifest](../../../benchmarks/experiment.template.json), retaining the profile's candidate/probe status, and complete the image, tokenizer/template, effective cache dtype, hardware and workload fields before execution.

| Starting arm | Applicability gate |
| --- | --- |
| [vLLM FP8 TP8](../../../profiles/glm-5.3.fp8.vllm.baseline.json) | First target-only baseline; confirm model registration, selected MLA/DSA kernels and effective FP8 KV. Record load, warmup and graph-capture peaks on every rank. |
| [SGLang FP8 TP8](../../../profiles/glm-5.3.fp8.sglang.baseline.json) | Compatibility probe. Qualify its reasoning/tool parsers and align effective KV precision before interpreting an engine difference. |
| [RedHat NVFP4 TP8](../../../profiles/glm-5.3.nvfp4.vllm.baseline.json) | Its KV dtype is automatic in the stored profile. Establish a supported matching KV setting first; otherwise label the comparison as a complete configuration change, not a weight-precision effect. |
| Inferact NVFP4; official BF16 | Separate artifacts from [precision](precision.md), without supplied launch profiles. Create and qualify distinct run manifests. A successful RedHat load does not qualify ModelOpt, and casting FP8 weights to BF16 does not create the BF16 reference. |

Keep `reasoning_effort` and `clear_thinking` explicit. The publisher specifies `max` for benchmark reproduction and recommends `clear_thinking=true` for chat. A service experiment with lower effort is a separate quality/latency decision. Retain the serialized conversation and record reasoning tokens, final-answer tokens and time to first final answer; early reasoning output alone does not establish responsive answers. [glm-5.3-CARD](https://huggingface.co/zai-org/GLM-5.3/raw/ba32f8c19c8738e2c57c71798c601d477a7bf844/README.md).

## Quality workloads and why they belong

Apply the [shared benchmark selection and evaluation rules](../../../benchmarks/MODEL-BENCHMARKS.md), including frozen item/scorer identities, paired quality uncertainty and answer-retaining evaluation. Start coding checks with its EvalPlus functional screen, then a frozen LiveCodeBench release/date range; these scored code-generation tests precede the more expensive repository-agent campaign below. Report pass@1, execution failures and evaluator timeouts with identical language/runtime and output budgets across exports.

| Workload | Proposed evaluation and rationale | Evidence boundary |
| --- | --- | --- |
| Instruction constraints | Run the pinned IFEval dataset/evaluator; retain prompt-level strict accuracy as the primary metric and per-instruction failure categories. Use the same response-field extraction, template and sampling for every export. | RedHat reports 85.70% versus 89.77% for its local FP8 baseline, a 4.07 percentage-point gap. Its B200 results motivate this gate; they are not reproduced B300 scores or an allowable regression. [glm-5.3-NV](https://huggingface.co/RedHatAI/GLM-5.3-NVFP4/raw/c8917e4258572c405575855ff53effe58c17a38e/README.md), [MBENCH-IFEVAL](https://raw.githubusercontent.com/google-research/google-research/master/instruction_following_eval/README.md). |
| Sparse-history retrieval | Use RULER v1 retrieval, variable tracking and aggregation tasks with a fixed tokenizer, seeds and generated payload hashes. Report each task/length and add held-out application document questions. This exercises distractors and distributed evidence beyond a single easy needle. | Pin the current `rulerv1-ns` pipeline and its NeMo-Skills dependency; the old main-branch runner is deprecated. Synthetic scores do not establish application accuracy or native 1M-context usability. [MBENCH-RULER-V1](https://raw.githubusercontent.com/NVIDIA/RULER/rulerv1-ns/README.md), [MBENCH-RULER](https://github.com/NVIDIA/RULER). |
| Coding deployment, if required | Use SWE-bench Verified with a frozen agent harness, task images, tool permissions, turn/token/time budgets and evaluator. Screen on a declared development subset; use an untouched evaluation set for promotion. Report resolved tasks, invalid patches, tool failures and task wall time. | This is an independent application evaluation, not reproduction of the publisher's Terminal-Bench, DeepSWE or in-house scores. Those use different harnesses and budgets. [MBENCH-SWEBENCH](https://www.swebench.com/SWE-bench/). |
| Application protocol | Freeze English/Chinese multi-turn prompts, nested JSON/tool arguments, stop strings and tool-result follow-ups with known expected outcomes. Score schema validity and semantic argument correctness separately. | Parser success is distinct from task success. Retain both raw generated text and parsed responses so parser changes cannot hide quality regressions. |

Quality runs need enough output budget to reach a final answer. Record truncation as a failure category; do not use a 128-token shape probe as a reasoning-quality score. Public datasets may have appeared in training, so they complement the held-out application set.

## Ordered experiments

| ID | Controlled comparison and mechanism | Measurements and decision |
| --- | --- | --- |
| G53-01: exact load | Qualify FP8 target-only on each engine's stable build, then a pinned candidate build with the same topology and payloads. Audit the stored main/MTP checkpoint inventory separately from resident target tensors, documented loader exclusions, repacking and kernel selection. Intentional omission of draft tensors is valid for target-only serving. | Retain readiness time, per-rank resident/peak memory, effective dtypes, finite-output and parser checks. Missing required target tensors, unexplained fallback or correctness failures block timing comparisons. Require MTP residency and precision checks when qualifying the speculative arm in G53-05. |
| G53-02: export quality | On one qualified engine/build and TP8 layout, compare official FP8 with RedHat NVFP4, then Inferact NVFP4 independently. Hold cache precision and sampling fixed. Add the exact BF16 reference only after a separate memory/load gate. | Produce paired quality deltas and failure categories, startup memory and useful throughput. Similar export sizes do not establish equal calibration. Promote an export only if every required quality gate passes. |
| G53-03: DSA/cache correctness | Keep the model's index budget and layer-reuse settings fixed. Compare a fresh request with the identical logical request after prefix reuse, unrelated-session interleaving, eviction and cancellation. Probe actual backend block/chunk boundaries and histories both below and above the 2,048 selection budget; move required evidence from start to middle to end. | Retain retrieval scores by evidence position, cache/indexer allocation and available reuse counters, TTFT and errors. A stale answer after eviction or cancellation is a correctness failure, even if aggregate throughput rises. Index-selection reuse is across layers, not a four-token chunking rule. |
| G53-04: node capacity | After NVFP4 TP8 passes, qualify TP4 separately, then two disjoint TP4 replicas against one TP8 group using the same eight GPUs, router and offered traffic. Hold export/cache settings fixed; confirm memory headroom at the intended load. | Report whole-node goodput, latency tails, rank imbalance, communication time and peak memory. Count both replicas and routing overhead. A single TP4 process's throughput is not an eight-GPU comparison. |
| G53-05: native MTP | Start with the [FP8 MTP candidate](../../../profiles/glm-5.3.fp8.vllm.mtp.json); compare speculation off with supported depths 1/3/5 on the same build, topology and sampling. Qualify MTP tensor loading, scales and effective precision for each pairing; MTP is excluded from the NVFP4 main-expert quantization scope. | Record natural accepted tokens per proposal/verification step, draft and verification cost, rollback/stop behavior, memory and task quality. Measure low load and saturation; a batch-one latency gain does not establish a throughput gain. |

The inspected vLLM load path explicitly skips MTP/nextn layers in the target model and delegates them to the MTP model. Preserve that distinction in both memory inventories and failure rules; check the registered load path again for the actual image. [MBENCH-GLM53-TARGET-LOADER](https://raw.githubusercontent.com/vllm-project/vllm/f8460ef23659afd69046a81529ec2295e4c3f686/vllm/models/deepseek_v32/nvidia/model.py).

For service measurements, use complete serialized input buckets of 4,096, 16,384, 32,768 and 61,440 tokens with output caps of 128 and 1,024; add a 4,096-input/8,192-output coding or reasoning trace. These are proposed shapes within the current 65,536 cap, not forced answer lengths. Count reasoning and template tokens. Raising the cap toward the native maximum is a separate capacity/accuracy experiment. Screen at concurrency 1 and 8, then 32 and a fixed offered-rate ladder from a pilot; include mixed lengths and burst/recovery traffic. Record achieved lengths, EOS and length-capped responses separately.

## Required outputs and promotion

Produce one manifest per arm, raw request/response records, quality scores by task/length, load and steady-state memory per rank, profiler evidence for claimed bottlenecks, and a paired decision table. Use the [protocol](../../../benchmarks/PROTOCOL.md) for warmup, randomized repeated A/B runs, uncertainty, errors and goodput. The [result schema](../../../benchmarks/result.schema.json) covers the lightweight client's fields; it does not replace the quality and profiler artifacts.

Before running, declare the minimum quality, maximum regression, latency/error budgets, memory reserve and minimum useful improvement. Reject any correctness failure or unmet quality gate. An improvement whose uncertainty crosses the declared useful threshold is inconclusive. If the BF16 reference cannot qualify, state that the result establishes compatibility relative to the official FP8 baseline only. Empty results remain unmeasured, and failed requests stay in the denominator.
