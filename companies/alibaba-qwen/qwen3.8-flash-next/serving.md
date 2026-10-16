# Qwen 3.8 Flash Next: serving on 8×B300

**Status: unbenchmarked local candidates.** Publisher and engine recipes document support; this audit did not run an engine or benchmark the node.

## Engine and topology

The supplied vLLM target-only candidate uses the exact NVIDIA export at TP8 and 65,536 tokens. The separate TP8 MTP candidate adds expert parallelism and one speculative token, following NVIDIA's layout while using a lower context cap. The supplied SGLang profile adapts its documented B300 TP1 target-only cell, with local caps of 65,536 tokens, 32 requests and a 0.82 static-memory fraction.

SGLang PR #41046 added exact NVIDIA-export recipes for B200/B300/GB300 and names version 0.5.20 or later. Its immutable generator selects TP1, FlashInfer linear-attention prefill/decode and BF16 recurrent state; it explicitly marks these cells `verified: false`. This supplies a concrete compatibility candidate, not B300 measurements. The profile retains that boundary. [qwen3.8-flash-next-GPR](https://github.com/sgl-project/sglang/pull/41046) [qwen3.8-flash-next-GR-SOURCE](https://raw.githubusercontent.com/sgl-project/sglang/a1eb691ab51bc461378b2fcca8991883add4f1b5/docs/src/snippets/configs/Qwen/qwen3.8-flash-next.jsx)

The base, official FP8 and NVIDIA metadata revisions are recorded in [sources](sources.md) and [model catalog](../../../catalog/models.json). NVIDIA's card supplies the exact NVFP4 TP8/MTP example; the current vLLM recipe's principal TP4+EP example uses the official FP8 export. Keep their checkpoint identities, KV settings and speculative depths distinct. Pin the actual runtime image before execution.

Official FP8 at `236dfdf285828023ca3bcd3f37366c58a3469b13` is a useful quality and implementation reference. Its TP4+EP recipe does not establish TP4 as the best B300 layout, or make a RedHatAI TP4+EP command evidence for NVIDIA's mixed export. NVIDIA TP4 and TP2 remain capacity/communication hypotheses after its documented TP8 path. The 640-wide experts and 128-wide FP8 blocks explain why plain TP8 fails for the official FP8 model and NVIDIA's FP8 MTP experts (`640 / 8 = 80`); enabling expert parallelism preserves the relevant expert width. Reducing TP does not by itself establish loader or kernel compatibility. [qwen3.8-flash-next-FP8-CFG](https://huggingface.co/Qwen/Qwen3.8-Flash-Next-FP8/raw/236dfdf285828023ca3bcd3f37366c58a3469b13/config.json), [qwen3.8-flash-next-NV](https://huggingface.co/nvidia/Qwen3.8-Flash-Next-NVFP4/raw/fc694b54fb0174e0913e6adf86691ef85a4ead47/README.md).

[qwen3.8-flash-next-VR](https://recipes.vllm.ai/Qwen/Qwen3.8-Flash-Next) [qwen3.8-flash-next-CARD](https://huggingface.co/Qwen/Qwen3.8-Flash-Next/raw/de4b8e4d43b917e7706784d8bb445c9af86a3540/README.md) [qwen3.8-flash-next-NV](https://huggingface.co/nvidia/Qwen3.8-Flash-Next-NVFP4/raw/fc694b54fb0174e0913e6adf86691ef85a4ead47/README.md) [HW](https://docs.nvidia.com/dgx/dgxb300-user-guide/introduction-to-dgxb300.html)

## Exact NVIDIA execution path

vLLM 0.31.0 source at `db9527a46873454610df6dbedf79a36d6bf1a7f6` dispatches this architecture on CUDA to `qwen4_exp/nvidia`; ROCm has a separate implementation. Its n-gram loader recognizes the NVIDIA mixed export's FP8 PLE map and selects either a device table or pinned host table according to `engram_config.cpu_offload`. Host lookup can prefetch rows while the preceding decoder layer runs. This source evidence supports investigating `--engram-config '{"cpu_offload":true}'` for the exact export, while the benefit depends on host memory, NUMA placement, interconnect traffic and lookup locality. Offloading the table is different from offloading attention KV. [RR-QWEN-VLLM-STABLE-BACKEND](https://raw.githubusercontent.com/vllm-project/vllm/db9527a46873454610df6dbedf79a36d6bf1a7f6/vllm/models/qwen4_exp/__init__.py), [RR-QWEN-VLLM-STABLE-NGRAM](https://raw.githubusercontent.com/vllm-project/vllm/db9527a46873454610df6dbedf79a36d6bf1a7f6/vllm/models/qwen4_exp/nvidia/ngram_embedding.py), [RR-QWEN-VLLM-STABLE-COMMON-EMBED](https://raw.githubusercontent.com/vllm-project/vllm/db9527a46873454610df6dbedf79a36d6bf1a7f6/vllm/models/qwen4_exp/common/ngram_embedding.py).

| Component or option | Inspected support boundary |
| --- | --- |
| NVIDIA QSA activations | Require BF16 model activations and FlashAttention; low-precision expert weights do not change that requirement. |
| Main QSA KV cache | Runtime `auto`, `bfloat16`, `fp8` or `fp8_e4m3` are accepted. A non-null checkpoint `kv_cache_scheme` is separately rejected; that guard does not prohibit all FP8 KV storage. |
| Context topology | Prefill/decode context parallelism is rejected in this implementation. TP or TP+EP support does not imply context-parallel support. |
| Attention modifications | Sliding windows, attention sinks, ALiBi, fused output quantization and dual-chunk RoPE are explicitly unsupported here. |
| State and indexer | Recurrent state, PLE convolution state, main KV and indexer cache are different allocations. The inspected atlas indexer accepts BF16 or FP8 through `--attention-config.indexer_kv_dtype`; do not infer its dtype from the main cache flag. |

The QSA guards above are present in the stable source and remain in the separately observed main commit `fa75d3456d60a5ffe923818c4b495295675b38e1`. Source support does not prove the selected container includes compatible kernels. [RR-QWEN-VLLM-STABLE-QSA](https://raw.githubusercontent.com/vllm-project/vllm/db9527a46873454610df6dbedf79a36d6bf1a7f6/vllm/models/qwen4_exp/nvidia/qsa.py), [RR-QWEN-VLLM-CURRENT-QSA](https://raw.githubusercontent.com/vllm-project/vllm/fa75d3456d60a5ffe923818c4b495295675b38e1/vllm/models/qwen4_exp/nvidia/qsa.py), [RR-QWEN-VLLM-PIN-INDEXER](https://raw.githubusercontent.com/vllm-project/vllm/f8460ef23659afd69046a81529ec2295e4c3f686/vllm/models/qwen4_exp/nvidia/indexer_qsa.py).

## Prompt, thinking and context policy

Use the pinned publisher card and template for generation controls. Thinking defaults to enabled, effort to `xhigh`, and `preserve_thinking` to true; `medium` and `low` are supported effort levels. Non-thinking is available through `chat_template_kwargs.enable_thinking=false`. The SGLang cookbook's contrary always-thinking prose is stale relative to these artifacts. [qwen3.8-flash-next-CARD](https://huggingface.co/Qwen/Qwen3.8-Flash-Next/raw/de4b8e4d43b917e7706784d8bb445c9af86a3540/README.md), [RR-QWEN-NEXT-TEMPLATE](https://huggingface.co/Qwen/Qwen3.8-Flash-Next/raw/de4b8e4d43b917e7706784d8bb445c9af86a3540/chat_template.jinja), [qwen3.8-flash-next-GR](https://docs.sglang.io/cookbook/autoregressive/Qwen/Qwen3.8-Flash-Next).

| Workload / mode | Publisher sampling settings | Service implication |
| --- | --- | --- |
| Direct chat / non-thinking | Temperature 0.7; top-p 0.8; top-k 20; min-p 0; presence penalty 1.5; repetition penalty 1 | Use an explicit output budget and account for template/tool-schema tokens. |
| Coding, research and multi-turn tools / thinking | Temperature 1.0; top-p 0.95; top-k 20; min-p 0; presence penalty 0; repetition penalty 1 | Preserve effort and reasoning-history policy when comparing configurations; retries can outweigh shorter individual turns. |
| Documents, images or video | Same explicit mode contract; pinned media preprocessing | Include visual tokens, reasoning history and output allowance within the total context cap. |

The ordinary vLLM recipe names `qwen3` for reasoning and `qwen3_coder` with automatic tool choice for tools. These parser choices belong to that engine path; the separate FP4-Local community containers use different options and cannot supply upstream parser or backend defaults. [qwen3.8-flash-next-VR](https://recipes.vllm.ai/Qwen/Qwen3.8-Flash-Next), [RR-QWEN-LOCAL-CARD](https://huggingface.co/nvidia/Qwen3.8-Flash-Next-FP4-Local/raw/b9ce18a6887e18c089fdea8509a33e63429a3300/README.md).

A native limit of 262,144 tokens is not a claim about concurrency or long-context quality; even the vLLM recipe distinguishes configuring that limit from exercising a full-length request. Keep the atlas's 65,536-token cap as a local planning choice. The publisher's longer-context recipe uses nested `text_config.rope_parameters`, YaRN factor 2 for 524,288 tokens or factor 4 for 1,000,000, preserving the stated multimodal RoPE fields. Static scaling also affects shorter prompts. [qwen3.8-flash-next-VR](https://recipes.vllm.ai/Qwen/Qwen3.8-Flash-Next), [qwen3.8-flash-next-CARD](https://huggingface.co/Qwen/Qwen3.8-Flash-Next/raw/de4b8e4d43b917e7706784d8bb445c9af86a3540/README.md).

## Optimization questions

Compare smaller TP groups and independent replicas at the same eight-GPU budget, explicitly accounting for PLE placement and per-replica state. Investigate whether host offload releases useful HBM without adding lookup tail latency, and whether MTP's natural acceptance repays draft/verification work and rollback storage. The TP8 MTP recipe also changes EP and autotuning, so those changes must be held constant when attributing an effect to speculation.

## Deployment boundary

For production, place one sharded model process group inside a pod that owns its whole GPU group. Do not make eight independent KServe replicas and expect them to form TP8. Start with colocated prefill and decode; adopt disaggregation only after it wins the workload comparison and state transfer is correct. [KS](https://kserve.github.io/website/docs/intro) [KSLLM](https://kserve.github.io/website/docs/model-serving/generative-inference/llmisvc/llmisvc-overview)

## Remaining uncertainty

B300 load, quality and performance for the documented SGLang NVIDIA TP1 recipe; n-gram placement costs; full checkpoint tensor-byte census; production throughput under realistic prefix reuse.
