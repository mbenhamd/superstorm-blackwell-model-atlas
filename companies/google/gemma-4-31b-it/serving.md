# Gemma 4 31B IT: serving and optimization on B300

## November 6 stable releases: vLLM v0.33.0 and SGLang v0.5.23

The latest stable releases are vLLM v0.33.0 (commit `4ba787ec9959e566d3b587a796dff07673324da5`; the GitHub release object carries tag name `v0.33.0rc3`) and SGLang v0.5.23 (commit `297e54fd105e974cdf401e5b4d20253a22c16f90`). KServe upstream v0.21.0 is unchanged; the installed version remains unknown. This review covers release notes, selected source and publisher recipes at the release commits. No image or B300 workload was executed, and every performance figure quoted is an upstream claim. Full reviews: [vLLM v0.33.0](../../../reports/vllm-v033-upgrade.md), [SGLang v0.5.23](../../../reports/sglang-v0523-upgrade.md).

**Identity.** November 6 Hub head recheck: 6 of 6 concrete variants equal retained pins (README/configuration not re-downloaded).

**vLLM v0.33.0.** Besides the CUDA 13.0 / torch 2.14.0 platform bump, the release contains Gemma 4 multimodal fixes on `Gemma4ForConditionalGeneration`, the 31B IT class (release note; all three merge commits are ancestors of `4ba787ec`):

- **Encoder CUDA-graph sizing and correctness (#61365).** Capture buffers were sized far beyond any batch the token budget can hold, causing a startup OOM on the PR's 26B-A4B NVFP4/RTX 5090 setup; graph output was wrong for video and for 70- and 140-token image batches. The fix captures one graph per budget and row width.
- **Non-default `max_soft_tokens` under encoder graphs (#60687).** Image requests previously failed with a shape-mismatch `RuntimeError` at graph replay.
- **Image/audio placeholder strings (#61196).** With `--chat-template-content-format string`, Gemma 4 image and audio chat requests returned HTTP 500; the default `openai` content format was unaffected.
- **Streaming tool arguments (#61494).** The `gemma4` parser streams string tool arguments incrementally.

The encoder-graph fixes apply only when `compilation_config.cudagraph_mm_encoder` is enabled; it defaults to `False` at `4ba787ec`. The retained vLLM arrays set neither that option nor the `string` content format, and they do not pass `--language-model-only`, so the vision encoder is loaded. Include image requests in the v0.32.0 → v0.33.0 release-parity check and record the content format and encoder-graph setting; with encoder graphs enabled, startup memory and image outputs can differ between the two releases. #63538 changes EmbeddingGemma2 and DiffusionGemma only. The data-parallel multimodal encoder (#60314) is main-only. No Gemma item was executed on B300. [V033-RELEASE](https://api.github.com/repos/vllm-project/vllm/releases/tags/v0.33.0rc3), [V033-CUDA-REQUIREMENTS](https://raw.githubusercontent.com/vllm-project/vllm/4ba787ec9959e566d3b587a796dff07673324da5/requirements/cuda.txt), [V033-PR-61365](https://api.github.com/repos/vllm-project/vllm/pulls/61365), [V033-PR-60687](https://api.github.com/repos/vllm-project/vllm/pulls/60687), [V033-PR-61196](https://api.github.com/repos/vllm-project/vllm/pulls/61196), [V033-CMP-GEMMA-ENC](https://api.github.com/repos/vllm-project/vllm/compare/ec8b20fbf01e04d33bb059e555a9b5f39fb4cc46...4ba787ec9959e566d3b587a796dff07673324da5?per_page=1), [V033-CMP-60687](https://api.github.com/repos/vllm-project/vllm/compare/4920df120d8ef6deafc3954bb48cf4ae2e927b92...4ba787ec9959e566d3b587a796dff07673324da5?per_page=1), [V033-CMP-GEMMA-PLACEHOLDER](https://api.github.com/repos/vllm-project/vllm/compare/268e54951c0028c632b2125bae342b3bb5baa85f...4ba787ec9959e566d3b587a796dff07673324da5?per_page=1), [V033-COMPILATION-CONFIG](https://raw.githubusercontent.com/vllm-project/vllm/4ba787ec9959e566d3b587a796dff07673324da5/vllm/config/compilation.py)

**SGLang v0.5.23.** No targeted item; the frozen-KV draft capture change (#45771) was measured on E2B on H200. [S0523-RELEASE](https://api.github.com/repos/sgl-project/sglang/releases/tags/v0.5.23)

## October 26 stable release recheck

The latest stable releases are unchanged: vLLM v0.32.0 and SGLang v0.5.22. This selected-source recheck retains the exact model/export revisions and the existing KServe requirement. It does not requalify historical launch arrays or an installed image.

**vLLM v0.32.0:** Keep TP1 BF16 as the quality control and compare exact FP8/NVFP4 exports separately. Blackwell FA4 head-geometry restrictions remain; hd512 does not become supported merely because a Gemma class is registered. No all-layer FA4 or measured export winner is established. [V032-H-FAUTIL](https://raw.githubusercontent.com/vllm-project/vllm/5df63a7203cdb9328d824a27b682e77c7b9928be/vllm/v1/attention/backends/fa_utils.py)

**SGLang v0.5.22:** Use the explicit Triton/BF16-KV comparison from the retained review; the model override defaults SM10x to TRT-LLM MHA when no backend is supplied. Gemma FA4 PR 42019 explicitly concerns SM90/H200 and cannot qualify B300. [S0522-Q-GEMMA-OVERRIDE](https://raw.githubusercontent.com/sgl-project/sglang/baa9befa381511cd4d56f83980951e5a45fffc6d/python/sglang/srt/arg_groups/model_overrides/gemma4.py) [S0522-Q-GEMMA-FA4-PR](https://api.github.com/repos/sgl-project/sglang/pulls/42019)

[Publisher/export README snapshots](README.md#hugging-face-readme-snapshots) · [Stable/main/nightly identities](../../../reports/nightly-readiness.md#october-26-catalog-wide-recheck). The dated detailed comparisons below retain their original evidence scope.

## October 26 optimization and benchmark priorities

TP1 BF16 quality control versus exact FP8/NVFP4 weight exports with supported local/global attention; then compare the separately pinned official assistant against target-only. The [benchmark decision criteria](../../../reports/optimization.md#benchmark-decisions-and-measurement-contract) define common controls and quality gates. These are proposed experiments in the execution repository, not measured results.

**unmerged draft plus two unmerged dependency PRs.** vLLM 62117 proposes H512 NVFP4 KV through FlashInfer on SM100/SM103: PrimTS decode and temporary FP8 materialization for context attention. Mixed H256/H512 page layouts require correct block clearing.

**Comparison:** After the three patch heads form a buildable integration, compare FP8 versus NVFP4 KV on that same build and exact NVIDIA Gemma export at TP1. Separate unique prompts from prefix-reuse pressure; include allocator reuse and short/long contexts before assistant-on tests.

**Measure and decide:** usable cache tokens and total peak HBM including FP8 workspace; prefill/decode latency and SLO goodput; NaN/Inf, degenerate output and mixed-page reuse; task quality and assistant verification cost. Reject on dependency/build mismatch; mixed-page numerical failure; quality exceeds permitted loss; capacity benefit is offset by workspace or latency cost.

**Evidence limit:** PR 62117 is draft/unmerged; FlashInfer 5720 and 6445 are also open. Author B200/B300 results are not independently reproduced. Do not enable this as stable v0.32 support or assume a universal 2x memory/latency gain. [O26-GEMMA-KV4](https://api.github.com/repos/vllm-project/vllm/pulls/62117) [O26-GEMMA-FI-5720](https://api.github.com/repos/flashinfer-ai/flashinfer/pulls/5720) [O26-GEMMA-FI-6445](https://api.github.com/repos/flashinfer-ai/flashinfer/pulls/6445)

The separate MRV2/MTP fast-prefill PR 63553 was explored on Gemma E2B/RTX3090. The pinned 31B target has num_kv_shared_layers=0; the separate assistant has four decoder layers and num_kv_shared_layers=4. This does not establish a 31B target KV-sharing improvement. [O26-GEMMA-MTP](https://api.github.com/repos/vllm-project/vllm/pulls/63553) [gemma-4-31b-it-CFG](https://huggingface.co/google/gemma-4-31B-it/raw/842da3794eaa0b77d5f08bae87a17459d91ff475/config.json) [RR-GM-GEMMA-DRAFT-CFG](https://huggingface.co/google/gemma-4-31B-it-assistant/raw/627c5ec1458b9086b841a91e0512fd31fd2fbbf1/config.json)

## SGLang v0.5.22 review — October 19

TP1 BF16 target-only, Triton attention/BF16 KV, then exact Red Hat FP8-block and NVFP4 exports. Compare text-only TRT-LLM separately; pinned assistant after target correctness.

Read the [release comparison and model-specific argument fragments](../../../reports/sglang-v0522-upgrade.md) and `sglang_v0522_b300_review` in the [catalog](../../../catalog/models.json) for changes, exclusions and proposed experiments. The review compares release source with v0.5.21; it does not qualify an engine image or measure B300 performance. Existing configuration records retain their original scope.

Key constraints: SM10x default trtllm_mha uses causal image-token attention; Triton is the image-quality control. SM10x FA4 hd256 rejects local attention/image mask callbacks; H200 result cannot promote B300 route.

[S0522-Q-GEMMA-OVERRIDE](https://raw.githubusercontent.com/sgl-project/sglang/baa9befa381511cd4d56f83980951e5a45fffc6d/python/sglang/srt/arg_groups/model_overrides/gemma4.py) [S0522-Q-GEMMA-RECIPE](https://raw.githubusercontent.com/sgl-project/sglang/baa9befa381511cd4d56f83980951e5a45fffc6d/docs/cookbook/autoregressive/Google/Gemma4.mdx) [S0522-Q-GEMMA-MODEL](https://raw.githubusercontent.com/sgl-project/sglang/baa9befa381511cd4d56f83980951e5a45fffc6d/python/sglang/srt/models/gemma4_causal.py)

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
