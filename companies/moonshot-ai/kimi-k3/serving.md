# Kimi K3: serving on 8×B300

**Status: unbenchmarked local recommendations.** The upstream recipes are evidence of documented support, not a benchmark of your node.

## Engine and topology

Start with a single eight-GPU target. For native K3, compare SGLang TP8 at 64K context against vLLM’s model-specific recipe. For the NVIDIA derivative, prefer the SGLang mixed-format path as the initial compatibility candidate, with the FlashInfer TRT-LLM MoE runner required by its recipe. Its published DCP8 setup is a separate topology from the symmetric-memory TP8 native baseline; do not combine their flags indiscriminately.

Establish target-only correctness first. Then attach the engine-specific drafter: Inferact’s MLA-native DSpark is documented for vLLM, while the RadixArk drafter is documented in the SGLang path. Tokenizer, hidden-state feature selection, target revision, drafter revision, KV precision, and speculative state rollback are one compatibility unit.

The repository includes separate target-only and DSpark profiles. It intentionally does not enable simulated acceptance. The SGLang cookbook marks some B300 rows as verified and other layouts as extrapolations; its simulated-acceptance results are capacity/performance experiments, not observed application acceptance. The published Inferact GB300 figure is not a measurement of your eight-B300 node.

[kimi-k3-VR](https://recipes.vllm.ai/moonshotai/Kimi-K3) [kimi-k3-GR](https://docs.sglang.io/cookbook/autoregressive/Moonshotai/Kimi-K3) [kimi-k3-CARD](https://huggingface.co/moonshotai/Kimi-K3) [HW](https://docs.nvidia.com/dgx/dgxb300-user-guide/introduction-to-dgxb300.html)

## Experiment sequence

Sweep target-only versus 3/5/7-token drafting on real coding and multi-turn agent prompts. Measure accepted tokens, total emitted tokens, draft overhead, target verification cost, state-pool ceiling, TTFT and p95 token latency. Compare context 16K/64K/128K before attempting 1M. Test cancellation and resumption with non-empty speculative state.

First capture actual GPU memory, compute capability, peer topology and software versions with `python scripts/preflight.py`. Then resolve immutable model metadata, inspect the rendered profile and run the target-only correctness suite. Profiles live in [profiles](../../../profiles/README.md).

## Acceptance gates

A successful load is necessary but insufficient. Require valid streaming framing, finite outputs, correctly separated reasoning, valid tool calls where supported, repeatable quality tests, bounded memory at load, and correct cache/state behavior after cancellation. Only then compare latency and throughput.

For production, place one sharded model process group inside a pod that owns its whole GPU group. Do not make eight independent KServe replicas and expect them to form TP8. Start with colocated prefill and decode; adopt disaggregation only after it wins the workload comparison and state transfer is correct. [KS](https://kserve.github.io/website/docs/intro) [KSLLM](https://kserve.github.io/website/docs/model-serving/generative-inference/llmisvc/llmisvc-overview)

## Parameters are not magic constants

The profile’s context cap is an application policy. Tensor parallelism is a starting layout. Memory utilization reserves room for non-weight allocations; changing it can trade cache space against startup headroom. Batch-token and sequence caps trade prefill efficiency against memory and queueing. Speculative depth trades draft/verification cost against naturally accepted tokens. Each must be varied one at a time before interaction testing.

## Remaining uncertainty

Exact B300 SXM6-AC OEM topology; all-FP8 artifact availability; exact installed-image ancestry of mixed-format fixes; maximum safe long-context concurrency; native-versus-NVFP4 quality on your tools and languages; actual DSpark acceptance on your workload.
