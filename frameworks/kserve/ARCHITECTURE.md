# KServe deployment architecture

KServe manages the Kubernetes service lifecycle. vLLM or SGLang still loads the checkpoint, schedules token work, owns the caches and executes GPU kernels. Qualify the exact engine/checkpoint combination directly, then measure what the platform adds. The companion [experiments](EXPERIMENTS.md) turn the deployment choices below into comparisons with explicit gates; none has been run on a cluster for this atlas.

## Release, branch and development image are separate observations

The fresh check for the October 16 local-date expansion, retrieved **October 15, 2026 UTC**, still resolves the latest stable release to **v0.21.0**, published September 25. Its tag is `d1482554fc4f66dd41aee70e01f5174e24f265bd`. The separately fetched `master` is `22be2b0496eea4548a98395c3abccf48d8235385`, committed October 15 at 19:47:34 UTC. Selected schemas, presets and controller functions were inspected at both commits. [KEXP-REL](https://github.com/kserve/kserve/releases/tag/v0.21.0) [KEXP-MASTER](https://github.com/kserve/kserve/commit/22be2b0496eea4548a98395c3abccf48d8235385)

The public overview still identifies its version as **0.20**. At v0.21.0, both `LLMInferenceService` and `LLMInferenceServiceConfig` serve `v1alpha1` and `v1alpha2`; `v1alpha2` is the storage version. The stable product release therefore still includes alpha-version LLM APIs. Use the chosen release's CRDs, conversion webhook and templates together; a website example is not a release-matched deployment receipt. [KEXP-DOCS](https://kserve.github.io/website/docs/model-serving/generative-inference/llmisvc/llmisvc-overview) [KEXP-CRD21](https://github.com/kserve/kserve/blob/d1482554fc4f66dd41aee70e01f5174e24f265bd/config/crd/full/llmisvc/serving.kserve.io_llminferenceservices.yaml) [KEXP-CFGCRD21](https://github.com/kserve/kserve/blob/d1482554fc4f66dd41aee70e01f5174e24f265bd/config/crd/full/llmisvc/serving.kserve.io_llminferenceserviceconfigs.yaml)

KServe's inspected controller publisher maps `master` pushes to the mutable Docker tag `kserve/llmisvc-controller:latest`; it is a development-image path, not a separately established nightly qualification channel. Registry metadata reports that tag updated October 15 at 20:13:47 UTC, with index digest `sha256:a9bd5f40cdff8c589d07ffd59e29337f9a1e7b2714cced7b0120acb5c714206f`. No image was pulled, its source revision was not independently established, and it was not run. Record the platform-specific digest and build provenance before using it in an experiment. [KEXP-PUBLISHMASTER](https://github.com/kserve/kserve/blob/22be2b0496eea4548a98395c3abccf48d8235385/.github/workflows/kserve-llmisvc-controller-docker-publish.yml) [KEXP-DEVIMAGE](https://hub.docker.com/v2/repositories/kserve/llmisvc-controller/tags/latest)

## Understand the two paths through the system

```text
Control: desired service/config → KServe controller → workloads and routing resources

Request: client → gateway → selected engine replica → generated response stream
                           ↑
                   endpoint picker, when configured

P/D request: gateway/router → prefill role → compatible state transfer → decode role
```

The controller reconciles objects; the request path runs through gateway/router components and engine pods. An endpoint picker selects a replica; the engine's own scheduler selects and batches token work inside it. Gateway latency, replica selection and GPU scheduling need separate measurements. The LLM API represents main/decode workloads, optional prefill and worker workloads, and router configuration. [KEXP-API21](https://github.com/kserve/kserve/blob/d1482554fc4f66dd41aee70e01f5174e24f265bd/pkg/apis/serving/v1alpha2/llm_inference_service_types.go) [KEXP-DOCS](https://kserve.github.io/website/docs/model-serving/generative-inference/llmisvc/llmisvc-overview)

| Deployment path | What it establishes | What remains to qualify |
| --- | --- | --- |
| Direct vLLM or SGLang | Exact engine/model baseline | Kubernetes lifecycle and gateway behavior |
| Custom-container `InferenceService`, Standard mode | Explicit engine command in a managed service; the included renderer supports this single-node path | Installed schema, readiness, resource allocation, stream forwarding and shutdown |
| v0.21.0 `LLMInferenceService` with its vLLM/llm-d presets | Composed workload, router, scheduler and optional P/D configuration | Exact engine image, connector, model and hardware compatibility |
| Inspected `master` SGLang runtime path | A dedicated single-node, non-P/D template selected by `spec.runtime: kserve-llm-sglang` | Current SGLang image, metrics/router contract, model load and lifecycle behavior |
| Inspected `master` DisaggregatedSet path | Optional coordinated management of P/D roles | Feature gate, additional CRDs, migration behavior and role scaling |

The SGLang path is new evidence: its template and runtime definition are **absent from v0.21.0**, although the introducing master commit predates the stable publication date. Release-branch contents decide availability, not merge date alone. The master selector explicitly calls this a single-node non-P/D choice, and the bundled runtime image is `lmsysorg/sglang:v0.5.14`. Its presence does not qualify this atlas's newer SGLang images or its large models, nor does it supply an established SGLang P/D adapter. [KEXP-SGLANGMERGE](https://github.com/kserve/kserve/commit/32055d172ea48ea57c94c9f24db81a2911fc2d64) [KEXP-COMPOSEMASTER](https://github.com/kserve/kserve/blob/22be2b0496eea4548a98395c3abccf48d8235385/pkg/controller/v1alpha2/llmisvc/config_merge.go) [KEXP-SGLANGMASTER](https://github.com/kserve/kserve/blob/22be2b0496eea4548a98395c3abccf48d8235385/config/llmisvcconfig/config-sglang-template.yaml) [KEXP-SGLANGRUNTIME](https://github.com/kserve/kserve/blob/22be2b0496eea4548a98395c3abccf48d8235385/config/runtimes/kserve-llm-sglang.yaml)

## Pin the cooperating versions

These are values in the inspected source, not a tested compatibility matrix or minimum supported versions. Gateway API and its Inference Extension are different dependencies.

| Component/default | v0.21.0 source | Inspected master |
| --- | --- | --- |
| LeaderWorkerSet | v0.8.0 | v0.11.0 |
| Gateway API | v1.5.1 | v1.5.1 |
| Gateway API Inference Extension | v1.5.0 | v1.6.2 |
| llm-d router | v0.10.0 | v0.11.0 |
| KEDA | 2.20.2 | 2.20.2 |
| Base vLLM workload image tag | `llm-d-cuda:v0.9.0` | `llm-d-cuda:v0.9.0` |
| WVA | v0.9.0 installer dependency; WVA and direct KEDA API paths | WVA configuration retained for decoding old objects; operational support removed |

The dependency rows come from each commit's `kserve-deps.env`; the workload image comes from the base templates. An llm-d image tag is not the vLLM package version. Inspect the resolved engine version, CUDA stack and image digest before substituting the atlas's qualified engine image. [KEXP-DEPS21](https://github.com/kserve/kserve/blob/d1482554fc4f66dd41aee70e01f5174e24f265bd/kserve-deps.env) [KEXP-DEPSMASTER](https://github.com/kserve/kserve/blob/22be2b0496eea4548a98395c3abccf48d8235385/kserve-deps.env) [KEXP-TEMPLATE21](https://github.com/kserve/kserve/blob/d1482554fc4f66dd41aee70e01f5174e24f265bd/config/llmisvcconfig/config-llm-template.yaml) [KEXP-APIMASTER](https://github.com/kserve/kserve/blob/22be2b0496eea4548a98395c3abccf48d8235385/pkg/apis/serving/v1alpha2/llm_inference_service_types.go)

A subtle routing difference deserves an explicit check. v0.21.0 includes preset YAML using approximate-prefix and inflight-load producers, a prefix-affinity filter and token-load scoring. However, the composition code requires a declared router version of at least **0.11.0** to inject those presets; its shipped scheduler is **0.10.0**. With shipped defaults and no explicit or previously preserved scheduler configuration, it uses the older `schedulerConfigText()` path, which includes queue, KV-utilization and prefix scoring. Master updates the router to 0.11.0. Capture the **rendered** endpoint-picker configuration: file existence, controller version and active routing policy are three different observations. [KEXP-EPP21](https://github.com/kserve/kserve/blob/d1482554fc4f66dd41aee70e01f5174e24f265bd/config/llmisvcconfig/config-llm-scheduler-eppconfig-default.yaml) [KEXP-COMPOSE21](https://github.com/kserve/kserve/blob/d1482554fc4f66dd41aee70e01f5174e24f265bd/pkg/controller/v1alpha2/llmisvc/config_merge.go) [KEXP-EPPSERVICE21](https://github.com/kserve/kserve/blob/d1482554fc4f66dd41aee70e01f5174e24f265bd/config/llmisvcconfig/config-llm-scheduler.yaml) [KEXP-SCHEDULER21](https://github.com/kserve/kserve/blob/d1482554fc4f66dd41aee70e01f5174e24f265bd/pkg/controller/v1alpha2/llmisvc/scheduler.go) [KEXP-ROUTER](https://github.com/kserve/kserve/commit/786c91ad2912724de94ecbcf6908d73e18ee862f)

## Branch changes that alter experiment design

| Master change absent from the stable path | Why it matters | Experiment |
| --- | --- | --- |
| DisaggregatedSet P/D backend, #6330, October 8 | Both roles can be managed through one workload object; migration replaces existing workloads | K04, K07 |
| DisaggregatedSet KEDA role scaling, #6383, October 15 | Scaling targets role scalers; both DisaggregatedSet and RoleScaler CRDs matter | K05 |
| Zero-surge rollout fix #6378 and zero-replica scale-up fix #6390 | Small replica counts and percentage rounding can affect rollout progress | K05, K07 |
| WVA deprecation, #6263, October 13 | A preserved API field does not mean autoscaling still operates | K05, K07 |
| Router 0.11.0 default, #6258, October 14 | Changes the cooperating image and enables a different default-preset path | K02, K03 |

These changes are visible in fetched master commits and inspected source, not reproduced results. [KEXP-DSMERGE](https://github.com/kserve/kserve/commit/75060774371f6d956207a3587fa5690949b739af) [KEXP-DSKEDA](https://github.com/kserve/kserve/commit/393c8349e6d5d88537b8786f8cd90f0c2ddc6cc1) [KEXP-DSROLLOUT](https://github.com/kserve/kserve/commit/05061768dc803dbff9c287bd6558b25f944452c6) [KEXP-DSZERO](https://github.com/kserve/kserve/commit/a10e88ae379f51e508e3e47cbcb756c13510c8bb) [KEXP-WVA](https://github.com/kserve/kserve/commit/b77d836e120bcde08f46bba2427914e54e47ad53) [KEXP-ROUTER](https://github.com/kserve/kserve/commit/786c91ad2912724de94ecbcf6908d73e18ee862f)

Master's DisaggregatedSet gate defaults off. Its P/D presets request the backend, so enabling the gate can move existing services when the required CRDs are present. The controller explicitly reports that moves onto or off the backend delete old workloads without waiting for replacement readiness. Test this as a potentially interrupting migration. For autoscaled roles, the implementation additionally requires the RoleScaler CRD; it reports a specific fallback reason when absent. [KEXP-DSCONFIGMASTER](https://github.com/kserve/kserve/blob/22be2b0496eea4548a98395c3abccf48d8235385/pkg/controller/v1alpha2/llmisvc/config_loader.go) [KEXP-DSMASTER](https://github.com/kserve/kserve/blob/22be2b0496eea4548a98395c3abccf48d8235385/pkg/controller/v1alpha2/llmisvc/workload_disaggregated.go)

Master rejects newly added or changed WVA configuration and reports existing WVA autoscaling as unsupported/disabled. It reconciles direct `spec.scaling.keda`, with a separate prefill scaling configuration where needed. An upgrade experiment must account for legacy scaling resources and current desired replicas before changing controllers; copying the website's WVA example into this branch is not a valid migration plan. [KEXP-VALIDATIONMASTER](https://github.com/kserve/kserve/blob/22be2b0496eea4548a98395c3abccf48d8235385/pkg/apis/serving/v1alpha2/llm_inference_service_validation.go) [KEXP-SCALINGMASTER](https://github.com/kserve/kserve/blob/22be2b0496eea4548a98395c3abccf48d8235385/pkg/controller/v1alpha2/llmisvc/scaling.go)

## Design within the eight-GPU budget

One TP8 replica owns all eight GPUs. Eight TP1 replicas, two TP4 replicas and one TP8 replica have different memory, scheduling and failure behavior. Compare them only after each topology loads the same artifact correctly; report whole-node goodput.

P/D normally needs a model copy in each role. A checkpoint that only fits at TP8 cannot be made into TP4 prefill plus TP4 decode merely by changing Kubernetes fields. Two TP8 roles require sixteen GPUs under that placement assumption. For this node, begin with an artifact whose two independently qualified role allocations fit the budget, or record the larger-model P/D experiment as blocked on more hardware.

The same accounting applies to rollouts. With all eight GPUs occupied, a second TP8 replica cannot become ready until another eight-GPU group is available or the old replica stops. A zero-downtime objective therefore needs spare capacity or a separately qualified smaller replica topology. The stable LLM API exposes `rolloutStrategy`, but a setting cannot create physical capacity. [KEXP-API21](https://github.com/kserve/kserve/blob/d1482554fc4f66dd41aee70e01f5174e24f265bd/pkg/apis/serving/v1alpha2/llm_inference_service_types.go)

## Prove transfer and lifecycle behavior

The stable P/D templates launch vLLM and conditionally add producer/consumer `NixlConnector` configuration when NIXL is importable and no user transfer configuration overrides it. Their fallback logs that P/D KV transfer stays disabled. Healthy pods alone therefore do not establish a working transfer path. Record the actual connector, transport, transfer counters and prefill work performed at decode. For hybrid models, additionally establish compatible recurrent/conv state transfer; token-KV transport alone is insufficient. [KEXP-DEC21](https://github.com/kserve/kserve/blob/d1482554fc4f66dd41aee70e01f5174e24f265bd/config/llmisvcconfig/config-llm-decode-template.yaml) [KEXP-PREFILL21](https://github.com/kserve/kserve/blob/d1482554fc4f66dd41aee70e01f5174e24f265bd/config/llmisvcconfig/config-llm-prefill-template.yaml) [Benchmark protocol](../../benchmarks/PROTOCOL.md)

Set readiness after model load and warmup, measure startup allowances, and test request draining before terminating a sharded group. Record queue/arrival signals and metric availability before enabling scaling. Zero engine replicas remove pod-local demand signals: a successful wake-up needs an observable trigger that remains available and an explicit policy for requests arriving during startup. K05 tests that design rather than assuming that a zero minimum provides request buffering.

Authenticate at the gateway, bound request sizes and token budgets, and define tenant/cache-key isolation. Pin model revisions and all participating images, retain the resolved configuration, and prepare a rollback artifact. These are experiment prerequisites and operating recommendations, not claims that every default template provides them.

## Included rendering path

The [renderer](../../deploy/kserve/render.py) emits a custom-container `InferenceService` in Standard mode with an existing model PVC, explicit GPU limits, shared memory and probes. Supply a real digest, existing node labels and measured host resources. It neither deploys the service nor constructs the LLMInferenceService experiments above. [Deployment boundary](../../deploy/kserve/README.md) [KCONST21](https://github.com/kserve/kserve/blob/d1482554fc4f66dd41aee70e01f5174e24f265bd/pkg/constants/constants.go)

```bash
python deploy/kserve/render.py --help
python deploy/kserve/render.py \
  --profile profiles/qwen3.8-27b.bf16.vllm.baseline.json \
  --image registry.example/engine@sha256:YOUR_64_HEX_DIGEST \
  --pvc model-cache --model-subpath qwen/pinned-revision \
  --name qwen27b --cpu 16 --host-memory 128Gi > service.json
kubectl apply --dry-run=server -f service.json
```

The illustrative digest is deliberately rejected until replaced. CPU and memory values are examples, not measured requirements. The final command is an operator-side schema/admission check against a chosen cluster; it does not measure engine correctness, transfer, latency or availability.
