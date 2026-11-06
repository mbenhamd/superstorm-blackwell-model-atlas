# Mistral Medium 3.5: sources

**November 6 refresh:** target and EAGLE heads still equal the retained pins; README, config, params, LICENSE and the EAGLE card/params are byte-identical to the retained hashes. Newly recorded: the NVIDIA mixed NVFP4/FP8 export [mistral-medium-3.5-NV-NVFP4-CARD](https://huggingface.co/nvidia/Mistral-Medium-3.5-128B-NVFP4/raw/b8c66d2098edd8c9c26bde2b2ff41b5967e111ae/README.md), [mistral-medium-3.5-NV-NVFP4-CFG](https://huggingface.co/nvidia/Mistral-Medium-3.5-128B-NVFP4/raw/b8c66d2098edd8c9c26bde2b2ff41b5967e111ae/config.json), [mistral-medium-3.5-NV-NVFP4-HFQ](https://huggingface.co/nvidia/Mistral-Medium-3.5-128B-NVFP4/raw/b8c66d2098edd8c9c26bde2b2ff41b5967e111ae/hf_quant_config.json), [mistral-medium-3.5-NV-NVFP4-INDEX](https://huggingface.co/nvidia/Mistral-Medium-3.5-128B-NVFP4/raw/b8c66d2098edd8c9c26bde2b2ff41b5967e111ae/model.safetensors.index.json), [mistral-medium-3.5-NV-NVFP4-TREE](https://huggingface.co/api/models/nvidia/Mistral-Medium-3.5-128B-NVFP4/tree/b8c66d2098edd8c9c26bde2b2ff41b5967e111ae), [mistral-medium-3.5-NV-NVFP4-COMMITS](https://huggingface.co/api/models/nvidia/Mistral-Medium-3.5-128B-NVFP4/commits/main), [mistral-medium-3.5-NV-NVFP4-API](https://huggingface.co/api/models/nvidia/Mistral-Medium-3.5-128B-NVFP4). SGLang v0.5.23 contains the Mistral3 wrapper fix: [O26-MISTRAL-WRAPPER-IN-0523](https://api.github.com/repos/sgl-project/sglang/compare/4542fc8f598e55d90f655de482b1b5cdf7c6228f...v0.5.23?per_page=1), [S0523-K-MISTRAL](https://raw.githubusercontent.com/sgl-project/sglang/297e54fd105e974cdf401e5b4d20253a22c16f90/python/sglang/srt/models/mistral.py).

**November 6 NVFP4 promotion (12:45–13:01Z):** the NVIDIA export became catalog variant `nvfp4`. Newly registered sources include [mistral-medium-3.5-NV-NVFP4-PARAMS](https://huggingface.co/nvidia/Mistral-Medium-3.5-128B-NVFP4/raw/b8c66d2098edd8c9c26bde2b2ff41b5967e111ae/params.json), [mistral-medium-3.5-NV-NVFP4-CHAT-TEMPLATE](https://huggingface.co/nvidia/Mistral-Medium-3.5-128B-NVFP4/raw/b8c66d2098edd8c9c26bde2b2ff41b5967e111ae/chat_template.jinja), [mistral-medium-3.5-NV-NVFP4-TREE-FULL](https://huggingface.co/api/models/nvidia/Mistral-Medium-3.5-128B-NVFP4/tree/b8c66d2098edd8c9c26bde2b2ff41b5967e111ae?recursive=true&expand=true), [mistral-medium-3.5-NV-NVFP4-REVISION](https://huggingface.co/api/models/nvidia/Mistral-Medium-3.5-128B-NVFP4/revision/b8c66d2098edd8c9c26bde2b2ff41b5967e111ae), [mistral-medium-3.5-NV-NVFP4-HEADERS](https://huggingface.co/nvidia/Mistral-Medium-3.5-128B-NVFP4/tree/b8c66d2098edd8c9c26bde2b2ff41b5967e111ae), [mistral-medium-3.5-CHAT-TEMPLATE](https://huggingface.co/mistralai/Mistral-Medium-3.5-128B/raw/22b2b868a15677cfa6061277ed2f653d1349a9ab/chat_template.jinja), [mistral-medium-3.5-TREE-EXPAND](https://huggingface.co/api/models/mistralai/Mistral-Medium-3.5-128B/tree/22b2b868a15677cfa6061277ed2f653d1349a9ab?recursive=false&expand=true), [mistral-medium-3.5-V033-MODELOPT](https://raw.githubusercontent.com/vllm-project/vllm/4ba787ec9959e566d3b587a796dff07673324da5/vllm/model_executor/layers/quantization/modelopt.py), [mistral-medium-3.5-V033-MISTRAL3](https://raw.githubusercontent.com/vllm-project/vllm/4ba787ec9959e566d3b587a796dff07673324da5/vllm/model_executor/models/mistral3.py), [mistral-medium-3.5-V033-LINEAR-KERNELS](https://raw.githubusercontent.com/vllm-project/vllm/4ba787ec9959e566d3b587a796dff07673324da5/vllm/model_executor/kernels/linear/__init__.py), [mistral-medium-3.5-V033-IMAGE](https://hub.docker.com/v2/repositories/vllm/vllm-openai/tags/v0.33.0), [mistral-medium-3.5-VLLM-PR54192](https://api.github.com/repos/vllm-project/vllm/pulls/54192), [mistral-medium-3.5-VLLM-PR45525](https://api.github.com/repos/vllm-project/vllm/pulls/45525), [mistral-medium-3.5-S0523-MODELOPT](https://raw.githubusercontent.com/sgl-project/sglang/297e54fd105e974cdf401e5b4d20253a22c16f90/python/sglang/srt/layers/quantization/modelopt_quant.py), [mistral-medium-3.5-S0523-LLAVA](https://raw.githubusercontent.com/sgl-project/sglang/297e54fd105e974cdf401e5b4d20253a22c16f90/python/sglang/srt/models/llava.py), [mistral-medium-3.5-SMAIN-MISTRAL](https://raw.githubusercontent.com/sgl-project/sglang/62384de1ae5e3bbd3159afd1639525b0bf39fbf9/python/sglang/srt/models/mistral.py); the [NVFP4 dossier](nvfp4.md) cites the complete set (vLLM v0.33.0 kernel, tokenizer, config and parser files; SGLang v0.5.23 loader, FP4 and argument files; PR/issue records; image tag metadata). Engine files are fetched at the release commits and SGLang main `62384de1`; nothing was executed.

**October 26 scoped refresh:** current Hub identities, immutable README/configuration files and selected latest-stable engine restrictions were rechecked. [Local README snapshots](README.md#hugging-face-readme-snapshots) link every concrete catalog variant and recorded additional artifact. Retrieval metadata remains in the single [source registry](../../../evidence/sources.json); the historical source descriptions below retain their original scope.

Rechecked on **2026-10-15**. Model cards, configurations and repository metadata below were fetched at the stated immutable revisions. Live documentation is identified separately. The audit did not download model-weight tensors or run an inference engine.

## mistral-medium-3.5-CARD

[Mistral Medium 3.5 pinned publisher card](https://huggingface.co/mistralai/Mistral-Medium-3.5-128B/raw/22b2b868a15677cfa6061277ed2f653d1349a9ab/README.md)

Revision: `22b2b868a15677cfa6061277ed2f653d1349a9ab`. Retrieval: HTTP 200 on 2026-10-15. Confirms dense128B/text-image, reasoning none/high, vLLM recommendation and explicit SGLang TP8 recipe, plus correction commit link.

## mistral-medium-3.5-CFG

[Mistral Medium 3.5 pinned configuration](https://huggingface.co/mistralai/Mistral-Medium-3.5-128B/raw/22b2b868a15677cfa6061277ed2f653d1349a9ab/config.json)

Revision: `22b2b868a15677cfa6061277ed2f653d1349a9ab`. Retrieval: HTTP 200 on 2026-10-15. All prior projection fields matched; corrected mscale_all_dim=0.0, mscale=1.0, beta_fast=4.0 and beta_slow=1.0 added to projection.

## mistral-medium-3.5-TREE

[Mistral pinned dual-layout file metadata](https://huggingface.co/api/models/mistralai/Mistral-Medium-3.5-128B/tree/22b2b868a15677cfa6061277ed2f653d1349a9ab?recursive=false&expand=false)

Revision: `22b2b868a15677cfa6061277ed2f653d1349a9ab`. Retrieval: HTTP 200 on 2026-10-15. Lists three consolidated and three Transformers safetensors files as alternative layouts; file metadata alone is not a tensor-content equality proof.

## mistral-medium-3.5-FIXCFG

[Mistral Transformers YaRN correction commit](https://huggingface.co/mistralai/Mistral-Medium-3.5-128B/commit/c4be198050fb5789774a55b92ed697becfbf20ae)

Revision: `c4be198050fb5789774a55b92ed697becfbf20ae`. Retrieval: HTTP 200 on 2026-10-15. Actual correction commit c4be198050fb5789774a55b92ed697becfbf20ae changes mscale_all_dim from1.0 to0.0; replaces duplicate mutable config citation.

## mistral-medium-3.5-HF-INDEX

[Mistral pinned Transformers weight index](https://huggingface.co/mistralai/Mistral-Medium-3.5-128B/raw/22b2b868a15677cfa6061277ed2f653d1349a9ab/model.safetensors.index.json)

Revision: `22b2b868a15677cfa6061277ed2f653d1349a9ab`. Retrieval: HTTP 200 on 2026-10-15. metadata.total_size=133605834656 bytes; this is tensor payload excluding safetensors headers.

## mistral-medium-3.5-NATIVE-INDEX

[Mistral pinned consolidated weight index](https://huggingface.co/mistralai/Mistral-Medium-3.5-128B/raw/22b2b868a15677cfa6061277ed2f653d1349a9ab/consolidated.safetensors.index.json)

Revision: `22b2b868a15677cfa6061277ed2f653d1349a9ab`. Retrieval: HTTP 200 on 2026-10-15. metadata.total_size=133605834656 bytes; alternative layout has same reported payload.

## mistral-medium-3.5-LICENSE

[Mistral pinned Modified MIT License](https://huggingface.co/mistralai/Mistral-Medium-3.5-128B/raw/22b2b868a15677cfa6061277ed2f653d1349a9ab/LICENSE)

Revision: `22b2b868a15677cfa6061277ed2f653d1349a9ab`. Retrieval: HTTP 200 on 2026-10-15. Exact title and revenue restriction checked; the license condition concerns preceding-month global consolidated company/employer revenue exceeding US$20million.

## mistral-medium-3.5-GR

[SGLang Mistral Medium3.5 deployment cookbook](https://docs.sglang.io/cookbook/autoregressive/Mistral/Mistral-Medium-3.5)

Live publisher/engine documentation; no immutable revision resolved. Retrieval: HTTP 200 on 2026-10-15. Documents exact static-FP8 artifact and both layouts; benchmark claims use4xH200. Its B300 TP2 recommendation is a recipe, not a universal TP minimum or local measurement.

See the global [source register](../../../evidence/sources.json) and [limits](../../../LIMITATIONS.md).
