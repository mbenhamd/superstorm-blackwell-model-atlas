# vLLM experiments for one 8×B300 node

**Status: designed, not executed.** These experiments use the [fresh source review](SOURCE_REVIEW.md), the atlas's immutable checkpoint records and its existing [launch candidates](../../profiles/INDEX.md). They propose measurements on the actual node; no throughput, accuracy, memory-fit or image-compatibility result is implied.

Use the [cross-engine roadmap](../../reports/EXPERIMENTS.md) to choose the next experiment and the [experiment manifest template](../../benchmarks/experiment.template.json) to record its control, candidate, gates and results.

## Common controls and decision rule

Record the engine source commit **and** artifact checksum/image digest; CUDA, driver, PyTorch, FlashInfer, DeepGEMM and NCCL versions; model/export/drafter revisions; actual GPU topology; resolved arguments; kernel selection; and every workload/cache setting. Use the same tokenizer, chat template, reasoning budget, sampling, parser, payload hashes and CPU allocation across an A/B pair. The observed v0.31.0 tag, current-main commit and nightly index point to different artifacts; see the [version ledger](SOURCE_REVIEW.md#stable-main-and-nightly-are-separate-observations).

Declare the application's quality threshold and p95/p99 latency budgets before measuring. Primary outcome is **whole-node goodput meeting those budgets**, with successful output tokens per second, TTFT, generation latency, memory and errors reported alongside it. A lower median with worse tail latency can lose this decision. Keep offered load and failed requests in the denominator. SSE chunk gaps are not exact token latency; use server traces for kernel and token timings. Follow the full [benchmark protocol](../../benchmarks/PROTOCOL.md).

Use a staged workload: tokenized inputs of 4,096, 16,384, 32,768 and 61,440 tokens, with 128 or 1,024 requested output tokens, where the checkpoint and application support them. Count templates, images, reasoning and output against the configured context cap; shorten cells that would exceed it. Start at concurrency 1, then 8 and 32, then the measured saturation region. Add a controlled arrival trace for queueing, since the bundled HTTP probe is closed-loop. Interleave at least three independent A/B repetitions and report dispersion and all failures. Increase repetitions when uncertainty is material to the decision.

For every experiment, hard failures include nonfinite outputs, invalid supported protocol responses, incorrect cache/state reuse, OOM, hangs and unrecovered rank failure. Quality is evaluated on representative held-out tasks, including tool/JSON and multilingual cases where needed. Set the allowable quality change before the run. A failed or unsupported cell is a result with a reason; it is never silently removed from the comparison.

## Coverage and order

| Model family | Start from | Highest-value follow-ups after V01 |
| --- | --- | --- |
| Kimi K3 | [Native TP8 candidate](../../profiles/kimi-k3.native.vllm.baseline.json); evaluate the patched NVIDIA export as a distinct artifact | V02 mixed-format dispatch, V03 hybrid state, V05 qualified drafter, V10 startup residency |
| GLM 5.3 | [FP8 TP8 baseline](../../profiles/glm-5.3.fp8.vllm.baseline.json), then [MTP5](../../profiles/glm-5.3.fp8.vllm.mtp.json) | V02 FP8/NVFP4 quality, V07 metadata, V08 topology |
| GLM 5.3 Flash | [FP8 baseline](../../profiles/glm-5.3-flash.fp8.vllm.baseline.json) | V03 state, V05 MTP, V08 two TP4 groups, V09 4+4 prefill/decode |
| DeepSeek V4 Flash 0731 | [Four-GPU TP1/DP4+EP](../../profiles/deepseek-v4-flash-0731.native.vllm.ep4.json), then [bundled DSpark](../../profiles/deepseek-v4-flash-0731.native.vllm.dspark.json) | V04/V05 draft budgeting and correctness, V08 eight-GPU adaptation |
| Qwen 3.8 27B | [BF16 TP1](../../profiles/qwen3.8-27b.bf16.vllm.baseline.json) | V02 precision, V03 state if the selected backend uses that path, V04 low-concurrency overhead, V08 replicas |
| Qwen 3.8 Flash Next | [NVIDIA TP8 baseline](../../profiles/qwen3.8-flash-next.nvfp4.vllm.baseline.json), then [one-token MTP with EP](../../profiles/qwen3.8-flash-next.nvfp4.vllm.mtp.json) | V03 state, V06 draft head, V08 topology after full checkpoint load accounting |
| Gemma 4 31B IT | [BF16 TP1](../../profiles/gemma-4-31b-it.bf16.vllm.baseline.json) | V02 precision, V04 graph/batch behavior, V08 replicas, V10 restart; V06 excludes Gemma 4 MTP |
| Mistral Medium 3.5 | [Publisher-derived TP8 baseline](../../profiles/mistral-medium-3.5.fp8.vllm.baseline.json), then [TP2 probe](../../profiles/mistral-medium-3.5.fp8.vllm.tp2-probe.json) | V04 mixed prefill/decode, V08 shard-versus-replica capacity, V10 restart |

The table selects experiments from existing model reports. It does not establish that every family reaches every generic vLLM kernel. Runtime class, dtype and backend evidence decide applicability.

## V01 — qualify stable and a pinned candidate

**Question:** Does the newer artifact correctly serve the exact checkpoint, and does it improve a relevant outcome?

**Arms:** v0.31.0 with a captured image digest versus one captured main/nightly artifact, initially target-only with the same topology and workload. Start with a TP1 model to exercise the process, then qualify each intended checkpoint separately. An unsupported stable checkpoint is a compatibility result; use a separately qualified reference for quality and do not manufacture an A/B speed ratio.

**Measure:** Load, repacking, memory profiling, JIT/autotune, graph capture, first successful request and steady-state time separately. Record peak memory per GPU, resolved caches/backends, post-warmup goodput and parser/quality results. Repeated startup near the selected memory budget also checks the cuBLAS handle change. Its merged implementation allocates handles before the initial memory snapshot. [VEXP-DIFF-61044](https://github.com/vllm-project/vllm/commit/9cede34a674c392092134e34218b127d6bbb3679.diff)

**Gate:** A source identity or successful health check does not pass model correctness. Require a loaded full checkpoint, valid canary requests and all common quality/failure gates. A stable-versus-main difference includes every changed dependency and default. To attribute a gain to a specific PR, add an isolated parent-versus-merge build pair with the same dependencies and configuration, and record any unavoidable dependency change.

## V02 — precision and actual kernel dispatch

**Question:** Does the chosen export/backend trade acceptable quality for more useful node capacity or lower latency?

**Arms:** Compare the catalogued BF16/FP8/NVFP4 exports available for the family, target-only and with matched effective KV/state precision. Hold topology fixed first. For a given export, separately compare only backends that support its exact weight layout, scaling and activation. Each export is a distinct checkpoint treatment; changing export and backend together cannot isolate either effect.

**Measure:** Peak load/repacking memory, resident weights and workspaces, cache capacity, kernel names, routing/attention/GEMM time, quality, TTFT and goodput. Include both small batches and long prefills. A smaller file can still require a larger temporary allocation or a slower kernel for the relevant shape.

**Gate:** Verify the mixed module dtypes rather than labeling the whole checkpoint “4-bit.” Keep Kimi's ModelOpt attention fix and patched-container identity explicit. Treat the new MegaMoE NVFP4 row as a **kernel integration research candidate** until an exact model caller exists: the inspected change retains MXFP4 callers and accepts only SwiGLU for the NVFP4 row. The source's activation guard rules out inferring Kimi SiTU support from that row. [VEXP-52406](https://github.com/vllm-project/vllm/pull/52406) [VEXP-SRC-MEGA](https://github.com/vllm-project/vllm/blob/784d1fff0c491b9add10ecd732de8f707a7e7dbe/vllm/model_executor/layers/fused_moe/deep_gemm_mega_moe.py#L126)

## V03 — hybrid prefix reuse and recurrent-state boundaries

**Question:** Does shared-prefix caching reduce repeated-prefill work while preserving the correct recurrent state under churn?

**Arms:** On one qualified artifact, compare cache disabled, a cold cache and a warmed shared prefix. Then vary the supported shared-checkpoint setting while keeping memory and workload fixed. Use workload cohorts with 0%, 50% and 90% shared input prefixes; replay identical cohorts in each arm. Start target-only; add speculation only after state correctness passes. The current stable option is `--enable-mamba-shared-prefix-checkpoint`; check its effective value on the selected binary. [VEXP-REL](https://github.com/vllm-project/vllm/releases/tag/v0.31.0)

**Measure:** Prefix hit tokens, actual recomputed tokens, state/checkpoint allocations, evictions, TTFT and tail goodput. Inspect a trace to determine whether the fused align-mode gather is used. To isolate that change, compare its parent/merge source under the same cache mode; an absent call is “not applicable.” The upstream result concerns an isolated kernel on MI355X. [VEXP-58737](https://github.com/vllm-project/vllm/pull/58737)

**Gate:** Use prefix lengths one token before, at and after the resolved block/checkpoint boundary. Force divergence after a shared prefix, eviction, cancellation, request reorder and small/large batch transitions. Compare each continuation with a fresh uncached execution. A high attention-cache hit rate cannot establish recurrent-state correctness. Include non-contiguous block-table views in the kernel qualification; the inspected implementation explicitly handles both strides. [VEXP-SRC-STATE](https://github.com/vllm-project/vllm/blob/784d1fff0c491b9add10ecd732de8f707a7e7dbe/vllm/v1/attention/backends/utils.py#L1167)

## V04 — admission, mixed workloads and CUDA graphs

**Question:** Which scheduling budget meets the declared tail-latency goal, and does graph replay improve it enough to justify its memory/startup cost?

**Arms:** Sweep `--max-num-batched-tokens` through 2,048, 8,192 and 16,384 after memory qualification, holding the sequence cap fixed. Then sweep active-request admission separately, using the supported `--max-num-active-seqs` control. Compare a homogeneous decode cohort with a fixed mixed trace containing short interactive requests and long prefills. The smaller budget can reduce decode interference while making prefills wait longer. [VEXP-OPT](https://docs.vllm.ai/en/latest/configuration/optimization/) [VEXP-REL](https://github.com/vllm-project/vllm/releases/tag/v0.31.0)

For the graph comparison, keep compilation/warmup settings fixed and compare resolved `NONE` with supported captured modes such as `FULL_DECODE_ONLY` or `FULL_AND_PIECEWISE`. Record fallback and padded batch sizes. `--enforce-eager` changes more than graph replay, so label that as a separate debug/startup arm. [VEXP-GRAPH](https://docs.vllm.ai/en/latest/design/cuda_graphs/)

**Measure and gate:** Track queue depth/time, running requests, preemptions/recomputation, graph memory/capture time, launch overhead, p99 generation latency and goodput. Exercise batch sizes immediately around captured sizes and transitions between prefill and decode. Reject stale replay outputs and memory failures. For DSpark, add a small-budget stress cell only after V05 passes, record the resolved draft-buffer request cap, and avoid interpreting the new admission rule as unlimited concurrency. [VEXP-DIFF-59468](https://github.com/vllm-project/vllm/commit/7cd7982dfda0d29c68f73c54cd343b674b290a47.diff)

## V05 — speculation must remain correct and pay for itself

**Question:** At what load and prompt type does natural speculative acceptance improve service goodput?

**Arms:** Target-only versus the exact model's qualified DSpark/MTP path on the same artifact and GPUs. DeepSeek 0731 starts from the bundled-DSpark profile; GLM 5.3 starts from MTP5; Qwen Flash Next starts from its one-token MTP profile. Treat other proposal depths, verification policies and greedy/probabilistic drafting as separate supported settings. Preserve the target sampler throughout a pair. No simulated-acceptance environment or config is admissible.

**Measure:** Accepted draft tokens, proposed tokens, verification steps, effective proposal lengths, drafting/verification time, memory and queueing. Compute acceptance with explicit denominators: mean emitted tokens per verification step includes the bonus token, whereas accepted draft tokens do not. The documented per-request metrics can be reconciled with aggregate counters for an all-`n=1` workload; verify their schema on the pinned binary. [VEXP-ACCEPT](https://docs.vllm.ai/en/latest/features/speculative_decoding/acceptance_metrics/)

**Gate:** Qualify the post-#61161 sampling behavior with repeated verification rounds and the upstream distribution regression, then the model's held-out quality workload. A stochastic output-string change across versions alone is not a quality failure; reuse of conditioned random draws can bias the distribution. Cover seed replay within one configuration, reordered requests and split batches. [VEXP-61161](https://github.com/vllm-project/vllm/pull/61161)

For resumable **input** sessions, stop inside an accepted draft run using EOS, a stop token and output-length limits, then send another input chunk. Verify that every new chunk token is computed correctly under synchronous/asynchronous scheduling and after cancellation. This is the #58668 regression surface; a normal output-streaming smoke request does not cover it. Retain target-only as the reference for capacity and quality even if speculation wins concurrency 1. [VEXP-DIFF-58668](https://github.com/vllm-project/vllm/commit/d486219fc2f27a981d6eda53eb2b95bfde1a1d63.diff)

## V06 — quantize an eligible draft head without changing the target

**Question:** Does reducing output-head work in the drafter compensate for its extra memory and any acceptance change on B300?

**Arms:** On a build containing #59973, begin with Qwen Flash Next's qualified TP8/MTP1 configuration. Compare the unmodified shared head with `draft_lm_head_quantization` set to `fp8`, then `nvfp4`, inside the existing speculative-config object. Keep proposal depth, target/export, target sampler, graphs and kernel settings fixed. Increase proposal depth only in a later sweep. Require Model Runner V2 and a loader-confirmed eligible shared head; configuration acceptance alone is insufficient. [VEXP-59973](https://github.com/vllm-project/vllm/pull/59973)

**Mechanism:** The target retains its head for verification. The drafter gets a per-rank copy: FP8 uses weight/activation quantization, whereas this NVFP4 path uses W4A16. The selected kernel matters at small row counts. Inspect its name and shape rather than importing DGX Spark/GB10 speed ratios. [VEXP-SRC-DRAFTHEAD](https://github.com/vllm-project/vllm/blob/784d1fff0c491b9add10ecd732de8f707a7e7dbe/vllm/model_executor/layers/quantization/online/lm_head.py)

**Measure and gate:** Head time, total draft time, natural acceptance, added resident and peak-load memory, cache capacity and whole-node goodput at concurrency 1/8/32. Use multilingual and tool/JSON prompts to expose proposal changes. Run the V05 quality/state gates. If weight reload is part of the intended service, verify copy refresh with graph replay. Do not apply this option to DSpark, DFlash or Gemma 4 MTP: the inspected config excludes them. [VEXP-SRC-SPECCONFIG](https://github.com/vllm-project/vllm/blob/784d1fff0c491b9add10ecd732de8f707a7e7dbe/vllm/config/speculative.py#L1789)

## V07 — GLM sparse-MLA metadata update

**Question:** Does the recent in-place metadata change reduce measured draft overhead for the exact GLM deployment?

**Arms:** Isolate #61873 with equivalent builds immediately before and after its merge, using GLM 5.3 FP8 and MTP5. Start at the atlas TP8 layout. A TP4 follow-up is a separately qualified topology cell. Keep DCP and PCP equal to 1, HiSparse absent, and confirm that FlashInfer sparse MLA plus the metadata-update path are selected. Source guards deliberately exclude other combinations. [VEXP-DIFF-61873](https://github.com/vllm-project/vllm/commit/54d9b1cb487c2a2f12506942820f0ae443807093.diff)

**Measure:** CPU preparation, GPU metadata kernel time, draft-step time, natural acceptance and end-to-end goodput. Include concurrency 1, 8 and 32, mixed prompt lengths and graph batch transitions. The upstream PR reports a small Blackwell result on a narrow workload; interleaved repeated runs are needed to resolve an effect of that size locally. [VEXP-61873](https://github.com/vllm-project/vllm/pull/61873)

**Gate:** Check token-to-request mapping after reorder, preemption, cancellation, partial prefill and graph replay. Compare quality and acceptance against the control. Do not credit the change when the relevant backend/guard disables it. Extend to GLM Flash only after tracing its exact backend; the shared family name is not proof that the same path is active.

## V08 — allocate all eight GPUs fairly

**Question:** Does the workload benefit more from cooperating ranks or additional independently schedulable replicas?

| Candidate | Whole-node comparison, after each layout fits and passes correctness |
| --- | --- |
| Qwen 27B / Gemma 31B | Eight TP1 replicas vs four TP2 replicas vs two TP4 replicas |
| Mistral Medium | One TP8 instance vs two TP4 instances; four TP2 instances only after its capacity probe passes |
| GLM 5.3 NVFP4 / GLM Flash | One TP8 instance vs two TP4 instances of the same exact export |
| DeepSeek 0731 | Two independent copies of the four-GPU TP1/DP4+EP baseline vs one TP1/DP8+EP adaptation; record the single four-GPU baseline separately |

**Controls:** Match total GPUs, offered node load, routing policy, cache warmness and latency budgets. Record weights/attention replication as well as expert sharding. EP uses TP×DP ranks; it does not multiply that GPU count again. Test communication backends only after matching their dependency and topology requirements; multi-node-NVLink settings cannot be inferred from ordinary intra-node NVLink. [VEXP-EP](https://docs.vllm.ai/en/latest/serving/expert_parallel_deployment/)

**Measure and gate:** Whole-node goodput, per-replica queues, expert imbalance, communication time, memory per rank, and the worst tail latency. Preserve empty-expert-batch, skewed-routing and rank-failure cases. Requalify native DeepSeek/Kimi MegaMoE callers after the refactor; its kernel tests do not prove multi-rank numerical correctness. NVFP4 row integration remains gated by V02. [VEXP-61538](https://github.com/vllm-project/vllm/pull/61538)

For Kimi and Qwen Flash Next, begin from their full eight-GPU candidates. Smaller layouts require explicit capacity evidence including auxiliary/draft tensors and host allocations; this plan does not infer that a replica layout fits.

## V09 — GLM Flash prefill/decode split on the same node

**Question:** Does a 4-GPU prefill pool plus 4-GPU decode pool improve tail latency enough to pay for transfer, routing and duplicated residency?

**Arms:** Two independent colocated TP4 services versus one TP4-prefill/TP4-decode pair, all using the same exact GLM Flash export, context cap, KV dtype and MTP setting. The current vLLM recipe uses NIXL, `DS` convolution-state layout, `HND` KV layout and matching MTP5 on **both** roles. The recipe also sets `--no-disable-hybrid-kv-cache-manager` on both roles; retain and verify its effective value when materializing the manifest. Preserve that contract for the recipe-derived arm. A target-only PD variation is a separate compatibility probe. [VEXP-GLMFLASH-RECIPE](https://recipes.vllm.ai/zai-org/GLM-5.3-Flash)

**Measure:** End-to-end TTFT and generation tail latency, transfer volume/time, state serialization, CPU work, both queues, resident memory and node goodput. Use the same routed arrival trace, sweeping long-prefill share and prefix reuse. Capture both raw completion throughput and SLO-conforming goodput; phase separation is not evidence of a raw-throughput gain. [VEXP-PD](https://docs.vllm.ai/en/latest/features/disagg_prefill/)

**Gate:** Confirm transfer/reconstruction of attention, sparse-index, recurrent/convolutional and required draft state for this exact path. Compare post-transfer continuations with colocated execution. Interrupt transfer, cancel the requester, restart a role and exercise eviction; require correct fallback/rejection without stale state or a stuck queue. Confirm effective graph modes separately because the recipe gives the roles different startup settings. Keep the result at engine level until a separate KServe lifecycle experiment qualifies the service orchestration.

## V10 — restart time and the cost of retained GPU weights

**Question:** Is retaining GPU weights across restarts worth its residency and lifecycle cost?

**Arms:** On one qualified artifact, compare ordinary disk loading with `vllm preload` plus the documented `ipc_cache` loader. Start with a TP1 target, then repeat for the intended sharded layout if every quantization method supports pre-processed IPC weights. Hold compile/autotune cache state fixed. Time initial daemon preparation separately, and include it when calculating the total cost of a restart sequence. Do not reuse one daemon across stable/main builds with mismatching fingerprints. [VEXP-PRELOAD](https://docs.vllm.ai/en/latest/features/preload/)

**Measure and gate:** Time readiness through the first correct canary, not merely process start. Record retained HBM, peak restart HBM, weight mapping, compilation, graph capture and the lost capacity for other replicas. Exercise a missing daemon, wrong revision/topology, cold compile cache and a rejected unsupported quantizer. Distinguish disk fallback from an IPC cache hit in the logs. In default zero-copy mode, the daemon must survive the engine and sleep-mode weight offload is unsupported. Requalify the complete target/drafter pair when applicable.

Initialized-engine snapshots are an **optional separate experiment** for the documented one-GPU/TP1 environment. They require host/driver/CRIU compatibility, exclude speculation, and have only dense-FP16 validation in the cited guide. They do not replace the TP8 restart experiment. Qualify a candidate model separately, include creation cost and disk footprint, check the restored canary, and test rejection after a changed runtime identity. No host privilege or kernel changes were performed by this atlas. [VEXP-SNAPSHOT](https://docs.vllm.ai/en/latest/features/initialized_snapshots/)

## What a completed experiment must retain

Save the control and candidate manifests, artifact identities, payload hashes, exact launch arguments, effective engine configuration, target/draft provenance, node inventory, quality outputs, metrics/traces and raw failures. Include each run's timing boundaries and cache state. Record “not applicable” when a feature's source/runtime guard excludes the cell, “failed” when a gate fails, and “inconclusive” when uncertainty prevents a decision.

Promote a candidate only when its correctness and quality gates pass and the predeclared service objective improves by the required margin across the intended workload. Retain the qualified control artifact and configuration for rollback. These plans supply evidence to choose an engine and deployment; they contain no measured winner.
