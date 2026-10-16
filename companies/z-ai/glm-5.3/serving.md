# GLM 5.3: serving on 8×B300

**Status: unbenchmarked local recommendations.** The upstream recipes are evidence of documented support, not a benchmark of your node.

## Engine and topology

Begin with the official FP8 checkpoint at TP8 and a deliberately capped 64K application context on each engine. Align effective KV precision, parsers, template and workload before interpreting an engine difference. The publisher BF16 checkpoint at TP8 is a useful separately qualified reference: its 1.507 TB serialized payload fits within the reference node's aggregate capacity, but actual load, cache and graph headroom remain gates. Casting FP8 weights is not this reference.

Compare TP4 for a specific NVFP4 export against TP8: four-way tensor parallelism could leave room for two independent four-GPU replicas, but each process must fit its actual workload and own a disjoint GPU group. NVIDIA/SGLang versus RedHat/vLLM changes exporter and engine together; it is a service-configuration comparison, not evidence that either engine is faster.

Add the MTP profile after the non-speculative baseline passes. The recipe’s five speculative tokens are a documented candidate, not a measurement on this node. In the current SGLang cookbook, the reasoning parser resolves to `glm45` and the tool-call parser to `glm47`; the latter parses the newer `<tool_call>/<arg_key>/<arg_value>` format. Use those distinct roles when checking the SGLang profile.

The official vLLM recipe contains inconsistent historical minimum-version labels. The lock file records the current release and inspected main separately rather than pretending that the recipe proves one exact minimum supported version.

[glm-5.3-VR](https://recipes.vllm.ai/zai-org/GLM-5.3) [glm-5.3-GR](https://docs.sglang.io/cookbook/autoregressive/GLM/GLM-5.3) [glm-5.3-CARD](https://huggingface.co/zai-org/GLM-5.3/raw/ba32f8c19c8738e2c57c71798c601d477a7bf844/README.md) [HW](https://docs.nvidia.com/dgx/dgxb300-user-guide/introduction-to-dgxb300.html)

## Exact recipe boundaries, rechecked 2026-10-16

These are **published settings**, not qualified commands or new launch configurations. Stable releases observed today are vLLM 0.31.0 and SGLang 0.5.21; neither a release number nor a mutable `latest` tag proves that a particular export works. Pin the selected image digest, dependencies and model snapshot before running. [RR-GLM-VLLM-RELEASE](https://github.com/vllm-project/vllm/releases/tag/v0.31.0) [RR-GLM-SGLANG-RELEASE](https://github.com/sgl-project/sglang/releases/tag/v0.5.21)

| Artifact and source | Settings the source actually documents | Qualification boundary |
| --- | --- | --- |
| Official FP8; [vLLM recipe](https://recipes.vllm.ai/zai-org/GLM-5.3) | TP8, FP8 KV, `glm47` for both reasoning and tool parsing, automatic tool choice; optional MTP five proposals. | Qualify target-only first. The page's 0.28 installation and 0.29 badge conflict; it does not establish an exact minimum build. |
| NVIDIA NVFP4 at `e3b8f9f2fad29727dfa95e766c5cac18ea1414bf`; [card](https://huggingface.co/nvidia/GLM-5.3-NVFP4/raw/e3b8f9f2fad29727dfa95e766c5cac18ea1414bf/README.md) | SGLang `--tp-size 8 --context-length 400000 --quantization modelopt_fp4 --tool-call-parser glm47 --reasoning-parser glm45 --trust-remote-code --mem-fraction-static 0.90`; source uses `lmsysorg/sglang:latest` and `transformers>=5.3.0`. | Uncatalogued candidate. No immutable engine image is supplied, and the card's shell block has a stray trailing quote. Its quality evaluation spans two four-GPU B300 nodes. Start with a capped context after build/load qualification; 400K is not an initial memory guarantee. |
| RedHat NVFP4; [pinned card](https://huggingface.co/RedHatAI/GLM-5.3-NVFP4/raw/c8917e4258572c405575855ff53effe58c17a38e/README.md) | vLLM TP4, `fp8_e4m3` KV, `glm45` reasoning, string chat content, trusted remote code and MTP five proposals. | The card does not configure automatic tool choice. Qualify the tool path separately, and remove speculation for the target-only control. |
| Inferact NVFP4; [vLLM recipe](https://recipes.vllm.ai/zai-org/GLM-5.3) | TP8 plus expert parallelism, FP8 E4M3 KV, `glm47` reasoning/tool parsers and automatic tool choice. | Its pinned artifact is resolved; ModelOpt loader, calibration and quality still need independent qualification. |

For SGLang DSA, retain the documented `sgl-kernel` indexer top-k backend unless another backend is specifically qualified. The current cookbook selects FP8 KV and TRT-LLM DSA on Blackwell. Native MTP uses `EAGLE` with low-latency settings 5 steps / top-k 1 / 6 draft tokens, or balanced 1/1/2; these counts are not interchangeable with vLLM's `num_speculative_tokens=5`. Record the effective backend and natural acceptance. [glm-5.3-GR](https://docs.sglang.io/cookbook/autoregressive/GLM/GLM-5.3)

## Optimization questions

Compare FP8 TP8; NVFP4 TP4; NVFP4 TP8; two isolated TP4 replicas; and MTP off versus 1/3/5 proposals. Report total node goodput, not only one replica’s tokens/second. Verify the same reasoning effort and retained conversation fields. The pinned publisher template defaults to `reasoning_effort=max` and `clear_thinking=false`; the publisher recommends explicitly enabling `clear_thinking` for chat. Treat those choices as workload settings, not performance-free toggles.

Capture actual GPU memory, compute capability, peer topology and software versions before interpreting a layout. Record model/export revision, image digest, effective cache dtype and selected kernels together.

The included FP8 vLLM profile explicitly selects FP8 KV, while the NVFP4 profile leaves KV selection to the engine. Record the effective cache dtype and align it through a validated setting before attributing differences to weight precision; otherwise treat cache precision as a separate experimental variable.

## Remaining uncertainty

Actual per-rank load and cache capacity on this node; exporter-specific quality under the application prompts; inclusion of required fixes in the selected image; and the workload crossover between vLLM and SGLang remain unmeasured. The 743B/753B accounting is now reconciled. See [architecture](architecture.md) for the pinned metadata calculation.
