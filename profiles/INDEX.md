# Profile index

Every row is unbenchmarked on the target node. See [guardrails](README.md).

| Profile | GPUs | Status | Rationale |
| --- | ---: | --- | --- |
| [kimi-k3.native.sglang.baseline](kimi-k3.native.sglang.baseline.json) | 8 | candidate | Native publisher MXFP4 path; 64K conservative cap. Symmetric memory is a separate topology-specific experiment. |
| [kimi-k3.native.vllm.baseline](kimi-k3.native.vllm.baseline.json) | 8 | candidate | Native checkpoint baseline; confirm the exact Kimi release recipe and kernels in the selected image. |
| [kimi-k3.nvfp4.sglang.baseline](kimi-k3.nvfp4.sglang.baseline.json) | 8 | candidate | Merged mixed NVFP4/FP8 compatibility fix; target-only correctness before drafting. No B300 speed claim. |
| [kimi-k3.nvfp4.vllm.baseline](kimi-k3.nvfp4.vllm.baseline.json) | 8 | blocked | Exact mixed FP8-attention compatibility not certified: complementary PR 52406 remains open. Do not execute on generic main without an audited compatibility path. |
| [kimi-k3.nvfp4.sglang.dspark](kimi-k3.nvfp4.sglang.dspark.json) | 8 | candidate | Model-specific draft candidate, separate from target-only baseline. Natural acceptance only; no simulated acceptance environment. |
| [glm-5.3.fp8.vllm.baseline](glm-5.3.fp8.vllm.baseline.json) | 8 | candidate | Model-specific vLLM recipe, context/concurrency reduced for initial verification. |
| [glm-5.3.nvfp4.vllm.baseline](glm-5.3.nvfp4.vllm.baseline.json) | 8 | candidate | RedHat export. Use loader auto-detection, inspect effective quantization and compare quality to official FP8. |
| [glm-5.3.fp8.vllm.mtp](glm-5.3.fp8.vllm.mtp.json) | 8 | candidate | Documented MTP proposal-depth candidate; verify acceptance and memory after target-only correctness. |
| [glm-5.3.fp8.sglang.baseline](glm-5.3.fp8.sglang.baseline.json) | 8 | compatibility-probe | Challenger engine. Parser names are engine-specific; exact checkpoint/image smoke test remains mandatory. |
| [glm-5.3-flash.fp8.sglang.baseline](glm-5.3-flash.fp8.sglang.baseline.json) | 4 | candidate | Blackwell FP8 candidate. Use an exact-payload parser smoke test before enabling automatic tools; compare TP8 as another experiment. |
| [glm-5.3-flash.fp8.sglang.mtp](glm-5.3-flash.fp8.sglang.mtp.json) | 4 | candidate | The SGLang recipe exposes this MTP route through EAGLE; not a generic external EAGLE drafter. |
| [glm-5.3-flash.fp8.vllm.baseline](glm-5.3-flash.fp8.vllm.baseline.json) | 4 | candidate | FP8 challenger; confirm NoPE sparse MLA, hybrid state, multimodal handling and parser registration in the pinned image. |
| [glm-5.3-flash.nvfp4.vllm.baseline](glm-5.3-flash.nvfp4.vllm.baseline.json) | 4 | compatibility-probe | Export linked in engine recipe, but complete exact derivative config not separately audited. |
| [deepseek-v4-flash-0731.native.vllm.ep4](deepseek-v4-flash-0731.native.vllm.ep4.json) | 4 | candidate | DP4 derives from the source Blackwell recipe; DP8 is an unbenchmarked eight-GPU adaptation. EP does not multiply GPU count again. |
| [deepseek-v4-flash-0731.native.vllm.ep8](deepseek-v4-flash-0731.native.vllm.ep8.json) | 8 | candidate | DP4 derives from the source Blackwell recipe; DP8 is an unbenchmarked eight-GPU adaptation. EP does not multiply GPU count again. |
| [deepseek-v4-flash-0731.native.vllm.dspark](deepseek-v4-flash-0731.native.vllm.dspark.json) | 4 | candidate | Built-in July-31 DSpark, not MTP. Config block size and CLI proposal count have different meanings. |
| [deepseek-v4-flash-0731.native.sglang.baseline](deepseek-v4-flash-0731.native.sglang.baseline.json) | 8 | compatibility-probe | Exact 0731 serializer and DSpark path must pass before comparison; no substitution with a later V4.1 model. |
| [qwen3.8-27b.bf16.vllm.baseline](qwen3.8-27b.bf16.vllm.baseline.json) | 1 | candidate | TP1 fits as a memory candidate. Compare eight independent replicas against TP2/4; default cache resolution must be recorded. |
| [qwen3.8-27b.fp8.vllm.baseline](qwen3.8-27b.fp8.vllm.baseline.json) | 1 | candidate | TP1 fits as a memory candidate. Compare eight independent replicas against TP2/4; default cache resolution must be recorded. |
| [qwen3.8-27b.nvfp4.vllm.baseline](qwen3.8-27b.nvfp4.vllm.baseline.json) | 1 | candidate | TP1 fits as a memory candidate. Compare eight independent replicas against TP2/4; default cache resolution must be recorded. |
| [qwen3.8-27b.bf16.sglang.baseline](qwen3.8-27b.bf16.sglang.baseline.json) | 1 | candidate | TP1 fits as a memory candidate. Compare eight independent replicas against TP2/4; default cache resolution must be recorded. |
| [qwen3.8-27b.fp8.sglang.baseline](qwen3.8-27b.fp8.sglang.baseline.json) | 1 | candidate | TP1 fits as a memory candidate. Compare eight independent replicas against TP2/4; default cache resolution must be recorded. |
| [qwen3.8-27b.nvfp4.sglang.baseline](qwen3.8-27b.nvfp4.sglang.baseline.json) | 1 | candidate | TP1 fits as a memory candidate. Compare eight independent replicas against TP2/4; default cache resolution must be recorded. |
| [qwen3.8-27b.nvfp4.sglang.mtp](qwen3.8-27b.nvfp4.sglang.mtp.json) | 1 | candidate | Source cookbook MTP candidate; dynamic/recurrent state pools must accommodate verification. |
| [gemma-4-31b-it.bf16.vllm.baseline](gemma-4-31b-it.bf16.vllm.baseline.json) | 1 | candidate | TP1 dense baseline. Auto tools are intentionally off until the exact Gemma4 chat template and parser are pinned. |
| [gemma-4-31b-it.fp8.vllm.baseline](gemma-4-31b-it.fp8.vllm.baseline.json) | 1 | candidate | TP1 dense baseline. Auto tools are intentionally off until the exact Gemma4 chat template and parser are pinned. |
| [gemma-4-31b-it.nvfp4.vllm.baseline](gemma-4-31b-it.nvfp4.vllm.baseline.json) | 1 | candidate | TP1 dense baseline. Auto tools are intentionally off until the exact Gemma4 chat template and parser are pinned. |
| [gemma-4-31b-it.nvfp4.sglang.baseline](gemma-4-31b-it.nvfp4.sglang.baseline.json) | 1 | compatibility-probe | Exact RedHat mixed export integration must be tested; a model-card UI widget is insufficient support evidence. |
| [mistral-medium-3.5.fp8.vllm.baseline](mistral-medium-3.5.fp8.vllm.baseline.json) | 8 | candidate | Producer-endorsed engine and TP8; this baseline reduces context/concurrency for cold-start correctness. |
| [mistral-medium-3.5.fp8.vllm.tp2-probe](mistral-medium-3.5.fp8.vllm.tp2-probe.json) | 2 | compatibility-probe | Two-GPU memory/throughput experiment only; not a measured optimization. Long-context KV grows strongly. |
| [mistral-medium-3.5.fp8.sglang.baseline](mistral-medium-3.5.fp8.sglang.baseline.json) | 8 | compatibility-probe | Exact checkpoint layout, tokenizer and image preprocessing support not certified here. |
| [qwen3.8-flash-next.nvfp4.vllm.baseline](qwen3.8-flash-next.nvfp4.vllm.baseline.json) | 8 | candidate | Producer-supported mixed precision path; includes PLE/ngram memory. Do not count only the 125B core. |
| [qwen3.8-flash-next.nvfp4.vllm.mtp](qwen3.8-flash-next.nvfp4.vllm.mtp.json) | 8 | candidate | TP8+EP MTP shape contract; mixed FP8 MTP fix PR 55513 merged. Verify it is in the actual image. |
| [qwen3.8-flash-next.nvfp4.sglang.baseline](qwen3.8-flash-next.nvfp4.sglang.baseline.json) | 4 | compatibility-probe | Exact NVIDIA PLE/MTP mixed loader requires independent verification; TP4 is a hypothesis, not an endorsement. |
