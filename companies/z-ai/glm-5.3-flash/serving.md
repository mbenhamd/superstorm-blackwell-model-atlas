# GLM 5.3 Flash: serving on 8×B300

**Status: unbenchmarked local recommendations.** The upstream recipes are evidence of documented support, not a benchmark of your node.

## Engine and topology

Use one TP4 target-only process as a starting candidate, then compare a second independent TP4 replica against a TP8 process. TP4 is a workload hypothesis, not a demonstrated optimum or minimum. SGLang’s Blackwell cookbook selects FlashInfer TRT-LLM MoE; vLLM provides an explicit TP4 FP8 recipe and an optional TP4-prefill plus TP4-decode layout.

First determine whether prefill interference warrants prefill/decode separation. The vLLM recipe requires matching KDA convolution-state layout, KV layout and speculative depth on both sides. A KV-only copy that omits recurrent state is not a correct migration. SGLang documents its PD route as a preview with dummy-weight mechanical checks only; it lacks real-weight load/accuracy qualification, and its current documented PD path does not start with speculative decoding. Keep speculation off and both roles at the same TP size for that separate probe.

The vLLM Flash recipe still contains historical integration/version guidance and differing FlashInfer minimums (0.6.17 in prerequisites versus 0.6.18 in troubleshooting). Resolve those requirements against the selected image; the recipe alone does not certify every release or nightly.

For structured responses, the current SGLang recipe resolves the reasoning parser to `glm45` and the tool-call parser to `glm47`; vLLM's current recipe uses `glm47` for both. Verify the returned fields on the pinned image.

Parser selection is separate from thinking control. The pinned publisher template accepts `reasoning_effort` values `low`, `high` and `max`, defaults to `max`, and defaults `clear_thinking` to false. It does not consume the cookbook's `thinking:false` setting. Preserve the selected template's actual history and reasoning behavior rather than assuming a client flag changes it. [MBENCH-glm-5.3-flash-TEMPLATE](https://huggingface.co/zai-org/GLM-5.3-Flash/raw/46a050bec13002ad29ee795c16e61cf4fa3c4a9c/chat_template.jinja)

Use natural MTP acceptance. Test the cookbook’s five-step, top-k-one configuration against target-only operation at high load. A speculative low-latency win can become a throughput loss when verification competes with a large batch.

[glm-5.3-flash-VR](https://recipes.vllm.ai/zai-org/GLM-5.3-Flash) [glm-5.3-flash-GR](https://docs.sglang.io/cookbook/autoregressive/GLM/GLM-5.3-Flash) [glm-5.3-flash-CARD](https://huggingface.co/zai-org/GLM-5.3-Flash/raw/46a050bec13002ad29ee795c16e61cf4fa3c4a9c/README.md) [HW](https://docs.nvidia.com/dgx/dgxb300-user-guide/introduction-to-dgxb300.html)

## Build and exporter-specific settings

The current SGLang cookbook requires a build containing Flash support, described as **0.5.20 or later**; the freshly observed stable release is 0.5.21. vLLM's latest release is 0.31.0, but its cookbook still contains older special-image guidance. Keep a stable build comparison and a separately pinned candidate build if required fixes are missing. No release or nightly container was executed here. [glm-5.3-flash-GR](https://docs.sglang.io/cookbook/autoregressive/GLM/GLM-5.3-Flash) [RR-GLM-SGLANG-RELEASE](https://github.com/sgl-project/sglang/releases/tag/v0.5.21) [RR-GLM-VLLM-RELEASE](https://github.com/vllm-project/vllm/releases/tag/v0.31.0)

The RedHat card's target-only recipe uses `vllm/vllm-openai:glm53-flash`, TP4, `--no-enable-flashinfer-autotune`, `--tool-call-parser glm47`, `--enable-auto-tool-choice` and **`--reasoning-parser glm45`**. Its MTP example additionally sets five speculative tokens, `--disable-custom-all-reduce`, expandable CUDA allocations and `--gpu-memory-utilization 0.85`. It does not prescribe 0.88. These are source settings for that export/image tag, not universal options for current vLLM. Resolve the tag to a digest and inspect dependency versions before proposing an executable replacement; the stored probe does not certify this special image. [glm-5.3-flash-NV](https://huggingface.co/RedHatAI/GLM-5.3-Flash-NVFP4/raw/18d55bfd5a2194887738da73753975c9d3842f46/README.md)

That RedHat parser recipe differs from the current vLLM official-FP8 recipe's `glm47` reasoning parser. Keep the parser choice with its exact artifact/build provenance, then test raw output, separated reasoning and tool arguments. Neither spelling should be silently copied across all builds.

Native speculation is documented in both engines. SGLang's `--speculative-algorithm EAGLE` serves the checkpoint's own MTP layer; its 5/1/6 settings mean steps/top-k/draft tokens. vLLM specifies `{"method":"mtp","num_speculative_tokens":5}`. The external DFlash2 checkpoint is a distinct experiment requiring separate target/draft identities. For the RedHat export, independently verify the FP8 MTP expert group and state rollback before drawing a conclusion about NVFP4-plus-MTP quality. [glm-5.3-flash-GR](https://docs.sglang.io/cookbook/autoregressive/GLM/GLM-5.3-Flash) [glm-5.3-flash-VR](https://recipes.vllm.ai/zai-org/GLM-5.3-Flash)

## Optimization questions

Compare target-only operation (omit speculation flags) with 1/3/5 draft steps; TP4 versus TP8; independent replicas versus 4+4 disaggregation; the supported KV/backend pairs (FP8 + TRT-LLM DSA versus BF16 + TileLang DSA in SGLang CUDA); controlled KDA pool sizes. Add multi-image and long multi-turn tests with cancellation, context-cache reuse and state rollback.

Capture actual GPU memory, compute capability, peer topology and software versions before interpreting a layout. Record model/export revision, image digest, effective cache dtype and selected kernels together.

## Remaining uncertainty

The RedHat quantization configuration is now inspected at an immutable revision: main routed experts use NVFP4 and MTP routed experts use FP8. Other exporters require their own configuration audit. Quality, loader memory, the best KDA/KV split and the disaggregation crossover still need local measurements.
