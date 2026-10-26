---
pipeline_tag: text-generation
base_model:
- deepseek-ai/DeepSeek-V4-Flash-0731
license: mit
library_name: Model Optimizer
tags:
- nvidia
- ModelOpt
- DeepSeekV4
- quantized
- NVFP4
- nvfp4
---

# Model Overview

## Description:
The NVIDIA DeepSeek-V4-Flash-0731-NVFP4 model is the quantized version of DeepSeek AI's DeepSeek-V4-Flash-0731 model, an autoregressive Mixture-of-Experts language model that uses an optimized Transformer architecture with hybrid attention (Compressed Sparse Attention and Heavily Compressed Attention) and Manifold-Constrained Hyper-Connections. DeepSeek-V4-Flash-0731 is the official DeepSeek-V4-Flash release and includes DeepSeek's DSpark speculative decoding module in the same checkpoint. For more information, refer to the [DeepSeek-V4-Flash-0731 model card](https://huggingface.co/deepseek-ai/DeepSeek-V4-Flash-0731). The NVIDIA DeepSeek-V4-Flash-0731-NVFP4 model is quantized with [Model Optimizer](https://github.com/NVIDIA/Model-Optimizer).

This model is ready for commercial or non-commercial use.  <br>

## Third-Party Community Consideration
This model is not owned or developed by NVIDIA. This model has been developed and built to a third-party’s requirements for this application and use case; see link to Non-NVIDIA [(DeepSeek-V4-Flash-0731) Model Card](https://huggingface.co/deepseek-ai/DeepSeek-V4-Flash-0731).

### License/Terms of Use:
[MIT](https://huggingface.co/deepseek-ai/DeepSeek-V4-Flash-0731/blob/main/LICENSE)

### Deployment Geography:
Global <br>

### Use Case:
DeepSeek V4 is well-suited for advanced reasoning, agentic AI applications, tool use scenarios, and complex problem-solving in domains such as mathematics, software engineering, and enterprise AI assistants.  <br>

### Release Date:
Hugging Face 08/31/2026 via https://huggingface.co/nvidia/DeepSeek-V4-Flash-0731-NVFP4 <br>

## References
NVIDIA Model Optimizer: https://github.com/NVIDIA/Model-Optimizer

## Model Architecture:
**Architecture Type:** Transformers  <br>
**Network Architecture:** DeepseekV4ForCausalLM — Mixture-of-Experts (MoE) with Hybrid Attention (Compressed Sparse Attention + Heavily Compressed Attention) <br>
**Number of Model Parameters:** 304B in total and 13B activated <br>
**This model was developed based on [DeepSeek-V4-Flash-0731](https://huggingface.co/deepseek-ai/DeepSeek-V4-Flash-0731)** <br>

## Input:
**Input Type(s):** Text <br>
**Input Format(s):** String <br>
**Input Parameters:** One-Dimensional (1D): Sequences <br>
**Other Properties Related to Input:** Supports multi-turn conversations with system prompts, user messages, and assistant responses. Maximum context length of 1 million tokens. Uses a custom encoding pipeline (encoding_dsv4) with reasoning effort levels (`low`, `high`, `max`). <br>

## Output:
**Output Type(s):** Text <br>
**Output Format:** String <br>
**Output Parameters:** One-Dimensional (1D): Sequences <br>
**Other Properties Related to Output:** Supports structured JSON output, function/tool calling, and reasoning content when enabled. <br>

Our AI models are designed and/or optimized to run on NVIDIA GPU-accelerated systems. By leveraging NVIDIA’s hardware (e.g. GPU cores) and software frameworks (e.g., CUDA libraries), the model achieves faster training and inference times compared to CPU-only solutions. <br>

## Software Integration:
**Supported Runtime Engine(s):** <br>
* SGLang <br>
* vLLM  <br>

**Supported Hardware Microarchitecture Compatibility:** <br>
* NVIDIA Blackwell <br>

**Preferred Operating System(s):** <br>
* Linux <br>

The integration of foundation and fine-tuned models into AI systems requires additional testing using use-case-specific data to ensure safe and effective deployment. Following the V-model methodology, iterative testing and validation at both unit and system levels are essential to mitigate risks, meet technical and functional requirements, and ensure compliance with safety and ethical standards before deployment.

## Model Version(s):
The model is DeepSeek-V4-Flash-0731 NVFP4 quantized with nvidia-modelopt **v0.46.0** <br>

## Training and Evaluation Datasets:

## Calibration Dataset:
**Link:** [cnn_dailymail](https://huggingface.co/datasets/abisee/cnn_dailymail), [Nemotron-Post-Training-Dataset-v2](https://huggingface.co/datasets/nvidia/Nemotron-Post-Training-Dataset-v2) <br>
**Data Collection Method by dataset:** Automated. <br>
**Labeling Method by dataset:** Automated. <br>
**Properties:** The cnn_dailymail dataset is an English-language dataset containing just over 300k unique news articles as written by journalists at CNN and the Daily Mail. The Nemotron-Post-Training-Dataset-v2 is a post-training dataset curated by NVIDIA containing multi-turn conversations across diverse topics. <br>

## Training Dataset:
**Data Modality:** Undisclosed <br>
**Data Collection Method by dataset:** Undisclosed <br>
**Labeling Method by dataset:** Undisclosed <br>
**Properties:** Undisclosed

## Evaluation Dataset:
**Datasets:** GPQA Diamond, AA-LCR, τ²-Bench Telecom, SciCode, IFBench, Terminal-Bench v2.1, GDPval <br>
**Data Collection Method by dataset:** Hybrid: Automated, Manually-Collected <br>
**Labeling Method by dataset:** Hybrid: Manually-Labeled, Automated <br>
**Properties:** We evaluated the model on reasoning, long-context recall, agentic tool-use, coding, and instruction-following benchmarks: GPQA Diamond contains 448 graduate-level multiple-choice questions written by domain experts in biology, physics, and chemistry. AA-LCR (Artificial Analysis Long Context Recall) evaluates a model's ability to accurately retrieve and recall information from long input contexts. τ²-Bench Telecom evaluates agentic tool-use and policy-adherence capabilities in dual-control telecom customer-service scenarios where the model interacts with a simulated user and external tools to resolve account issues. SciCode evaluates scientific coding capabilities. IFBench is a benchmark for evaluating instruction-following capabilities across diverse and structured task constraints. Terminal-Bench v2.1 evaluates agentic software-engineering capability in a real terminal environment, where the model must plan and execute shell commands to complete tasks end to end. GDPval is an AI evaluation benchmark designed to measure how well frontier models perform real, economically valuable knowledge work across major industries. <br>

## Inference:
**Acceleration Engine:** **SGLang** and **vLLM** <br>
**Test Hardware:** **NVIDIA B200** <br>

## Post Training Quantization
This model was obtained by quantizing the weights and activations of DeepSeek-V4-Flash-0731 to NVFP4 data type, ready for inference with **SGLang** and **vLLM**. Only the routed MoE experts are quantized. DeepSeek's DSpark speculative-decoding heads are carried through unquantized and unmodified.

### Quantization Recipe
The recipe is in the Model Optimizer repository under [`examples/deepseek/deepseek_v4`](https://github.com/NVIDIA/Model-Optimizer/tree/main/examples/deepseek/deepseek_v4) ([`ptq.py`](https://github.com/NVIDIA/Model-Optimizer/blob/main/examples/deepseek/deepseek_v4/ptq.py), [`quantize_to_nvfp4.py`](https://github.com/NVIDIA/Model-Optimizer/blob/main/examples/deepseek/deepseek_v4/quantize_to_nvfp4.py)). It runs in three stages:

**1. Reshard the source checkpoint to the model-parallel layout** (CPU only), using DeepSeek's own `convert.py`:

```sh
python <DeepSeek-V4-Flash-0731>/inference/convert.py \
    --hf-ckpt-path <DeepSeek-V4-Flash-0731> \
    --save-path <mp8_checkpoint> \
    --n-experts 256 \
    --model-parallel 8
```

**2. Collect activation ranges (amax) on the routed experts** (from Model Optimizer repo root):

```sh
torchrun --nproc-per-node 8 examples/deepseek/deepseek_v4/ptq.py \
    --model_path <mp8_checkpoint> \
    --config <DeepSeek-V4-Flash-0731>/inference/config.json \
    --dsv4_inference_dir <DeepSeek-V4-Flash-0731>/inference \
    --output_path <amax_dump>
```

Calibration uses the script defaults: `cnn_dailymail` and `Nemotron-Post-Training-Dataset-v2`, `--calib_size 64`, `--calib_seq 512`.

**3. Export the NVFP4 checkpoint** (from Model Optimizer repo root):

```sh
python examples/deepseek/deepseek_v4/quantize_to_nvfp4.py \
    --amax_path <amax_dump> \
    --source_ckpt <DeepSeek-V4-Flash-0731> \
    --output_ckpt <output> \
    --cast_mxfp4_to_nvfp4
```

`--cast_mxfp4_to_nvfp4` matters for this model in particular. DeepSeek-V4 already ships its routed experts in **MXFP4** (E2M1 nibbles with one E8M0 scale per 32 elements). NVFP4 reuses the same E2M1 nibble grid but stores an E4M3 scale per 16 elements, so the weight bits are carried over unchanged — a lossless bit-cast — and only the block scales are rewritten. The activation amax from stage 2 is therefore the only calibrated quantity that survives into the artifact, and the checkpoint is slightly *larger* than its source (scale bytes double while weight bytes stay the same).

## Usage

### Deploy with SGLang

```sh
sglang serve \
    --model-path nvidia/DeepSeek-V4-Flash-0731-NVFP4 \
    --tp-size 8 \
    --kv-cache-dtype fp8_e4m3 \
    --moe-runner-backend flashinfer_trtllm_routed \
    --chunked-prefill-size 4096 \
    --swa-full-tokens-ratio 0.1 \
    --tool-call-parser deepseekv4 \
    --reasoning-parser deepseek-v4 \
    --trust-remote-code
```

### Deploy with vLLM

```sh
vllm serve nvidia/DeepSeek-V4-Flash-0731-NVFP4 \
    --tensor-parallel-size 8 \
    --enable-expert-parallel \
    --max-model-len 393216 \
    --kv-cache-dtype fp8 \
    --block-size 256 \
    --attention_config.use_fp4_indexer_cache=True \
    --tokenizer-mode deepseek_v4 \
    --tool-call-parser deepseek_v4 \
    --enable-auto-tool-choice \
    --reasoning-parser deepseek_v4 \
    --reasoning-config '{"reasoning_parser":"deepseek_v4","reasoning_start_str":"","reasoning_end_str":""}' \
    --trust-remote-code
```

The base DeepSeek-V4-Flash-0731 checkpoint includes DSpark and those heads are preserved here, but speculative decoding was not exercised during this release's validation — enable it only after verifying it for this NVFP4 checkpoint.

## Evaluation
The accuracy benchmark results are presented in the table below:
<table>
  <tr>
   <td><strong>Precision</strong>
   </td>
   <td><strong>GPQA Diamond</strong>
   </td>
   <td><strong>AA-LCR</strong>
   </td>
   <td><strong>τ²-Bench Telecom</strong>
   </td>
   <td><strong>SciCode</strong>
   </td>
   <td><strong>IFBench</strong>
   </td>
   <td><strong>Terminal-Bench v2.1</strong>
   </td>
   <td><strong>GDPval (rubric)</strong>
   </td>
  </tr>
  <tr>
   <td>MXFP4 (source)
   </td>
   <td><strong>91.5</strong>
   </td>
   <td><strong>72.1</strong>
   </td>
   <td><strong>98.7</strong>
   </td>
   <td><strong>51.7</strong>
   </td>
   <td><strong>75.8</strong>
   </td>
   <td><strong>74.7</strong>
   </td>
   <td><strong>93.0</strong>
   </td>
  </tr>
  <tr>
   <td>NVFP4
   </td>
   <td><strong>91.5</strong>
   </td>
   <td><strong>71.8</strong>
   </td>
   <td><strong>97.9</strong>
   </td>
   <td><strong>52.1</strong>
   </td>
   <td><strong>75.5</strong>
   </td>
   <td><strong>73.7</strong>
   </td>
   <td><strong>93.2</strong>
   </td>
  </tr>
</table>

> Baseline: [DeepSeek-V4-Flash-0731](https://huggingface.co/deepseek-ai/DeepSeek-V4-Flash-0731). Measured at `temperature=1.0`, `top_p=1.0`, `max` reasoning effort, `max_new_tokens=384000`; τ²-Bench Telecom, Terminal-Bench v2.1, and GDPval use `top_p=0.95`.

## Model Limitations:
The base model was trained on data that contains toxic language and societal biases originally crawled from the internet. Therefore, the model may amplify those biases and return toxic responses especially when prompted with toxic prompts. The model may generate answers that may be inaccurate, omit key information, or include irrelevant or redundant text producing socially unacceptable or undesirable text, even if the prompt itself does not include anything explicitly offensive.

## Ethical Considerations

NVIDIA believes Trustworthy AI is a shared responsibility and we have established policies and practices to enable development for a wide array of AI applications. Developers should work with their internal model team to ensure this model meets requirements for the relevant industry and use case and addresses unforeseen product misuse.

Users are responsible for model inputs and outputs. Users are responsible for ensuring safe integration of this model, including implementing guardrails as well as other safety mechanisms, prior to deployment.

Please report model quality, risk, security vulnerabilities or NVIDIA AI Concerns [here](https://app.intigriti.com/programs/nvidia/nvidiavdp/detail).
