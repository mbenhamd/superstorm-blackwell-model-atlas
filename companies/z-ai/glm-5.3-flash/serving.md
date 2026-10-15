# GLM 5.3 Flash: serving on 8×B300

**Status: unbenchmarked local recommendations.** The upstream recipes are evidence of documented support, not a benchmark of your node.

## Engine and topology

Use one TP4 target-only process as a starting candidate, then compare a second independent TP4 replica against a TP8 process. SGLang’s Blackwell cookbook selects FlashInfer TRT-LLM MoE; vLLM provides an explicit TP4 FP8 recipe and an optional TP4-prefill plus TP4-decode layout.

First determine whether prefill interference warrants prefill/decode separation. The vLLM recipe requires matching KDA convolution-state layout, KV layout and speculative depth on both sides. A KV-only copy that omits recurrent state is not a correct migration. SGLang documents its PD route as a preview with dummy-weight mechanical checks only; it lacks real-weight load/accuracy qualification, and its current documented PD path does not start with speculative decoding. Keep speculation off and both roles at the same TP size for that separate probe.

The vLLM Flash recipe still contains historical integration/version guidance and differing FlashInfer minimums (0.6.17 in prerequisites versus 0.6.18 in troubleshooting). Resolve those requirements against the selected image; the recipe alone does not certify every release or nightly.

For structured responses, the current SGLang recipe resolves the reasoning parser to `glm45` and the tool-call parser to `glm47`; vLLM's current recipe uses `glm47` for both. Verify the returned fields on the pinned image.

Use natural MTP acceptance. Test the cookbook’s five-step, top-k-one configuration against target-only operation at high load. A speculative low-latency win can become a throughput loss when verification competes with a large batch.

[glm-5.3-flash-VR](https://recipes.vllm.ai/zai-org/GLM-5.3-Flash) [glm-5.3-flash-GR](https://docs.sglang.io/cookbook/autoregressive/GLM/GLM-5.3-Flash) [glm-5.3-flash-CARD](https://huggingface.co/zai-org/GLM-5.3-Flash/raw/46a050bec13002ad29ee795c16e61cf4fa3c4a9c/README.md) [HW](https://docs.nvidia.com/dgx/dgxb300-user-guide/introduction-to-dgxb300.html)

## Experiment sequence

Compare target-only operation (omit speculation flags) with 1/3/5 draft steps; TP4 versus TP8; independent replicas versus 4+4 disaggregation; the supported KV/backend pairs (FP8 + TRT-LLM DSA versus BF16 + TileLang DSA in SGLang CUDA); controlled KDA pool sizes. Add multi-image and long multi-turn tests with cancellation, context-cache reuse and state rollback.

First capture actual GPU memory, compute capability, peer topology and software versions with `python scripts/preflight.py`. Then resolve immutable model metadata, inspect the rendered profile and run the target-only correctness suite. Profiles live in [profiles](../../../profiles/README.md).

## Acceptance gates

A successful load is necessary but insufficient. Require valid streaming framing, finite outputs, correctly separated reasoning, valid tool calls where supported, repeatable quality tests, bounded memory at load, and correct cache/state behavior after cancellation. Only then compare latency and throughput.

For production, place one sharded model process group inside a pod that owns its whole GPU group. Do not make eight independent KServe replicas and expect them to form TP8. Start with colocated prefill and decode; adopt disaggregation only after it wins the workload comparison and state transfer is correct. [KS](https://kserve.github.io/website/docs/intro) [KSLLM](https://kserve.github.io/website/docs/model-serving/generative-inference/llmisvc/llmisvc-overview)

## Parameters are not magic constants

The profile’s context cap is an application policy. Tensor parallelism is a starting layout. Memory utilization reserves room for non-weight allocations; changing it can trade cache space against startup headroom. Batch-token and sequence caps trade prefill efficiency against memory and queueing. Speculative depth trades draft/verification cost against naturally accepted tokens. Each must be varied one at a time before interaction testing.

## Remaining uncertainty

The RedHat quantization configuration is now inspected at an immutable revision: main routed experts use NVFP4 and MTP routed experts use FP8. Other exporters require their own configuration audit. Quality, loader memory, the best KDA/KV split and the disaggregation crossover still need local measurements.
