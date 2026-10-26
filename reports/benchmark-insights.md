# GuideLLM and vLLM: benchmark insights and dashboard design

**Selected-source review: October 26, 2026 UTC.** This reference defines which measurements support a serving decision, how to interpret them and why each UI component is useful. It assumes the atlas's eight-B300 allocation and mandatory KServe route, with vLLM executing inference. The installed KServe version, resource kind, runtime and gateway remain unknown. Executable adapters, datasets, detailed campaigns, dashboards and results belong in the separate execution repository. No B300 performance or quality results are claimed here.

The decision is: **which configuration sustains the declared workload within latency, reliability and quality requirements, and what limits further capacity?** Those requirements have not been supplied; the UI must not invent passing thresholds or identify an optimal configuration before they exist.

## Source and version boundary

The release recheck identifies GuideLLM **v0.8.1**, vLLM **v0.32.0**, SGLang **v0.5.22** and KServe **v0.21.0**. Metric definitions below use GuideLLM commit `597bc014ef78daeb11312374022430939b611f11` and vLLM commit `5df63a7203cdb9328d824a27b682e77c7b9928be`. SGLang is an alternative engine under KServe, but its telemetry requires a separately reviewed adapter. Branch heads and advertised development wheels are recorded separately in the [upstream lock](../evidence/upstreams.lock.json); none identifies an installed build. [BI-G-RELEASE](https://api.github.com/repos/vllm-project/guidellm/releases/latest) [BI-G-TAG](https://api.github.com/repos/vllm-project/guidellm/git/ref/tags/v0.8.1) [RR-GM-VLLM-RELEASE](https://api.github.com/repos/vllm-project/vllm/releases/latest) [RR-GM-SGLANG-RELEASE](https://api.github.com/repos/sgl-project/sglang/releases/latest) [ATTR-K-RELEASE](https://api.github.com/repos/kserve/kserve/releases/latest)

UI recommendations and diagnostic hypotheses are engineering proposals. Upstream documentation and implementation establish the named fields and calculations, not their accuracy on an uninspected deployment or an independently reproduced improvement. Follow the [measurement contract](optimization.md#benchmark-decisions-and-measurement-contract), [configuration applicability notes](configuration-reference.md) and [limitations](../LIMITATIONS.md).

## Page layout and decisions

| Position / component | Content | Decision and layout rationale |
| --- | --- | --- |
| Persistent context bar | Exact model/export, engine image, weight/cache/draft precision, GPU allocation and groups, independent replicas, workload, cache state, baseline | Keep comparison conditions visible while scrolling. A topology label must distinguish independent replicas from coupled parallel groups. |
| Summary cards | Highest tested sustainable offered rate; latency-SLO goodput at the selected point; p95 first answer; SLO attainment; failed/incomplete counts | Establish usable capacity and response quality before diagnostics. Until targets and evidence exist, capacity is unavailable rather than zero or a guessed winner. |
| Main capacity chart | Offered requests/s versus completed successful requests/s and latency-SLO goodput | Locate where extra traffic stops yielding useful completions. Show achieved dispatch rate alongside offered rate to expose client limitations. |
| Aligned latency chart | p50/p95/p99 TTFT, first content and completion latency versus load, with declared target lines | Expose the latency cost of throughput. Separate chart axes preserve units; uncertainty and sample count accompany tail estimates. |
| Workload heatmap | Actual input-length by output-length buckets; SLO attainment or p95 latency, with counts | Locate request shapes hidden by global averages. Freeze common bucket boundaries for comparisons and mark sparse cells. |
| Synchronized diagnostics | Queue, cache occupancy, preemptions, per-GPU memory/activity, replica load and platform events over time | Explain a selected interval without losing its workload or run identity. Per-rank peaks and imbalance can disappear in node averages. |
| Comparison table | Baseline/candidate goodput, latency, output tokens/s, peak memory, quality, repeated-run variability and exact configuration differences | Choose a measured tradeoff. Compare matched load or capacity under the same objectives, explicitly distinguishing those two questions. |
| Run details drawer | Effective configuration, windows, status denominators, exclusions, telemetry gaps, provenance and raw artifact links | Make every conclusion inspectable without filling the main page with implementation details. |

Selecting a load point updates the cards, latency distributions and diagnostic interval together. Keep the full capacity curve visible. Selecting a time interval must identify it as a drill-down; it must not silently replace whole-run statistics. Use separate views for fixed-concurrency and scheduled-arrival experiments, with their actual independent variable on the horizontal axis.

Use text states as well as color: **measured**, **derived**, **hypothesis**, **unavailable**, **not applicable** and **insufficient evidence**. Distinguish missing telemetry from zero activity and failed runs from missing runs. A lower-bound or indeterminate search result is not an established maximum. Enable baseline deltas only after exposing mismatched workload, output-length, sampling, cache, GPU-budget or quality conditions.

## Measurements and ownership

| Source | Required data | Insight supported |
| --- | --- | --- |
| GuideLLM outcomes and request statistics | Successful, errored and incomplete counts; observed input/output lengths; TTFT, first content, completion latency and average ITL; applicable distributions | Detect short, failed or truncated responses behind an apparent speed increase; distinguish response onset from answer availability. |
| GuideLLM load and SLO statistics | Configured arrival policy/rate, observed concurrency and rates, output tokens/s, applicable dispatch/scheduled delay, SLO attainment and determined count | Establish latency-conforming capacity and identify a client that cannot sustain the configured schedule. |
| vLLM telemetry | Running/waiting requests, queue/prefill/decode intervals, cache occupancy/reuse, preemptions, admission rejections and applicable speculative counters | Diagnose engine pressure and investigate the mechanism behind a controlled comparison. |
| GPU and host telemetry | Per-GPU memory and activity, power and supported profiling fields; CPU, host memory and load-generator utilization | Investigate rank imbalance, host limitations and resource efficiency. These are additional collectors, not native client benchmark measurements. |
| KServe / Kubernetes / gateway telemetry | Ready replicas, restarts, rollout/scale events, routing distribution, gateway errors and correlated traces where available | Separate service lifecycle and routing effects from model execution; availability depends on the installed integration. |
| Separate application evaluation | Correct answers, valid and correct tool actions, completed tasks, retries and full task wall time | Establish usefulness and permissible quality loss. HTTP success and latency conformity do not grade semantic correctness. |

GuideLLM's saved metrics provide client statistics; request and event populations depend on its measurement window. NVIDIA DCGM Exporter exposes selected GPU telemetry to Prometheus. Match fields and units to the deployed exporter rather than assuming every GPU counter exists. [BI-G-METRICS](https://raw.githubusercontent.com/vllm-project/guidellm/597bc014ef78daeb11312374022430939b611f11/docs/en/guides/metrics.md) [BI-DCGM](https://docs.nvidia.com/datacenter/dcgm/latest/installation/install-dcgm-exporter.html)

Scrape each replica/engine directly through the monitoring integration, retaining its identity; a load-balanced metrics URL can switch replicas between scrapes. Align client and telemetry windows, record clock uncertainty and scrape gaps, and isolate or label background traffic. Do not add duplicated rank/frontend counters without establishing their ownership. A per-request waterfall requires correlated request events; aggregate histograms support distributions, not a fabricated request trace.

## Metric definitions that affect the UI

Let `t_send`, `t_first`, `t_content`, `t_last`, `t_end` and `t_target` denote client dispatch, first generated token event, first content event, last token event, terminal response and scheduled arrival. Let `N` be the observed output-token count. Store timestamp availability and token-count provenance; streaming chunks can contain several tokens.

| Display metric | Definition / applicability |
| --- | --- |
| TTFT | `t_first - t_send`; label whether reasoning/tool events can establish the first token. |
| First content latency | `t_content - t_send`; closer to first visible answer when the backend separates reasoning and content. It does not establish first usable tool-call latency. |
| Completion latency | `t_end - t_send`; keep terminal protocol framing distinct from last-token timing. |
| GuideLLM average ITL | `(t_last - t_first) / (N - 1)` for `N > 1`; a per-request average, not a measured distribution of every individual token gap. |
| GuideLLM reported time per output token | `(t_last - t_send) / N`, with the implementation's end-time fallback when last-token timing is absent; includes initial waiting. |
| Dispatch and scheduled latency | Respectively `t_send - t_target` and `t_end - t_target`; valid only for a meaningful arrival schedule. Preserve native nulls for inapplicable profiles. |

Convert source seconds and milliseconds explicitly. GuideLLM has separate first-content timing, and its reported time-per-output-token formula differs from its average ITL. Keep both source names and normalized display definitions. [BI-G-REQUEST-STATS](https://raw.githubusercontent.com/vllm-project/guidellm/597bc014ef78daeb11312374022430939b611f11/src/guidellm/schemas/base/request_stats.py)

**The native SLO key `tpot_ms` is another distinct contract:** in this GuideLLM revision it evaluates `inter_token_latency_ms`, excluding the initial wait, rather than the similarly named reported `time_per_output_token_ms`. Its built-in objectives use TTFT, average ITL and completion latency measured from request dispatch. A first-visible-answer or scheduled-arrival objective therefore needs an explicitly derived policy; do not relabel native attainment as satisfying it. The compiled metrics expose `slo_determined_requests`. [BI-G-METRICS-SOURCE](https://raw.githubusercontent.com/vllm-project/guidellm/597bc014ef78daeb11312374022430939b611f11/src/guidellm/benchmark/schemas/metrics.py)

Native latency-SLO attainment counts errored requests as non-conforming and excludes incomplete requests and successful requests with unevaluable objectives. Show the native denominator, all status totals and excluded counts together. Goodput measures objective-conforming completions per second under the native window convention; it does not grade quality. If the dashboard also computes an all-offered-request measure, give it a separate name, cohort, deadline and drain policy so unfinished requests cannot disappear. [BI-G-SLO](https://raw.githubusercontent.com/vllm-project/guidellm/597bc014ef78daeb11312374022430939b611f11/docs/en/guides/service_level_objectives.md)

GuideLLM's `goodput` profile searches **concurrent streams**, not offered arrival rate. Preserve its probe warnings, aborted status and lower-bound/indeterminate results. Sustainable offered-rate capacity additionally needs a finite-arrival experiment, bounded queue growth and the declared error/quality criteria. A concurrency search or throughput maximum alone cannot establish it. [BI-G-GOODPUT](https://raw.githubusercontent.com/vllm-project/guidellm/597bc014ef78daeb11312374022430939b611f11/src/guidellm/benchmark/profiles/goodput.py)

Window selection differs across request and event statistics, so their counts need not match. Preserve each metric's population and window instead of recomputing every rate from one request total. GuideLLM's ITL/TPOT means are token-exposure weighted, and its native intervals do not cover those metrics or rate distributions. Other native intervals describe within-run estimation; repeated paired runs are needed for run-to-run variability. Do not reinterpret a percentile of request averages as individual token-gap jitter. [BI-G-METRICS](https://raw.githubusercontent.com/vllm-project/guidellm/597bc014ef78daeb11312374022430939b611f11/docs/en/guides/metrics.md)

## vLLM diagnostic mapping

These names are exposed by the reviewed v0.32.0 source. Inspect the deployed `/metrics` contract before wiring a dashboard. Prometheus counters below use their exported `_total` suffix; histogram observations require their buckets/count/sum series.

| Diagnostic | Metric families | Interpretation |
| --- | --- | --- |
| Scheduler | `vllm:num_requests_running`, `vllm:num_requests_waiting`, `vllm:num_requests_waiting_by_reason` | Track engine queues separately from client dispatch delay and gateway waiting. |
| Timing | `vllm:time_to_first_token_seconds`, `vllm:request_queue_time_seconds`, `vllm:request_prefill_time_seconds`, `vllm:request_decode_time_seconds`, `vllm:request_time_per_output_token_seconds` | Server boundaries differ from client boundaries. |
| Cache occupancy | `vllm:kv_cache_usage_perc` | Fraction: `1` means 100%. It is not total HBM usage or a complete census of hybrid/recurrent state. |
| Prefix reuse | `vllm:prefix_cache_hits_total`, `vllm:prefix_cache_queries_total` | Token-based counters; calculate window deltas/rates, not lifetime ratios. |
| Disruption | `vllm:num_preemptions_total`, `vllm:admission_rejections_total` | Preserve rejection reason, engine and replica labels. |
| Output and termination | `vllm:generation_tokens_total`, `vllm:request_success_total` | Inspect finish reasons; server success is not task correctness or proof against truncation. |

[V032-METRICS-LOGGER](https://raw.githubusercontent.com/vllm-project/vllm/5df63a7203cdb9328d824a27b682e77c7b9928be/vllm/v1/metrics/loggers.py)

The inspected vLLM queue interval ends at first scheduling; prefill and decode are wall intervals that can include preemptions. They are not isolated GPU kernel time. Its per-request time-per-output-token excludes the first token, using decode time divided by `N - 1` where possible. Do not compare it directly with GuideLLM's reported inclusive TPOT. Do not subtract client p95 from server p95, sum stage p95 values, or average replica percentiles: use compatible merged histograms/raw observations or correlated per-request durations. [BI-V-STATS](https://raw.githubusercontent.com/vllm-project/vllm/5df63a7203cdb9328d824a27b682e77c7b9928be/vllm/v1/metrics/stats.py)

For applicable speculative configurations, collect `vllm:spec_decode_num_drafts_total`, `vllm:spec_decode_num_draft_tokens_total` and `vllm:spec_decode_num_accepted_tokens_total`. Draft-token acceptance is accepted/proposed token deltas; native mean acceptance length also includes a bonus token (`1 + accepted/drafts`) for the reviewed autoregressive convention. Distinguish these quantities. Neither establishes latency improvement without a matched target-only run, memory accounting and quality checks. [BI-V-SPEC-METRICS](https://raw.githubusercontent.com/vllm-project/vllm/5df63a7203cdb9328d824a27b682e77c7b9928be/vllm/v1/spec_decode/metrics.py)

## Workload coverage and explanatory insights

The following are coverage categories, not a detailed run campaign. Illustrative token lengths are design inputs, not observed traffic or validated limits. Use actual lengths after tokenization, reserve output space within supported context, and include representative application traffic.

| Coverage | Controlled contrast | Useful view |
| --- | --- | --- |
| Short interactive | Approximately 512 input / 128 output tokens across finite arrival rates | First-answer latency and goodput curves |
| Long input | Approximately 8K or 32K input / 256 output tokens, where supported | TTFT by actual input length; prefill and queue intervals |
| Long generation | Approximately 512 input / 2K output tokens | Average ITL, completion latency and output throughput |
| Conversation reuse | Growing histories with repeated versus changed prefixes; controlled affinity | Latency by turn, reuse and replica imbalance |
| Mixed / burst traffic | Matched short/long mixture, controlled arrival burst | Short-request tail degradation, queue growth and recovery |
| Configuration tradeoff | One precision, speculation or supported placement change at a time | Paired latency/goodput/memory/quality table |

Hold total GPU allocation constant for placement comparisons. Show whole-node throughput and allocated GPUs; per-GPU normalization alone can conceal differences in the deployment being purchased or scheduled. Separate target, draft, cache, recurrent-state and workspace memory where instrumentation permits; otherwise report observed total usage and the unresolved decomposition. [Memory accounting](memory-math.md), [parallel-group interpretation](optimization.md#tp-ep-and-replicas-answer-different-questions).

| Proposed insight | Evidence required | Decision and remaining limit |
| --- | --- | --- |
| Queueing limits useful capacity | Rising waiting/queue time, plateauing completions and deteriorating goodput at matched workload | Investigate admission, batching and valid replica placement. Correlation does not isolate compute, memory or routing as the cause. |
| Prefix reuse benefits repeated conversations | Lower first-answer latency and uncached prefill work in matched warm-prefix runs | Evaluate locality/affinity with cold-prefix and skewed-traffic controls; cache hits alone do not establish user benefit. |
| Speculation helps only within a load range | Target-only/speculative curves cross, with draft overhead and extra memory recorded | Choose according to workload/load and quality. High acceptance alone is insufficient. |
| Reduced precision increases usable concurrency | Lower observed memory and more SLO-conforming work, with acceptable task quality | Compare exact artifacts and effective kernels; capacity savings need not improve low-load latency. |
| A replica or rank is limiting the node | Per-replica queue/load skew or per-rank memory/activity peaks | Investigate routing, cache locality and placement before increasing the global budget. |
| The load generator limits the experiment | Intended arrivals diverge from dispatch, with client resource/generation-delay evidence | Fix or qualify the harness limit; do not call its ceiling server capacity. Multi-turn predecessor and configured think time need separate treatment. |

Each insight card should link to the measured comparison, show absolute and relative differences with their units, and name the next discriminating experiment. Until that evidence exists, use hypothesis wording. Keep application correctness separate from latency conformity, or explicitly define a joint task-quality-and-latency measure when per-request grading exists.

## Ingestion, comparison and review requirements

Use GuideLLM JSON as the primary client artifact and retain the original alongside normalized fields in the execution repository. CSV is a summary and omits detailed request data. Full request payload retention can be sampled separately from lightweight statistics; the importer must preserve that distinction and the token-count source preference. [BI-G-OUTPUTS](https://raw.githubusercontent.com/vllm-project/guidellm/597bc014ef78daeb11312374022430939b611f11/docs/en/guides/outputs.md)

The measurement record needs:

- **Identity:** run/configuration IDs, dataset revision/hash, exact model/export/draft and tokenizer/template/processor pins, engine image digest and source/build version, library versions, effective precision/backend/cache settings, GPU/rank allocation and actual KServe integration. Reference the existing [configuration catalog](../catalog/configurations.json); record effective execution settings externally rather than promoting historical candidates here.
- **Population and clocks:** requests, conversations and turns; scheduled/dispatch/token/terminal timestamps where available; requested and observed lengths; outcome/finish/error/cancellation reasons; warmup, active and drain/cooldown windows; native and derived SLO policies with their denominators. Extra events such as first usable tool call require instrumentation rather than assumed GuideLLM coverage.
- **Telemetry and evaluation:** scrape interval/coverage and replica/GPU identities; source units and reset handling; task-evaluator identity, sampling policy, quality tolerance, repeated-run summaries and links to underlying artifacts. GPU energy alone is not whole-node energy; any cost view requires an explicit allocation/pricing basis.

Start with context, capacity/latency curves, outcome counts and matched comparison tables. Add synchronized diagnostics, then cache/speculation and cost/energy views when their data sources are qualified. Preserve distribution details in drill-downs; a single score or tokens/s leaderboard cannot encode these decisions.

The two-pass review covers the cited metric definitions, units, native-versus-derived policies, source identities and internal links. It does not certify a dashboard implementation, installed metric endpoint, exact model/build pairing or measured B300 result. Source registry and lock updates record this limited scope; no model/catalog configuration is promoted by this report.
