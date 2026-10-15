# DeepSeek V4 Flash 0731: serving on 8×B300

**Status: unbenchmarked local recommendations.** The upstream recipes are evidence of documented support, not a benchmark of your node.

## Engine and topology

Use the documented vLLM TP1/DP4 plus expert-parallel layout as the initial four-GPU baseline. The DP8/EP profile is an explicit eight-GPU adaptation. Expert parallelism reuses the data-parallel group; it is not another factor multiplying the GPU count. Both local profiles impose a 64K cap, FP8 KV and the DeepGEMM MegaMoE backend. The chosen image still needs to pass correctness checks for this exact revision. [vLLM recipe](https://recipes.vllm.ai/deepseek-ai/DeepSeek-V4-Flash?features=tool_calling,reasoning&hardware=b300).

The publisher also documents the exact 0731 checkpoint with SGLang TP4, `flashinfer_mxfp4` and bundled DSpark. SGLang's cookbook reports an end-to-end run of that command on 4×GB300 with v0.5.16. This is upstream evidence, not a local eight-B300 result. The included SGLang TP8 target-only profile remains a compatibility probe because it changes that topology and omits speculation. [Publisher card](https://huggingface.co/deepseek-ai/DeepSeek-V4-Flash-0731/blob/7872f01b1d1fe23eabc4c98b48bffcef5a386062/README.md), [SGLang cookbook](https://docs.sglang.io/cookbook/autoregressive/DeepSeek/DeepSeek-V4).

Preserve the producer's encoding contract: this release supplies Python message-encoding/parsing helpers instead of a Jinja chat template. Check reasoning fields, tool boundaries and streaming. The engine parser names differ: vLLM documents `deepseek_v4`; SGLang documents reasoning parser `deepseek-v4` and tool parser `deepseekv4`. A fluent answer alone does not verify that protocol. [Encoding documentation](https://huggingface.co/deepseek-ai/DeepSeek-V4-Flash-0731/blob/7872f01b1d1fe23eabc4c98b48bffcef5a386062/encoding/README.md), [vLLM recipe](https://recipes.vllm.ai/deepseek-ai/DeepSeek-V4-Flash?features=tool_calling,reasoning&hardware=b300), [SGLang cookbook](https://docs.sglang.io/cookbook/autoregressive/DeepSeek/DeepSeek-V4).

DSpark weights are bundled with the target. SGLang instructs users to omit a separate draft-model path; its documented default proposes five tokens and verifies six. The vLLM recipe uses seven proposals. These engine choices do not rewrite the checkpoint's `dspark_block_size=5`. Match sampling too: the publisher's vLLM example uses greedy drafting, while the current recipe selects probabilistic drafting. Treat each as a distinct experiment and keep the client sampling fixed. [Publisher card](https://huggingface.co/deepseek-ai/DeepSeek-V4-Flash-0731/blob/7872f01b1d1fe23eabc4c98b48bffcef5a386062/README.md), [vLLM recipe](https://recipes.vllm.ai/deepseek-ai/DeepSeek-V4-Flash?features=tool_calling,reasoning&hardware=b300), [SGLang cookbook](https://docs.sglang.io/cookbook/autoregressive/DeepSeek/DeepSeek-V4).

The 64K local cap is deliberately restrictive. DeepSeek recommends allowing up to 384K output tokens for high/max effort; those requests cannot fit this cap. Compare engines under the same shorter application budget, or create a separately qualified long-output profile. [Publisher usage guidance](https://huggingface.co/deepseek-ai/DeepSeek-V4-Flash-0731/blob/7872f01b1d1fe23eabc4c98b48bffcef5a386062/README.md).

## Experiment sequence

Compare target-only with native DSpark, natural acceptance, and identical prompts. Test 4-GPU versus 8-GPU EP layouts, index-cache precision and 16K/64K/128K prompts. Validate tool calls, reasoning boundaries, EOS handling and the first token after a cancelled speculative request.

First capture actual GPU memory, compute capability, peer topology and software versions with `python scripts/preflight.py`. Then verify local metadata against the immutable revision in [model.json](model.json), inspect the rendered profile and run the target-only correctness suite. Profiles live in [profiles](../../../profiles/README.md).

## Acceptance gates

A successful load is necessary but insufficient. Require valid streaming framing, finite outputs, correctly separated reasoning, valid tool calls where supported, repeatable quality tests, bounded memory at load, and correct cache/state behavior after cancellation. Only then compare latency and throughput.

For production, place one sharded model process group inside a pod that owns its whole GPU group. Independent KServe replicas do not assemble a distributed TP/DP/EP engine group. Start with colocated prefill and decode; adopt disaggregation only after it wins the workload comparison and state transfer is correct. [KS](https://kserve.github.io/website/docs/intro) [KSLLM](https://kserve.github.io/website/docs/model-serving/generative-inference/llmisvc/llmisvc-overview)

## Parameters are not magic constants

The profile’s context cap is an application policy. Tensor parallelism is a starting layout. Memory utilization reserves room for non-weight allocations; changing it can trade cache space against startup headroom. Batch-token and sequence caps trade prefill efficiency against memory and queueing. Speculative depth trades draft/verification cost against naturally accepted tokens. Each must be varied one at a time before interaction testing.

## Remaining uncertainty

Exact main-plus-draft parameter accounting; selected image and kernel provenance; local B300 capacity, throughput and application correctness; qualification of the local eight-GPU adaptations.
