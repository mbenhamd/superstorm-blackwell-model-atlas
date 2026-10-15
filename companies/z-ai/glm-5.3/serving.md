# GLM 5.3: serving on 8×B300

**Status: unbenchmarked local recommendations.** The upstream recipes are evidence of documented support, not a benchmark of your node.

## Engine and topology

Use vLLM FP8 TP8 with a deliberately capped 64K application context as the first target-only comparison. Compare TP4 for NVFP4 against TP8: four-way tensor parallelism could leave room for two independent four-GPU replicas, but only if each process really fits with the desired workload and no overlapping GPU assignment.

Add the MTP profile after the non-speculative baseline passes. The recipe’s five speculative tokens are a documented candidate, not a measurement on this node. In the current SGLang cookbook, the reasoning parser resolves to `glm45` and the tool-call parser to `glm47`; the latter parses the newer `<tool_call>/<arg_key>/<arg_value>` format. Use those distinct roles when checking the SGLang profile.

The official vLLM recipe contains inconsistent historical minimum-version labels. The lock file records the current release and inspected main separately rather than pretending that the recipe proves one exact minimum supported version.

[glm-5.3-VR](https://recipes.vllm.ai/zai-org/GLM-5.3) [glm-5.3-GR](https://docs.sglang.io/cookbook/autoregressive/GLM/GLM-5.3) [glm-5.3-CARD](https://huggingface.co/zai-org/GLM-5.3/raw/ba32f8c19c8738e2c57c71798c601d477a7bf844/README.md) [HW](https://docs.nvidia.com/dgx/dgxb300-user-guide/introduction-to-dgxb300.html)

## Experiment sequence

Compare FP8 TP8; NVFP4 TP4; NVFP4 TP8; two isolated TP4 replicas; and MTP off versus 1/3/5 proposals. Report total node goodput, not only one replica’s tokens/second. Verify the same reasoning effort and retained conversation fields. The pinned publisher template defaults to `reasoning_effort=max` and `clear_thinking=false`; the publisher recommends explicitly enabling `clear_thinking` for chat. Treat those choices as workload settings, not performance-free toggles.

First capture actual GPU memory, compute capability, peer topology and software versions with `python scripts/preflight.py`. Then resolve immutable model metadata, inspect the rendered profile and run the target-only correctness suite. Profiles live in [profiles](../../../profiles/README.md).

The included FP8 vLLM profile explicitly selects FP8 KV, while the NVFP4 profile leaves KV selection to the engine. Record the effective cache dtype and align it through a validated setting before attributing differences to weight precision; otherwise treat cache precision as a separate experimental variable.

## Acceptance gates

A successful load is necessary but insufficient. Require valid streaming framing, finite outputs, correctly separated reasoning, valid tool calls where supported, repeatable quality tests, bounded memory at load, and correct cache/state behavior after cancellation. Only then compare latency and throughput.

For production, place one sharded model process group inside a pod that owns its whole GPU group. Do not make eight independent KServe replicas and expect them to form TP8. Start with colocated prefill and decode; adopt disaggregation only after it wins the workload comparison and state transfer is correct. [KS](https://kserve.github.io/website/docs/intro) [KSLLM](https://kserve.github.io/website/docs/model-serving/generative-inference/llmisvc/llmisvc-overview)

## Parameters are not magic constants

The profile’s context cap is an application policy. Tensor parallelism is a starting layout. Memory utilization reserves room for non-weight allocations; changing it can trade cache space against startup headroom. Batch-token and sequence caps trade prefill efficiency against memory and queueing. Speculative depth trades draft/verification cost against naturally accepted tokens. Each must be varied one at a time before interaction testing.

## Remaining uncertainty

Actual per-rank load and cache capacity on this node; exporter-specific quality under the application prompts; inclusion of required fixes in the selected image; and the workload crossover between vLLM and SGLang remain unmeasured. The 743B/753B accounting is now reconciled. See [architecture](architecture.md) for the pinned metadata calculation.
