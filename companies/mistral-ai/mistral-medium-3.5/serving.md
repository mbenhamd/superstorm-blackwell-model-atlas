# Mistral Medium 3.5: serving on 8×B300

## vLLM v0.32.0 update (October 18)

Pinned FP8 target and official EAGLE release control; target-only versus3 proposals, then TP2/4 layouts versus TP8. Exact EAGLE implementation unchanged; Large3/Llama4 repair is not a Medium3.5 fix.

Explicit draft max_model_len above target remains invalid. See the [v0.32 B300 source review and experiment priorities](../../../reports/vllm-v032-upgrade.md) and `vllm_v032_b300_review` in the [model catalog](../../../catalog/models.json). The version-specific analysis below retains its original scope; no runtime result or launch-array migration is implied.

**Status: unbenchmarked local recommendations.** The upstream recipes are evidence of documented support, not a benchmark of the target B300 node.

## B300 / vLLM v0.31.0 priority (October 17)

Publisher FP8 TP8 reference; investigate TP2/TP4 and corresponding independent replicas. Compare target-only with official EAGLE, three proposals, separately pinned draft revision.

Stable contains EagleMistral; nightly is not required merely by old recipe wording. Omit draft max_model_len=65536 on a 32768 target, or reduce it: v0.31 rejects draft cap above target. TP1 and FP8 KV remain capacity/quality probes. These are selected-source candidates inside mandatory KServe, with no engine execution or measured B300 winner. [VLLM031-CATALOG-vllm-model_executor-models-mistral_eagle](https://raw.githubusercontent.com/vllm-project/vllm/db9527a46873454610df6dbedf79a36d6bf1a7f6/vllm/model_executor/models/mistral_eagle.py) [TOPQ-VLLM-STABLE-SPEC-CONFIG](https://raw.githubusercontent.com/vllm-project/vllm/db9527a46873454610df6dbedf79a36d6bf1a7f6/vllm/config/speculative.py) [VLLM031-CATALOG-recipe-mistral](https://raw.githubusercontent.com/vllm-project/recipes/d5fc1f55cee70f4e1944f2dd4f7569cb8276ad94/models/mistralai/Mistral-Medium-3.5-128B.yaml) [TOPM-GEMMA-V-REQUIRE](https://raw.githubusercontent.com/vllm-project/vllm/db9527a46873454610df6dbedf79a36d6bf1a7f6/requirements/common.txt)

## Engine and topology

Use vLLM first because the producer explicitly recommends it and documents the Mistral reasoning and tool parsers. Establish the TP8 publisher baseline with the atlas’s 32K cap, then compare the TP2 probe and a TP4 experiment. Keep a fixed number of total node GPUs when comparing independent replicas against tensor sharding.

Resolve the correct tokenizer and Mistral encoding dependencies in the image. Do not copy an old nightly-install command and label it reproducible: pin the wheel or image digest and record the loaded config checksum. The card’s historical dependency minima are not a complete tested bill of materials.

The publisher's target and EAGLE cards specify vLLM nightly with `mistral_common >= 1.11.1` and `transformers >= 5.4.0`; their SGLang section names the Blackwell tag `lmsysorg/sglang:dev-cu13-mistral-medium-3.5` (CUDA 13.0). These are documented setup requirements, not immutable runtime identities. The latest stable releases rechecked on 2026-10-16 are [vLLM 0.31.0](https://github.com/vllm-project/vllm/releases/tag/v0.31.0) and [SGLang 0.5.21](https://github.com/sgl-project/sglang/releases/tag/v0.5.21); a release number alone does not qualify the target/draft path.

The pinned publisher card also supplies a SGLang TP8 command with `--tool-call-parser mistral` and `--reasoning-parser mistral`. The official SGLang cookbook documents this exact FP8 model, the alternate checkpoint layouts and H200 validation runs. This establishes documented support; it does not certify the atlas’s B300 image or settings. The local SGLang profile remains a compatibility probe until loaded and tested, and a parser-free probe cannot establish reasoning or tool-call correctness. [mistral-medium-3.5-GR](https://docs.sglang.io/cookbook/autoregressive/Mistral/Mistral-Medium-3.5)

[mistral-medium-3.5-CARD](https://huggingface.co/mistralai/Mistral-Medium-3.5-128B/blob/22b2b868a15677cfa6061277ed2f653d1349a9ab/README.md) [HW](https://docs.nvidia.com/dgx/dgxb300-user-guide/introduction-to-dgxb300.html)

## What the EAGLE recipes actually configure

The exact target is `mistralai/Mistral-Medium-3.5-128B` at `22b2b868a15677cfa6061277ed2f653d1349a9ab`; the matching draft is `mistralai/Mistral-Medium-3.5-128B-EAGLE` at `d31694b0f55b51d4d962b5c3dbf0e03d1f019275`. Both revisions were rechecked on 2026-10-16. The publisher recipes use repository names without revision pins; a reproducible deployment must supply the corresponding immutable snapshots. [mistral-medium-3.5-EAGLE-CARD](https://huggingface.co/mistralai/Mistral-Medium-3.5-128B-EAGLE/raw/d31694b0f55b51d4d962b5c3dbf0e03d1f019275/README.md).

| Setting | Publisher vLLM example | Publisher SGLang example |
| --- | --- | --- |
| Target parallelism | `--tensor-parallel-size 8` | `--tp 8` |
| Protocol | `--tool-call-parser mistral --reasoning-parser mistral --enable-auto-tool-choice` | `--tool-call-parser mistral --reasoning-parser mistral` |
| Draft selection | `--speculative-config` with draft model, `method: eagle` | `--speculative-algorithm EAGLE --speculative-draft-model-path` with official draft |
| Draft extent | `num_speculative_tokens: 3` | `--speculative-num-steps 3 --speculative-eagle-topk 1 --speculative-num-draft-tokens 4` |
| Explicit dtype | No dtype override in example | `--dtype bfloat16` |
| Explicit context setting | Draft `max_model_len: 65536` inside speculative config | No context cap in publisher command |
| Capacity settings | 16,384 batched tokens, 128 sequences, utilization 0.8 | No corresponding limits set in publisher command |

These counts describe different engine interfaces; three steps and four draft tokens are not interchangeable with vLLM's three speculative tokens. The 65,536 value belongs to vLLM's draft configuration and does not establish full-window speculative support. The atlas's 32K/32-request references are separate target-only adaptations.

SGLang explicitly requires BF16 here because the native draft `params.json` has no dtype field: its automatic fallback can choose FP16, conflicting with the BF16 target's shared embedding/head. The target remains a serialized static-FP8 export. The cookbook auto-detects target layouts and prefers Transformers files when both are present; the draft instead has native `params.json` and `consolidated.safetensors`. A missing draft `config.json` is expected, not evidence that the artifact is absent. Select one target layout and retain its manifest; never add both alternatives as one resident weight allocation. [mistral-medium-3.5-GR](https://docs.sglang.io/cookbook/autoregressive/Mistral/Mistral-Medium-3.5), [mistral-medium-3.5-EAGLE-PARAMS](https://huggingface.co/mistralai/Mistral-Medium-3.5-128B-EAGLE/raw/d31694b0f55b51d4d962b5c3dbf0e03d1f019275/params.json).

First compare target-only TP1/2/4 where the workload fits, retaining TP8 as the publisher reference. Then compare EAGLE off/on in the same build, GPU group and admission budget: low-concurrency long code/reasoning, short tool turns, long-context prefill and saturated batching can respond differently. Count naturally accepted proposals, verification cycles, extra memory and useful request latency separately. A draft that shortens decoding can still reduce whole-node capacity by consuming cache/workspace headroom. No local measurement selects a winner.

## Optimization questions

After the TP8 correctness baseline, measure TP1 if it fits the workload, TP2, TP4 and TP8 with the same total node GPU budget. Keep KV precision fixed while comparing native FP8 weights; cover 4K/32K/128K prompts, one versus multiple images, and `reasoning_effort=none` versus `high`. Include a regression that records `mscale_all_dim=0.0` and checks long-context output quality.

## Remaining uncertainty

Installed-image and B300 compatibility at the pinned corrected revision; runtime memory beyond the reported weight payload; maximum safe concurrency and best TP width; no audited NVFP4 variant. SGLang support is documented upstream, but has not been run locally.
