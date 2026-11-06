---
pipeline_tag: image-text-to-text
base_model:
- deepseek-ai/DeepSeek-V4.1-Flash-1017
license: mit
library_name: Model Optimizer
tags:
- nvidia
- ModelOpt
- DeepSeekV4
- quantized
- FP4
- fp4
---

# Model Overview

## Description:
The NVIDIA DeepSeek-V4.1-Flash-1017 NVFP4 model is the quantized version of DeepSeek AI's DeepSeek-V4.1-Flash-1017 model, which is an auto-regressive language model that uses an optimized transformer architecture. DeepSeek-V4.1-Flash-1017 is a natively multimodal Mixture-of-Experts (MoE) model with a Causal Encoder-Decoder (CED) architecture, Compressed Sparse Attention 2 (CSA2), and support for contexts of up to one million tokens. For more information, please check [here](https://huggingface.co/deepseek-ai/DeepSeek-V4.1-Flash-1017). The NVIDIA DeepSeek-V4.1-Flash-1017 NVFP4 model is quantized with [Model Optimizer](https://github.com/NVIDIA/Model-Optimizer).

This model is ready for commercial or non-commercial use.  <br>

## Third-Party Community Consideration
This model is not owned or developed by NVIDIA. This model has been developed and built to a third-party's requirements for this application and use case; see link to Non-NVIDIA [(DeepSeek-V4.1-Flash-1017) Model Card](https://huggingface.co/deepseek-ai/DeepSeek-V4.1-Flash-1017) from DeepSeek AI.

### License/Terms of Use:
[MIT](https://huggingface.co/datasets/choosealicense/licenses/blob/main/markdown/mit.md)

### Deployment Geography:
Global <br>

### Use Case:
Developers looking to take off-the-shelf, pre-quantized models for deployment in AI Agent systems, chatbots, RAG systems, and other AI-powered applications. <br>

### Release Date:
Hugging Face 10/30/2026 via https://huggingface.co/nvidia/DeepSeek-V4.1-Flash-1017-NVFP4 <br>

## References
NVIDIA Model Optimizer: https://github.com/NVIDIA/Model-Optimizer

## Model Architecture:
**Architecture Type:** Transformers  <br>
**Network Architecture:** DeepSeek-V4.1-Flash-1017 (`DeepseekV41ForCausalLM`) — Causal Encoder-Decoder Mixture-of-Experts with Compressed Sparse Attention 2 <br>
**Number of Model Parameters:** 552B backbone in total, 8B activated during prefill and 16B during decode, plus 196B Engram conditional memory <br>
**This model was developed based on [DeepSeek-V4.1-Flash-1017](https://huggingface.co/deepseek-ai/DeepSeek-V4.1-Flash-1017)** <br>

## Input:
**Input Type(s):** Text, Image <br>
**Input Format(s):** String, Red, Green, Blue (RGB) <br>
**Input Parameters:** One-Dimensional (1D), Two-Dimensional (2D) <br>
**Other Properties Related to Input:** Context length up to 1M <br>

## Output:
**Output Type(s):** Text <br>
**Output Format:** String <br>
**Output Parameters:** One-Dimensional (1D): Sequences<br>
**Other Properties Related to Output:** None <br>

Our AI models are designed and/or optimized to run on NVIDIA GPU-accelerated systems. By leveraging NVIDIA's hardware (e.g. GPU cores) and software frameworks (e.g., CUDA libraries), the model achieves faster training and inference times compared to CPU-only solutions. <br>

## Software Integration:
**Supported Runtime Engine(s):** <br>
* **vLLM** (needs MXFP4 Engram support, [vllm-project/vllm#61530](https://github.com/vllm-project/vllm/pull/61530)) <br>

This checkpoint stores the Engram lookup tables as MXFP4, which stock vLLM images cannot load. Use a vLLM build that includes the pull request above. The benchmark results below were obtained with `vllm/vllm-openai:v0.31.0` with that pull request's Engram changes applied.

* **SGLang** <br>

**Supported Hardware Microarchitecture Compatibility:** <br>
* NVIDIA Blackwell <br>

**Preferred Operating System(s):** <br>
* Linux <br>

The integration of foundation and fine-tuned models into AI systems requires additional testing using use-case-specific data to ensure safe and effective deployment. Following the V-model methodology, iterative testing and validation at both unit and system levels are essential to mitigate risks, meet technical and functional requirements, and ensure compliance with safety and ethical standards before deployment.

## Model Version(s):
The model is quantized with nvidia-modelopt **v0.48.0rc0**. Source revision: `1bae0e1088993b9b82de08f59de5be5a34e42170`. <br>

## Training and Evaluation Datasets:

## Calibration Dataset:
**Link:** [cnn_dailymail](https://huggingface.co/datasets/abisee/cnn_dailymail), [Nemotron-Post-Training-Dataset-v2](https://huggingface.co/datasets/nvidia/Nemotron-Post-Training-Dataset-v2) <br>
**Data Collection Method by dataset:** Automated. <br>
**Labeling Method by dataset:** Automated. <br>
**Properties:** The cnn_dailymail dataset is an English-language dataset containing just over 300k unique news articles as written by journalists at CNN and the Daily Mail. The Nemotron-Post-Training-Dataset-v2 is a post-training dataset curated by NVIDIA containing multi-turn conversations across diverse topics. <br>

Calibration used 512 samples per dataset (1,024 total), sequence length 512, batch size 4, and the default deterministic sample selection. The Nemotron subsets were `stem`, `chat`, `math`, and `code`.

## Training Dataset:
**Data Modality:** Undisclosed <br>
**Data Collection Method by dataset:** Undisclosed <br>
**Labeling Method by dataset:** Undisclosed <br>
**Properties:** Undisclosed <br>

## Evaluation Dataset:
**Datasets:** GPQA Diamond, AA-LCR, SciCode, IFBench, MMMU-Pro, Terminal-Bench 2.1 <br>
**Data Collection Method by dataset:** Hybrid: Automated, Manually-Collected <br>
**Labeling Method by dataset:** Hybrid: Manually-Labeled, Automated <br>
**Properties:** These benchmarks cover scientific reasoning (GPQA Diamond), long-context recall (AA-LCR), scientific coding (SciCode), instruction following (IFBench), visual understanding (MMMU-Pro), and terminal-based agent tasks (Terminal-Bench 2.1). <br>

## Inference:
**Acceleration Engines:** **vLLM**, **SGLang** <br>
**Test Hardware:** **NVIDIA GB300 (Blackwell)**<br>

## Post Training Quantization
This model converts the ordinary routed MoE experts from source MXFP4 to NVFP4 weights and activations (W4A4), with group size 16. The converted projections are `w1`, `w2`, and `w3` for 384 experts across 40 layers. The Engram lookup tables are converted from the source FP8 to MXFP4. Attention, shared experts, vision, MTP, and other excluded components retain their source precision, including MXFP8 where applicable.

All 16,986,931,200 expert weight blocks passed lossless conversion, preserving dequantized weight values with signed-zero canonicalization; the Engram conversion is lossy. Activation scales were calibrated; 24 of 46,080 projection entries used fallback scales. Lossless weight conversion does not imply identical inference outputs.

The checkpoint is approximately 400 GiB (source: approximately 475 GiB) in 48 safetensors shards.

## Usage

### Deploy with vLLM

This checkpoint needs a vLLM build with MXFP4 Engram support ([vllm-project/vllm#61530](https://github.com/vllm-project/vllm/pull/61530)). The command below is the one used for the reported results on four GB300 GPUs, with the repository ID in place of the local path.

```bash
VLLM_ENGINE_READY_TIMEOUT_S=3600 vllm serve nvidia/DeepSeek-V4.1-Flash-1017-NVFP4 \
    --tensor-parallel-size 4 \
    --tokenizer-mode deepseek_v41 \
    --attention-config '{"backend":"FLASHINFER_MLA_SPARSE_DSV41","indexer_kv_dtype":"mxfp4","indexer_sparse_logits":true}' \
    --kv-cache-dtype fp8 \
    --max-num-seqs 128 \
    --engram-config '{"cpu_offload":true}' \
    --reasoning-parser deepseek_v41
```

Add `--enable-auto-tool-choice --tool-call-parser deepseek_v41` for tool calling. Pass `chat_template_kwargs: {"thinking": true, "reasoning_effort": "max"}` in requests for thinking at maximum effort. Text and image input were validated with this command; speculative decoding (MTP) was not exercised. Validate the final staged package with the intended runtime before deployment.

### Deploy with SGLang

SGLang loads this checkpoint natively from 2026-11-04 on ([sgl-project/sglang#47935](https://github.com/sgl-project/sglang/pull/47935)). The command below was validated on four GB300 GPUs.

```bash
python -m sglang.launch_server --model-path nvidia/DeepSeek-V4.1-Flash-1017-NVFP4 \
    --tp 4 \
    --trust-remote-code \
    --kv-cache-dtype fp8_e4m3 \
    --dsv4-attn-backend flashmla \
    --mem-fraction-static 0.9 \
    --speculative-algorithm DSPARK \
    --speculative-dspark-block-size 5 \
    --engram-config '{"placement":"cpu","replication":"none","lookup":"auto"}' \
    --reasoning-parser auto \
    --tool-call-parser auto
```

Drop the two `--speculative-*` flags to serve without speculative decoding. `--engram-config` keeps the Engram tables in host memory, about 97 GiB per node. Text input, reasoning and tool calling were validated with this command; GSM8K is 96.82% with DSpark and 96.59% without.

## Evaluation
Accuracy results obtained with vLLM are shown below, in percent.

<table>
  <tr>
    <th>Precision</th>
    <th>GPQA Diamond</th>
    <th>AA-LCR</th>
    <th>SciCode</th>
    <th>IFBench</th>
    <th>MMMU-Pro</th>
    <th>Terminal-Bench 2.1</th>
  </tr>
  <tr>
    <td>MXFP4 (source)</td>
    <td>92.77</td>
    <td>80.41</td>
    <td>57.58</td>
    <td>76.33</td>
    <td>78.38</td>
    <td>81.81</td>
  </tr>
  <tr>
    <td>NVFP4 + MXFP4 Engram</td>
    <td>92.93</td>
    <td>80.19</td>
    <td>57.32</td>
    <td>76.47</td>
    <td>78.73</td>
    <td>81.11</td>
  </tr>
</table>

> Baseline: [DeepSeek-V4.1-Flash-1017](https://huggingface.co/deepseek-ai/DeepSeek-V4.1-Flash-1017), a mixed-precision checkpoint with MXFP4 routed experts.
> Ordinary benchmark requests used `temperature=1.0`, `top_p=1.0`, `reasoning_effort=max`, and `max_new_tokens=262144`.
> GPQA used 16 repeats; AA-LCR used 16 repeats in each of two runs; IFBench used 5; SciCode is the mean of 8 runs.
> Terminal-Bench 2.1 used a separate agentic configuration with eight trajectories per task; the score is the mean of two runs.

## Model Limitations:
The base model was trained on data that contains toxic language and societal biases originally crawled from the internet. Therefore, the model may amplify those biases and return toxic responses especially when prompted with toxic prompts. The model may generate answers that may be inaccurate, omit key information, or include irrelevant or redundant text producing socially unacceptable or undesirable text, even if the prompt itself does not include anything explicitly offensive.

## Ethical Considerations

NVIDIA believes Trustworthy AI is a shared responsibility and we have established policies and practices to enable development for a wide array of AI applications. Developers should work with their internal model team to ensure this model meets requirements for the relevant industry and use case and addresses unforeseen product misuse.

Please make sure you have proper rights and permissions for all input image and video content; if image or video includes people, personal health information, or intellectual property, the image or video generated will not blur or maintain proportions of image subjects included.

Please report model quality, risk, security vulnerabilities or NVIDIA AI Concerns [here](https://www.nvidia.com/en-us/support/submit-security-vulnerability/).
