# Configuration reference

The [catalog](../catalog/configurations.json) contains **59 source-derived configuration references**. Each records the target and optional draft revision, argument array, hardware allocation and the origin of the recipe. Read `engine_env` and `engine_image` when present. The five November 20 additions use different evidence and answer different benchmark questions.

Each reference is untested on the target node. Read the current family serving page before using an older reference: new research can identify restrictions or additional candidates without silently rewriting its historical source identity. Memory fractions, context caps and admission limits are starting hypotheses, not universal defaults.

KServe is required for all 59 references. The pod command, engine image, model mount, resource allocation, startup probe and route must match the installed integration. For example, the TP1 Qwen SGLang references specify port 30000. Align that port with the rendered Service and probes, or explicitly adapt it. Record any such change with the benchmark. [KServe configuration and runtime](../frameworks/kserve/ARCHITECTURE.md).

## Choosing a record for analysis

**November 20 review.** Each family’s `latest_stable_review` and every configuration’s `latest_release_recheck` identify the assessed release and the qualifications on its use. The 54 existing records keep their original arguments and build identities, along with their November 6 rechecks in `prior_release_rechecks`. A named stable release in the recheck identifies the comparison source. For example, SGLang’s v0.5.23 cookbook marks the general B300 Qwen Flash Next NVIDIA cells unverified, while the AgentX reference below uses an older, digest-pinned development image. [vLLM v0.34.0](vllm-v034-upgrade.md) · [SGLang v0.5.23 and development recipes](sglang-2026-11-20.md).

| November 20 configuration ID | Comparison and limits |
| --- | --- |
| `mistral-large-4.fp8.vllm.v034.tp8.dspark` and `mistral-large-4.nvfp4.vllm.v034.tp8.dspark` | v0.34.0 release-source recipe for both TP8 exports with three-token bundled DSpark and a 262,144-token cap. Establish target-only quality first. Stock-release execution remains unmeasured. [Release recipe analysis](vllm-v034-upgrade.md#mistral-large-4-configuration-references). |
| `qwen3.8-flash-next.nvfp4.sglang.agentx-tp1-c12` | One B300 worker, with host PLE and NEXTN. The upstream source point used concurrency 12 and synthetic acceptance length 2.32. The engine admission limit was 96. The catalog records the recipe for natural acceptance and preserves that difference from the published run. [AgentX source review](sglang-2026-11-20.md). |
| `qwen3.8-27b.nvfp4-qad.sglang.v0523.tp1` | SGLang TP1 reference for the NVIDIA quantization-aware distillation export. Hold the template, cache dtype and used input IDs fixed when comparing against the separately published PTQ export. [Qwen precision](../companies/alibaba-qwen/qwen3.8-27b/precision.md). |
| `muse-glimmer-30b.redhat-nvfp4.vllm.v034.tp1` | Red Hat W4A4 export. The argument record identifies the adaptation from its named development image to stock v0.34.0. Establish correct text, image and tool output at TP1 before comparing capacity against BF16. [Muse precision](../companies/meta/muse-glimmer-30b/precision.md). |

**October 26 recheck (historical):** at that date the 40 records then present received a `latest_release_recheck` identifying vLLM v0.32.0 or SGLang v0.5.22, the unchanged model pin, selected-source findings and required reconciliation; those entries are now in `prior_release_rechecks`, and the corresponding model assessments are in `prior_stable_reviews`. `argument_array_status` explicitly preserves the historical command: this metadata is not full CLI validation. In particular, GLM flagship NVFP4 arrays that omit KV dtype inherit the v0.32 FP8 default on B300; Kimi DCP+DSpark needs static ragged verification; the historical SGLang Mistral array omits publisher parser arguments. Reconcile those controls in the separate execution repository.

For **SGLang v0.5.22**, read `sglang_v0522_b300_review` and `recommended_sglang_v0522_b300` in the model catalog, plus the [release-scoped argument and experiment guide](sglang-v0522-upgrade.md). It includes model-specific argument fragments, cache/graph restrictions and the replica-DP/attention-DP migration. These do not rewrite or certify the 40 historical launch arrays below.

For **vLLM v0.32**, read `vllm_v032_b300_review` and `recommended_vllm_v032_b300` in the model catalog, plus the [upgrade analysis](vllm-v032-upgrade.md). These are source-derived experiment priorities, not newly qualified launch arrays. The 40 argument records below retain their original scope; reconcile removed options, changed defaults and exact backend gates before using them with v0.32.

`reference_scope` distinguishes historical source snapshots, release-specific comparisons, publisher transcriptions and adaptations to a different image or release. `status` describes an untested candidate or compatibility probe. Reading the current applicability metadata alongside the source revision preserves the difference between a recorded command and a newly measured result.

For B300/vLLM v0.31, first read the selected model's `vllm_v031_b300_review` in `catalog/models.json`, including constraints and source IDs. This analysis covers all eight families; only Qwen27 currently has six explicit `.vllm.v031.` argument records. Reconcile other retained arguments with their family review before execution.

```bash
# Current stable assessment for both engines
jq '.models[] | {key, review: .latest_stable_review}' catalog/models.json

# Current applicability of each historical argument array
jq '.[] | {id, recheck: .latest_release_recheck}' catalog/configurations.json

# Pinned publisher README copied under each family
jq '.models[] | {key, readme: .huggingface_readme}' catalog/models.json

# Release-scoped analysis for one family
jq '.models[] | select(.key == "kimi-k3") | .vllm_v031_b300_review' catalog/models.json

# Explicit release-specific argument references
jq '.[] | select(.reference_scope == "release-specific-comparison") | {id, engine_release, model_revision, engine_args, tested_on_target}' catalog/configurations.json
```

`recommended` is the broader multi-engine summary; `recommended_vllm_v031_b300` is the release-scoped summary. Read their evidence and constraints before applying either. Preserve the reviewed source SHA, model/draft/tokenizer revisions and actual image identity separately.

## Qwen27 release-specific comparisons (October 17)

These six target-only references use vLLM **v0.31.0**, TP1, BF16 activation boundaries, 32K context, 32 sequences, a 16K batching budget, 0.90 memory utilization and the same prefix/chunked-prefill and parser controls. They carry exact model/tokenizer revision arguments and a separate source identity. They do not rewrite or certify the older snapshots below. [Mechanisms, restrictions and optional MTP delta](../companies/alibaba-qwen/qwen3.8-27b/serving.md).

| ID | Weight export | Full-attention backend | KV dtype |
| --- | --- | --- | --- |
| `qwen3.8-27b.bf16.vllm.v031.fi-bf16-kv` | bf16 | FlashInfer | bfloat16 |
| `qwen3.8-27b.fp8.vllm.v031.fi-bf16-kv` | fp8 | FlashInfer | bfloat16 |
| `qwen3.8-27b.nvfp4.vllm.v031.fi-bf16-kv` | nvfp4 | FlashInfer | bfloat16 |
| `qwen3.8-27b.fp8.vllm.v031.fi-fp8-kv` | fp8 | FlashInfer | fp8_e4m3 |
| `qwen3.8-27b.nvfp4.vllm.v031.fi-fp8-kv` | nvfp4 | FlashInfer | fp8_e4m3 |
| `qwen3.8-27b.nvfp4.vllm.v031.fa4-bf16-kv` | nvfp4 | FA4 | bfloat16 |

## Retained configuration snapshots

| ID | Engine | GPUs / TP / DP | Context cap | Status | Rationale |
| --- | --- | --- | ---: | --- | --- |
| `kimi-k3.native.sglang.baseline` | sglang | 8 / 8 / 1 | 65536 | candidate | Native publisher MXFP4 path; 64K conservative cap. Symmetric memory is a separate topology-specific experiment. |
| `kimi-k3.native.vllm.baseline` | vllm | 8 / 8 / 1 | 65536 | candidate | Native checkpoint baseline; confirm the exact Kimi release recipe and kernels in the selected image. |
| `kimi-k3.nvfp4.sglang.baseline` | sglang | 8 / 8 / 1 | 65536 | candidate | Merged mixed NVFP4/FP8 compatibility fix; target-only correctness before drafting. No B300 speed claim. |
| `kimi-k3.nvfp4.vllm.baseline` | vllm | 8 / 8 / 1 | 65536 | compatibility-probe | October 17 corrects the old open-PR blocker rationale: selected fixes exist in v0.31, but exact mixed-export image is unqualified and the old patch is not drop-in. Historical arguments retained. |
| `kimi-k3.nvfp4.sglang.dspark` | sglang | 8 / 8 / 1 | 65536 | candidate | Model-specific draft candidate, separate from target-only baseline. Natural acceptance only; no simulated acceptance environment. |
| `glm-5.3.fp8.vllm.baseline` | vllm | 8 / 8 / 1 | 65536 | candidate | Model-specific vLLM recipe, context/concurrency reduced for initial verification. |
| `glm-5.3.nvfp4.vllm.baseline` | vllm | 8 / 8 / 1 | 65536 | candidate | RedHat export. Use loader auto-detection, inspect effective quantization and compare quality to official FP8. |
| `glm-5.3.fp8.vllm.mtp` | vllm | 8 / 8 / 1 | 65536 | candidate | Documented MTP proposal-depth candidate; verify acceptance and memory after target-only correctness. |
| `glm-5.3.fp8.sglang.baseline` | sglang | 8 / 8 / 1 | 65536 | compatibility-probe | Challenger engine. The cookbook uses glm47 for tool calls and glm45 for reasoning; exact checkpoint/image smoke testing remains mandatory. |
| `glm-5.3-flash.fp8.sglang.baseline` | sglang | 4 / 4 / 1 | 65536 | candidate | Blackwell FP8 candidate. Use an exact-payload parser smoke test before enabling automatic tools; compare TP8 as another experiment. |
| `glm-5.3-flash.fp8.sglang.mtp` | sglang | 4 / 4 / 1 | 65536 | candidate | The SGLang recipe exposes this MTP route through EAGLE; not a generic external EAGLE drafter. |
| `glm-5.3-flash.fp8.vllm.baseline` | vllm | 4 / 4 / 1 | 65536 | candidate | FP8 challenger; confirm NoPE sparse MLA, hybrid state, multimodal handling and parser registration in the pinned image. |
| `glm-5.3-flash.nvfp4.vllm.baseline` | vllm | 4 / 4 / 1 | 65536 | compatibility-probe | Exact RedHat card/config are pinned and inspected; mixed NVFP4 routed experts and FP8 MTP still require loader, kernel and quality checks in the selected image. |
| `deepseek-v4-flash-0731.native.vllm.ep4` | vllm | 4 / 1 / 4 | 65536 | candidate | DP4 derives from the source Blackwell recipe; DP8 is an unbenchmarked eight-GPU adaptation. EP does not multiply GPU count again. |
| `deepseek-v4-flash-0731.native.vllm.ep8` | vllm | 8 / 1 / 8 | 65536 | candidate | DP4 derives from the source Blackwell recipe; DP8 is an unbenchmarked eight-GPU adaptation. EP does not multiply GPU count again. |
| `deepseek-v4-flash-0731.native.vllm.dspark` | vllm | 4 / 1 / 4 | 65536 | candidate | Built-in July-31 DSpark, not MTP. Config block size and CLI proposal count have different meanings. |
| `deepseek-v4-flash-0731.native.sglang.baseline` | sglang | 8 / 8 / 1 | 65536 | compatibility-probe | Exact 0731 serializer and DSpark path must pass before comparison; no substitution with a later V4.1 model. |
| `qwen3.8-27b.bf16.vllm.baseline` | vllm | 1 / 1 / 1 | 32768 | candidate | TP1 fits as a memory candidate. Compare eight independent replicas against TP2/4; default cache resolution must be recorded. |
| `qwen3.8-27b.fp8.vllm.baseline` | vllm | 1 / 1 / 1 | 32768 | candidate | TP1 fits as a memory candidate. Compare eight independent replicas against TP2/4; default cache resolution must be recorded. |
| `qwen3.8-27b.nvfp4.vllm.baseline` | vllm | 1 / 1 / 1 | 32768 | candidate | TP1 fits as a memory candidate. Compare eight independent replicas against TP2/4; default cache resolution must be recorded. |
| `qwen3.8-27b.bf16.sglang.baseline` | sglang | 1 / 1 / 1 | 32768 | candidate | TP1 fits as a memory candidate. Compare eight independent replicas against TP2/4; default cache resolution must be recorded. |
| `qwen3.8-27b.fp8.sglang.baseline` | sglang | 1 / 1 / 1 | 32768 | candidate | TP1 fits as a memory candidate. Compare eight independent replicas against TP2/4; default cache resolution must be recorded. |
| `qwen3.8-27b.nvfp4.sglang.baseline` | sglang | 1 / 1 / 1 | 32768 | candidate | TP1 fits as a memory candidate. Compare eight independent replicas against TP2/4; default cache resolution must be recorded. |
| `qwen3.8-27b.nvfp4.sglang.mtp` | sglang | 1 / 1 / 1 | 32768 | candidate | Source cookbook MTP candidate; dynamic/recurrent state pools must accommodate verification. |
| `gemma-4-31b-it.bf16.vllm.baseline` | vllm | 1 / 1 / 1 | 32768 | candidate | TP1 dense baseline. Auto tools are intentionally off until the exact Gemma4 chat template and parser are pinned. |
| `gemma-4-31b-it.fp8.vllm.baseline` | vllm | 1 / 1 / 1 | 32768 | candidate | TP1 dense baseline. Auto tools are intentionally off until the exact Gemma4 chat template and parser are pinned. |
| `gemma-4-31b-it.nvfp4.vllm.baseline` | vllm | 1 / 1 / 1 | 32768 | candidate | TP1 dense baseline. Auto tools are intentionally off until the exact Gemma4 chat template and parser are pinned. |
| `gemma-4-31b-it.nvfp4.sglang.baseline` | sglang | 1 / 1 / 1 | 32768 | compatibility-probe | Exact RedHat mixed export integration must be tested; a model-card UI widget is insufficient support evidence. |
| `mistral-medium-3.5.fp8.vllm.baseline` | vllm | 8 / 8 / 1 | 32768 | candidate | Producer-endorsed engine and TP8; this baseline reduces context/concurrency for cold-start correctness. |
| `mistral-medium-3.5.fp8.vllm.tp2-probe` | vllm | 2 / 2 / 1 | 32768 | compatibility-probe | Two-GPU memory/throughput experiment only; not a measured optimization. Long-context KV grows strongly. |
| `mistral-medium-3.5.fp8.sglang.baseline` | sglang | 8 / 8 / 1 | 32768 | compatibility-probe | Exact checkpoint layout, tokenizer and image preprocessing support not certified here. |
| `mistral-medium-3.5.nvfp4.vllm.tp4` | vllm | 4 / 4 / 1 | 32768 | candidate | NVIDIA NVFP4 export, exporter TP width, two replicas per node; v0.33.0 `modelopt_mixed` load path by source reading; FP8 publisher baseline is the quality control. |
| `mistral-medium-3.5.nvfp4.vllm.tp2` | vllm | 2 / 2 / 1 | 32768 | compatibility-probe | NVFP4 capacity alternative, four replicas per node; 47.61 GB weights per GPU versus 66.80 GB for FP8. |
| `mistral-medium-3.5.nvfp4.sglang.tp4` | sglang | 4 / 4 / 1 | 32768 | compatibility-probe | Expected weight-load failure at v0.5.23: fused `qkv_proj`/`gate_up_proj` unresolved for Mistral3 `modelopt_mixed`. |
| `qwen3.8-flash-next.nvfp4.vllm.baseline` | vllm | 8 / 8 / 1 | 65536 | candidate | Producer-supported mixed precision path; includes PLE/ngram memory. Do not count only the 125B core. |
| `qwen3.8-flash-next.nvfp4.vllm.mtp` | vllm | 8 / 8 / 1 | 65536 | candidate | TP8+EP MTP shape contract; mixed FP8 MTP fix PR 55513 merged. Verify it is in the actual image. |
| `qwen3.8-flash-next.nvfp4.sglang.baseline` | sglang | 1 / 1 / 1 | 65536 | compatibility-probe | Exact NVIDIA TP1 recipe added by SGLang PR 41046 is explicitly marked verified:false. Retain a compatibility probe until loader, kernels and quality pass on the selected image. |

## How to interpret the values

- GPU count is the physical allocation. EP may use the same rank world; do not multiply it into GPU count again.
- Context caps include serialized input and requested output. They do not establish long-context quality.
- Candidate and compatibility-probe records still need an exact supported runtime. A blocked record documents a restriction; it is not an executable recommendation.
- The argument arrays describe the retained source snapshot. Inspect effective dtype, parser, backend and model-specific normalization in the chosen image.
- Newly identified NVIDIA GLM, DeepSeek NVFP4 and separate assistant/draft artifacts remain separate observations in the [upstream identities](../evidence/upstreams.lock.json), with details in their family pages.

See [optimization reasoning](optimization.md), [framework selection](../frameworks/DECISION.md), and [the supplied-report corrections](report-review.md).

## Applying the FP8/FA4 findings

The newly supplied generic commands are not added as production configurations. Use the source-reviewed controls in the [vLLM](../frameworks/vllm/SOURCE_REVIEW.md) and [SGLang](../frameworks/sglang/SOURCE_REVIEW.md) pages: vLLM's field is `flash_attn_version`, an ordinary FA4 override does not select DeepSeek DSA, and SGLang's cache/page/phase restrictions must be resolved together. An FP8 checkpoint, FP8 cache and native FP8 attention are separate configuration choices. The historical catalog above remains tied to its own inspected sources; the new findings do not certify those references against a newer binary.
