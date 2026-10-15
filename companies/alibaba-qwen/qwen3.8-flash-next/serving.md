# Qwen 3.8 Flash Next: serving on 8×B300

**Status: unbenchmarked local candidates.** Publisher and engine recipes document support; this audit did not run an engine or benchmark the node.

## Engine and topology

The supplied vLLM target-only candidate uses the exact NVIDIA export at TP8 and 65,536 tokens. The separate TP8 MTP candidate adds expert parallelism and one speculative token, following NVIDIA's layout while using a lower context cap. The supplied SGLang profile adapts its documented B300 TP1 target-only cell, with local caps of 65,536 tokens, 32 requests and a 0.82 static-memory fraction.

SGLang PR #41046 added exact NVIDIA-export recipes for B200/B300/GB300 and names version 0.5.20 or later. Its immutable generator selects TP1, FlashInfer linear-attention prefill/decode and BF16 recurrent state; it explicitly marks these cells `verified: false`. This supplies a concrete compatibility candidate, not B300 measurements. The profile retains that boundary. [qwen3.8-flash-next-GPR](https://github.com/sgl-project/sglang/pull/41046) [qwen3.8-flash-next-GR-SOURCE](https://raw.githubusercontent.com/sgl-project/sglang/a1eb691ab51bc461378b2fcca8991883add4f1b5/docs/src/snippets/configs/Qwen/qwen3.8-flash-next.jsx)

The base, official FP8 and NVIDIA metadata revisions are recorded in [sources](sources.md) and [model.json](model.json). NVIDIA's card supplies the exact NVFP4 TP8/MTP example; the current vLLM recipe's principal TP4+EP example uses the official FP8 export. Keep their checkpoint identities, KV settings and speculative depths distinct. Pin the actual runtime image before execution.

[qwen3.8-flash-next-VR](https://recipes.vllm.ai/Qwen/Qwen3.8-Flash-Next) [qwen3.8-flash-next-CARD](https://huggingface.co/Qwen/Qwen3.8-Flash-Next/raw/de4b8e4d43b917e7706784d8bb445c9af86a3540/README.md) [qwen3.8-flash-next-NV](https://huggingface.co/nvidia/Qwen3.8-Flash-Next-NVFP4/raw/fc694b54fb0174e0913e6adf86691ef85a4ead47/README.md) [HW](https://docs.nvidia.com/dgx/dgxb300-user-guide/introduction-to-dgxb300.html)

## Experiment sequence

Compare SGLang TP1 target-only with vLLM TP8 target-only, accounting for total GPUs consumed and effective cache/state dtypes. Then evaluate TP4 capacity experiments, TP8+EP with one-token MTP, and alternative proposal depths after accuracy checks. Track n-gram placement, lookup stalls, recurrent-state allocation, indexer time and total node goodput.

Use the pinned publisher card and tokenizer template for thinking controls and sampling. The current SGLang cookbook's claim that this model always thinks conflicts with the publisher card, which documents `enable_thinking` and separate thinking/non-thinking sampling settings. Treat that cookbook prose as stale. [qwen3.8-flash-next-GR](https://docs.sglang.io/cookbook/autoregressive/Qwen/Qwen3.8-Flash-Next)

First capture actual GPU memory, compute capability, peer topology and software versions with `python scripts/preflight.py`. Then resolve immutable model metadata, inspect the rendered profile and run the target-only correctness suite. Profiles live in [profiles](../../../profiles/README.md).

## Acceptance gates

A successful load is necessary but insufficient. Require valid streaming framing, finite outputs, correctly separated reasoning, valid tool calls where supported, repeatable quality tests, bounded memory at load, and correct cache/state behavior after cancellation. Only then compare latency and throughput.

For production, place one sharded model process group inside a pod that owns its whole GPU group. Do not make eight independent KServe replicas and expect them to form TP8. Start with colocated prefill and decode; adopt disaggregation only after it wins the workload comparison and state transfer is correct. [KS](https://kserve.github.io/website/docs/intro) [KSLLM](https://kserve.github.io/website/docs/model-serving/generative-inference/llmisvc/llmisvc-overview)

## Parameters are not magic constants

The profile’s context cap is an application policy. Tensor parallelism is a starting layout. Memory utilization reserves room for non-weight allocations; changing it can trade cache space against startup headroom. Batch-token and sequence caps trade prefill efficiency against memory and queueing. Speculative depth trades draft/verification cost against naturally accepted tokens. Each must be varied one at a time before interaction testing.

## Remaining uncertainty

B300 load, quality and performance for the documented SGLang NVIDIA TP1 recipe; n-gram placement costs; full checkpoint tensor-byte census; production throughput under realistic prefix reuse.
