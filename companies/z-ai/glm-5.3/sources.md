# GLM 5.3: sources

**October 26 scoped refresh:** current Hub identities, immutable README/configuration files and selected latest-stable engine restrictions were rechecked. [Local README snapshots](README.md#hugging-face-readme-snapshots) link every concrete catalog variant and recorded additional artifact. Retrieval metadata remains in the single [source registry](../../../evidence/sources.json); the historical source descriptions below retain their original scope.

Rechecked on **2026-10-16 UTC**. Artifact links below identify immutable commits. The engine recipe pages remain mutable documentation; a retrieved recipe is not a tested image.

| Source ID | Inspected artifact | Revision |
| --- | --- | --- |
| glm-5.3-CARD | [zai-org/GLM-5.3 README.md](https://huggingface.co/zai-org/GLM-5.3/raw/ba32f8c19c8738e2c57c71798c601d477a7bf844/README.md) | `ba32f8c19c8738e2c57c71798c601d477a7bf844` |
| glm-5.3-CFG | [zai-org/GLM-5.3 config.json](https://huggingface.co/zai-org/GLM-5.3/raw/ba32f8c19c8738e2c57c71798c601d477a7bf844/config.json) | `ba32f8c19c8738e2c57c71798c601d477a7bf844` |
| glm-5.3-INDEX | [zai-org/GLM-5.3 model.safetensors.index.json](https://huggingface.co/zai-org/GLM-5.3/resolve/ba32f8c19c8738e2c57c71798c601d477a7bf844/model.safetensors.index.json) | `ba32f8c19c8738e2c57c71798c601d477a7bf844` |
| glm-5.3-LICENSE | [zai-org/GLM-5.3 LICENSE](https://huggingface.co/zai-org/GLM-5.3/raw/ba32f8c19c8738e2c57c71798c601d477a7bf844/LICENSE) | `ba32f8c19c8738e2c57c71798c601d477a7bf844` |
| glm-5.3-BF16-CARD | [zai-org/GLM-5.3-BF16 README.md](https://huggingface.co/zai-org/GLM-5.3-BF16/raw/abf42e6c0e53bc29a875511301e7b7fcd220315b/README.md) | `abf42e6c0e53bc29a875511301e7b7fcd220315b` |
| glm-5.3-BF16-CFG | [zai-org/GLM-5.3-BF16 config.json](https://huggingface.co/zai-org/GLM-5.3-BF16/raw/abf42e6c0e53bc29a875511301e7b7fcd220315b/config.json) | `abf42e6c0e53bc29a875511301e7b7fcd220315b` |
| glm-5.3-BF16-INDEX | [zai-org/GLM-5.3-BF16 model.safetensors.index.json](https://huggingface.co/zai-org/GLM-5.3-BF16/resolve/abf42e6c0e53bc29a875511301e7b7fcd220315b/model.safetensors.index.json) | `abf42e6c0e53bc29a875511301e7b7fcd220315b` |
| glm-5.3-NV | [RedHatAI/GLM-5.3-NVFP4 README.md](https://huggingface.co/RedHatAI/GLM-5.3-NVFP4/raw/c8917e4258572c405575855ff53effe58c17a38e/README.md) | `c8917e4258572c405575855ff53effe58c17a38e` |
| glm-5.3-NV-CFG | [RedHatAI/GLM-5.3-NVFP4 config.json](https://huggingface.co/RedHatAI/GLM-5.3-NVFP4/raw/c8917e4258572c405575855ff53effe58c17a38e/config.json) | `c8917e4258572c405575855ff53effe58c17a38e` |
| glm-5.3-NV-INDEX | [RedHatAI/GLM-5.3-NVFP4 model.safetensors.index.json](https://huggingface.co/RedHatAI/GLM-5.3-NVFP4/resolve/c8917e4258572c405575855ff53effe58c17a38e/model.safetensors.index.json) | `c8917e4258572c405575855ff53effe58c17a38e` |
| glm-5.3-INFERACT-CARD | [Inferact/GLM-5.3-NVFP4 README.md](https://huggingface.co/Inferact/GLM-5.3-NVFP4/raw/ce67b36f3669192b5bb233819f0fda6c8a9837f8/README.md) | `ce67b36f3669192b5bb233819f0fda6c8a9837f8` |
| glm-5.3-INFERACT-CFG | [Inferact/GLM-5.3-NVFP4 config.json](https://huggingface.co/Inferact/GLM-5.3-NVFP4/raw/ce67b36f3669192b5bb233819f0fda6c8a9837f8/config.json) | `ce67b36f3669192b5bb233819f0fda6c8a9837f8` |
| glm-5.3-INFERACT-INDEX | [Inferact/GLM-5.3-NVFP4 model.safetensors.index.json](https://huggingface.co/Inferact/GLM-5.3-NVFP4/resolve/ce67b36f3669192b5bb233819f0fda6c8a9837f8/model.safetensors.index.json) | `ce67b36f3669192b5bb233819f0fda6c8a9837f8` |
| glm-5.3-META | [Pinned Hub metadata](https://huggingface.co/api/models/zai-org/GLM-5.3/revision/ba32f8c19c8738e2c57c71798c601d477a7bf844) | `ba32f8c19c8738e2c57c71798c601d477a7bf844` |

## Engine documentation

- [TOPG-GLM-VLLM: freshly retrieved vLLM recipe](https://recipes.vllm.ai/zai-org/GLM-5.3) — 743B/39B headline; native FP8 TP8/MTP5 and full-1M `max-num-seqs=32`; EP is in the Inferact NVFP4 example. Historical version guidance is inconsistent.
- [TOPG-GLM-SGLANG: freshly retrieved SGLang cookbook](https://docs.sglang.io/cookbook/autoregressive/GLM/GLM-5.3) — Native MTP through EAGLE and distinct reasoning/tool parsers; cookbook options are not local performance measurements.

## Claim-specific rechecks

| Source ID | Evidence and scope |
| --- | --- |
| TOPG-GLM-MAIN | [Current Hub main metadata](https://huggingface.co/api/models/zai-org/GLM-5.3) resolves to the retained `ba32f8c…` pin. |
| TOPG-GLM-CARD | [Pinned publisher card](https://huggingface.co/zai-org/GLM-5.3/raw/ba32f8c19c8738e2c57c71798c601d477a7bf844/README.md): CyberGym score and evaluation conditions are publisher claims. |
| TOPG-GLM-INDEX | [Pinned FP8 index](https://huggingface.co/zai-org/GLM-5.3/resolve/ba32f8c19c8738e2c57c71798c601d477a7bf844/model.safetensors.index.json): 703.72 GiB serialized tensor payload, calculated as bytes / 2³⁰. |
| TOPG-GLM-NVIDIA-CARD | [Pinned NVIDIA card](https://huggingface.co/nvidia/GLM-5.3-NVFP4/raw/e3b8f9f2fad29727dfa95e766c5cac18ea1414bf/README.md): 753B/40B headline, SGLang settings, license identifiers and two-node TP8 quality-evaluation scope. |
| TOPG-GLM-NVIDIA-INDEX | [Pinned NVIDIA index](https://huggingface.co/nvidia/GLM-5.3-NVFP4/resolve/e3b8f9f2fad29727dfa95e766c5cac18ea1414bf/model.safetensors.index.json): 432.24 GiB serialized tensor payload. |
| TOPG-GLM-TEMPLATE | [Pinned local chat template](https://huggingface.co/zai-org/GLM-5.3/raw/ba32f8c19c8738e2c57c71798c601d477a7bf844/chat_template.jinja): effort defaults, retained reasoning and unconditional opening reasoning tag. |
| TOPG-GLM-API | [Hosted API guide](https://docs.z.ai/guides/llm/glm-5.3): text-only input and unsupported disabled reasoning; mutable documentation, not local-engine behavior. |
| TOPG-SGLANG-MODELOPT | [SGLang main ModelOpt dispatch at `2adc76a…`](https://raw.githubusercontent.com/sgl-project/sglang/2adc76ad61a9c036304716a4548093b1b27b10fb/python/sglang/srt/layers/quantization/modelopt_quant.py): mixed-format dispatch, backend-specific NVFP4 preparation and distinct MegaMoE path; source inspection only. |

## glm-5.3-BF16-HEADERS

For the main/MTP split, the pinned BF16 index identified 791 tensors under `model.layers.78`. Only the 8-byte safetensors header-length prefix and JSON header were requested from the following files (HTTP 206); no tensor payloads were read. Summing those tensor shapes gives 9,952,920,576 parameters. The main-model figure subtracts that count from the Hub total; it is a derived accounting result.

- [model-00270-of-00282.safetensors](https://huggingface.co/zai-org/GLM-5.3-BF16/resolve/abf42e6c0e53bc29a875511301e7b7fcd220315b/model-00270-of-00282.safetensors) — 75,515,904 extra-layer parameters.
- [model-00271-of-00282.safetensors](https://huggingface.co/zai-org/GLM-5.3-BF16/resolve/abf42e6c0e53bc29a875511301e7b7fcd220315b/model-00271-of-00282.safetensors) — 2,680,160,256 extra-layer parameters.
- [model-00272-of-00282.safetensors](https://huggingface.co/zai-org/GLM-5.3-BF16/resolve/abf42e6c0e53bc29a875511301e7b7fcd220315b/model-00272-of-00282.safetensors) — 2,680,160,256 extra-layer parameters.
- [model-00273-of-00282.safetensors](https://huggingface.co/zai-org/GLM-5.3-BF16/resolve/abf42e6c0e53bc29a875511301e7b7fcd220315b/model-00273-of-00282.safetensors) — 2,680,160,256 extra-layer parameters.
- [model-00274-of-00282.safetensors](https://huggingface.co/zai-org/GLM-5.3-BF16/resolve/abf42e6c0e53bc29a875511301e7b7fcd220315b/model-00274-of-00282.safetensors) — 1,836,923,904 extra-layer parameters.

The global [source register](../../../evidence/sources.json), [upstream lock](../../../evidence/upstreams.lock.json) and [limits](../../../LIMITATIONS.md) distinguish source observations from unperformed execution.
