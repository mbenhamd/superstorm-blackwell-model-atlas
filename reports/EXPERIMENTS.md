# Experiment roadmap: stable engines, main and nightly

This is a **planned experiment program**, with no GPU results yet. It turns the current [vLLM](../frameworks/vllm/EXPERIMENTS.md), [SGLang](../frameworks/sglang/EXPERIMENTS.md) and [KServe](../frameworks/kserve/EXPERIMENTS.md) research into an order of work on the eight-GPU B300 baseline. Feature details and primary citations live in those engine pages; the [nightly report](nightly-readiness.md) identifies the observed source and artifact versions.

## What each comparison can tell us

| Comparison | Hold fixed | What a result would support |
| --- | --- | --- |
| Stable A versus pinned nightly B, same engine | Exact checkpoint, workload, effective precision, topology and service objective | Whether the complete candidate build improves this workload. Different bundled dependencies prevent attributing the change to one PR. |
| Candidate build with feature off versus on | Same build and all other effective settings | Whether that feature helps within its supported combinations. Record any settings it automatically changes. |
| vLLM versus SGLang | Checkpoint/export, tokenized request content, hardware budget, quality and latency requirements | Which complete serving configuration meets this application's needs. Engines need not use identically named kernels or identical scheduling defaults. |
| Direct engine versus KServe-managed endpoint | Engine image, model, replicas, request payloads and resource allocation | Added routing/lifecycle cost or benefit. Keep gateway behavior separate from numerical-engine behavior. |

Start with one fixed-configuration comparison, then tune each engine within the same hardware and objective. Report both results. This separates an upgrade regression from the best configuration found under an explicitly equal tuning budget. A winner found for 4K coding prompts is not a winner for 64K document work.

## Sequence the work

| ID | Experiment and hypothesis | Change deliberately | Observe and decide |
| --- | --- | --- | --- |
| X01 | **Artifact and load qualification.** A stable or nightly build can load the exact export and select the intended execution path. | Stable and one pinned candidate build, target-only, short context, low load | Record import/load/warmup failures, actual kernels, effective dtypes and peak memory. Stop on fallback surprises or incorrect output before comparing speed. |
| X02 | **Precision and quality.** Lower weight or cache precision can create useful capacity while meeting the quality threshold. | Weight export first; KV dtype in a separate comparison; state precision only where explicitly supported | Hold evaluation data and sampling fixed. Record quality deltas, failure categories and memory at load and steady state. A different export is a different artifact with its own revision. |
| X03 | **Cache and hybrid-state correctness.** Prefix reuse saves prefill without stale state or excess pool pressure. | Cold, repeated-prefix and evicted-prefix requests; cache feature off/on where supported | Compare first-answer/TTFT, reuse counters, recurrent/KV allocation, eviction, cancellation and subsequent answers. Interleave unrelated sessions and differing images/tools. |
| X04 | **Scheduling and graphs.** Admission and prefill policies trade queueing against decode interference. | One supported scheduling knob at a time; graph policy separately | Replay a mixed short/long trace. Measure offered/completed load, queue delay, TTFT, TPOT, errors and SLO goodput. Check that the load generator is not the bottleneck. |
| X05 | **Node-wide parallelism.** Communication savings can outweigh larger per-worker batches or replica count. | Supported TP/DP/EP arrangements within the same eight-GPU budget | Report whole-node goodput, per-request tails, expert imbalance/communication time and memory. Count all replicas and router resources. Do not compare eight replicas against a single worker as equal-resource results. |
| X06 | **Natural speculation.** Accepted draft work can reduce latency after paying draft, verification and state-management costs. | Target-only versus the supported MTP/DSpark path; then supported draft depth | Record acceptance definition and distribution, target/draft work, memory and quality at both low and high load. Reject synthetic acceptance and fake KV runs as service evidence. |
| X07 | **Startup and recovery.** A supported warm-weight or cache mechanism may shorten recovery but retain resources. | Ordinary restart versus the documented mechanism, same checkpoint and build | Separate image fetch, storage read, deserialization/repacking, compilation, graph capture and readiness. Measure time to first correct response and retained GPU/host memory. Test model-version replacement. |
| X08 | **Prefill/decode separation.** Isolation may improve tail latency enough to pay transfer and routing costs. | Colocated service versus a supported split with the same total GPU budget | Include KV and required recurrent-state transfer, fabric traffic, router overhead, failures and placement. Proceed only when the exact architecture/connector combination is documented and qualifies. |
| X09 | **Service lifecycle.** KServe routing and scaling can sustain the qualified engine under variable load. | Add one control-plane capability at a time after a direct-engine baseline | Measure gateway overhead, cold starts, burst recovery, cache locality, drain/cancellation and rollback. Treat multi-node expansion as a separate hardware experiment. |

X01 is a prerequisite for every other row. X02 and X03 gate performance claims; X06 follows a target-only baseline. X08 is optional, after X04/X05 identify the bottleneck. X09 uses a qualified engine image. These are proposed engineering gates, not upstream guarantees.

## Which model to use first

The [model benchmark guide](../benchmarks/MODEL-BENCHMARKS.md) maps every family to specific quality campaigns and explains the remaining evaluator work. Its linked family validation plans supply matched controls and decision gates; the rows below provide only the campaign entry points.

| Atlas family | Useful first question | Existing starting point and limit |
| --- | --- | --- |
| Qwen 3.8 27B | Can a small hybrid target expose state/cache/scheduling regressions cheaply, then scale by replication? | [BF16 vLLM profile](../profiles/qwen3.8-27b.bf16.vllm.baseline.json), [BF16 SGLang profile](../profiles/qwen3.8-27b.bf16.sglang.baseline.json); compare the exact FP8/NVFP4 exports only after baseline quality. |
| Gemma 4 31B IT | How do export precision, multimodal processing and replicas change latency and quality? | [BF16 vLLM](../profiles/gemma-4-31b-it.bf16.vllm.baseline.json), [SGLang NVFP4 probe](../profiles/gemma-4-31b-it.nvfp4.sglang.baseline.json); a speculative feature mentioning another Gemma variant does not qualify this checkpoint or supply a matching drafter. |
| GLM 5.3 Flash | Do sparse/hybrid state and speculative changes preserve long-context correctness? | [SGLang target-only](../profiles/glm-5.3-flash.fp8.sglang.baseline.json), [MTP candidate](../profiles/glm-5.3-flash.fp8.sglang.mtp.json), [vLLM FP8](../profiles/glm-5.3-flash.fp8.vllm.baseline.json). |
| GLM 5.3 | Can precision or communication changes improve useful capacity for the large target? | [vLLM FP8](../profiles/glm-5.3.fp8.vllm.baseline.json), [NVFP4](../profiles/glm-5.3.nvfp4.vllm.baseline.json), [SGLang FP8](../profiles/glm-5.3.fp8.sglang.baseline.json); align effective KV dtype before attributing a difference to weights. |
| Qwen 3.8 Flash Next | Are PLE/ngram memory, mixed MTP tensors and sparse attention handled correctly? | [vLLM TP8](../profiles/qwen3.8-flash-next.nvfp4.vllm.baseline.json), [SGLang documented TP1 probe](../profiles/qwen3.8-flash-next.nvfp4.sglang.baseline.json); first qualify each, then compare equal node budgets. |
| Kimi K3 | Which exact target/drafter and mixed-precision path qualifies before speculation? | [Native vLLM](../profiles/kimi-k3.native.vllm.baseline.json), [NVFP4 SGLang](../profiles/kimi-k3.nvfp4.sglang.baseline.json), [SGLang DSpark](../profiles/kimi-k3.nvfp4.sglang.dspark.json); the generic vLLM NVFP4 path remains subject to its existing block. |
| DeepSeek V4 Flash 0731 | How do DP/EP and DSpark behave for the July-31 architecture? | [vLLM EP4](../profiles/deepseek-v4-flash-0731.native.vllm.ep4.json), [local SGLang TP8 target-only probe](../profiles/deepseek-v4-flash-0731.native.sglang.baseline.json); the publisher TP4 + DSpark route is a distinct experiment described in the [serving report](../companies/deepseek/deepseek-v4-flash-0731/serving.md). V4.1-specific improvements cannot be assumed to apply. |
| Mistral Medium 3.5 | Is lower TP or more replication useful after the publisher topology qualifies? | [vLLM TP8](../profiles/mistral-medium-3.5.fp8.vllm.baseline.json), [TP2 probe](../profiles/mistral-medium-3.5.fp8.vllm.tp2-probe.json), [SGLang](../profiles/mistral-medium-3.5.fp8.sglang.baseline.json). |

Profile names are lookup aids; their `status`, notes and launch gates still apply. This roadmap creates no additional supported configuration and does not remove any blocked/probe status.

For a first campaign, qualify Qwen 3.8 27B BF16 on one GPU with each engine's stable build, then its pinned candidate. Use that manageable target for the shared client, cache, cancellation and scheduler checks. Next use GLM Flash for the model-specific hybrid/MTP questions, and a qualified large MoE for communication experiments. Bring Kimi NVFP4 forward when its exact mixed-format compatibility is the deployment decision. Add KServe using an already qualified small-model service before introducing distributed topology. This order is a proposed way to reduce debugging cost, not a claim that one model predicts another's performance.

## Workloads and measurement design

Use three workload classes: interactive short input/output; long input with short answers; and long generation such as coding or reasoning. Add the real application trace, tool/JSON requests and image workloads only for supported models. Keep a separate held-out quality set. Generated random tokens are useful for shape/capacity experiments but do not establish application quality or realistic speculative acceptance.

Choose from the protocol's 4K/16K/32K/64K input buckets only where the complete serialized input, including chat-template and image tokens, plus the requested output fits the actual profile and model context limits. A 32K cap does not admit a 32K input plus generation. Reduce or skip infeasible points; raising a context cap is a separate capacity and accuracy experiment. Screen at concurrency 1 and 8 before larger queues. For saturation, choose a fixed offered request-rate ladder from a pilot and reuse it across A/B runs; include a mixed workload and a burst/recovery trace. Record client queueing when a concurrency cap prevents the intended arrivals from reaching the service.

Warm up explicitly, then randomize A/B order and repeat independently. Three runs can screen candidates; use more repetitions and enough requests to characterize tails before promotion. Publish sample counts and run-to-run variation; a handful of requests cannot establish reliable p99 latency. Retain every failed run and distinguish setup failures from timed service failures. Do not average p99 values and present the result as a pooled p99.

The current vLLM benchmark CLI exposes arrival-rate controls, percentile selection and latency-budget goodput options. SGLang's serving harness supports both its native endpoint and OpenAI-compatible backends. Their defaults and token accounting differ, so use the same frozen client/payload path for the principal cross-engine comparison and native tools for diagnosis. Inspect the installed build's help before choosing arguments; these are mutable documentation observations. [XEXP-VBENCH](https://docs.vllm.ai/en/latest/cli/bench/serve/), [XEXP-GBENCH](https://docs.sglang.io/developer_guide/bench_serving.html).

Only after a pinned environment is prepared, inspect its available interfaces:

```bash
vllm bench serve --help
python -m sglang.bench_serving --help
```

The atlas [streaming client](../benchmarks/PROTOCOL.md) is useful for completion/error behavior and a shared client view. It is closed-loop and does not supply an open-loop saturation trace, exact token emission timing or a quality evaluator. Native counters should be reconciled with endpoint usage and tokenizer identity rather than silently mixed.

SGLang documents `--fake-prefill` as locally generated fake KV for a decode-only microbenchmark. Keep such results explicitly separate from end-to-end, quality, transfer and speculation claims. Similarly, an engine-reported acceptance average needs its denominator and observation interval; a cumulative server counter can contain earlier runs. [XEXP-GBENCH](https://docs.sglang.io/developer_guide/bench_serving.html).

## Record each run before executing it

Copy [experiment.template.json](../benchmarks/experiment.template.json) into the operator's run directory. It is a documentation template, **not an executable launch profile** and not consumed by the launcher or benchmark client. Null values are unresolved inputs or unmeasured results, never zero. Fill every applicable identity, control and promotion threshold before a run; mark inapplicable fields with a written reason. Keep credentials out of the record.

Retain the full resolved command and only relevant, nonsecret environment settings; effective backend/graph/dtype diagnostics; model/drafter/tokenizer revisions; image manifest and architecture-specific digest or verified wheel hash; dependency/build versions; node inventory and topology; workload/payload hashes; raw measurements; quality outputs; server logs; and a decision with failure reasons. A release tag, main SHA and nightly tag are three distinct identities.

Predeclare the minimum quality score, permitted quality regression, latency budgets, error budget, minimum useful goodput improvement, capacity margin and analysis method. Specify how repetitions are paired or aggregated and how uncertainty is estimated. The template supplies no invented business SLA. Promote only a configuration that meets those requirements across repeated runs, including cancellation, eviction and recovery. Compare uncertainty in the baseline-to-candidate improvement with the predeclared useful-improvement threshold: an interval that straddles that threshold is inconclusive; an interval entirely below it fails the improvement requirement. Overlap between raw run ranges alone does not decide this comparison. Retain the baseline artifact for rollback.

## Deliverables

For each completed experiment produce a filled manifest, raw per-request records, quality report and a short decision table: baseline versus candidate, hardware consumed, quality, goodput under the declared SLO, latency tails, peak memory, errors, and startup/recovery where relevant. Explain why a candidate wins or fails for that workload. The engine pages describe the specific current changes worth testing; none of the planned rows is a measured result.
