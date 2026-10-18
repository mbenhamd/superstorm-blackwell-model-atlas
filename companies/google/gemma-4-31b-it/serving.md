# Gemma 4 31B IT: serving on 8×B300

## vLLM v0.32.0 update (October 18)

TP1 target-only parity on the new dependency stack, with BF16 quality anchor and matched exact FP8/NVFP4 comparisons. Selected release integration changes do not establish new Gemma assistant capability or expanded FA4 head geometry.

Assistant support existed in v0.31; method=mtp alone does not identify the separate artifact. See the [v0.32 B300 source review and experiment priorities](../../../reports/vllm-v032-upgrade.md) and `vllm_v032_b300_review` in the [model catalog](../../../catalog/models.json). The version-specific analysis below retains its original scope; no runtime result or launch-array migration is implied.

**Status: unbenchmarked local recommendations.** The upstream recipes are evidence of documented support, not a benchmark of the target B300 node.

## B300 / vLLM v0.31.0 priority (October 17)

TP1 per KServe replica; BF16 quality anchor versus exact FP8/NVFP4 exports. Evaluate TRITON_FLASHINFER for mixed 256/512 head shapes; then the official separate assistant for decode latency.

Generic all-layer FA4 is unsuitable. Stable includes assistant support despite stale nightly-only recipe wording; method=mtp alone does not identify the separate assistant. Qualify quantized-target pairings independently. These are selected-source candidates inside mandatory KServe, with no engine execution or measured B300 winner. [B300V31-GEMMA-TRITON-FLASHINFER](https://raw.githubusercontent.com/vllm-project/vllm/db9527a46873454610df6dbedf79a36d6bf1a7f6/vllm/v1/attention/backends/triton_flashinfer.py) [B300V31-ATTENTION-COMPOSITE](https://raw.githubusercontent.com/vllm-project/vllm/db9527a46873454610df6dbedf79a36d6bf1a7f6/vllm/v1/attention/backends/composite.py) [TOPM-GEMMA-V-PROPOSER](https://raw.githubusercontent.com/vllm-project/vllm/db9527a46873454610df6dbedf79a36d6bf1a7f6/vllm/v1/spec_decode/gemma4.py) [TOPQ-VLLM-STABLE-SPEC-CONFIG](https://raw.githubusercontent.com/vllm-project/vllm/db9527a46873454610df6dbedf79a36d6bf1a7f6/vllm/config/speculative.py)

## Engine and topology

Start with vLLM TP1, 32K context and restrained concurrency. Compare BF16, RedHat block FP8 and RedHat NVFP4. The exact tool template is a versioned deployment asset, not a path guaranteed to exist inside every image; the baseline reference therefore does not blindly reference a source-tree-relative example file.

Eight TP1 replicas are an eight-GPU capacity hypothesis after each replica passes its workload gate. They do not establish eightfold goodput: CPU image processing, routing, cache affinity and admission policy can limit the node. Compare aggregate useful requests under the same tail-latency and quality thresholds.

For dense TP1 replicas, each request's model layers run on one GPU, avoiding tensor-parallel collectives within that forward pass. This is not zero system overhead: dispatch, tokenization, transfers and per-replica scheduling still matter. An export's weight-file total cannot guarantee “250 GB free” per B300. The effective memory budget also includes the selected allocator fraction, KV pools, graphs, activations, multimodal preprocessing and any assistant. [architecture](architecture.md), [memory mathematics](../../../reports/memory-math.md), [node topology](../../../hardware/B300-8GPU.md).

SGLang is an alternative to qualify for the exact export. The generic Hugging Face “use with SGLang” widget does not establish that a particular quantization format works in the selected image. A profile marked compatibility-probe must first load and pass protocol/accuracy tests.

Keep audio disabled for this variant unless a separately verified processor/runtime path proves the intended capability. Do not copy the generic example’s audio limit and advertise audio support.

[gemma-4-31b-it-CARD](https://huggingface.co/google/gemma-4-31B-it/blob/842da3794eaa0b77d5f08bae87a17459d91ff475/README.md) [HW](https://docs.nvidia.com/dgx/dgxb300-user-guide/introduction-to-dgxb300.html)

## Export format and dependency gates

`--quantization modelopt` belongs to a ModelOpt artifact such as the pinned NVIDIA or Turbo exports. Unsloth's current artifact declares **compressed-tensors mixed precision**; its own recipe leaves quantization detection to vLLM. Forcing ModelOpt does not convert the artifact, and vLLM checks a conflicting explicit method against checkpoint metadata. Red Hat's compressed-tensors exports also retain their own format contract. SGLang v0.5.21 has a `modelopt_fp4` implementation, but that is evidence of a loader/kernel path, not proof that every named exporter, modality, cache dtype and assistant combination works. [TOPM-GEMMA-UNSLOTH-CFG](https://huggingface.co/unsloth/gemma-4-31B-it-NVFP4/raw/373c00b5ecb0a8ee43942b5ca08b93805de8eee4/config.json), [TOPM-GEMMA-UNSLOTH-CARD](https://huggingface.co/unsloth/gemma-4-31B-it-NVFP4/raw/373c00b5ecb0a8ee43942b5ca08b93805de8eee4/README.md), [TOPM-GEMMA-V-OVERRIDE](https://github.com/vllm-project/vllm/blob/db9527a46873454610df6dbedf79a36d6bf1a7f6/vllm/config/model.py), [TOPM-GEMMA-G-MODELOPT](https://github.com/sgl-project/sglang/blob/e00930c5489053f26d86b179cee0d087f846acbb/python/sglang/srt/layers/quantization/modelopt_quant.py).

Dependency claims must stay attached to their source: Unsloth's pinned card asks for vLLM ≥0.25.0, FlashInfer ≥0.6.13 and CUTLASS DSL ≥4.5.2; Turbo's older card asks for vLLM ≥0.19 with CUDA 13.0 and Transformers ≥5.5.0. The inspected current stable vLLM **0.31.0** instead declares **Transformers ≥5.10.4 and <5.18.0** in its requirements. A config's `transformers_version`, a generic lower bound and a moving `cu130-nightly` image are different evidence. Pin a coherent released build or image digest and its resolved dependencies; these cards do not justify upgrading Transformers inside an arbitrary serving image. [TOPM-GEMMA-UNSLOTH-CARD](https://huggingface.co/unsloth/gemma-4-31B-it-NVFP4/raw/373c00b5ecb0a8ee43942b5ca08b93805de8eee4/README.md), [TOPM-GEMMA-TURBO-CARD](https://huggingface.co/LilaRest/gemma-4-31B-it-NVFP4-turbo/raw/782d58ea7f9cf3a148be86e153f5689a2d73238b/README.md), [TOPM-GEMMA-V-REQUIRE](https://github.com/vllm-project/vllm/blob/db9527a46873454610df6dbedf79a36d6bf1a7f6/requirements/common.txt).

## FP8 KV and FA4 must cover both layer shapes

Gemma 31B combines **256-dimensional local heads and 512-dimensional global heads**. In vLLM 0.31.0, the Gemma configuration can prefer FA4, but the lower-level selector still rejects the 512-dimensional Blackwell path; its dedicated 256-dimensional Blackwell kernel also rejects quantized KV, among other conditions. Therefore a model-level FA4 setting plus `--kv-cache-dtype fp8` does not establish a supported FA4 execution path for all 60 layers. Check the effective backend, cache dtype, local/global pools and multimodal masking for the actual build. FP8 storage capacity and FP8 attention arithmetic are separate claims. [TOPM-GEMMA-V-CONFIG](https://github.com/vllm-project/vllm/blob/db9527a46873454610df6dbedf79a36d6bf1a7f6/vllm/model_executor/models/config.py), [TOPM-GEMMA-V-FAUTIL](https://github.com/vllm-project/vllm/blob/db9527a46873454610df6dbedf79a36d6bf1a7f6/vllm/v1/attention/backends/fa_utils.py).

The same head-dimension/cache guards remain in inspected vLLM main `9a16d43ef0413b0a2a222e7f5baa4498c291ae5b`. This is a dated source observation, not a claim about every FA4 library or an unexamined wheel. [TOPM-GEMMA-V-FAUTIL-MAIN](https://github.com/vllm-project/vllm/blob/9a16d43ef0413b0a2a222e7f5baa4498c291ae5b/vllm/v1/attention/backends/fa_utils.py), [attention guide](../../../reports/attention-and-fa4.md).

## Text-only tool experiment and asset gate

The report's `--max-model-len 32768`, `--gpu-memory-utilization 0.90`, `--language-model-only`, `--enable-auto-tool-choice`, `--reasoning-parser gemma4`, `--tool-call-parser gemma4`, template override and `--async-scheduling` correspond to Red Hat's reproduction recipe. The recipe also explicitly enables thinking through `--default-chat-template-kwargs '{"enable_thinking": true}'`. Omitting that setting changes the experiment. These flags do not describe the atlas's existing 0.85, parser-free references or a multimodal evaluation. [gemma-4-31b-it-FP8](https://huggingface.co/RedHatAI/gemma-4-31B-it-FP8-block/raw/d7242548c457ab4b45bd3adb8937f2659af4739d/README.md).

`examples/tool_chat_template_gemma4.jinja` is **not bundled in this atlas**. It exists in vLLM at inspected commit `f8460ef23659afd69046a81529ec2295e4c3f686`, but that does not establish its presence or location in an installed wheel/container. Before enabling tools, bundle a reviewed template from the selected engine revision, record its SHA-256 and absolute container path, and verify parser registration in that same image. Record whether the override supersedes the target's newer Hugging Face template. The newer target template and inspected vLLM override require deserialized tool-argument mappings (or `None`); unlike the older template, they reject raw argument strings. An API adapter may normalize strings before rendering, so inspect the rendered tool history rather than assuming every OpenAI-compatible request is affected. [RR-GM-VLLM-TEMPLATE](https://github.com/vllm-project/vllm/blob/f8460ef23659afd69046a81529ec2295e4c3f686/examples/tool_chat_template_gemma4.jinja).

Use a local immutable model snapshot and an absolute template path in the completed command. Pin an image digest, effective KV dtype, scheduler and concurrency limits before launching. First check no-tool chat, single/multiple calls, tool-result continuation with thinking preserved as required by the selected template, and streaming/cancellation. `--language-model-only` disables the image path; qualify image/document traffic in a separate configuration.

## MTP requires the matching separate assistant

Google's official pairing is `google/gemma-4-31B-it` plus `google/gemma-4-31B-it-assistant`, pinned in [architecture](architecture.md). The target configuration does not declare bundled NextN layers. Native family MTP support refers to this paired assistant architecture; it does not make every target export a self-contained MTP checkpoint. [TOPM-GEMMA-DRAFT-CARD](https://huggingface.co/google/gemma-4-31B-it-assistant/raw/627c5ec1458b9086b841a91e0512fd31fd2fbbf1/README.md), [TOPM-GEMMA-BASE-CFG](https://huggingface.co/google/gemma-4-31B-it/raw/842da3794eaa0b77d5f08bae87a17459d91ff475/config.json).

| Engine source inspected | What selects Gemma's assistant path | Consequence for the proposed generic flags |
| --- | --- | --- |
| vLLM v0.31.0, `db9527a46873454610df6dbedf79a36d6bf1a7f6` | An explicit assistant model is converted from `gemma4_assistant` to `gemma4_mtp`; the proposer binds its attention to the target cache. | `method=mtp` with two speculative tokens and no model defaults to the target repository. It does not discover or download Google's separate assistant. |
| SGLang v0.5.21, `e00930c5489053f26d86b179cee0d087f846acbb` | Explicit `speculative-draft-model-path` with `Gemma4AssistantForCausalLM` converts `NEXTN`/`EAGLE` into `FROZEN_KV_MTP`; `EAGLE3` is rejected for this assistant. | `NEXTN` and three steps alone do not select that path. The official 31B recipe names the assistant and uses five steps, six draft tokens, top-k one and TP2; it is not a measured optimum for TP1 B300. |

[TOPM-GEMMA-V-SPEC](https://github.com/vllm-project/vllm/blob/db9527a46873454610df6dbedf79a36d6bf1a7f6/vllm/config/speculative.py), [TOPM-GEMMA-V-PROPOSER](https://github.com/vllm-project/vllm/blob/db9527a46873454610df6dbedf79a36d6bf1a7f6/vllm/v1/spec_decode/gemma4.py), [TOPM-GEMMA-G-HOOK](https://github.com/sgl-project/sglang/blob/e00930c5489053f26d86b179cee0d087f846acbb/python/sglang/srt/arg_groups/speculative_hook.py), [TOPM-GEMMA-G-COOKBOOK](https://github.com/sgl-project/sglang/blob/e00930c5489053f26d86b179cee0d087f846acbb/docs/cookbook/autoregressive/Google/Gemma4.mdx).

The live vLLM recipe still labels MTP nightly-only and suggests four to eight speculative tokens, but Gemma's implementation is present in the inspected **stable v0.31.0 source**. Retain this documentation discrepancy rather than treating the mutable warning as current release evidence. Source inclusion does not validate an unexamined binary, quantized target/draft pairing or speedup. Start with the BF16 target plus BF16 assistant; evaluate each Red Hat, NVIDIA, Unsloth or Turbo target pairing independently. [TOPM-GEMMA-V-RECIPE](https://recipes.vllm.ai/Google/gemma-4-31B-it), [TOPM-GEMMA-V-DRAFT](https://github.com/vllm-project/vllm/blob/db9527a46873454610df6dbedf79a36d6bf1a7f6/vllm/model_executor/models/gemma4_mtp.py).

Main-branch features also have model-specific exclusions. Inspected vLLM main `9a16d43e…` explicitly rejects its new `draft_lm_head_quantization` option for Gemma MTP. Inspected SGLang main `2adc76ad…` resolves Gemma's alias to `FROZEN_KV_MTP` before applying its block-verification allowlist, which excludes that path. These features cannot be added to Gemma merely because their names mention MTP/NEXTN elsewhere. Existing atlas profiles remain target-only, with no local speedup claim. [TOPM-GEMMA-V-SPEC-MAIN](https://github.com/vllm-project/vllm/blob/9a16d43ef0413b0a2a222e7f5baa4498c291ae5b/vllm/config/speculative.py), [TOPM-GEMMA-G-HOOK-MAIN](https://github.com/sgl-project/sglang/blob/2adc76ad61a9c036304716a4548093b1b27b10fb/python/sglang/srt/arg_groups/speculative_hook.py).

## Optimization questions

Compare TP1 BF16/FP8/NVFP4 at matched context and batch; verify global/local cache accounting; test thinking on/off separately; include image grounding, tool-call JSON, long-distance retrieval and concurrent cancellations.

## Remaining uncertainty

Physical KV allocation under attention_k_eq_v in the selected engine; exact export-level SGLang compatibility; correct tool template at the final image revision; local B300 quality and latency.
