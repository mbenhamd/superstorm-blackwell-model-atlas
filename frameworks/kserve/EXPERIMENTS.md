# KServe experiments after engine qualification

**Status: proposed experiments; no cluster deployment or serving measurement was performed.** KServe controls service deployment and routing resources; vLLM and SGLang remain the engines. These plans measure the extra request path and lifecycle behavior after the exact checkpoint, engine image and GPU topology pass the [direct-engine protocol](../../benchmarks/PROTOCOL.md). See [architecture](ARCHITECTURE.md) for the freshly inspected stable/master differences.

Use the [shared experiment roadmap](../../reports/EXPERIMENTS.md) to choose the next eligible comparison and the [manual run record](../../benchmarks/experiment.template.json) to retain its inputs, gates and results.

## Entry conditions and evidence to retain

Start with a target-only engine configuration that loads the pinned artifact, meets the quality threshold and has a reproducible direct-service baseline. Add speculation, quantization or another engine release in separate comparisons. A platform experiment cannot repair an unqualified model/export/kernel combination.

Record the model and tokenizer revisions, engine version and digest, GPU allocation, CPU/memory resources, node/network inventory, workload hashes, cache state and offered arrival trace. Also retain the KServe controller digest, CRD versions, resolved base configs, **rendered** pod commands, endpoint-picker configuration, gateway implementation, dependency versions, scaling targets and relevant Kubernetes events. Secrets and prompt contents need not appear in shared reports; use identifiers and payload hashes where appropriate.

Declare the latency, quality, error and resource budgets before each run. Use the protocol's TTFT, first-answer latency, TPOT and goodput definitions. A chunk gap is not an exact token latency. Measure client-visible and engine-side results together, using synchronized clocks for cross-component traces. Preserve failed requests, unschedulable pods and failed runs. Randomize comparison order, repeat runs and report uncertainty and workload-specific results.

| ID | Decision | Required path |
| --- | --- | --- |
| K01 | Is gateway/platform overhead acceptable? | Direct endpoint and managed service, same engine |
| K02 | Does prefix-aware routing improve useful cache reuse? | At least two qualified replicas and a compatible endpoint picker |
| K03 | Does routing preserve latency under uneven work? | Fixed replica pool, mixed workloads and controlled arrival process |
| K04 | Does P/D separation improve goodput within the same GPU budget? | Both roles fit and transfer works for the exact model |
| K05 | Does scaling respond soon enough, including cold starts? | Explicit metric source, actuator and observable replica targets |
| K06 | Does cancellation and draining release work predictably? | Stream-capable client and engine/cache instrumentation |
| K07 | Can the service roll forward and back within its availability budget? | Pinned old/new bundles and sufficient rollout capacity |
| K08 | Does master's SGLang template preserve the qualified engine behavior? | Source/image provenance for the unreleased template path |

The matrix gives local experiment identifiers, not KServe API fields or runnable manifests. Derive manifests from the selected commit's schemas and samples, then inspect their resolved output. The included [renderer](../../deploy/kserve/README.md) covers only custom-container Standard `InferenceService`.

## K01 — Gateway and service overhead

**Hypothesis.** The managed request path adds acceptable latency and CPU cost while preserving the engine's response semantics. The budget comes from the application; there is no assumed universal overhead in milliseconds.

**Control and change.** Route an identical replay first to the qualified pod/service endpoint and then through the production-shaped gateway path to the **same** engine pod. Place the client consistently, hold TLS/authentication and connection reuse policy explicit, disable autoscaling and use one fixed replica. If comparing Standard InferenceService with LLMInferenceService, first verify the rendered commands, resources, cache and engine image are equivalent; then treat that wrapper comparison as a separate arm.

**Procedure and measurements.** Start at concurrency one with short output, then repeat the application's input/output mix below and near saturation. Cover streaming text, reasoning/tool deltas where supported, finish reasons, usage counts and long responses. Retain client TTFT/end-to-end distributions, engine request times, gateway CPU/memory, upstream errors, connection resets and timeout counts. Report the distribution difference and traced extra stages; do not subtract unrelated p99 samples and call the result per-request overhead.

**Gate.** Promote when quality and response semantics match the direct baseline and the added latency/resource cost stays inside the preregistered platform allowance. Any truncated stream, swallowed failure or response buffering that violates the streaming objective blocks promotion. This becomes the reference path for K02–K07.

## K02 — Prefix locality versus load

**Hypothesis.** Sending related prompts to a replica with reusable state saves prefill work, but a heavily loaded cache owner can erase that benefit.

**Control and change.** Use at least two identical, independently qualified replicas. Compare a documented policy without prefix preference against a compatible policy with it, keeping the replica count and total GPUs fixed. Confirm the active configuration: stable 0.21.0's shipped router is 0.10.0 and uses its legacy default unless explicit/preserved configuration intervenes; the newer preset path requires router 0.11.0. Do not mix controller and router changes into a routing-only attribution. [KEXP-COMPOSE21](https://github.com/kserve/kserve/blob/d1482554fc4f66dd41aee70e01f5174e24f265bd/pkg/controller/v1alpha2/llmisvc/config_merge.go) [KEXP-SCHEDULER21](https://github.com/kserve/kserve/blob/d1482554fc4f66dd41aee70e01f5174e24f265bd/pkg/controller/v1alpha2/llmisvc/scheduler.go)

**Procedure and measurements.** Replay token-identical shared prefixes, unrelated prefixes, a skewed hot-prefix workload and a workload whose hot prefix changes over time. Run cold and warmed conditions separately; disclose warmup requests and cost. Add eviction pressure and a replica restart. Record chosen endpoint, actual engine prefix reuse/prefill work where exposed, queue time, cache occupancy/eviction, TTFT, per-replica load and total-node goodput. Router estimates are not ground-truth cache hits. For hybrid models, retain recurrent-state reuse evidence too.

**Gate.** Accept the policy only if the declared workload mix gains goodput or latency within its resource budget, without starving cold or minority traffic. Negative-control prefixes must not receive another request's state or content. Apply the declared tenant/cache-key policy and test isolation with synthetic prompts. If no trustworthy cache counter is available, label the result as a routing/latency comparison and leave the cache mechanism unproven.

## K03 — Load balancing and scheduler failure

**Hypothesis.** A policy that accounts for queued and active work improves tail latency when requests have unequal costs; an even request count alone does not establish an even GPU workload.

**Control and change.** Keep the replica pool fixed. Compare K02's selected policy with a documented alternative that emphasizes current load. Use the same model, cache state and arrival trace. Introduce mixtures of short and long prompts, short and long outputs, and a hot-prefix group competing with new prompts. Add vision traffic only after its direct path is qualified, and account for its preprocessing/token cost separately.

**Procedure and measurements.** Use an open-loop load generator for arrival-rate and overload experiments; the atlas's closed-loop SSE probe is insufficient to establish the offered-load curve. Measure queue/TTFT/end-to-end distributions by workload class, SLO-compliant goodput, timeouts, rejections, per-replica token work and scheduler CPU/decision latency. Keep failures in the offered-request denominator. In an isolated run, restart or interrupt the endpoint picker and observe the actual gateway response. The stable scheduler template declares `failureMode: FailOpen`; that declaration alone does not prove how the installed gateway behaves during failure. [KEXP-EPPSERVICE21](https://github.com/kserve/kserve/blob/d1482554fc4f66dd41aee70e01f5174e24f265bd/config/llmisvcconfig/config-llm-scheduler.yaml)

**Gate.** Require the chosen policy to meet each declared workload-class latency target and overload behavior, with no persistent starvation. Document the observed fallback or fail-open behavior and its recovery time. An aggregate throughput win that breaches the short-request objective is not sufficient for that workload.

## K04 — Prefill/decode separation and transfer economics

**Hypothesis.** Separating prompt processing from generation can reduce interference enough to pay for duplicated weights, state transfer, buffering and extra routing. The crossover depends on prompt/output lengths, load, cache reuse and the transport.

**Control and change.** Compare colocated serving with P/D at the same total GPU allocation and quality objective. First qualify each role's topology and the exact connector directly. For eight GPUs, a TP4 prefill plus TP4 decode arm is eligible only if each role independently fits and works. A model needing TP8 for each role requires sixteen GPUs under that assumption; mark it blocked on additional capacity rather than call an unequal-resource comparison an eight-GPU win.

**Procedure and measurements.** Begin with a model whose full state-transfer contract is established. Sweep the protocol's eligible context/output lengths, arrival load and prefill/decode allocation; retain both low-load and saturation behavior. Confirm actual transfer and decoding from transferred state. The stable presets conditionally add NIXL producer/consumer connectors and can leave transfer disabled when NIXL is unavailable, so successful pod health checks are insufficient. Record connector/transport identity, bytes and transfer time, prefill repeated at decode, queue time by role, TTFT, generation latency, goodput and peak memory. [KEXP-DEC21](https://github.com/kserve/kserve/blob/d1482554fc4f66dd41aee70e01f5174e24f265bd/config/llmisvcconfig/config-llm-decode-template.yaml) [KEXP-PREFILL21](https://github.com/kserve/kserve/blob/d1482554fc4f66dd41aee70e01f5174e24f265bd/config/llmisvcconfig/config-llm-prefill-template.yaml)

Repeat correctness checks through cache eviction, cancellation and a role restart. For hybrid models, explicitly include recurrent/conv state and speculative rollback where enabled. Treat independent Deployments/LeaderWorkerSets and master's optional DisaggregatedSet as separate orchestration arms after the transfer path passes; changing workload ownership does not by itself establish faster transfer.

**Gate.** Require a repeatable goodput or latency improvement at equal resources and quality, including the declared failure/recovery budget. Publish the crossover region and cases where colocated serving wins. Unknown state-transfer compatibility, decode recomputing the prompt unexpectedly, or missing transfer evidence leaves the advanced configuration unqualified.

## K05 — Scaling, cold start and wake-up

**Hypothesis.** Demand-based scaling can save idle GPU time without missing the application latency objective if the metric arrives early enough and new replicas become useful before the queue exceeds its budget.

**Control and change.** Use fixed replicas as the reference, then one explicit direct-KEDA configuration at the same maximum GPU budget. Declare the metric, scrape/poll cadence, activation threshold, minimum/maximum replicas, cooldown, fallback and request admission policy. Use settings supported by the selected schemas. Stable 0.21.0 also offers WVA paths, but master rejects new WVA configuration and reports existing WVA scaling as unsupported; a stable-WVA-to-master upgrade is a separate migration case. [KEXP-API21](https://github.com/kserve/kserve/blob/d1482554fc4f66dd41aee70e01f5174e24f265bd/pkg/apis/serving/v1alpha2/llm_inference_service_types.go) [KEXP-VALIDATIONMASTER](https://github.com/kserve/kserve/blob/22be2b0496eea4548a98395c3abccf48d8235385/pkg/apis/serving/v1alpha2/llm_inference_service_validation.go) [KEXP-SCALINGMASTER](https://github.com/kserve/kserve/blob/22be2b0496eea4548a98395c3abccf48d8235385/pkg/controller/v1alpha2/llmisvc/scaling.go)

**Procedure and measurements.** Replay steps, bursts, ramps and idle periods. Separate image-cold, model-cache-cold and already-cached starts. Timestamp demand observation, desired-replica change, scheduling, image availability, model load, warmup, readiness, route inclusion and first successful request. Measure useful-capacity delay, queue area, errors/retries, TTFT during scale-up, wasted GPU-seconds and scale-down oscillation. If reporting a cost, supply the actual price basis; GPU-seconds alone are a resource measure.

Only add scale-to-zero after demonstrating a demand signal that survives zero engine pods. Test the first request, a burst during startup, metric loss and restoration, and the declared buffering/rejection behavior. For master's DisaggregatedSet arm, observe the actual role-scaler target and test zero-to-one-to-many transitions for both roles; the October 15 fix specifically concerns zero-replica scale-up. [KEXP-DSKEDA](https://github.com/kserve/kserve/commit/393c8349e6d5d88537b8786f8cd90f0c2ddc6cc1) [KEXP-DSZERO](https://github.com/kserve/kserve/commit/a10e88ae379f51e508e3e47cbcb756c13510c8bb)

**Gate.** Promote only if scale-up and wake-up meet the declared request/availability budgets, missing metrics produce the chosen fallback, and no uncontrolled replica oscillation persists. A replica marked ready before successful warmup or a zero-pod state that cannot observe new demand fails the gate. On a fully occupied TP8 node, increasing desired replicas without additional schedulable GPUs is a capacity failure, not autoscaler throughput.

## K06 — Cancellation, timeouts and draining

**Hypothesis.** Client cancellation propagates through the gateway/router to the engine quickly enough to bound wasted work and release sequence state, and shutdown handles admitted work predictably.

**Control and change.** Exercise the same qualified engine directly and through K01's managed path. Cancel at distinct stages: queued, mid-prefill, after first content and mid-decode. Repeat with cache hits, long contexts and P/D where eligible. Distinguish an explicit client disconnect from gateway timeout and pod termination; they need separate results.

**Procedure and measurements.** Correlate a synthetic request ID across client, gateway and engine. Observe engine work after disconnect, time until active/queued counts settle, KV/recurrent pool occupancy, memory plateau and subsequent-request correctness. Repeat cancellations to reveal accumulating state, then drain and terminate a replica under normal traffic. Record requests accepted during draining, completed/truncated streams, retries, duplicate responses and time to restore capacity. Retain response semantics for tool calls without executing returned tool content.

The atlas's SSE runner does not guarantee a strict wall-clock abort or expose engine-internal release time. Use a client that can deliberately close the stream and endpoint/engine instrumentation for this experiment; a client timeout exception alone does not prove cancellation reached the GPU. [Runner boundaries](../../benchmarks/PROTOCOL.md)

**Gate.** Require the preregistered cancellation/drain bounds, correct subsequent outputs and no accumulating request state or sustained memory growth across repetitions. A retry policy must not silently duplicate user-visible work. For hybrid/speculative paths, any state corruption blocks promotion even when latency improves.

## K07 — Rolling update, migration and rollback

**Hypothesis.** A pinned update can reach useful new capacity and return to the old bundle within an explicit availability budget, while preserving stream semantics and the model/config identity of each response.

**Control and change.** Separate three cases: engine-image change under one controller, controller/router bundle change with the engine held fixed, and workload-backend migration. Retain old/new manifests, digests, CRDs, templates, routing config and model identity. Validate schema/conversion compatibility and rehearse recovery in a disposable environment before involving an existing service. A rollout requiring another TP8 replica needs another eight-GPU allocation; otherwise predeclare a service interruption or use a separately qualified topology with spare capacity.

**Procedure and measurements.** Send steady short traffic plus long streams during update and rollback. Include a replacement that never becomes ready, one that fails warmup, and an interruption of an engine worker. Measure unavailable time, successful/failed/truncated streams, revision mix, routing-convergence time, duplicate requests, queue growth and time to restore the previous service. Check that old scheduling/scaling resources do not continue controlling the wrong workload.

For DisaggregatedSet, distinguish rolling within an existing backend from moving onto or off it. The inspected controller warns that backend migration replaces old workloads without waiting for new readiness. Exercise that case with an explicit outage budget. Also cover zero surge and one/small replica counts, which motivated #6378; observe both roles and their desired/ready revisions. A controller-image rollback alone does not prove CRD and stored-object compatibility. [KEXP-DSMASTER](https://github.com/kserve/kserve/blob/22be2b0496eea4548a98395c3abccf48d8235385/pkg/controller/v1alpha2/llmisvc/workload_disaggregated.go) [KEXP-DSROLLOUT](https://github.com/kserve/kserve/commit/05061768dc803dbff9c287bd6558b25f944452c6)

**Gate.** Require successful recovery within the declared budget, no silent truncated success, and an auditable returned-to-service bundle. Publish any planned downtime and spare-capacity requirement. An unready replacement that stalls forever, an unexpected WVA shutdown, or route/scaler resources targeting the wrong revision fails the gate.

## K08 — Qualify the new SGLang template independently

**Hypothesis.** The inspected master template can preserve a directly qualified SGLang single-node deployment while adding the intended Kubernetes lifecycle and routing behavior.

**Control and change.** Compare that exact SGLang image through a custom-container Standard InferenceService and through master's dedicated runtime/template path. The source selects the SGLang template for single-node non-P/D services via `spec.runtime`; the bundled runtime defaults to SGLang 0.5.14. Explicitly pin the already-qualified current engine image rather than silently switching engine versions with the wrapper. This path is absent from the inspected 0.21.0 release. [KEXP-COMPOSEMASTER](https://github.com/kserve/kserve/blob/22be2b0496eea4548a98395c3abccf48d8235385/pkg/controller/v1alpha2/llmisvc/config_merge.go) [KEXP-SGLANGMASTER](https://github.com/kserve/kserve/blob/22be2b0496eea4548a98395c3abccf48d8235385/config/llmisvcconfig/config-sglang-template.yaml) [KEXP-SGLANGRUNTIME](https://github.com/kserve/kserve/blob/22be2b0496eea4548a98395c3abccf48d8235385/config/runtimes/kserve-llm-sglang.yaml)

**Procedure and measurements.** Inspect resolved command, runtime image precedence, model mount, TP degree, shared memory, writable paths, probes and termination behavior. Run K01 and K06 first. Then test an endpoint-picker configuration only after identifying compatible SGLang metrics and endpoint metadata; if those cannot be established, record the routing-dependent arm as blocked with the missing contract. Compare outputs, load/warmup time, memory, protocol completeness and useful goodput to the custom-container control.

**Gate.** Promote only the behavior actually exercised: a passing single-node template test does not qualify multi-node, P/D transfer, hybrid-state migration or every llm-d cache plugin. Record engine-specific integration gaps explicitly and retain the simpler qualified service as the rollback reference.

## Reporting a result

A result should state the exact comparison, workload, source/image identities, quality and SLO gates, capacity budget, failures and uncertainty. Include the rendered configuration and measurement artifacts needed to repeat it. Describe the decision as supported for that workload and topology; distinguish a source feature, a successful schema check, an upstream test claim and a locally reproduced serving result. Until these experiments run, their status remains **proposed**.
