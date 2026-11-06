---
license: other
language:
- en
- fr
- de
- es
- pt
- it
- ja
- ko
- ru
- zh
- ar
- fa
- id
- ms
- ne
- pl
- ro
- sr
- sv
- tr
- uk
- vi
- hi
- bn
- bg
- hr
- cs
- da
- nl
- et
- fi
- el
- hu
- ga
- lv
- lt
- mt
- sk
- sl
base_model:
- mistralai/Mistral-Large-4-1T-A52B
base_model_relation: quantized
tags:
- vLLM
- SGLang
- llama.cpp
---

# Mistral Large 4 NVFP4

This repository contains the **NVFP4** quantized checkpoint of [Mistral Large 4 - Le Chonk](https://huggingface.co/mistralai/Mistral-Large-4-1T-A52B), our largest and most capable model to date: a 1 trillion-parameter natively multimodal Mixture-of-Experts model with 49 billion active parameters per token (52 billion including embeddings and output layers), trained from scratch on 3,800 NVIDIA Grace Blackwell GPUs in Mistral's own datacenters in Europe.

You should observe similar performance to the FP8 checkpoint, with a substantially smaller memory footprint and faster inference.

> [!Note]
> This card covers evaluation, installation and serving of the NVFP4 checkpoint. For the architecture, capabilities, recommended settings, usage examples see the [**main model page: Mistral-Large-4-1T-A52B**](https://huggingface.co/mistralai/Mistral-Large-4-1T-A52B).

## Key Features

Same model as [Mistral Large 4](https://huggingface.co/mistralai/Mistral-Large-4-1T-A52B): 1M context window, multimodal input (text and image, text output), reasoning effort configurable per request (`low`, `medium`, `high`), native function calling and strict JSON schema output, and an embedded DSpark speculative decoding draft head.

- **NVFP4 quantization**: NVFP4 MoE experts with FP8 linears, for a substantial memory reduction vs FP8.
- **Blackwell-optimized**: NVFP4 targets Blackwell GPUs (B200 / B300 / GB200 / GB300), which have dedicated hardware for the format.
- **No accuracy regressions**: See the [evaluation results](#evaluation) comparing NVFP4 with FP8.

We release this model under the [**Mistral Ecosystem Open-Weight License**](https://huggingface.co/mistralai/Mistral-Large-4-1T-A52B-NVFP4/blob/main/LICENSE): a modified version of the MIT license, for both commercial and non-commercial use — operating a Model-as-a-Service business requires a separate commercial license with Mistral.

## Evaluation

Across all domains including multimodal reasoning (GDP.pdf, MathVision), long-context (Graphwalks 512k), coding agents (DeepSWE, SWE-bench Pro, Terminal-Bench 4), business automation (AutomationBench) and cyber (CyberGym) the NvFP4 checkpoint matches FP8 behaviour.

<img src="https://huggingface.co/mistralai/Mistral-Large-4-1T-A52B-NVFP4/resolve/3d843073c9987de83d1f94a73a3184da8cf0dba2/images/fp8-vs-nvfp4-evaluations.png" alt="FP8 and NVFP4 evaluation scores and mean completion lengths" width="800" style="max-width: 100%; height: auto;" />

## Recommended Settings

- **Reasoning Effort**:
  - `'low'` / `'medium'` / `'high'` — default is `'high'`.
  - Use `reasoning_effort="high"` for complex prompts and agentic usage, `'low'` for fast chat replies.
- **Sampling**: For all reasoning effort we recommend to set the following sampling parameters:
  - `temperature=1.0`
  - `top_p=0.95`
- **System Prompt**: define a clear environment and use case, including guidance on how to effectively leverage tools in agentic systems.
- **Tools**: keep the set of tools well-defined and limit their number to the minimum required for the use case.
- **Context**: the checkpoint supports a 1M context window.

## Usage

We **thank** all the ecosystem folks who helped us throughout this release to integrate Le Chonk into their frameworks.

The model can be deployed with:

- [`vllm`](https://github.com/vllm-project/vllm): See [here](#vllm).
- [`SGLang`](https://github.com/sgl-project/sglang): See [here](#sglang).
- [`llama.cpp`](https://github.com/ggml-org/llama.cpp): See GGUFs and instructions [here](https://huggingface.co/ggml-org/Mistral-Large-4-1T-A52B-NVFP4-GGUF).

> [!Note]
> For optimal performance, we recommend using the Mistral AI API if local serving is subpar.

## vLLM

### Installation

Use the official vLLM Docker image, which includes support for Mistral Large 4:

```bash
docker pull vllm/vllm-openai:mistral-large-4
```

See also the [vLLM recipe for Mistral Large 4](https://recipes.vllm.ai/mistralai/Mistral-Large-4-1T-A52B), which covers both the FP8 and NVFP4 checkpoints, for ready-made serving configurations.

### Serve the Model

```bash
docker run --runtime nvidia --gpus all \
  -v ~/.cache/huggingface:/root/.cache/huggingface \
  -p 8000:8000 \
  --ipc=host \
  vllm/vllm-openai:mistral-large-4 \
  --model mistralai/Mistral-Large-4-1T-A52B-NVFP4 \
  --tensor-parallel-size 8 \
  --kv-cache-dtype fp8_ds_mla \
  --tool-call-parser mistral \
  --reasoning-parser mistral \
  --enable-auto-tool-choice \
  --gpu-memory-utilization 0.85
```

Key parameter notes:

- `--kv-cache-dtype fp8_ds_mla`: FP8 KV cache for the MLA layers, needed for this checkpoint.
- `--tool-call-parser mistral` and `--reasoning-parser mistral`: required for tool usage and to separate reasoning from content in responses.
- If you run short of GPU memory, lower `--max-model-len` and/or `--max-num-seqs` (concurrency). See the [vLLM guide on conserving memory](https://docs.vllm.ai/en/latest/configuration/conserving_memory/#context-length-and-batch-size).

### Speculative decoding (DSpark)

The checkpoint ships the same DSpark draft head as the FP8 model. To enable it, add the following argument to the serving command above:

```bash
--speculative-config '{"method": "dspark", "num_speculative_tokens": 3}'
```

`num_speculative_tokens` is set to 3, the depth of the draft block. See the [main model page](https://huggingface.co/mistralai/Mistral-Large-4-1T-A52B#speculative-decoding-dspark) for the measured speedups.

For request examples (instruction following, strict JSON schema, vision and tool calls), see [Ping the Server](https://huggingface.co/mistralai/Mistral-Large-4-1T-A52B#ping-the-server) on the main model page and use `mistralai/Mistral-Large-4-1T-A52B-NVFP4` as the model id.

## SGLang

Serve Mistral Large 4 NVFP4 with the [SGLang library](https://github.com/sgl-project/sglang) for production-ready inference. See also SGLang's [cookbook](https://docs.sglang.io/cookbook/autoregressive/Mistral/Mistral-Large-4), which covers both the FP8 and NVFP4 checkpoints.

### Installation

Use the official SGLang Docker image, which includes support for Mistral Large 4:

```bash
docker pull lmsysorg/sglang:mistral-large-4
```

### Serve the Model

```bash
sglang serve \
  --model-path mistralai/Mistral-Large-4-1T-A52B-NVFP4 \
  --tp-size 4 \
  --mem-fraction-static 0.85 \
  --speculative-algorithm DSPARK \
  --max-running-requests 64 \
  --reasoning-parser auto \
  --tool-call-parser auto \
  --host 0.0.0.0 \
  --port 30000
```

> [!Note]
> Speculative decoding (DSpark) is on and this recipe pins `--max-running-requests` to **64**. Adjust it to match your target concurrency — if you remove the flag, SGLang falls back to **48**.

Key parameter notes:

- `--speculative-algorithm DSPARK`: enables the embedded DSpark draft head, which proposes blocks of 3 tokens. Remove this flag to serve without speculation.
- `--tp-size 4`: example tensor-parallel size for a Blackwell node; adjust to your topology.
- `--reasoning-parser auto` and `--tool-call-parser auto`: let SGLang pick the reasoning and tool-call parsers for this model.

## License

This model is licensed under the [Mistral Ecosystem Open-Weight License](https://huggingface.co/mistralai/Mistral-Large-4-1T-A52B-NVFP4/blob/main/LICENSE).

*You must not use this model in a manner that infringes, misappropriates, or otherwise violates any third party’s rights, including intellectual property rights.*
