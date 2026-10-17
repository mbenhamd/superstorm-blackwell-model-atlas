# GLM 5.3 Flash: serving on 8×B300

**Status: unbenchmarked local recommendations.** The upstream recipes are evidence of documented support, not a benchmark of the target B300 node.

## B300 / vLLM v0.31.0 priority (October 17)

Official FP8: two TP4 KServe replicas versus one TP8 group. Investigate FP8 TP2 ×4 replicas, then RedHat mixed NVFP4 TP1 ×8 if runtime memory/kernels permit; MTP separately.

These narrower layouts are hypotheses. FP8 payload about 328 GB excludes TP1 full residency; mixed payload about 198 GB makes TP1 plausible, not guaranteed. Preserve NVFP4 main experts and FP8 MTP experts. These are selected-source candidates inside mandatory KServe, with no engine execution or measured B300 winner. [glm-5.3-flash-INDEX](https://huggingface.co/zai-org/GLM-5.3-Flash/resolve/46a050bec13002ad29ee795c16e61cf4fa3c4a9c/model.safetensors.index.json) [glm-5.3-flash-NV-INDEX](https://huggingface.co/RedHatAI/GLM-5.3-Flash-NVFP4/resolve/18d55bfd5a2194887738da73753975c9d3842f46/model.safetensors.index.json) [glm-5.3-flash-NV-CFG](https://huggingface.co/RedHatAI/GLM-5.3-Flash-NVFP4/raw/18d55bfd5a2194887738da73753975c9d3842f46/config.json) [Q31-CAT-V031-VLLM-MODELS-GLM5NEXT-COMMON-MTP-PY](https://raw.githubusercontent.com/vllm-project/vllm/db9527a46873454610df6dbedf79a36d6bf1a7f6/vllm/models/glm5next/common/mtp.py)

## Engine and topology

Use one TP4 target-only process as a starting candidate, then compare a second independent TP4 replica against a TP8 process. TP4 is a workload hypothesis, not a demonstrated optimum or minimum. SGLang’s Blackwell cookbook selects FlashInfer TRT-LLM MoE; vLLM provides an explicit TP4 FP8 recipe and an optional TP4-prefill plus TP4-decode layout.

First determine whether prefill interference warrants prefill/decode separation. The vLLM recipe requires matching KDA convolution-state layout, KV layout and speculative depth on both sides. A KV-only copy that omits recurrent state is not a correct migration. SGLang documents its PD route as a preview with dummy-weight mechanical checks only; it lacks real-weight load/accuracy qualification, and its current documented PD path does not start with speculative decoding. Keep speculation off and both roles at the same TP size for that separate probe.

The vLLM Flash recipe still contains historical integration/version guidance and differing FlashInfer minimums (0.6.17 in prerequisites versus 0.6.18 in troubleshooting). Released vLLM 0.31.0 instead pins both `flashinfer-python` and `flashinfer-cubin` to **0.7.0.post1** in its CUDA requirements. Preserve the selected engine's dependency set and image digest; installing a loose historical minimum into another image does not establish compatibility. [TOPG-FLASH-VLLM](https://recipes.vllm.ai/zai-org/GLM-5.3-Flash) [TOPG-VLLM-CUDA](https://raw.githubusercontent.com/vllm-project/vllm/db9527a46873454610df6dbedf79a36d6bf1a7f6/requirements/cuda.txt)

For structured responses, the current SGLang recipe resolves the reasoning parser to `glm45` and the tool-call parser to `glm47`; vLLM's current recipe uses `glm47` for both. These settings govern reasoning and tool extraction. A client accepting raw text has a different contract; the parser spelling is not a universal prerequisite for generating tokens. Verify the returned fields on the pinned image. [TOPG-FLASH-SGLANG](https://docs.sglang.io/cookbook/autoregressive/GLM/GLM-5.3-Flash) [TOPG-FLASH-VLLM](https://recipes.vllm.ai/zai-org/GLM-5.3-Flash)

Parser selection is separate from thinking control. Z.ai's hosted Flash API documents `thinking.type: enabled` as its only supported value. The pinned publisher template always opens `<think>` for a new generation, maps `low`/`high` to those efforts and other values to `max`, and defaults `clear_thinking` to false. It consumes neither `thinking:false` nor `enable_thinking:false`; the cookbook's proposed `thinking:false` toggle therefore has no effect in this template. Hosted-API validation and local-engine handling of unsupported request fields must not be conflated. [TOPG-FLASH-API](https://docs.z.ai/guides/vlm/glm-5.3-flash) [TOPG-FLASH-TEMPLATE](https://huggingface.co/zai-org/GLM-5.3-Flash/raw/46a050bec13002ad29ee795c16e61cf4fa3c4a9c/chat_template.jinja)

`clear_thinking` controls earlier reasoning retained in the prompt. The publisher card recommends true for chat, while the hosted Flash API page recommends false. Keep this source difference explicit with the selected conversation policy; neither setting disables new reasoning. [glm-5.3-flash-CARD](https://huggingface.co/zai-org/GLM-5.3-Flash/raw/46a050bec13002ad29ee795c16e61cf4fa3c4a9c/README.md) [TOPG-FLASH-API](https://docs.z.ai/guides/vlm/glm-5.3-flash)

MTP is optional and separate from reasoning. The cookbook starts its latency profile at 5/1/6 and its throughput profile with speculation off. Use natural acceptance when comparing them: a speculative latency gain can become a throughput loss when verification competes with a large batch. [TOPG-FLASH-SGLANG](https://docs.sglang.io/cookbook/autoregressive/GLM/GLM-5.3-Flash)

[glm-5.3-flash-VR](https://recipes.vllm.ai/zai-org/GLM-5.3-Flash) [glm-5.3-flash-GR](https://docs.sglang.io/cookbook/autoregressive/GLM/GLM-5.3-Flash) [glm-5.3-flash-CARD](https://huggingface.co/zai-org/GLM-5.3-Flash/raw/46a050bec13002ad29ee795c16e61cf4fa3c4a9c/README.md) [HW](https://docs.nvidia.com/dgx/dgxb300-user-guide/introduction-to-dgxb300.html)

## Build and exporter-specific settings

The current SGLang cookbook requires a build containing Flash support, described as **0.5.20 or later**; the freshly observed stable release is 0.5.21. vLLM's latest release is 0.31.0, but its cookbook still contains older special-image guidance. Keep a stable build comparison and a separately pinned candidate build if required fixes are missing. No release or nightly container was executed here. [glm-5.3-flash-GR](https://docs.sglang.io/cookbook/autoregressive/GLM/GLM-5.3-Flash) [RR-GLM-SGLANG-RELEASE](https://github.com/sgl-project/sglang/releases/tag/v0.5.21) [RR-GLM-VLLM-RELEASE](https://github.com/vllm-project/vllm/releases/tag/v0.31.0)

The RedHat card's target-only recipe uses `vllm/vllm-openai:glm53-flash`, TP4, `--no-enable-flashinfer-autotune`, `--tool-call-parser glm47`, `--enable-auto-tool-choice` and **`--reasoning-parser glm45`**. Its MTP example additionally sets five speculative tokens, `--disable-custom-all-reduce`, expandable CUDA allocations and `--gpu-memory-utilization 0.85`. It does not prescribe 0.88. These are source settings for that export/image tag, not universal options for current vLLM. Resolve the tag to a digest and inspect dependency versions before proposing an executable replacement; the stored probe does not certify this special image. [glm-5.3-flash-NV](https://huggingface.co/RedHatAI/GLM-5.3-Flash-NVFP4/raw/18d55bfd5a2194887738da73753975c9d3842f46/README.md)

That RedHat parser recipe differs from the current vLLM official-FP8 recipe's `glm47` reasoning parser. Keep the parser choice with its exact artifact/build provenance, then test raw output, separated reasoning and tool arguments. Neither spelling should be silently copied across all builds.

Native speculation is documented in both engines. SGLang's `--speculative-algorithm EAGLE` serves the checkpoint's own MTP layer; the cookbook says upstream folds the older `NEXTN` spelling into `EAGLE`. Its 5/1/6 settings mean steps/top-k/draft tokens. vLLM specifies `{"method":"mtp","num_speculative_tokens":5}`. The external DFlash2 checkpoint is a distinct experiment requiring separate target/draft identities. For the RedHat export, independently verify the FP8 MTP expert group and state rollback before drawing a conclusion about NVFP4-plus-MTP quality. [TOPG-FLASH-SGLANG](https://docs.sglang.io/cookbook/autoregressive/GLM/GLM-5.3-Flash) [TOPG-FLASH-VLLM](https://recipes.vllm.ai/zai-org/GLM-5.3-Flash)

## Optimization questions

Compare target-only operation (omit speculation flags) with 1/3/5 draft steps; TP4 versus TP8; independent replicas versus 4+4 disaggregation; the supported KV/backend pairs (FP8 + TRT-LLM DSA versus BF16 + TileLang DSA in SGLang CUDA); controlled KDA pool sizes. Add multi-image and long multi-turn tests with cancellation, context-cache reuse and state rollback.

Capture actual GPU memory, compute capability, peer topology and software versions before interpreting a layout. Record model/export revision, image digest, effective cache dtype and selected kernels together.

## Remaining uncertainty

The RedHat quantization configuration is now inspected at an immutable revision: main routed experts use NVFP4 and MTP routed experts use FP8. Other exporters require their own configuration audit. Quality, loader memory, the best KDA/KV split and the disaggregation crossover still need local measurements.
