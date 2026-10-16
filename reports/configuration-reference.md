# Configuration reference

These **34 source-derived references** consolidate the former per-file launch profiles. Full argument arrays, exact model/draft revisions, source IDs and inspected source commits are in [catalog/configurations.json](../catalog/configurations.json). This file is reference data; no launcher is included.

Each reference is untested on the target node. Read the current family serving page before using an older reference: new research can identify restrictions or additional candidates without silently rewriting its historical source identity. Memory fractions, context caps and admission limits are starting hypotheses, not universal defaults.

## Retained configuration snapshots

| ID | Engine | GPUs / TP / DP | Context cap | Status | Rationale |
| --- | --- | --- | ---: | --- | --- |
| `kimi-k3.native.sglang.baseline` | sglang | 8 / 8 / 1 | 65536 | candidate | Native publisher MXFP4 path; 64K conservative cap. Symmetric memory is a separate topology-specific experiment. |
| `kimi-k3.native.vllm.baseline` | vllm | 8 / 8 / 1 | 65536 | candidate | Native checkpoint baseline; confirm the exact Kimi release recipe and kernels in the selected image. |
| `kimi-k3.nvfp4.sglang.baseline` | sglang | 8 / 8 / 1 | 65536 | candidate | Merged mixed NVFP4/FP8 compatibility fix; target-only correctness before drafting. No B300 speed claim. |
| `kimi-k3.nvfp4.vllm.baseline` | vllm | 8 / 8 / 1 | 65536 | blocked | Exact mixed FP8-attention compatibility not certified: complementary PR 52406 remains open. Do not execute on generic main without an audited compatibility path. |
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
