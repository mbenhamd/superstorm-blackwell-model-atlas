# Qwen 3.8 27B: serving on 8×B300

**Status: unbenchmarked local candidates.** Publisher and engine recipes document support; this audit did not run an engine or benchmark the node.

## Engine and topology

Begin with vLLM TP1 BF16 at 32K context, then the same FP8 and NVFP4 workload. Repeat with SGLang TP1. Keep vision enabled for multimodal validation and explicitly constrain its allowed input sizes; a text-only optimization must be a separate profile.

The supplied TP1 settings are controlled local experiments. NVIDIA's card documents a TP4 vLLM example and a SGLang example for its exact export; the current SGLang cookbook also lists that export. The cookbook pins FP8 KV, whereas the supplied SGLang comparison references pin BF16 KV. Record this difference and resolve vLLM's `auto` cache dtype before comparing results. The vLLM recipe's low-latency NVFP4 example uses an Inferact artifact, so its measurements do not establish NVIDIA-export performance.

Compare per-GPU replicas with TP2 and TP4 only after measuring single-request latency. The NVIDIA card’s TP4 long-context example is not evidence that TP4 maximizes node throughput for ordinary chat. For hybrid prefix caching, verify the recurrent-state path, not just token KV hits.

The 262,144-token native window is a supported model capacity, not a useful initial admission policy for every application. At BF16, the conventional full-attention KV payload alone grows from 2 GiB for a 32,768-token sequence to 16 GiB at native length. Recurrent-state slots and snapshots add a separate concurrency cost. The supplied report's immediate `--max-model-len 262144` recommendation should therefore be read as a long-context configuration, while 32K is the atlas's conservative starting hypothesis. Neither setting is a measured optimum.

“About 250 GB free” after loading weights is not a verified runtime budget: GB/GiB conversion, loading/repacking, graphs, vision, recurrent slots and allocator reserves all intervene. At one million tokens, the conventional full-attention KV payload alone is about **61.04 GiB at BF16 or 30.52 GiB at FP8 per sequence** (`2 × 16 × 4 × 256 × 1,000,000 × bytes`). This calculation excludes the other allocations and does not establish useful million-token quality or concurrency. [TOPQ-27-CFG](https://huggingface.co/Qwen/Qwen3.8-27B/raw/1d4bf0f2ff6012fd82039f2fa52739d0dd7c60c0/config.json)

Base, official FP8 and NVIDIA metadata revisions are pinned in [sources](sources.md) and [model catalog](../../../catalog/models.json). Pin the tokenizer/processor and actual runtime image as well. A revision identifies source artifacts; it does not validate installed kernels, multimodal execution or MTP behavior.

[qwen3.8-27b-VR](https://recipes.vllm.ai/Qwen/Qwen3.8-27B) [qwen3.8-27b-GR](https://docs.sglang.io/cookbook/autoregressive/Qwen/Qwen3.8-27B) [qwen3.8-27b-CARD](https://huggingface.co/Qwen/Qwen3.8-27B/raw/1d4bf0f2ff6012fd82039f2fa52739d0dd7c60c0/README.md) [qwen3.8-27b-NV](https://huggingface.co/nvidia/Qwen3.8-27B-NVFP4/raw/482ca0f3832238542f8f5295dde86b5f22711d80/README.md) [HW](https://docs.nvidia.com/dgx/dgxb300-user-guide/introduction-to-dgxb300.html)

## Prompt and generation contract

The pinned publisher template uses thinking and `preserve_thinking` by default; documented effort levels are `xhigh` (default), `medium` and `low`. Setting `preserve_thinking=false` retains reasoning associated with the latest user message rather than stripping every reasoning block. Saving the actual serialized conversation matters: preservation changes prompt length and prefix-reuse opportunities. [qwen3.8-27b-CARD](https://huggingface.co/Qwen/Qwen3.8-27B/raw/1d4bf0f2ff6012fd82039f2fa52739d0dd7c60c0/README.md), [RR-QWEN-27-PIN-CHAT_TEMPLATE](https://huggingface.co/Qwen/Qwen3.8-27B/raw/1d4bf0f2ff6012fd82039f2fa52739d0dd7c60c0/chat_template.jinja).

| Workload / mode | Explicit request settings | Practical consequence |
| --- | --- | --- |
| Direct chat or extraction / non-thinking | `chat_template_kwargs.enable_thinking=false`; temperature 0.7, top-p 0.8, top-k 20, min-p 0, presence penalty 1.5, repetition penalty 1 | Bound the final-answer budget to the task; structured output still depends on the selected parser and API support. |
| Coding, research or multi-turn tools / thinking | `enable_thinking=true`, `preserve_thinking=true`; temperature 1.0, top-p 0.95, top-k 20, min-p 0, presence penalty 0, repetition penalty 1; state `reasoning_effort` explicitly | Lower effort can save tokens per turn while increasing failed attempts; complete-task latency includes retries and tool time. |
| Images or video | Keep the same mode settings and pin processor, image limits and frame-sampling policy | Count visual tokens and preserved reasoning inside the input-plus-output context budget. |

The numbers are publisher recommendations, not measured B300 tuning. Parameter support differs across APIs. The ordinary vLLM recipe uses `--reasoning-parser qwen3` and, for tools, `--enable-auto-tool-choice --tool-call-parser qwen3_coder`; NVIDIA's SGLang example names `qwen3` and `qwen3_coder` too. Parser-free configurations do not establish the corresponding reasoning/tool API behavior. [qwen3.8-27b-VR](https://recipes.vllm.ai/Qwen/Qwen3.8-27B), [qwen3.8-27b-NV](https://huggingface.co/nvidia/Qwen3.8-27B-NVFP4/raw/482ca0f3832238542f8f5295dde86b5f22711d80/README.md).

## Long context and optimization opportunities

The publisher's YaRN example places `rope_parameters` under `text_config`: `rope_type=yarn`, `rope_theta=10000000`, `partial_rotary_factor=0.25`, `mrope_interleaved=true`, `mrope_section=[11,11,10]`, and `original_max_position_embeddings=262144`. Factor 2 targets 524,288 tokens; factor 4 accompanies the 1,000,000-token example. vLLM uses `--hf-overrides` and SGLang `--json-model-override-args`, with their respective longer-context override environment variables. This changes positional behavior even for short prompts, so it belongs to a separate long-context service policy. [qwen3.8-27b-CARD](https://huggingface.co/Qwen/Qwen3.8-27B/raw/1d4bf0f2ff6012fd82039f2fa52739d0dd7c60c0/README.md).

The useful optimization questions are whether eight independent TP1 replicas outperform four TP2 or two TP4 groups at the same node budget; whether reduced weight bandwidth offsets quantization overhead; and whether native MTP saves more decode work than its draft, verification and state-rollback costs. Prefix reuse must restore GDN and convolution state as well as full-attention KV. These are mechanisms to investigate, with no established winner.

The pinned BF16, official FP8 and NVIDIA weight indexes all include native `mtp.` entries. SGLang's native recipe spells the chain `EAGLE` (or its `NEXTN` alias), with three steps, top-k 1 and four verification tokens; vLLM uses method `mtp` and a speculative-token count. These are different API counts for the same style of in-checkpoint drafting, not external EAGLE3 weights. The NVIDIA MTP tensors are excluded from its quantization map, so the draft loader must preserve that precision contract. [TOPQ-27-INDEX](https://huggingface.co/Qwen/Qwen3.8-27B/resolve/1d4bf0f2ff6012fd82039f2fa52739d0dd7c60c0/model.safetensors.index.json) [TOPQ-27FP8-INDEX](https://huggingface.co/Qwen/Qwen3.8-27B-FP8/resolve/017b9c7af6b5689d5dd426a76e0bc077eb5ca20a/model.safetensors.index.json) [TOPQ-27NV-INDEX](https://huggingface.co/nvidia/Qwen3.8-27B-NVFP4/resolve/482ca0f3832238542f8f5295dde86b5f22711d80/model.safetensors.index.json) [TOPQ-SGL-STABLE-RECIPE27](https://raw.githubusercontent.com/sgl-project/sglang/e00930c5489053f26d86b179cee0d087f846acbb/docs/src/snippets/configs/Qwen/qwen3.8-27b.jsx)

Lower-precision weights do not establish calibrated FP8 KV scales. The SGLang recipe explicitly distinguishes BF16/official-FP8 checkpoints without FP8 KV calibration from exports that carry it; NVIDIA's quantization metadata leaves `kv_cache_quant_algo` unset. Record the selected cache dtype and the engine's scale handling together. [TOPQ-SGL-STABLE-RECIPE27](https://raw.githubusercontent.com/sgl-project/sglang/e00930c5489053f26d86b179cee0d087f846acbb/docs/src/snippets/configs/Qwen/qwen3.8-27b.jsx) [TOPQ-27NV-QUANT](https://huggingface.co/nvidia/Qwen3.8-27B-NVFP4/raw/482ca0f3832238542f8f5295dde86b5f22711d80/hf_quant_config.json)

## Deployment boundary

For production, place one sharded model process group inside a pod that owns its whole GPU group. Do not make eight independent KServe replicas and expect them to form TP8. Start with colocated prefill and decode; adopt disaggregation only after it wins the workload comparison and state transfer is correct. [KS](https://kserve.github.io/website/docs/intro) [KSLLM](https://kserve.github.io/website/docs/model-serving/generative-inference/llmisvc/llmisvc-overview)

## Remaining uncertainty

Actual TP1 NVFP4 kernel efficiency on this B300 firmware/container combination; optimal hybrid-cache split; useful quality at the extended context; performance under the user’s language and tool distributions.
