---
pipeline_tag: text-generation
base_model:
- Qwen/Qwen3.8-27B
license: other
license_name: nvidia-open-model-license
library_name: Model Optimizer
tags:
- nvidia
- ModelOpt
- Qwen3.8
- quantized
- NVFP4
- nvfp4
- QAD
---

# Model Overview

## Description:
The NVIDIA Qwen3.8-27B-NVFP4-QAD model is the quantized version of Alibaba's Qwen3.8-27B model, which is an auto-regressive language model that uses an optimized transformer architecture. For more information, please check [here](https://huggingface.co/Qwen/Qwen3.8-27B). The NVIDIA Qwen3.8-27B-NVFP4-QAD model is quantized with [Model Optimizer](https://github.com/NVIDIA/Model-Optimizer) using [quantization-aware distillation (QAD)](https://developer.nvidia.com/blog/how-quantization-aware-training-enables-low-precision-accuracy-recovery/).

This model is ready for commercial or non-commercial use. <br>

## License/Terms of Use:
**GOVERNING DOWNLOAD TERMS:** Use of this model is governed by the [NVIDIA Open Model Agreement](https://www.nvidia.com/en-us/agreements/enterprise-software/nvidia-open-model-agreement/).

**ADDITIONAL INFORMATION** : The Qwen3.8-27B base model is governed by the [Apache 2.0 License](https://www.apache.org/licenses/LICENSE-2.0). **Qwen3.8-27B**.

## Deployment Geography:
Global <br>

## Use Case:
Developers looking to take off-the-shelf, pre-quantized models for deployment in AI Agent systems, chatbots, RAG systems, and other AI-powered applications. <br>

## Release Date:
Huggingface **11/04/2026** via https://huggingface.co/nvidia/Qwen3.8-27B-NVFP4-QAD <br>

## References
NVIDIA Model Optimizer: https://github.com/NVIDIA/Model-Optimizer

## Model Architecture:
**Architecture Type:** Transformer <br>
**Network Architecture:** Qwen3.8-27B (`Qwen3_5ForConditionalGeneration`) <br>
**Number of Model Parameters:** 27B <br>
**This model was developed based on [Qwen3.8-27B](https://huggingface.co/Qwen/Qwen3.8-27B).** <br>

<!--
## Computational Load (Internal Only: For NVIDIA Models Only; please add as an HTML comment and remove the fields below from the published model card)

**Cumulative Compute:** **[XXX]** <br>

**Estimated Energy and Emissions for Model Training:** **[XXX]** <br>
-->

## Input:
**Input Type(s):** Text, Image, Video <br>
**Input Format(s):** String, Red, Green, Blue (RGB), Video (MP4/WebM) <br>
**Input Parameters:** Text: One-Dimensional (1D); Image: Two-Dimensional (2D); Video: Three-Dimensional (3D) <br>
**Other Properties Related to Input:** Context length up to 262,144 tokens <br>

## Output:
**Output Type(s):** Text <br>
**Output Format:** String <br>
**Output Parameters:** 1D (One-Dimensional): Sequences <br>
**Other Properties Related to Output:** Maximum completion length is configurable up to 262,144 tokens. <br>

Our AI models are designed and/or optimized to run on NVIDIA GPU-accelerated systems. By leveraging NVIDIA's hardware (e.g. GPU cores) and software frameworks (e.g., CUDA libraries), the model achieves faster training and inference times compared to CPU-only solutions. <br>

## Software Integration:
**Runtime Engine(s):** <br>
* vLLM <br>
* SGLang <br>

**Supported Hardware Microarchitecture Compatibility:** <br>
* NVIDIA Blackwell <br>

**Supported Operating System(s):** <br>
* Linux <br>

The integration of foundation and fine-tuned models into AI systems requires additional testing using use-case-specific data to ensure safe and effective deployment. Following the V-model methodology, iterative testing and validation at both unit and system levels are essential to mitigate risks, meet technical and functional requirements, and ensure compliance with safety and ethical standards before deployment.

## Model Version(s):
The model version is NVFP4 QAD 1.0 and is quantized with NVIDIA-ModelOpt **v0.48.0** <br>

## Calibration Dataset:
** Link: [Nemotron-Post-Training-Dataset-v3](https://huggingface.co/collections/nvidia/nemotron-post-training-v3) <br>
** Data Collection Method by dataset: Automated. <br>
** Labeling Method by dataset: Automated. <br>
** Properties: The Nemotron-Post-Training-Dataset-v3 is a post-training dataset curated by NVIDIA containing multi-turn conversations across diverse topics. <br>

## Training Dataset:
** Link: [Nemotron-Cascade-2-SFT-Data](https://huggingface.co/datasets/nvidia/Nemotron-Cascade-2-SFT-Data) <br>
** Data Modality: Text <br>
** Text Training Data Size: 1.26B tokens <br>
** Data Collection Method by dataset: Hybrid: Automated, Manually-Collected, Synthetic <br>
** Labeling Method by dataset: Hybrid: Automated, Manually-Labeled, Synthetic <br>
** Properties: English-language multi-turn conversations spanning math, science, chat, instruction following, safety, conversational agent, software engineering, and terminal agent tasks. The data does not include personal data. <br>

## Inference:
**Acceleration Engine:** vLLM, SGLang <br>
**Test Hardware:** NVIDIA Blackwell GB300 <br>

## Evaluation Dataset:
* Datasets: GPQA Diamond, IFBench, MMMU Pro, SciCode, Terminal-Bench 2.1, AA-LCR <br>
** Data Collection Method by dataset: Hybrid: Automated, Manually-Collected <br>
** Labeling Method by dataset: Hybrid: Manually-Labeled, Automated <br>
** Properties: We evaluated the model on English-language reasoning, coding, agentic, long-context, and multimodal benchmarks: GPQA Diamond contains 198 graduate-level multiple-choice questions written by domain experts in biology, physics, and chemistry; IFBench is a benchmark for evaluating instruction-following capabilities across diverse and structured task constraints; MMMU Pro is the more challenging version of the Massive Multi-discipline Multimodal Understanding benchmark, measuring college-level multimodal reasoning across diverse disciplines with expanded answer choices and a vision-only input setting; SciCode evaluates scientific coding capabilities; Terminal-Bench 2.1 evaluates agentic task completion in terminal environments; AA-LCR (Artificial Analysis Long Context Recall) evaluates a model's ability to accurately retrieve and recall information from long input contexts. <br>

## Quantization-Aware Distillation
This model was obtained by quantization-aware distillation of Qwen3.8-27B to NVFP4, ready for inference with vLLM and SGLang. The BF16 teacher supplies token-level probability targets. The trainable NVFP4 weights are quantized and reconstructed for each forward pass. Gradients update the underlying weights so their low-precision representations better match the teacher. Only the weights and activations of the linear operators within transformer blocks are quantized. This optimization reduces the disk size and GPU memory requirements by approximately 2.8x.

## Usage

To serve this checkpoint with [vLLM](https://github.com/vllm-project/vllm), you can start the docker `vllm/vllm-openai:nightly` and run the sample command below:

```sh
vllm serve nvidia/Qwen3.8-27B-NVFP4-QAD --port 8000 --quantization modelopt --max-model-len 262144 --reasoning-parser qwen3  
```

To serve this checkpoint with [SGLang](https://github.com/sgl-project/sglang), you can start the docker `lmsysorg/sglang:v0.5.23-cu130` and run the sample command below:

```sh
sglang serve --model-path nvidia/Qwen3.8-27B-NVFP4-QAD --port 30000 --context-length 262144 --reasoning-parser qwen3
```

## Evaluation
<table>
  <tr>
    <td><strong>Benchmark</strong></td>
    <td><strong>BF16</strong></td>
    <td><strong>NVFP4 QAD</strong></td>
  </tr>
  <tr>
    <td>GPQA Diamond</td>
    <td>88.19</td>
    <td>87.94</td>
  </tr>
  <tr>
    <td>IFBench</td>
    <td>79.25</td>
    <td>79.04</td>
  </tr>
  <tr>
    <td>MMMU Pro</td>
    <td>75.78</td>
    <td>75.61</td>
  </tr>
  <tr>
    <td>SciCode</td>
    <td>48.34</td>
    <td>48.82</td>
  </tr>
  <tr>
    <td>Terminal-Bench 2.1</td>
    <td>77.25</td>
    <td>76.69</td>
  </tr>
  <tr>
    <td>AA-LCR</td>
    <td>78.63</td>
    <td>79.13</td>
  </tr>
</table>

> Baseline: [Qwen3.8-27B](https://huggingface.co/Qwen/Qwen3.8-27B).

## Model Limitations:
The base model was trained on data that contains toxic language and societal biases originally crawled from the internet. Therefore, the model may amplify those biases and return toxic responses especially when prompted with toxic prompts. The model may generate answers that may be inaccurate, omit key information, or include irrelevant or redundant text producing socially unacceptable or undesirable text, even if the prompt itself does not include anything explicitly offensive.

## Ethical Considerations

NVIDIA believes Trustworthy AI is a shared responsibility and we have established policies and practices to enable development for a wide array of AI applications. Developers should work with their internal model team to ensure this model meets requirements for the relevant industry and use case and addresses unforeseen product misuse.

For more detailed information on ethical considerations for this model, please see the Model Card++ Explainability, Bias, Safety & Security, and Privacy Subcards below.

Please report model quality, risk, security vulnerabilities or NVIDIA AI Concerns [here](https://www.nvidia.com/en-us/support/submit-security-vulnerability/).

SUBCARDS:

## Explainability

| Field | Response |
| :---- | :---- |
| Intended Task/Domain: | Text generation, reasoning, summarization, and question answering. |
| Model Type: | Text, Image, and Video-to-text transformer |
| Intended Users: | This model is intended for developers, researchers, and customers building/utilizing LLMs, while balancing accuracy and efficiency. |
| Output: | Text String(s) |
| Describe how the model works: | Generates text by predicting the next word or token based on the context provided in the input sequence using multiple self-attention layers. Quantization-aware distillation trains the NVFP4 weights so their low-precision representations match a BF16 teacher. |
| Name the adversely impacted groups this has been tested to deliver comparable outcomes regardless of: | Not Applicable |
| Technical Limitations & Mitigation: | The model was trained on data that contains toxic language and societal biases originally crawled from the internet. Therefore, the model may amplify those biases and return toxic responses especially when prompted with toxic prompts. Therefore, before deploying any applications of this model, developers should perform safety testing and tuning tailored to their specific applications of the model. |
| Verified to have met prescribed NVIDIA quality standards: | Yes |
| Performance Metrics: | Accuracy, Throughput, and user-side throughput |
| Potential Known Risk | The model may generate answers that may be inaccurate, omit key information, or include irrelevant or redundant text producing socially unacceptable or undesirable text, even if the prompt itself does not include anything explicitly offensive. |
| Licensing: | **GOVERNING DOWNLOAD TERMS:** Use of this model is governed by the [NVIDIA Open Model Agreement](https://www.nvidia.com/en-us/agreements/enterprise-software/nvidia-open-model-agreement/).

**ADDITIONAL INFORMATION** : The Qwen3.8-27B base model is governed by the [Apache 2.0 License](https://www.apache.org/licenses/LICENSE-2.0). **Qwen3.8-27B**. |

## Bias

| Field | Response |
| :---- | :---- |
| Participation considerations from adversely impacted groups [protected classes](https://www.senate.ca.gov/protected-classes) in model design and testing: | None |
| Measures taken to mitigate against unwanted bias: | None |
| Bias Metric (If Measured): | Not Applicable |

## Safety & Security

| Field | Response |
| :---- | :---- |
| Model Application Field(s): | Chat, Instruction Following, Chatbot Development, Code Generation, Reasoning, Customer Service |
| Describe the life critical impact (if present). | Not Applicable |
| Use Case Restrictions: | **GOVERNING DOWNLOAD TERMS:** Use of this model is governed by the [NVIDIA Open Model Agreement](https://www.nvidia.com/en-us/agreements/enterprise-software/nvidia-open-model-agreement/).

**ADDITIONAL INFORMATION** : The Qwen3.8-27B base model is governed by the [Apache 2.0 License](https://www.apache.org/licenses/LICENSE-2.0). **Qwen3.8-27B**. |
| Model and dataset restrictions: | The Principle of least privilege (PoLP) is applied limiting access for dataset generation and model development.  Restrictions enforce dataset access during training, and dataset license constraints adhered to. |

## Privacy

The datasets used to train this model were reviewed before release. Please review NVIDIA’s Privacy Policy (https://www.nvidia.com/en-us/about-nvidia/privacy-policy/) for more information.
