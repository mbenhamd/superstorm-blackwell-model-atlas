# GLM 5.3: serving on 8×B300

## SGLang v0.5.22 review — October 19

Official FP8 TP8 target-only DCP1 control, then DCP2 and native MTP5/1/6; optional DCP4. Hold FP8 DCP8 pending a verified sparse-kernel fix.

Read the [release comparison and model-specific argument fragments](../../../reports/sglang-v0522-upgrade.md) and `sglang_v0522_b300_review` in the [catalog](../../../catalog/models.json) for changes, exclusions and proposed experiments. The review compares release source with v0.5.21; it does not qualify an engine image or measure B300 performance. Existing configuration records retain their original scope.

Key constraints: FP8 TP8/DCP8 reaches reported64-query-head B300 sparse-kernel corruption; DCP2/4 gather16/32. Release chunks rows only. Issue author expects affected artifact inFlashInfer0.7.1; not reproduced here. DCP requires supported Blackwell TRT-LLM route and attentionTP divisibility; excludes CP/HiSparse/HiCache/PD/unified memory/pooled index/tree draft.

[S0522-S-DCP](https://raw.githubusercontent.com/sgl-project/sglang/baa9befa381511cd4d56f83980951e5a45fffc6d/python/sglang/srt/layers/attention/dsa/dsa_dcp.py) [S0522-S-DSA-OVERRIDE](https://raw.githubusercontent.com/sgl-project/sglang/baa9befa381511cd4d56f83980951e5a45fffc6d/python/sglang/srt/arg_groups/model_overrides/deepseek_v2.py) [S0522-S-DCP-DOC](https://raw.githubusercontent.com/sgl-project/sglang/baa9befa381511cd4d56f83980951e5a45fffc6d/docs/docs/advanced_features/dcp.mdx)

## vLLM v0.32.0 update (October 18)

Explicit KV-matched v0.31/v0.32 control; then BF16 versus FP8 KV at TP8 and independent TP4 KServe groups. GlmMoeDsa auto KV selects FP8 on CUDA family10 including B300, independent of target weight precision.

Explicit FP8 profiles already chose FP8; do not count default change as new savings. GLM Flash does not inherit this hook. See the [v0.32 B300 source review and experiment priorities](../../../reports/vllm-v032-upgrade.md) and `vllm_v032_b300_review` in the [model catalog](../../../catalog/models.json). The version-specific analysis below retains its original scope; no runtime result or launch-array migration is implied.

**Status: unbenchmarked local recommendations.** The upstream recipes are evidence of documented support, not a benchmark of the target B300 node.

## B300 / vLLM v0.31.0 priority (October 17)

Official FP8 TP8 reference versus two independent TP4 KServe replicas. Compare RedHat or Inferact NVFP4 at TP4; native MTP 1/3/5 separately.

Match KV precision before attributing differences to the exporter. NVFP4 TP2 is only a memory probe; approximately 232 GB serialized weights/rank precede cache/workspace. DSA requires its sparse MLA path, not ordinary FA4. These are selected-source candidates inside mandatory KServe, with no engine execution or measured B300 winner. [glm-5.3-CARD](https://huggingface.co/zai-org/GLM-5.3/raw/ba32f8c19c8738e2c57c71798c601d477a7bf844/README.md) [glm-5.3-NV](https://huggingface.co/RedHatAI/GLM-5.3-NVFP4/raw/c8917e4258572c405575855ff53effe58c17a38e/README.md) [Q31-CAT-GLM-5-3-RECIPE-YAML](https://raw.githubusercontent.com/vllm-project/recipes/d5fc1f55cee70f4e1944f2dd4f7569cb8276ad94/models/zai-org/GLM-5.3.yaml) [Q31-CAT-V031-VLLM-MODELS-DEEPSEEK-V32-NVIDIA-MTP-PY](https://raw.githubusercontent.com/vllm-project/vllm/db9527a46873454610df6dbedf79a36d6bf1a7f6/vllm/models/deepseek_v32/nvidia/mtp.py)

## Engine and topology

Begin with the official FP8 checkpoint at TP8 and a deliberately capped 64K application context on each engine. Align effective KV precision, parsers, template and workload before interpreting an engine difference. The publisher BF16 checkpoint at TP8 is a useful separately qualified reference: its 1.507 TB serialized payload fits within the reference node's aggregate capacity, but actual load, cache and graph headroom remain gates. Casting FP8 weights is not this reference.

Compare TP4 for a specific NVFP4 export against TP8. Two independent TP4 replicas, with either FP8 or a qualified NVFP4 export, remain candidates: they duplicate weights across the node and divide cache capacity between services, and each process must fit its workload on a disjoint GPU group. NVIDIA/SGLang versus RedHat/vLLM changes exporter and engine together; it is a service-configuration comparison, not evidence that either engine is faster.

MTP is optional. Add it after the non-speculative baseline is qualified; five proposals are a documented latency candidate, not a model requirement or a measured optimum. In the current SGLang cookbook, the reasoning parser resolves to `glm45` and the tool-call parser to `glm47`; the latter parses the newer `<tool_call>/<arg_key>/<arg_value>` format. Parsers produce structured reasoning/tool fields; they do not enable generation or MTP. [TOPG-GLM-SGLANG](https://docs.sglang.io/cookbook/autoregressive/GLM/GLM-5.3)

The official vLLM recipe contains inconsistent historical minimum-version labels. The lock file records the current release and inspected main separately rather than pretending that the recipe proves one exact minimum supported version.

[glm-5.3-VR](https://recipes.vllm.ai/zai-org/GLM-5.3) [glm-5.3-GR](https://docs.sglang.io/cookbook/autoregressive/GLM/GLM-5.3) [glm-5.3-CARD](https://huggingface.co/zai-org/GLM-5.3/raw/ba32f8c19c8738e2c57c71798c601d477a7bf844/README.md) [HW](https://docs.nvidia.com/dgx/dgxb300-user-guide/introduction-to-dgxb300.html)

## Exact recipe boundaries, rechecked 2026-10-16

These are **published settings**, not qualified commands or new launch configurations. Stable releases observed today are vLLM 0.31.0 and SGLang 0.5.21; neither a release number nor a mutable `latest` tag proves that a particular export works. Pin the selected image digest, dependencies and model snapshot before running. [RR-GLM-VLLM-RELEASE](https://github.com/vllm-project/vllm/releases/tag/v0.31.0) [RR-GLM-SGLANG-RELEASE](https://github.com/sgl-project/sglang/releases/tag/v0.5.21)

| Artifact and source | Settings the source actually documents | Qualification boundary |
| --- | --- | --- |
| Official FP8; [TOPG-GLM-VLLM](https://recipes.vllm.ai/zai-org/GLM-5.3) | TP8, FP8 KV, `glm47` for both reasoning and tool parsing, automatic tool choice and MTP five proposals. Its full-1M B200 example sets `--max-num-seqs 32`. | Target-only is a control made by removing MTP. Native FP8 with EP, 1M context and 128 sequences is an adaptation, not this published recipe; the EP example belongs to Inferact NVFP4. The page's 0.28 installation and 0.29 badge conflict. |
| NVIDIA NVFP4 at `e3b8f9f2fad29727dfa95e766c5cac18ea1414bf`; [TOPG-GLM-NVIDIA-CARD](https://huggingface.co/nvidia/GLM-5.3-NVFP4/raw/e3b8f9f2fad29727dfa95e766c5cac18ea1414bf/README.md) | SGLang `--tp-size 8 --context-length 400000 --quantization modelopt_fp4 --tool-call-parser glm47 --reasoning-parser glm45 --trust-remote-code --mem-fraction-static 0.90`; source uses `lmsysorg/sglang:latest` and `transformers>=5.3.0`. | Uncatalogued candidate. No immutable engine image is supplied, and the shell block has a stray trailing quote. Its quality evaluation spans two four-GPU B300 nodes. The command does not explicitly select FP8 KV or NEXTN/MTP; adding those changes the configuration. |
| RedHat NVFP4; [pinned card](https://huggingface.co/RedHatAI/GLM-5.3-NVFP4/raw/c8917e4258572c405575855ff53effe58c17a38e/README.md) | vLLM TP4, `fp8_e4m3` KV, `glm45` reasoning, string chat content, trusted remote code and MTP five proposals. | The card does not configure automatic tool choice. Qualify the tool path separately, and remove speculation for the target-only control. |
| Inferact NVFP4; [vLLM recipe](https://recipes.vllm.ai/zai-org/GLM-5.3) | TP8 plus expert parallelism, FP8 E4M3 KV, `glm47` reasoning/tool parsers and automatic tool choice. | Its pinned artifact is resolved; ModelOpt loader, calibration and quality still need independent qualification. |

For SGLang DSA, retain the documented `sgl-kernel` indexer top-k backend unless another backend is specifically qualified. The current cookbook selects FP8 KV and TRT-LLM DSA on Blackwell. Native MTP uses `EAGLE` with low-latency settings 5 steps / top-k 1 / 6 draft tokens, or balanced 1/1/2; these counts are not interchangeable with vLLM's `num_speculative_tokens=5`. Record the effective backend and natural acceptance. [glm-5.3-GR](https://docs.sglang.io/cookbook/autoregressive/GLM/GLM-5.3)

The 400K NVIDIA evaluation limit and 1,048,576-token model limit describe different scopes. Changing a context flag does not create cache memory, and reducing the number of scheduled sequences does not prove that even one maximum-length request fits. Long prompts, generated reasoning and tool history all use the request's context budget.

## Reasoning contract

Z.ai's hosted API supports `thinking.type: enabled` only and explicitly warns that `disabled` requests fail. The pinned local template unconditionally opens `<think>` when adding a generation prompt, accepts `low`/`high` effort and maps other values to `max`; it does not read `thinking` or `enable_thinking`. This establishes the template behavior, not that every local engine rejects the same JSON field as the hosted API. `clear_thinking` changes retained reasoning history, not whether the new response starts with reasoning. [TOPG-GLM-API](https://docs.z.ai/guides/llm/glm-5.3) [TOPG-GLM-TEMPLATE](https://huggingface.co/zai-org/GLM-5.3/raw/ba32f8c19c8738e2c57c71798c601d477a7bf844/chat_template.jinja)

## Optimization questions

Compare FP8 TP8; NVFP4 TP4; NVFP4 TP8; two isolated TP4 replicas; and MTP off versus 1/3/5 proposals. Report total node goodput, not only one replica’s tokens/second. Verify the same reasoning effort and retained conversation fields. The pinned publisher template defaults to `reasoning_effort=max` and `clear_thinking=false`; the publisher recommends explicitly enabling `clear_thinking` for chat. Treat those choices as workload settings, not performance-free toggles.

Capture actual GPU memory, compute capability, peer topology and software versions before interpreting a layout. Record model/export revision, image digest, effective cache dtype and selected kernels together.

The included FP8 vLLM profile explicitly selects FP8 KV, while the NVFP4 profile leaves KV selection to the engine. Record the effective cache dtype and align it through a validated setting before attributing differences to weight precision; otherwise treat cache precision as a separate experimental variable.

## Remaining uncertainty

Actual per-rank load and cache capacity on this node; exporter-specific quality under the application prompts; inclusion of required fixes in the selected image; and the workload crossover between vLLM and SGLang remain unmeasured. The 743B/753B accounting is now reconciled. See [architecture](architecture.md) for the pinned metadata calculation.
