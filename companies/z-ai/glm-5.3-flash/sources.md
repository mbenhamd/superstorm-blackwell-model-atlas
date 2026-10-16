# GLM 5.3 Flash: sources

Rechecked on **2026-10-16 UTC**. Artifact links below identify immutable commits. The engine recipe pages remain mutable documentation; a retrieved recipe is not a tested image.

| Source ID | Inspected artifact | Revision |
| --- | --- | --- |
| glm-5.3-flash-CARD | [zai-org/GLM-5.3-Flash README.md](https://huggingface.co/zai-org/GLM-5.3-Flash/raw/46a050bec13002ad29ee795c16e61cf4fa3c4a9c/README.md) | `46a050bec13002ad29ee795c16e61cf4fa3c4a9c` |
| glm-5.3-flash-CFG | [zai-org/GLM-5.3-Flash config.json](https://huggingface.co/zai-org/GLM-5.3-Flash/raw/46a050bec13002ad29ee795c16e61cf4fa3c4a9c/config.json) | `46a050bec13002ad29ee795c16e61cf4fa3c4a9c` |
| glm-5.3-flash-INDEX | [zai-org/GLM-5.3-Flash model.safetensors.index.json](https://huggingface.co/zai-org/GLM-5.3-Flash/resolve/46a050bec13002ad29ee795c16e61cf4fa3c4a9c/model.safetensors.index.json) | `46a050bec13002ad29ee795c16e61cf4fa3c4a9c` |
| glm-5.3-flash-LICENSE | [zai-org/GLM-5.3-Flash LICENSE](https://huggingface.co/zai-org/GLM-5.3-Flash/raw/46a050bec13002ad29ee795c16e61cf4fa3c4a9c/LICENSE) | `46a050bec13002ad29ee795c16e61cf4fa3c4a9c` |
| glm-5.3-flash-BF16-CARD | [zai-org/GLM-5.3-Flash-BF16 README.md](https://huggingface.co/zai-org/GLM-5.3-Flash-BF16/raw/f9fed3bbc82291073373d67452e9f25317ef7577/README.md) | `f9fed3bbc82291073373d67452e9f25317ef7577` |
| glm-5.3-flash-BF16-CFG | [zai-org/GLM-5.3-Flash-BF16 config.json](https://huggingface.co/zai-org/GLM-5.3-Flash-BF16/raw/f9fed3bbc82291073373d67452e9f25317ef7577/config.json) | `f9fed3bbc82291073373d67452e9f25317ef7577` |
| glm-5.3-flash-BF16-INDEX | [zai-org/GLM-5.3-Flash-BF16 model.safetensors.index.json](https://huggingface.co/zai-org/GLM-5.3-Flash-BF16/resolve/f9fed3bbc82291073373d67452e9f25317ef7577/model.safetensors.index.json) | `f9fed3bbc82291073373d67452e9f25317ef7577` |
| glm-5.3-flash-NV | [RedHatAI/GLM-5.3-Flash-NVFP4 README.md](https://huggingface.co/RedHatAI/GLM-5.3-Flash-NVFP4/raw/18d55bfd5a2194887738da73753975c9d3842f46/README.md) | `18d55bfd5a2194887738da73753975c9d3842f46` |
| glm-5.3-flash-NV-CFG | [RedHatAI/GLM-5.3-Flash-NVFP4 config.json](https://huggingface.co/RedHatAI/GLM-5.3-Flash-NVFP4/raw/18d55bfd5a2194887738da73753975c9d3842f46/config.json) | `18d55bfd5a2194887738da73753975c9d3842f46` |
| glm-5.3-flash-NV-INDEX | [RedHatAI/GLM-5.3-Flash-NVFP4 model.safetensors.index.json](https://huggingface.co/RedHatAI/GLM-5.3-Flash-NVFP4/resolve/18d55bfd5a2194887738da73753975c9d3842f46/model.safetensors.index.json) | `18d55bfd5a2194887738da73753975c9d3842f46` |
| glm-5.3-flash-META | [Pinned Hub metadata](https://huggingface.co/api/models/zai-org/GLM-5.3-Flash/revision/46a050bec13002ad29ee795c16e61cf4fa3c4a9c) | `46a050bec13002ad29ee795c16e61cf4fa3c4a9c` |

## Engine documentation

- [TOPG-FLASH-VLLM: freshly retrieved vLLM recipe](https://recipes.vllm.ai/zai-org/GLM-5.3-Flash) — Historical FlashInfer minima differ within the page; verify the selected build's dependency set.
- [TOPG-FLASH-SGLANG: freshly retrieved SGLang cookbook](https://docs.sglang.io/cookbook/autoregressive/GLM/GLM-5.3-Flash) — Native MTP uses EAGLE; latency and throughput presets differ. Its proposed thinking toggle is not consumed by the pinned publisher template.

## Claim-specific rechecks

| Source ID | Evidence and scope |
| --- | --- |
| TOPG-FLASH-MAIN | [Current Hub main metadata](https://huggingface.co/api/models/zai-org/GLM-5.3-Flash) resolves to the retained `46a050b…` pin. |
| TOPG-FLASH-BENCH | [Publisher benchmark graphic at `83c03d3…`](https://raw.githubusercontent.com/zai-org/GLM-5/83c03d317378f86f0a012f7c4cd48b6243c7e69b/resources/bench_53.png), visually inspected: Flash 84.3/63.4 and Opus 4.8 85.0/58.0 on Terminal Bench 2.1/DeepSWE v1.1. The immutable image pin avoids the card's mutable `main` image reference. |
| TOPG-FLASH-INDEX | [Pinned FP8 index](https://huggingface.co/zai-org/GLM-5.3-Flash/resolve/46a050bec13002ad29ee795c16e61cf4fa3c4a9c/model.safetensors.index.json): 305.78 GiB serialized tensor payload. |
| TOPG-FLASH-NV-INDEX | [Pinned RedHat NVFP4 index](https://huggingface.co/RedHatAI/GLM-5.3-Flash-NVFP4/resolve/18d55bfd5a2194887738da73753975c9d3842f46/model.safetensors.index.json): 184.23 GiB serialized tensor payload. |
| TOPG-FLASH-TEMPLATE | [Pinned local chat template](https://huggingface.co/zai-org/GLM-5.3-Flash/raw/46a050bec13002ad29ee795c16e61cf4fa3c4a9c/chat_template.jinja): effort defaults, retained reasoning and unconditional opening reasoning tag. |
| TOPG-FLASH-API | [Hosted API guide](https://docs.z.ai/guides/vlm/glm-5.3-flash): enabled-only reasoning and a `clear_thinking` recommendation that differs from the model card; mutable hosted-service documentation. |
| TOPG-VLLM-CUDA | [Released vLLM 0.31.0 CUDA requirements](https://raw.githubusercontent.com/vllm-project/vllm/db9527a46873454610df6dbedf79a36d6bf1a7f6/requirements/cuda.txt): FlashInfer Python/cubin 0.7.0.post1 pins; no installation or execution. |

The global [source register](../../../evidence/sources.json), [upstream lock](../../../evidence/upstreams.lock.json) and [limits](../../../LIMITATIONS.md) distinguish source observations from unperformed execution.
