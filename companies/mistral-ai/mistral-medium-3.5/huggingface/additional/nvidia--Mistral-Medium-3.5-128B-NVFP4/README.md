---
pipeline_tag: text-generation
base_model:
- mistralai/Mistral-Medium-3.5-128B
license: other
license_name: nvidia-open-model-license
library_name: Model Optimizer
tags:
- nvidia
- ModelOpt
- Mistral
- Mistral-Medium-3.5
- quantized
- NVFP4
- nvfp4
---

# Model Overview

## Description:
Mistral Medium 3.5 128B is Mistral AI's first flagship merged model. It is a dense 128B model with a 256k context window, handling instruction-following, reasoning, and coding in a single set of weights. Mistral Medium 3.5 replaces its predecessor Mistral Medium 3.1 and Magistral in Le Chat. It also replaces Devstral 2 in our coding agent Vibe. Concretely, expect better performance for instruct, reasoning and coding tasks in a new unified model in comparison with our previous released models. 
The NVIDIA Mistral-Medium-3.5-128B NVFP4 model is quantized with [Model Optimizer](https://github.com/NVIDIA/Model-Optimizer).

This model is ready for commercial/non-commercial use.

## Third-Party Community Consideration
This model is not owned or developed by NVIDIA. This model has been developed and built to a third-party's requirements for this application and use case; see link to Non-NVIDIA [Mistral-Medium-3.5-128B Model Card](https://huggingface.co/mistralai/Mistral-Medium-3.5-128B)

### License/Terms of Use:
**GOVERNING TERMS:** **GOVERNING TERMS:**  Use of this model is governed by [Mistral’s Modified MIT license](https://huggingface.co/mistralai/Mistral-Medium-3.5-128B/blob/main/LICENSE). To deploy and customize the model in your environment, please contact Mistral[https://mistral.ai/contact/].


### Deployment Geography:
Global

### Use Case:
**Use Case:** Designed for advanced chat, coding assistance, reasoning-intensive tasks, multimodal image understanding, and agentic workflows that benefit from function calling, JSON output, and long-context processing.

### Release Date:
Hugging Face 07/01/2026 via https://huggingface.co/nvidia/Mistral-Medium-3.5-128B-NVFP4

## Model Architecture:
**Architecture Type:** Transformer  
**Network Architecture:** Mistral (dense 128B language model with vision encoder)  
**Total Parameters:** 128B

### Input:
**Input Types:** Text, Image  
**Input Formats:** String, Red, Green, Blue (RGB)  
**Input Parameters:** One-Dimensional (1D), Two-Dimensional (2D)  
**Other Input Properties:** Supports multilingual text input in English, French, Spanish, German, Italian, Portuguese, Dutch, Chinese, Japanese, Korean, and Arabic, plus image input with variable image sizes and aspect ratios.  
**Input Context Length (ISL):** 262,144 (256k)

### Output:
**Output Types:** Text  
**Output Format:** String  
**Output Parameters:** One-Dimensional (1D)  
**Other Output Properties:** Supports native function calling, JSON output, configurable reasoning effort for quick replies or deeper reasoning runs, and strong system prompt adherence.

Our AI models are designed and/or optimized to run on NVIDIA GPU-accelerated systems. By leveraging NVIDIA's hardware (e.g. GPU cores) and software frameworks (e.g., CUDA libraries), the model achieves faster training and inference times compared to CPU-only solutions.

## Software Integration:
**Runtime Engine(s):**
* vLLM

**Supported Hardware Microarchitecture Compatibility:**
* NVIDIA Blackwell

**Preferred Operating System(s):**
* Linux

The integration of foundation and fine-tuned models into AI systems requires additional testing using use-case-specific data to ensure safe and effective deployment. Following the V-model methodology, iterative testing and validation at both unit and system levels are essential to mitigate risks, meet technical and functional requirements, and ensure compliance with safety and ethical standards before deployment.

## Model Version(s):
This model versions is NVFP4 quantized Mistral-Medium-3.5-128B with nvidia-modelopt **v0.44.0**<br>

## Training and Evaluation Datasets:

We calibrated the model using the dataset noted below, and performed evaluation using the benchmarks noted under Evaluation Datasets.
We did not perform training or testing for this Model Optimizer release. The methods noted under Training and Testing Datasets below represent the data collection and labeling methods used by the third-party to train and test the underlying model.<br>

## Calibration Dataset:
**Link:** [Nemotron-Post-Training-v3](https://huggingface.co/collections/nvidia/nemotron-post-training-v3)<br>
**Data Collection Method by dataset:** Automated.<br>
**Labeling Method by dataset:** Automated.<br>
**Properties:** `Nemotron-Post-Training-v3` is a post-training dataset collection curated by NVIDIA. The calibration blend used for this model sampled from [`nemotron-sft-instruction-following-chat-v2`](https://huggingface.co/datasets/nvidia/Nemotron-SFT-Instruction-Following-Chat-v2), [`nemotron-science-v1`](https://huggingface.co/datasets/nvidia/Nemotron-Science-v1), [`nemotron-competitive-programming-v1`](https://huggingface.co/datasets/nvidia/Nemotron-Competitive-Programming-v1), [`nemotron-sft-agentic-v2`](https://huggingface.co/datasets/nvidia/Nemotron-SFT-Agentic-v2), [`nemotron-math-v2`](https://huggingface.co/datasets/nvidia/Nemotron-Math-v2), [`nemotron-sft-swe-v2`](https://huggingface.co/datasets/nvidia/Nemotron-SFT-SWE-v2), and [`nemotron-sft-multilingual-v1`](https://huggingface.co/datasets/nvidia/Nemotron-SFT-Multilingual-v1).

## Training Dataset:
**Data Modality:** Text, Image <br>
**Data Collection Method by dataset:** Undisclosed <br>
**Labeling Method by dataset:** Undisclosed <br>
**Data Size:** Undisclosed <br>
**Properties:** Undisclosed

## Evaluation Dataset:
**Datasets:** MMLU Pro, GPQA Diamond, AA-LCR, SciCode, AIME 2025, IFBench, MMMU Pro<br>
**Data Collection Method by dataset:** Hybrid, Automated, Human <br>
**Labeling Method by dataset:** Hybrid, Automated, Human<br>
**Properties:** We evaluated the model on text-based reasoning, coding, instruction-following, long-context recall, and multimodal benchmarks: MMLU Pro is a multi-task language understanding benchmark with challenging multiple-choice questions across diverse academic domains; GPQA Diamond contains 448 graduate-level multiple-choice questions written by domain experts in biology, physics, and chemistry; AA-LCR evaluates long-context recall; SciCode evaluates scientific coding capabilities; AIME 2025 contains problems from the American Invitational Mathematics Examination; IFBench is a benchmark for evaluating instruction-following capabilities across diverse and structured task constraints; MMMU Pro is the more challenging version of the Massive Multi-discipline Multimodal Understanding benchmark, measuring college-level multimodal reasoning across diverse disciplines with expanded answer choices and a vision-only input setting.

## Inference:
**Acceleration Engine:** vLLM<br>
**Test Hardware:** NVIDIA B200

## Post Training Quantization
This model was obtained by quantizing selected weights and activations of Mistral-Medium-3.5-128B with Model Optimizer, ready for inference with vLLM. MLP linear operators in decoder layers 4 through 86 are quantized to NVFP4, while the MLP linear operators in decoder layers 0 through 3 and 87 remain in FP8. Attention linear operators and the KV cache remain in FP8. This optimization preserves FP8 precision in the model's edge layers and attention path while reducing checkpoint size and GPU memory requirements.

## Usage
To serve this checkpoint with [vLLM](https://github.com/vllm-project/vllm), launch the validated docker image `vllm/vllm-openai:v0.21.0` and run the sample command below:

```
vllm serve nvidia/Mistral-Medium-3.5-128B-NVFP4 \
  --tensor-parallel-size 4 \
  --gpu-memory-utilization 0.9 \
  --max-model-len 196608 \
  --config-format hf \
  --dtype auto \
  --trust-remote-code
```

Reasoning effort is configurable per request via `reasoning_effort="high"` (test-time reasoning). Recommended sampling: `temperature=0.7`, `top_p=0.95`.

### Evaluation

The accuracy benchmark results are presented in the table below:

| **Precision** | **MMLU Pro** | **GPQA Diamond** | **AA-LCR** | **SciCode** | **AIME 2025** | **IFBench** | **MMMU Pro** |
|---|---|---|---|---|---|---|---|
| FP8 | 82.31% | 76.88% | 62.06% | 42.50% | 88.85% | 70.25% | 63.35% |
| NVFP4 | 82.20% | 76.80% | 65.10% | 42.60% | 88.75% | 69.17% | 62.79% |

> Baseline: [Mistral-Medium-3.5-128B](https://huggingface.co/mistralai/Mistral-Medium-3.5-128B).
> Benchmarked with `reasoning_effort="high"`, temperature=0.7, top_p=0.95.

## Model Limitations:
The base model was trained on data that contains toxic language and societal biases originally crawled from the internet. Therefore, the model may amplify those biases and return toxic responses especially when prompted with toxic prompts. The model may generate answers that may be inaccurate, omit key information, or include irrelevant or redundant text producing socially unacceptable or undesirable text, even if the prompt itself does not include anything explicitly offensive.

## Ethical Considerations

NVIDIA believes Trustworthy AI is a shared responsibility and we have established policies and practices to enable development for a wide array of AI applications. Developers should work with their internal model team to ensure this model meets requirements for the relevant industry and use case and addresses unforeseen product misuse.

Please make sure you have proper rights and permissions for all input image and video content; if image or video includes people, personal health information, or intellectual property, the image or video generated will not blur or maintain proportions of image subjects included.

Please report model quality, risk, security vulnerabilities or NVIDIA AI Concerns [here](https://app.intigriti.com/programs/nvidia/nvidiavdp/detail).
