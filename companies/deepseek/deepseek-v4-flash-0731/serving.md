# DeepSeek V4 Flash 0731: serving on 8×B300

## vLLM v0.32.0 update (October 18)

NVIDIA NVFP4 TP8 target-only control, then same-revision bundled DSpark acceptance/quality probe after ignore-list correction. ModelOpt ignore mapping preserves native MXFP4 mtp.* draft experts instead of misinterpreting them as target NVFP4. Exact pinned0731 config/index matches this mechanism.

PR end-to-end recovery is V4.1; publisher0731 export did not exercise speculation. No measured0731 speedup or complete loader qualification. See the [v0.32 B300 source review and experiment priorities](../../../reports/vllm-v032-upgrade.md) and `vllm_v032_b300_review` in the [model catalog](../../../catalog/models.json). The version-specific analysis below retains its original scope; no runtime result or launch-array migration is implied.

**Status: unbenchmarked candidates, rechecked 2026-10-16 (UTC).** The upstream recipes document serving paths; none was run on this node.

## B300 / vLLM v0.31.0 priority (October 17)

Native TP1/DP4+EP reference; compare DP8+EP as an eight-GPU adaptation. Compare target-only with bundled DSpark; seven proposals are a recipe candidate, with explicit matching draft revision and sampling.

Use v0.31 indexer_kv_dtype=mxfp4, not obsolete use_fp4_indexer_cache. Default V4 FlashMLA uses packed fp8_ds_mla, not generic FP8/FA4. NVIDIA NVFP4 target-only TP8 is separate; its DSpark pairing remains unresolved. These are selected-source candidates inside mandatory KServe, with no engine execution or measured B300 winner. [VLLM031-CATALOG-vllm-models-deepseek_v4-nvidia-model](https://raw.githubusercontent.com/vllm-project/vllm/db9527a46873454610df6dbedf79a36d6bf1a7f6/vllm/models/deepseek_v4/nvidia/model.py) [VLLM031-CATALOG-vllm-models-deepseek_v4-attention](https://raw.githubusercontent.com/vllm-project/vllm/db9527a46873454610df6dbedf79a36d6bf1a7f6/vllm/models/deepseek_v4/attention.py) [VLLM031-CATALOG-recipe-deepseek](https://raw.githubusercontent.com/vllm-project/recipes/d5fc1f55cee70f4e1944f2dd4f7569cb8276ad94/models/deepseek-ai/DeepSeek-V4-Flash.yaml) [deepseek-v4-flash-0731-NV-CARD](https://huggingface.co/nvidia/DeepSeek-V4-Flash-0731-NVFP4/raw/f1caa71142bd0be02f728c79f75042ac1e461579/README.md)

## Engine and topology

Use the documented vLLM TP1/DP4 plus expert-parallel layout as the initial four-GPU baseline. DP8/EP is a separate eight-GPU adaptation. Expert parallelism reuses the data-parallel group; it is not another factor multiplying the GPU count. A 64K total-context cap is an initial workload choice; the recipe specifies FP8 KV and the DeepGEMM MegaMoE backend. The chosen image still needs to pass correctness checks for this exact revision. [vLLM recipe](https://recipes.vllm.ai/deepseek-ai/DeepSeek-V4-Flash?features=tool_calling,reasoning&hardware=b300).

The publisher also documents the exact 0731 checkpoint with SGLang TP4, `flashinfer_mxfp4` and bundled DSpark. SGLang's cookbook reports an end-to-end run of that command on 4×GB300 with v0.5.16. This is upstream evidence, not a local eight-B300 result. A SGLang TP8 target-only adaptation needs qualification because it changes that topology and omits speculation. [Publisher card](https://huggingface.co/deepseek-ai/DeepSeek-V4-Flash-0731/blob/7872f01b1d1fe23eabc4c98b48bffcef5a386062/README.md), [SGLang cookbook](https://docs.sglang.io/cookbook/autoregressive/DeepSeek/DeepSeek-V4).

The native TP4 recipe must not be transferred wholesale to `nvidia/DeepSeek-V4-Flash-0731-NVFP4`. That export's immutable card documents TP8 target-only commands, reports B200 test hardware, and says speculation was not exercised. The report's NVFP4 TP4 + DSpark proposal is therefore an unqualified combination. SGLang 0.5.20 is also no longer the latest stable release: the fresh check found 0.5.21. A newer release alone does not validate this combination. [NVIDIA export card](https://huggingface.co/nvidia/DeepSeek-V4-Flash-0731-NVFP4/raw/f1caa71142bd0be02f728c79f75042ac1e461579/README.md), [SGLang release](https://github.com/sgl-project/sglang/releases/tag/v0.5.21).

| Source-backed candidate | Settings that identify the path | Qualification boundary |
| --- | --- | --- |
| Native vLLM | TP1/DP4 + EP; `deep_gemm_mega_moe`; FP8 KV, block size 256; `deepseek_v4` tokenizer/reasoning/tool parsers | Start with target-only. Optional seven-token DSpark is a separate comparison; choose and record greedy versus probabilistic drafting. |
| Native SGLang | TP4; `flashinfer_mxfp4`; prefill chunk 4096, SWA/full-token ratio 0.1; `deepseek-v4` reasoning and `deepseekv4` tool parser | Derive a target-only control from the documented DSpark recipe; preserve its memory and cache settings. Upstream evidence is four GB300 GPUs. |
| NVIDIA 0731 NVFP4 SGLang | TP8; `flashinfer_trtllm_routed`; `fp8_e4m3` KV; prefill chunk 4096 and SWA/full-token ratio 0.1; same SGLang parsers | Pin `f1caa71142bd0be02f728c79f75042ac1e461579` and qualify target-only before TP4 or DSpark. |
| NVIDIA 0731 NVFP4 vLLM | TP8 + EP; FP8 KV, block size 256; FP4 indexer enabled in the card's example; DeepSeek tokenizer/parsers and reasoning configuration | Separate export recipe; do not carry over the native MegaMoE backend. Establish actual indexer/cache settings before comparing quality. |

These settings summarize the [native vLLM recipe](https://recipes.vllm.ai/deepseek-ai/DeepSeek-V4-Flash?features=tool_calling,reasoning&hardware=b300), [native SGLang recipe](https://docs.sglang.io/cookbook/autoregressive/DeepSeek/DeepSeek-V4) and [NVIDIA export commands](https://huggingface.co/nvidia/DeepSeek-V4-Flash-0731-NVFP4/raw/f1caa71142bd0be02f728c79f75042ac1e461579/README.md). Complete image/dependency pins and effective defaults remain required. The prefill chunk is a scheduling choice shared by two recipes; it is not proof that their quantization or draft paths are interchangeable.

Preserve the producer's encoding contract: this release supplies Python message-encoding/parsing helpers instead of a Jinja chat template. Check reasoning fields, tool boundaries and streaming. The engine parser names differ: vLLM documents `deepseek_v4`; SGLang documents reasoning parser `deepseek-v4` and tool parser `deepseekv4`. A fluent answer alone does not verify that protocol. [Encoding documentation](https://huggingface.co/deepseek-ai/DeepSeek-V4-Flash-0731/blob/7872f01b1d1fe23eabc4c98b48bffcef5a386062/encoding/README.md), [vLLM recipe](https://recipes.vllm.ai/deepseek-ai/DeepSeek-V4-Flash?features=tool_calling,reasoning&hardware=b300), [SGLang cookbook](https://docs.sglang.io/cookbook/autoregressive/DeepSeek/DeepSeek-V4).

DSpark weights are bundled with the target. SGLang instructs users to omit a separate draft-model path; its documented default proposes five tokens and verifies six. The vLLM recipe uses seven proposals. These engine choices do not rewrite the checkpoint's `dspark_block_size=5`. Match sampling too: the publisher's vLLM example uses greedy drafting, while the current recipe selects probabilistic drafting. Treat each as a distinct experiment and keep the client sampling fixed. [Publisher card](https://huggingface.co/deepseek-ai/DeepSeek-V4-Flash-0731/blob/7872f01b1d1fe23eabc4c98b48bffcef5a386062/README.md), [vLLM recipe](https://recipes.vllm.ai/deepseek-ai/DeepSeek-V4-Flash?features=tool_calling,reasoning&hardware=b300), [SGLang cookbook](https://docs.sglang.io/cookbook/autoregressive/DeepSeek/DeepSeek-V4).

A 64K total-context cap is deliberately restrictive. DeepSeek recommends allowing up to 384K output tokens for high/max effort; those requests cannot fit this cap. Compare engines under the same shorter application budget, or qualify a separate long-output configuration. [Publisher usage guidance](https://huggingface.co/deepseek-ai/DeepSeek-V4-Flash-0731/blob/7872f01b1d1fe23eabc4c98b48bffcef5a386062/README.md).

## Optimization questions

Compare target-only with native DSpark, natural acceptance, and identical prompts. Test 4-GPU versus 8-GPU EP layouts, index-cache precision and 16K/64K/128K prompts. Validate tool calls, reasoning boundaries, EOS handling and the first token after a cancelled speculative request.

For a small first campaign, score one fixed prompt, a multi-turn tool exchange through the 0731 encoder, and an executable coding task at concurrency 1. Add a document question with evidence just inside and outside the 128-token recent window, then a cancellation/reuse case. Only after those pass, compare target-only with native DSpark and then with the separate NVFP4 export. On the same eight-GPU node, compare two qualified four-GPU groups against one eight-GPU group using equal aggregate offered work; TP4 is a candidate, not a universal native-engine optimum. Keep results in the external experiment repository.

For any external experiment, record the actual GPU memory, topology, target/export revision, image digest and effective backends before comparing results.

## Remaining uncertainty

Exact main-plus-draft parameter accounting; selected image and kernel provenance; local B300 capacity, throughput and application correctness; qualification of the local eight-GPU adaptations.
