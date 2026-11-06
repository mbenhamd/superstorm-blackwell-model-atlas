# Kimi K3.1 Pro: serving and optimization on B300

## November 6 engine support status

| Engine | Where K3.1 support exists | In atlas stable baseline? | Evidence |
| --- | --- | --- | --- |
| vLLM | Five open PRs. #66030 adds the model files and says "K3.1 imports but does not serve" until #66037 lands. #66028 adds the renderer, #65685 ROCm/P-D/indexer top-k, #66027 DCP optimizations. The recipe requires "vLLM >= 0.34.0 (not released yet — nightly wheel)" or image `vllm/vllm-openai:kimi-k31` | No. Not in v0.33.0 (or v0.32.0); no release contains it | Release note / PR metadata |
| SGLang | Basic support (#48415) merged to main 2026-11-04 as `61a3c7f2` with `flashmla_kv` and `fp8_ds_mla` KV. DSA decode context parallelism (#48721) merged to main 2026-11-06T08:35Z as `188cf7da`: `--dcp-size > 1` serves plain prefill and decode only, with `flashmla_kv` for both phases. The K3.1 override on main rejects DCP combined with speculative decoding, PD disaggregation or HiCache, and requires the fused sgl-kernel v2 DSA top-k; the PR body adds HiSparse and prefill CP to the rejected set. The author lists no GPU test before merge ("Not run yet"). The opt-in trtllm DSA backend (#48714) merged 2026-11-06T09:00Z as `c06e39c6` and is rejected with DCP>1. DFLASH/DSpark verify, PD and HiCache under DCP, prefill CP and the push-combine reduce and direct all-to-all kernels remain on the `kimi-k3.1-day-0` branch (PR #48414, open; head `ac4006aa` as of 2026-11-06T10:01Z, after `e23bce6b` at 08:26Z) | No. `61a3c7f2`, `188cf7da` and `c06e39c6` are not ancestors of v0.5.23 (or v0.5.22) | PR metadata; compare API; override source at `c06e39c6` |

The images are mutable tags published by the engine projects (Docker Hub namespaces `vllm` and `lmsysorg`), not by Moonshot AI. Digests observed on 2026-11-06: `vllm/vllm-openai:kimi-k31` → `sha256:904520f3…0a99` (amd64 `sha256:88175ddf…599e`, updated 2026-11-04T15:49Z). `lmsysorg/sglang:dev-kimi-k31-pro` → `sha256:67fc77d1…c391` (amd64 `sha256:4a098ad7…305a`, updated 2026-11-04T15:44Z). The source commit inside each image has not been inspected. The SGLang cookbook states that its AgentX commands were measured on a different build: commit `9ab3c28176` plus one unmerged change. [kimi-k3.1-pro-VPR66030](https://api.github.com/repos/vllm-project/vllm/pulls/66030) [kimi-k3.1-pro-VPR66037](https://api.github.com/repos/vllm-project/vllm/pulls/66037) [kimi-k3.1-pro-VR-B300-TP](https://recipes.vllm.ai/moonshotai/Kimi-K3.1-Pro.md?hardware=b300&strategy=single_node_tp) [kimi-k3.1-pro-SPR48415](https://api.github.com/repos/sgl-project/sglang/pulls/48415) [kimi-k3.1-pro-SPR48414](https://api.github.com/repos/sgl-project/sglang/pulls/48414) [kimi-k3.1-pro-SPR48721](https://api.github.com/repos/sgl-project/sglang/pulls/48721) [kimi-k3.1-pro-SPR48714](https://api.github.com/repos/sgl-project/sglang/pulls/48714) [kimi-k3.1-pro-SBR-DAY0](https://api.github.com/repos/sgl-project/sglang/branches/kimi-k3.1-day-0) [kimi-k3.1-pro-SCMP-V0523](https://api.github.com/repos/sgl-project/sglang/compare/61a3c7f2a45f6cfd5fdcec90fd5019d2334c2f0e...v0.5.23) [kimi-k3.1-pro-SCMP-188CF7DA-V0523](https://api.github.com/repos/sgl-project/sglang/compare/188cf7da66938ca2e1ea9cbf7ebbf9a2c81edc2a...v0.5.23) [kimi-k3.1-pro-SCMP-C06E39C6-V0523](https://api.github.com/repos/sgl-project/sglang/compare/c06e39c6ca27c3d78b1696bb25d23b57ce5720ff...v0.5.23) [kimi-k3.1-pro-SOV-C06E39C6](https://raw.githubusercontent.com/sgl-project/sglang/c06e39c6ca27c3d78b1696bb25d23b57ce5720ff/python/sglang/srt/arg_groups/model_overrides/kimi_k3.py) [kimi-k3.1-pro-IMG-VLLM](https://hub.docker.com/v2/repositories/vllm/vllm-openai/tags/kimi-k31) [kimi-k3.1-pro-IMG-SGLANG](https://hub.docker.com/v2/repositories/lmsysorg/sglang/tags/dev-kimi-k31-pro)

**KServe consequence.** Neither engine's stable release can serve this model. A KServe deployment needs a custom ServingRuntime or InferenceService container that references a pinned development image digest. The installed KServe version, resource kind and runtime integration are unknown. Kimi K3 model groups on v0.33.0 / v0.5.23 (or the earlier v0.32.0 / v0.5.22) cannot be switched to K3.1 by changing only the model URI. TokenSpeed, which the card also lists, is outside the required vLLM/SGLang scope.

## Why K3.1 needs new engine code

DSA adds an indexer forward pass, top-2048 selection and sparse MLA kernels. The engine also needs a packed cache that holds the MLA latent, the indexer keys and the KDA state slots in one block row. vLLM PR 66037 states that a DSA layer on a dense backend now raises instead of silently running full attention. An engine that loads the weights without DSA support would therefore have produced numerically different attention. [kimi-k3.1-pro-VPR66037](https://api.github.com/repos/vllm-project/vllm/pulls/66037) [kimi-k3.1-pro-CFG](https://huggingface.co/moonshotai/Kimi-K3.1-Pro/raw/d9e99b0792a5e93b78ea9bea62a68167e36ddd9e/config.json)

## vLLM elements to use on 8×B300

All rows require the K3.1 development build; none is in v0.32.0 or v0.33.0. Commands come from the vLLM project recipe (source `recipes/models/moonshotai/Kimi-K3.1-Pro.yaml` in vllm-project/vllm at `e740bad`; Moonshot's card links it) rendered for `hardware=b300` (page updated 2026-11-05).

| Element | Setting | Label | Rationale and limits |
| --- | --- | --- | --- |
| Topology (baseline) | `--tensor-parallel-size 8`, `--trust-remote-code`, `--load-format fastsafetensors`, `VLLM_ENGINE_READY_TIMEOUT_S=3600` | vLLM recipe | "Simplest working setup… Throughput was not tuned." One KServe group of 8 GPUs |
| Parsers | `--enable-auto-tool-choice --tool-call-parser kimi_k3 --reasoning-parser kimi_k3` | vLLM recipe | Same parsers as K3; encoder logic unchanged |
| Expert parallel (long-prompt TTFT) | `--enable-expert-parallel --moe-backend deep_gemm_mega_moe --all2all-backend flashinfer_nvlink_one_sided` | vLLM recipe | Recipe reports a 340K-token prefill in ~10 s vs ~15 s at TP8. Measured one request at a time on a pre-release checkpoint; not reproduced |
| KV capacity | Decode Context Parallelism (DCP8) row | vLLM recipe | ~18.5M vs ~2.6M FP8 KV tokens; decode 7–25% slower. Use only when KV capacity is the limit. The exact B300 DCP flag was not captured in the rendered commands |
| KV dtype | FP8 latent (recipe capacity figures assume FP8 KV; PR 66030 says DSA KV-dtype defaults arrive with split 3/5); optional `--kv-cache-dtype nvfp4_ds_mla` | vLLM recipe; PR metadata | NVFP4 is ~1.5× tokens. Indexer keys stay FP8; long-context accuracy unmeasured |
| Speculative decoding | `--speculative-config '{"model":"Inferact/Kimi-K3.1-Pro-DSpark-preview","num_speculative_tokens":5,"method":"dspark","draft_sample_method":"probabilistic"}'` | vLLM recipe | Pin draft revision `6a2ef20a`. Its card is a "preview" and does not state the target revision |
| Small-batch decode | `--additional-config '{"decode_backend":"latency_specialized"}'` | vLLM recipe | Recipe claims 1.6–1.7× decode step at batch 1 and 1.2–1.3× at 32–64 on 8×B300 TP8. Requires the V2 runner, FULL decode graphs and no EP, so it excludes the MegaMoE row |
| Context cap | none set by recipe | Hypothesis | Set an explicit `--max-model-len` for the KServe SLO; budget the KDA state per sequence |

[kimi-k3.1-pro-VR](https://recipes.vllm.ai/moonshotai/Kimi-K3.1-Pro) [kimi-k3.1-pro-VR-B300-TP](https://recipes.vllm.ai/moonshotai/Kimi-K3.1-Pro.md?hardware=b300&strategy=single_node_tp) [kimi-k3.1-pro-VR-B300-TEP](https://recipes.vllm.ai/moonshotai/Kimi-K3.1-Pro.md?hardware=b300&strategy=single_node_tep) [kimi-k3.1-pro-VR-B300-SPEC](https://recipes.vllm.ai/moonshotai/Kimi-K3.1-Pro.md?hardware=b300&strategy=single_node_tp&features=tool_calling,reasoning,spec_decoding,low_latency_decode) [kimi-k3.1-pro-VR-B300-NVFP4KV](https://recipes.vllm.ai/moonshotai/Kimi-K3.1-Pro.md?hardware=b300&strategy=single_node_tp&features=tool_calling,reasoning,nvfp4_kv_cache)

The recipe's MI355X AgentX preset uses `rejection_sample_method: synthetic` with acceptance length 3.62. The recipe itself says it must never be used to serve users or evaluate accuracy. It is not B300 evidence.

## SGLang elements to use on 8×B300

The cookbook generator marks both B300 Unified cells "Final Verification In Progress". Only the B300 Decode cells used in PD disaggregation are "Verified". Basic TP8 needs main at or after `61a3c7f2`. Plain DCP (no speculative decoding, PD or HiCache) needs main at or after `188cf7da`. DFLASH and PD, with or without DCP, need the day-0 branch or image. None of these commits is in v0.5.23.

| Element | Setting | Label | Rationale and limits |
| --- | --- | --- | --- |
| Topology, Low-Latency | `--trust-remote-code --tp-size 8 --mem-fraction-static 0.85 --max-running-requests 64 --weight-loader-prefetch-checkpoints --model-loader-extra-config '{"enable_multithread_load": true}'` | Cookbook generator (unverified cell) | Flat TP8 replicates MLA/indexer KV on every rank |
| Topology, High-Concurrency | adds `--dcp-size 8 --dcp-comm-backend fi_a2a --ep-size 2`; env `SGLANG_DCP_PUSH_COMBINE_MAX_ROWS=1536`, `SGLANG_CUSTOM_ALL_REDUCE_V2_MAX_SIZE_KB=32768` | Cookbook generator (unverified cell) | DCP is "the only axis that shards" MLA KV. KDA state is not sharded. Plain DCP8 is accepted on main from `188cf7da`; the main override lists `fi_a2a` as a `--dcp-comm-backend` value. #48721 defers the push-combine reduce and direct all-to-all kernels to later ports, so whether `SGLANG_DCP_PUSH_COMBINE_MAX_ROWS` has any effect on main was not checked. The cookbook targets the day-0 branch/image |
| Parsers | `--reasoning-parser kimi_k3 --tool-call-parser kimi_k3` | Cookbook | — |
| KV | FP8 forced, page size 64; default DSA kernel FlashMLA (`fp8_ds_mla`, 656 B/token/layer) | Cookbook; PR 48415/48714 | `--dsa-prefill-backend/--dsa-decode-backend trtllm` is opt-in, uses an FP8 query and is rejected with DCP>1. Merged to main as `c06e39c6` (#48714; author accuracy measured on the dev branch, not re-run on the merged change) |
| MoE runner | default FlashInfer trtllm-gen fused MXFP4 (no flag) | Cookbook | MegaMoE (`--moe-a2a-backend megamoe`) was measured only on PP4×PCP2 prefill. Do not add `--enable-symm-mem` (deadlock) |
| Speculative decoding | `--speculative-algorithm DFLASH --speculative-draft-model-path RadixArk/Kimi-K3.1-Dflash2-Preview --speculative-dflash-block-size 8 --speculative-draft-kv-cache-dtype fp8_e4m3 --speculative-draft-attention-backend cutedsl_mla --enable-linear-replayssm-spec` plus explicit `--max-running-requests` | Cookbook generator | Draft KV ring adds ~15% target KV. The draft card warns that width 8 × 64 requests left no KV memory at 0.85, so use ≤32 requests at width 8. Pin draft `ea257b38` |
| Concurrency ceiling | KDA state ~52 MB/request/rank at TP8 (FP32); `--max-mamba-cache-size` / `--mamba-full-memory-ratio` | Cookbook; derived check | Matches 69×12×128×128×4 B = 51.75 MiB |

[kimi-k3.1-pro-GR](https://docs.sglang.io/cookbook/autoregressive/Moonshotai/Kimi-K3.1-Pro) [kimi-k3.1-pro-GR-CELLS](https://docs.sglang.io/cookbook/autoregressive/Moonshotai/Kimi-K3.1-Pro) [kimi-k3.1-pro-SPR48714](https://api.github.com/repos/sgl-project/sglang/pulls/48714) [kimi-k3.1-pro-SPR48721](https://api.github.com/repos/sgl-project/sglang/pulls/48721) [kimi-k3.1-pro-SOV-C06E39C6](https://raw.githubusercontent.com/sgl-project/sglang/c06e39c6ca27c3d78b1696bb25d23b57ce5720ff/python/sglang/srt/arg_groups/model_overrides/kimi_k3.py) [kimi-k3.1-pro-DFLASH2](https://huggingface.co/RadixArk/Kimi-K3.1-Dflash2-Preview/blob/ea257b38a8ee755b65287bb8ccd0938b519ce26b/README.md)

The cookbook's GB300 and MI355X AgentX tables fix DFlash acceptance at the draft's expected value. They are throughput experiments, not B300 or natural-acceptance results.

## Draft artifacts

No K3 draft is compatible: the target-layer features and architecture class changed. None of the K3.1 drafts is published by Moonshot.

| Draft | Pinned revision | Engine path | Architecture / target layers | Evidence status |
| --- | --- | --- | --- | --- |
| `Inferact/Kimi-K3.1-Pro-DSpark-preview` (K3.1 counterpart of `Inferact/Kimi-K3-DSpark`) | `6a2ef20a05efe88aabbf9ecaa12d020c3b0edf94` | vLLM recipe, 5 proposals | 5 dense MLA layers, 2.7B BF16, block 7; features [75, 79, 83, 87, 91] | "Preview"; author pooled acceptance length 3.154, measured at 7 draft tokens with `rejection_sample_method: block`, not at the recipe's 5 proposals with default rejection. Author long-context acceptance at the same 7-token setting: 2.765 (BEAM 1M) to 3.501 (AA-LCR). Hardware and target revision unstated |
| `RadixArk/Kimi-K3.1-Dflash2-Preview` | `ea257b38a8ee755b65287bb8ccd0938b519ce26b` | SGLang cookbook DFLASH | 5 MLA layers, SWA 1,024, 2.78B BF16; features [7, 23, 51, 67, 83, 91] | Author acceptance on 8×B300 TP8 (GSM8K/AIME26/GPQA only). Config `base_model_revision` 535833b1 is absent from public history |
| `LithosAI/Kimi-K3.1-Pro-DSpark` | `d791d217d1cc679e07877721761bfcc09d70d514` | Card shows SGLang DSPARK and vLLM dspark commands | GQA 64Q/16KV, 2.25B BF16; features [7, 23, 67, 83, 91] | Third-party. Author mean acceptance 3.448 on 8×B300 TP8 FP8 KV. Block size inconsistent across card (8), config (5), training (5) and SGLang example (7/8). Neither engine recipe references it |

[kimi-k3.1-pro-DRAFT](https://huggingface.co/Inferact/Kimi-K3.1-Pro-DSpark-preview/blob/6a2ef20a05efe88aabbf9ecaa12d020c3b0edf94/README.md) [kimi-k3.1-pro-DRAFT-CFG](https://huggingface.co/Inferact/Kimi-K3.1-Pro-DSpark-preview/raw/6a2ef20a05efe88aabbf9ecaa12d020c3b0edf94/config.json) [kimi-k3.1-pro-DFLASH2-CFG](https://huggingface.co/RadixArk/Kimi-K3.1-Dflash2-Preview/raw/ea257b38a8ee755b65287bb8ccd0938b519ce26b/config.json) [kimi-k3.1-pro-DRAFT-LITHOS](https://huggingface.co/LithosAI/Kimi-K3.1-Pro-DSpark/blob/d791d217d1cc679e07877721761bfcc09d70d514/README.md) [kimi-k3.1-pro-DRAFT-LITHOS-CFG](https://huggingface.co/LithosAI/Kimi-K3.1-Pro-DSpark/raw/d791d217d1cc679e07877721761bfcc09d70d514/config.json)

Excluded: `vllm-project/Kimi-K3.1-Pro-pruned75` is a 75%-expert-pruned smoke-test checkpoint with an author GSM8K of 43.67 that is "not for quality-sensitive use". `unsloth/Kimi-K3.1-Pro` carries a byte-identical config and card, so it is a mirror, not a distinct format.

## Optimization priorities (proposed, not measured)

1. **Target-only TP8 control** on each engine's pinned K3.1 image through KServe. Record the effective DSA kernel, MoE runner, KV dtype and per-rank memory after load.
2. **KV-capacity axis.** Compare TP8 against TP8+DCP8 at fixed context and offered load: decode step, TTFT, maximum concurrent sessions. Keep KDA state slots fixed; DCP does not shard them.
3. **Draft axis**, after (1). vLLM with Inferact preview at 5 proposals; SGLang with RadixArk DFlash2 at block 6/8. Use natural acceptance on agentic coding traces and record running-request caps.
4. **KV precision.** FP8 against NVFP4 (vLLM) or FlashMLA against TRT-LLM DSA (SGLang), gated on long-context retrieval, not GSM8K.
5. **K3 vs K3.1** at equal topology. Confirm whether DSA reduces long-history decode cost on B300; the card claim is not quantified.

Reject a configuration when dispatch falls back from the declared DSA/MoE backend, quality falls below the pre-declared margin, or tail latency worsens at target load. See the [benchmark decision criteria](../../../reports/optimization.md#benchmark-decisions-and-measurement-contract).

## Remaining uncertainty

- No released engine contains K3.1, and the image source commits are unverified.
- SGLang DCP on main (`188cf7da`) merged with GPU validation still owed by its author (TP8/DCP8 GSM8K and a DCP1-vs-DCP8 logprob comparison on B300).
- DSA kernel behavior on SM103 and long-context quality under top-2048 selection are unmeasured.
- Actual B300 KV/state capacity is unmeasured.
- Natural draft acceptance on the target workload is unmeasured.
- The RadixArk draft was trained against an unpublished base revision.
