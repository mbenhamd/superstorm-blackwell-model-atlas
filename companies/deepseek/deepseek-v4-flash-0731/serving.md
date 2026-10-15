# DeepSeek V4 Flash 0731: serving on 8×B300

**Status: unbenchmarked local recommendations.** The upstream recipes are evidence of documented support, not a benchmark of your node.

## Engine and topology

Start with vLLM’s model-specific path and an eight-GPU DP-attention/EP candidate derived from the documented smaller Blackwell layout. This topology is an explicit unbenchmarked adaptation, not a reproduced 8×B300 result. The included profile uses a fixed 64K cap, FP8 KV and the DeepGEMM MegaMoE path; the actual image must support the exact July-31 revision.

Preserve the producer’s encoding contract. The model card describes Python encoding/parsing helpers rather than an ordinary Jinja template. Treat a generic chat endpoint that returns fluent prose but mangles tool boundaries as a failed integration.

SGLang is a comparison path, not a reason to swap in a newer model. Before performance tests, confirm the exact 0731 serializer, draft configuration, request fields and model registry. This atlas marks that SGLang launch profile as a compatibility-probe candidate.

[deepseek-v4-flash-0731-VR](https://recipes.vllm.ai/deepseek-ai/DeepSeek-V4-Flash?features=tool_calling,reasoning&hardware=b300) [deepseek-v4-flash-0731-CARD](https://huggingface.co/deepseek-ai/DeepSeek-V4-Flash-0731) [HW](https://docs.nvidia.com/dgx/dgxb300-user-guide/introduction-to-dgxb300.html)

## Experiment sequence

Compare target-only with native DSpark, natural acceptance, and identical prompts. Test 4-GPU versus 8-GPU EP layouts, index-cache precision and 16K/64K/128K prompts. Validate tool calls, reasoning boundaries, EOS handling and the first token after a cancelled speculative request.

First capture actual GPU memory, compute capability, peer topology and software versions with `python scripts/preflight.py`. Then resolve immutable model metadata, inspect the rendered profile and run the target-only correctness suite. Profiles live in [profiles](../../../profiles/README.md).

## Acceptance gates

A successful load is necessary but insufficient. Require valid streaming framing, finite outputs, correctly separated reasoning, valid tool calls where supported, repeatable quality tests, bounded memory at load, and correct cache/state behavior after cancellation. Only then compare latency and throughput.

For production, place one sharded model process group inside a pod that owns its whole GPU group. Do not make eight independent KServe replicas and expect them to form TP8. Start with colocated prefill and decode; adopt disaggregation only after it wins the workload comparison and state transfer is correct. [KS](https://kserve.github.io/website/docs/intro) [KSLLM](https://kserve.github.io/website/docs/model-serving/generative-inference/llmisvc/llmisvc-overview)

## Parameters are not magic constants

The profile’s context cap is an application policy. Tensor parallelism is a starting layout. Memory utilization reserves room for non-weight allocations; changing it can trade cache space against startup headroom. Batch-token and sequence caps trade prefill efficiency against memory and queueing. Speculative depth trades draft/verification cost against naturally accepted tokens. Each must be varied one at a time before interaction testing.

## Remaining uncertainty

Exact total and active parameter scope for this checkpoint; source-to-image provenance of the selected backend; full raw compression schedule is not archived; no local B300 capacity or throughput results; exact SGLang 0731 integration not certified.
