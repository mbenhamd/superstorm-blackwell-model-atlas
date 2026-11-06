# Mistral Large 4: serving and optimization on B300

## November 6 engine support status

| Engine | Latest stable release | Model support location | In a release? |
| --- | --- | --- | --- |
| vLLM | v0.33.0 (`4ba787ec`, release object tag name v0.33.0rc3; published 2026-11-02); v0.32.0 also lacks support | Draft PR #64534 "[Model] Add Mistral Large 4", branch `mistral-large-4` head `28a4495de85c64050b3aad39e946d02791710579`, described as "not meant to be merged as is"; unchanged at the 12:45Z recheck (still draft, last update 2026-11-04T19:43Z); image `vllm/vllm-openai:mistral-large-4` | No. `registry.py` on main `6c15c6cc` has no `MistralLarge4*` entry; the PR branch registers `MistralLarge4ForCausalLM` and `MistralLarge4DSparkModel`. The recipe states "no vLLM release or nightly wheel includes Mistral Large 4 support yet" and sets `min_vllm_version: "0.34.0"` |
| SGLang | v0.5.23 (`297e54f`, published 2026-11-02); v0.5.22 also lacks support | Open PR #47271 "[Feat] Mistral-Large-4: add model support" (adds `srt/models/mistral_large_4.py`); head `2cc2f0ef93b1baf96cb520ca3333d5b43dd2352d` at the 2026-11-06T08:30Z retrieval, `1fd8f59c249034bf0239de2894b0659b21576925` at the 10:02Z recheck (still open, unmerged; the added commit changes PD-disaggregation and speculative-registry files, not `mistral_large_4.py`), `eb80b0b66de7d5dda991758a71d8579ae0700526` at the 12:45Z recheck (still open; 188 commits ahead, mostly an upstream-main merge plus Mistral tool/reasoning protocol fixes; `mistral_large_4.py` differs from `2cc2f0ef` by one import); the head moves often, so pin a commit or the image digest; image `lmsysorg/sglang:mistral-large-4` | No. `python/sglang/srt/models` at v0.5.23 and at main `80eedfaf` contains no `mistral_large_4.py` |

Source inspection: [mistral-large-4-VLLM-PR64534](https://api.github.com/repos/vllm-project/vllm/pulls/64534) [mistral-large-4-VLLM-REG-MAIN](https://raw.githubusercontent.com/vllm-project/vllm/6c15c6cc5380b7d2d6052144f96889bf6c5d2e7c/vllm/model_executor/models/registry.py) [mistral-large-4-VLLM-REG-PR](https://raw.githubusercontent.com/vllm-project/vllm/28a4495de85c64050b3aad39e946d02791710579/vllm/model_executor/models/registry.py) [mistral-large-4-SGL-PR47271](https://api.github.com/repos/sgl-project/sglang/pulls/47271) [mistral-large-4-SGL-PR47271-COMPARE](https://api.github.com/repos/sgl-project/sglang/compare/2cc2f0ef93b1baf96cb520ca3333d5b43dd2352d...1fd8f59c249034bf0239de2894b0659b21576925) [mistral-large-4-SGL-MODELS-TREE](https://api.github.com/repos/sgl-project/sglang/contents/python/sglang/srt/models?ref=297e54fd105e974cdf401e5b4d20253a22c16f90)

Generic pieces have landed separately: vLLM PR #64095 "Cross-layer KV cache sharing for attention layers" merged 2026-11-05 (`b02e2287`), after v0.33.0; DSpark spec-decode machinery exists in vLLM v0.32.0 and SGLang v0.5.22 for other models. Neither makes the Large 4 model class available. [mistral-large-4-VLLM-PR64095](https://api.github.com/repos/vllm-project/vllm/pulls/64095)

**Runtime identities (mutable tags, digests observed 2026-11-06):**

| Image tag | Last pushed | Index digest | amd64 digest |
| --- | --- | --- | --- |
| `vllm/vllm-openai:mistral-large-4` | 2026-10-29T14:27:23Z | `sha256:83a52c97e78b284d031e98135f17a448789358be31aa246237d6ad0130ef7657` | `sha256:13bc2adaca593fddfa8f88e41f7cea53582d46d169d63bd86e1477157575fa52` |
| `lmsysorg/sglang:mistral-large-4` | 2026-10-29T13:56:51Z | `sha256:6c9e19a08f30ef8472f3c2ae2d01de99b452cf1fed77f720cd3b6fec61625770` | `sha256:bff7ea4d5feb5ef8f07e32e67d58d295a36bdcd65541f4c830bb18c66c3d249b` |

Both tags still resolved to these digests at 2026-11-06T12:45:33Z. A KServe `ServingRuntime`/`InferenceService` must reference these by digest. The image contents (engine commit, CUDA, FlashInfer/DeepGEMM versions) were not inspected; the PR heads above are not shown to equal the image builds. [mistral-large-4-VLLM-IMAGE](https://hub.docker.com/v2/repositories/vllm/vllm-openai/tags/mistral-large-4) [mistral-large-4-SGL-IMAGE](https://hub.docker.com/v2/repositories/lmsysorg/sglang/tags/mistral-large-4)

## Publisher and engine recipes

| Setting | Publisher card, vLLM (FP8) | Publisher card, vLLM (NVFP4) | vLLM recipe base_args | Publisher card, SGLang (FP8) | Publisher card, SGLang (NVFP4) | SGLang cookbook, 8×B300 FP8 (verified cells) |
| --- | --- | --- | --- | --- | --- | --- |
| Image | `vllm/vllm-openai:mistral-large-4` | same | same; "no release or nightly wheel" | `lmsysorg/sglang:mistral-large-4` | same | same |
| Parallelism | `--tensor-parallel-size 8` | `--tensor-parallel-size 8` | TP8 on B300 (single_node_tp) | `--tp-size 8` | `--tp-size 4` ("example tensor-parallel size for a Blackwell node; adjust to your topology") | `--tp-size 8` |
| Memory | `--gpu-memory-utilization 0.85` | 0.85 | 0.85 | `--mem-fraction-static 0.85` | `--mem-fraction-static 0.85` | 0.85 |
| Context cap | none | none | `--max-model-len 262144` ("validated up to 256k") | none | none | unset (native 1,048,576) |
| Batching | none | none | `--max-num-batched-tokens 8192`, `--max-num-seqs 128` | `--max-running-requests 64` | `--max-running-requests 64` (falls back to 48 if removed) | default 48 with DSpark; 64 in GB300 low-latency cell |
| KV dtype | default | `--kv-cache-dtype fp8_ds_mla` ("needed") | default `fp8_ds_mla` | default | default | default FP8 E4M3 on Blackwell |
| Loader | default | default | `--tokenizer-mode mistral --config-format mistral --load-format mistral` | default | default | auto (native layout detected) |
| Parsers | `--tool-call-parser mistral --reasoning-parser mistral --enable-auto-tool-choice` | same | same | `auto` / `auto` | `auto` / `auto` | `auto` / `auto` |
| Speculation | optional `{"method":"dspark","num_speculative_tokens":3}` | same | default mode `dspark`, 3 | `--speculative-algorithm DSPARK` | `--speculative-algorithm DSPARK` | Low Latency cell: `--speculative-algorithm DSPARK`; High Throughput: off |
| Env | — | — | `VLLM_ENGINE_READY_TIMEOUT_S=6000` (cold start 1,300–1,800 s) | — | — | — |

[mistral-large-4-CARD](https://huggingface.co/mistralai/Mistral-Large-4-1T-A52B/raw/af26e7869af601441d5cdf75a1272469ddc3d059/README.md) [mistral-large-4-NVFP4-CARD](https://huggingface.co/mistralai/Mistral-Large-4-1T-A52B-NVFP4/raw/bb6d00fe249b0e876f0cffc6b85014be02de3e68/README.md) [mistral-large-4-VLLM-RECIPE](https://raw.githubusercontent.com/vllm-project/vllm/6c15c6cc5380b7d2d6052144f96889bf6c5d2e7c/recipes/models/mistralai/Mistral-Large-4-1T-A52B.yaml) [mistral-large-4-SGL-CONFIG-SRC](https://raw.githubusercontent.com/sgl-project/sglang/80eedfaf2fb34e392eaacdbb78a7cff92d6b647d/docs/src/snippets/configs/mistralai/mistral-large-4.jsx) [mistral-large-4-SGL-COOKBOOK-SRC](https://raw.githubusercontent.com/sgl-project/sglang/80eedfaf2fb34e392eaacdbb78a7cff92d6b647d/docs/cookbook/autoregressive/Mistral/Mistral-Large-4.mdx)

The SGLang cookbook marks only FP8 TP8 on 8×B300 as verified for B300; its NVFP4 TP8 B300 cells are "Not yet verified … derived from the verified recipes", and NVFP4 TP4 is verified on 4×GB300 and on one Vera Rubin (arm64) tray, not on B300. The publisher NVFP4 card nonetheless gives an SGLang TP4 command (DSPARK on, `--max-running-requests 64`) as an "example tensor-parallel size for a Blackwell node"; that is a publisher example, not a B300-verified cell. The vLLM recipe lists B300 as verified for TP8 (NVFP4 and FP8), but its own variant table names NVFP4 validation on "GB300, B200" and FP8 on "GB300, H200, MI350X" while the variant descriptions include B300 — an internal inconsistency; no B300 measurement table is published in the recipe.

## Publisher/engine benchmark claims (not reproduced)

SGLang PR/cookbook, 8×B300 FP8 TP8, `lmsysorg/sglang:mistral-large-4`, 1,024 random input / 512 output, 64 prompts per point, flushed cache: target-only 774.1 total tok/s/GPU at concurrency 64 (TPOT P50 28.42 ms); with DSpark 1,017.6 (TPOT 9.81 ms) and 3.71 accepted tokens per 4-token verify step; GSM8K 96.74% at `reasoning_effort` low. The publisher card claims "up to 1.9x" throughput from DSpark. The vLLM recipe reports GB300 NVFP4 TP8 + DSpark c1 TPOT 3.13 ms, NVFP4 1.09–1.18× faster per token than FP8 at TP8 without speculation, ~1.5× FP8's KV capacity, and DSpark acceptance length ~2.98 / 2.85 / 2.79 on real-text prompts at 8k / 32k / 60k input (1P1D on 4+4 GB300, NVFP4 revision `4359ec6`). The SGLang 3.71 tokens/verify figure has no stated prompt set: the cookbook lists it beside the 1,024-token random-prompt speed run, and the benchmark source and PR #47271 record only the value. The two acceptance figures differ in engine, hardware, checkpoint, input length and prompt set; SGLang states "bonus included" and the vLLM runbook does not state its counting rule. The gap between them is therefore unresolved, not attributable to traffic type. Random-token prompts can inflate acceptance relative to agentic traffic; these numbers are publisher/engine results under their own conditions and are not B300 predictions for the atlas workload. [mistral-large-4-SGL-BENCH-SRC](https://raw.githubusercontent.com/sgl-project/sglang/80eedfaf2fb34e392eaacdbb78a7cff92d6b647d/docs/src/snippets/configs/mistralai/mistral-large-4-benchmarks.jsx)

## Elements to use on 8×B300 under KServe

### vLLM (`vllm/vllm-openai:mistral-large-4`, digest-pinned)

| Element | Value | Label | Source |
| --- | --- | --- | --- |
| Image | `vllm/vllm-openai@sha256:83a52c97…` (index) | Release-absent; mutable tag resolved to digest | mistral-large-4-VLLM-IMAGE |
| Checkpoint | NVFP4 `bb6d00fe…` first; FP8 `af26e786…` as quality control | Recipe default (NVFP4 on Blackwell) | mistral-large-4-VLLM-RECIPE |
| NVFP4 path | Detected as `modelopt_mixed` (also present in v0.33.0); routed experts on FlashInfer TRT-LLM NVFP4 (monolithic under TP); `FP8_PB_WO` as block W8A8; TP4 × 2 alternative in the [NVFP4 dossier](nvfp4.md#6-launch-commands) | Source inspection at PR head `28a4495d` and v0.33.0 | mistral-large-4-VLLM-PR-MODELOPT, mistral-large-4-VLLM-V033-NVFP4-ORACLE |
| Layout | TP8, one replica | Recipe (validated B300 layout) | mistral-large-4-VLLM-RECIPE |
| Memory fraction | `--gpu-memory-utilization 0.85` | Recipe base_args ("every validated run used these") + both publisher cards | mistral-large-4-VLLM-RECIPE |
| Loader | `--tokenizer-mode mistral --config-format mistral --load-format mistral` | Recipe | mistral-large-4-VLLM-RECIPE |
| Context / batching | `--max-model-len 262144` or lower; `--max-num-batched-tokens 8192 --max-num-seqs 128` | Recipe (only validated values) | mistral-large-4-VLLM-RECIPE |
| KV dtype | `fp8_ds_mla` (default; explicit on NVFP4 per card) | Publisher card + recipe | mistral-large-4-NVFP4-CARD |
| Attention | FlashMLA sparse with DSA indexer (recipe-stated default; no flag) | Recipe | mistral-large-4-VLLM-RECIPE |
| Speculation | `--speculative-config '{"method":"dspark","num_speculative_tokens":3}'`; depth fixed by checkpoint | Publisher card + recipe | mistral-large-4-CARD |
| Protocol | `--tool-call-parser mistral --reasoning-parser mistral --enable-auto-tool-choice` | Publisher card | mistral-large-4-CARD |
| Startup | `VLLM_ENGINE_READY_TIMEOUT_S=6000`; KServe startup/readiness probes must tolerate ≥1,800 s | Recipe + hypothesis for KServe probe values | mistral-large-4-VLLM-RECIPE |
| Long-context option | `--decode-context-parallel-size 8` when KV capacity binds (recipe: 3.60M → 28.76M tokens on GB300 NVFP4) | Recipe (GB300 only) | mistral-large-4-VLLM-RECIPE |
| Text-only option | `--language-model-only` (required for PCP) | Recipe | mistral-large-4-VLLM-RECIPE |

Known issues: vLLM issues #64793/#64789 (Responses API rejects `developer` role and `input_text` content with `--tokenizer-mode mistral`) were open on 2026-11-06 (rechecked 12:54Z); use Chat Completions until resolved. vLLM #64855 (open, ROCm-verified; CUDA path asserted from code reading) reports wrong DSA-indexer top-k on ragged speculative-decode steps; whether the Large 4 image is affected is unknown, so compare DSpark-on against target-only quality. [mistral-large-4-VLLM-ISSUE64855](https://api.github.com/repos/vllm-project/vllm/issues/64855) HiSparse with the default FlashInfer MNNVL all-reduce crashes (recipe note; set `VLLM_FLASHINFER_ALLREDUCE_BACKEND=trtllm` only if HiSparse is used).

### SGLang (`lmsysorg/sglang:mistral-large-4`, digest-pinned)

| Element | Value | Label | Source |
| --- | --- | --- | --- |
| Image | `lmsysorg/sglang@sha256:6c9e19a0…` (index) | Release-absent; PR #47271 open | mistral-large-4-SGL-IMAGE |
| Checkpoint | FP8 `af26e786…` (only verified B300 cell); NVFP4 `bb6d00fe…` at TP8 is the cookbook's B300 cell marked "Not yet verified", and the publisher card's TP4 command is verified only on 4×GB300 | Cookbook verified / unverified / publisher example | mistral-large-4-SGL-CONFIG-SRC, mistral-large-4-NVFP4-CARD |
| NVFP4 path | Detected as `modelopt_mixed`; routed experts on `flashinfer_trtllm` (DeepSeek-family SM100 override, SM103 included); `dsa` attention forced; commands in the [NVFP4 dossier](nvfp4.md#6-launch-commands) | Source inspection at PR head `eb80b0b6` | mistral-large-4-SGL-PR-OVERRIDES |
| Layout | `--tp-size 8 --mem-fraction-static 0.85` | Cookbook verified (8×B300) | mistral-large-4-SGL-CONFIG-SRC |
| KV dtype | default FP8 E4M3; `--kv-cache-dtype bfloat16` as quality control (≈1.34M vs 2.49M tokens) | Cookbook | mistral-large-4-SGL-COOKBOOK-SRC |
| Context | leave `--context-length` unset for 1,048,576, or cap to workload | Cookbook | mistral-large-4-SGL-COOKBOOK-SRC |
| Speculation | `--speculative-algorithm DSPARK`; do not pass draft path or draft-length flags; `--max-running-requests` default 48, ≤48 for long context | Cookbook | mistral-large-4-SGL-COOKBOOK-SRC |
| Protocol | `--reasoning-parser auto --tool-call-parser auto` (resolves to `mistral`); `reasoning_effort` `none` → HTTP 400 | Cookbook + PR | mistral-large-4-SGL-PR47271 |
| Tokenizer | `mistral-common` ≥ 1.13.0 (in image) | Cookbook | mistral-large-4-SGL-COOKBOOK-SRC |
| Options | Prefill CP 2 for long-prompt TTFT; DCP or HiSparse for KV capacity (mutually exclusive with prefill CP); DP-attention and EP8 in Playground (not verified) | Cookbook Playground (unverified) | mistral-large-4-SGL-CONFIG-SRC |
| Restrictions | `--enable-kv-cache-sharding` rejected; PP must keep layer 35 with readers (`SGLANG_PP_LAYER_PARTITION=35,37`) | Cookbook | mistral-large-4-SGL-COOKBOOK-SRC |

## Topology analysis for 8×B300

FP8 has one viable single-node layout: all eight GPUs in one TP8 (or DP8-attention + EP8) group, ≈132.6 GB/GPU of serialized weights. NVFP4 admits TP8 (≈76.3 GB/GPU even shard; ≈80.2 GB target-only once replicated indexer, router, vision and MLA down-projections are counted, ≈84.4 GB with a replicated DSpark draft) or two TP4 replicas (≈152.5 GB/GPU even shard; ≈155.3 / ≈159.5 GB, leaving ≈1.8–1.9M FP8 KV tokens per replica at 0.85 of 288 GB — see the [NVFP4 dossier](nvfp4.md#5-memory-weights-per-gpu-and-kv-room); the publisher NVFP4 card's SGLang example uses TP4, while engine verification of NVFP4 TP4 covers GB300 and Vera Rubin only); two replicas double request-level parallelism but halve per-replica KV room and run MoE over four GPUs. Because TP replicates the MLA latent, TP8 does not give eight times the per-token KV capacity of TP1; DCP shards the latent and is the documented capacity lever. Expert parallelism (EP8 with DP-attention) avoids latent replication and suits short-input, high-concurrency traffic in the GB300 P/D results; it was not validated colocated on B300 by either engine. All of these are derived candidates.

## Optimization questions

1. Target-only TP8: NVFP4 vs FP8 at equal `--max-model-len`, quality on the atlas workload (tool calls, long-context retrieval, image prompts), TTFT/TPOT, KV token capacity.
2. DSpark on/off in the same image and layout; report natural acceptance length on real traffic, not GSM8K/random prompts; check KV admission loss (vLLM recipe: draft admission bound ≈0.69× of plain DCP8 capacity at 64k).
3. NVFP4: one TP8 replica vs two TP4 replicas at the same offered load; reject TP4 if KV capacity cannot hold the target context × concurrency.
4. vLLM vs SGLang images on identical artifact, context cap and concurrency; record engine commit inside each image.
5. Long context: TP8 vs TP8 + DCP8 at 128k–256k; treat >262,144 tokens as unvalidated in vLLM.
6. KServe: cold-start time against probe settings; storage path for 1.06 TB (FP8) or 610 GB (NVFP4) snapshots; restart-from-cache behavior.

[Benchmark decision criteria](../../../reports/optimization.md#benchmark-decisions-and-measurement-contract) define common controls. These are proposed experiments for the execution repository, not measured results.

## Remaining uncertainty

No released engine; image builds not source-identified; SM103 block-FP8 GEMM kernel choice not observed; NVFP4 recipe revision `4359ec6` not public; per-layer cache layout for NoPE/indexer layers per engine; B300 NVFP4 not verified by SGLang and inconsistently documented by vLLM; 1M-token serving unvalidated; DSpark acceptance on agentic traffic; KServe integration details (installed version, resource kind) unknown.
