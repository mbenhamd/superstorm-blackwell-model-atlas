# KServe deployment architecture

## Scope and current release

The latest stable release, rechecked October 15, 2026, is **v0.21.0**, published September 25. Its tag resolves to `d1482554fc4f66dd41aee70e01f5174e24f265bd`. The separately observed master branch is `22be2b0496eea4548a98395c3abccf48d8235385` at 21:52 UTC; this is branch metadata, not a controller execution test. No cluster or CRD installation was available for validation here. [KREL](https://github.com/kserve/kserve/releases/tag/v0.21.0) [KMAIN](https://github.com/kserve/kserve/commit/22be2b0496eea4548a98395c3abccf48d8235385)

The retrieved website pages identify their documentation version as **0.20**. The v0.21.0 source schemas were checked separately: both `LLMInferenceService` and `LLMInferenceServiceConfig` serve `v1alpha1` and `v1alpha2`, with `v1alpha2` as the storage version. Thus a `v1alpha1` example is not automatically invalid, but the website is not proof of a release-matched manifest. [KSLLM](https://kserve.github.io/website/docs/model-serving/generative-inference/llmisvc/llmisvc-overview) [KSCFG](https://kserve.github.io/website/docs/model-serving/generative-inference/llmisvc/llmisvc-configuration) [KCRD21](https://github.com/kserve/kserve/blob/d1482554fc4f66dd41aee70e01f5174e24f265bd/config/crd/full/llmisvc/serving.kserve.io_llminferenceservices.yaml) [KCONFIGCRD21](https://github.com/kserve/kserve/blob/d1482554fc4f66dd41aee70e01f5174e24f265bd/config/crd/full/llmisvc/serving.kserve.io_llminferenceserviceconfigs.yaml)

## Start with one node and colocated prefill/decode

```text
Client
  → authenticated gateway / admission limits
  → KServe-managed service
  → one pod owning N complete GPUs
  → vLLM or SGLang process group
  → tokenizer / model / cache / kernels
```

For TP8, one model replica owns eight GPUs and forms an eight-rank process group. Eight independent one-GPU replicas are a different architecture. For a small dense model, use independent TP1 replicas deliberately and route requests across them. For a TP4 comparison, allocate two non-overlapping GPU groups, not two processes competing for the same four devices.

The included [renderer](../../deploy/kserve/render.py) emits a custom-container `InferenceService` with the Standard deployment-mode annotation, which exists in the v0.21.0 source. It uses a read-only model PVC, explicit GPU limits, a memory-backed shared-memory mount and health probes. Host CPU/memory requests and the image digest are required inputs; they are not guessed from the DGX reference machine. Local rendering does not validate the installed CRD, admission policy, device allocation or endpoint behavior. [KCONST21](https://github.com/kserve/kserve/blob/d1482554fc4f66dd41aee70e01f5174e24f265bd/pkg/constants/constants.go) [KSAPI](https://kserve.github.io/website/docs/reference/crd-api) [KSMULTI](https://kserve.github.io/website/docs/model-serving/generative-inference/multi-node)

## Move to LLMInferenceService when its features are needed

The specialized API composes model, workload and router configuration. It can represent worker groups, prefill/decode roles and KV-aware scheduling, using compatible infrastructure such as LeaderWorkerSet and Gateway API. Use the release-matched CRDs and templates. Do not paste a field from a different release and assume Kubernetes accepts its meaning. [KSLLM](https://kserve.github.io/website/docs/model-serving/generative-inference/llmisvc/llmisvc-overview) [KSCFG](https://kserve.github.io/website/docs/model-serving/generative-inference/llmisvc/llmisvc-configuration)

An engine that serves an HTTP-compatible endpoint is not automatically compatible with every advanced llm-d scheduling or transfer feature. For SGLang, separately establish router metadata, endpoint metrics, cache-transfer protocol, state transfer and health semantics. Keep basic custom-container operation distinct from advanced integration.

Official docs contain simplified model-size examples and differ in how broadly they describe older InferenceService multi-node support. Treat those as documentation scope differences, not physical parameter-count limits. For this repo, the supported template scope is explicitly single-node; advanced multi-node manifests are not claimed validated. [KSLLM](https://kserve.github.io/website/docs/model-serving/generative-inference/llmisvc/llmisvc-overview) [KSMULTI](https://kserve.github.io/website/docs/model-serving/generative-inference/multi-node)

## When disaggregation pays

Prefill/decode separation can reduce interference and allow different resource allocation. It also adds routing, transfer, buffering and failure-recovery costs. Require a measured win at the same quality and latency objective. For hybrid models, transferring token KV but not compatible recurrent/conv state is insufficient. The GLM Flash recipe explicitly couples layouts and speculative depth on both sides. [glm-5.3-flash-VR](https://recipes.vllm.ai/zai-org/GLM-5.3-Flash)

## Operational controls

Authenticate at the gateway, constrain input/output tokens and image payloads, rate-limit tenants and separate privileged management endpoints. Mount immutable models read-only and keep registry/model credentials in managed secrets, not command-line strings or Git. Use explicit image digests and retain a rollback artifact.

Define readiness only after weights and warmup are complete. Size startup allowances from measured cold starts. Termination must drain or reject work predictably before killing a sharded process group. Scale on meaningful request/queue/service metrics rather than CPU utilization alone; the precise autoscaler adapter must be validated against the chosen version.

Prefix reuse can improve service but can also leak cross-tenant information through timing or reuse policy. Define isolation and cache-key semantics, and test them. This is an operational recommendation; this source review did not establish every engine’s tenant-isolation guarantees.

## Safe render and validate

```bash
python deploy/kserve/render.py --help
# Supply a real immutable image, an existing PVC and locally measured resources.
python deploy/kserve/render.py \
  --profile profiles/qwen3.8-27b.bf16.vllm.baseline.json \
  --image registry.example/engine@sha256:YOUR_64_HEX_DIGEST \
  --pvc model-cache --model-subpath qwen/pinned-revision \
  --name qwen27b --cpu 16 --host-memory 128Gi > service.json
kubectl apply --dry-run=server -f service.json
```

The illustrative digest is deliberately rejected by the renderer. Replace it with a real digest; no deployment is performed by this repository’s validation tests.
