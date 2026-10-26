---
pipeline_tag: text-generation
base_model:
- zai-org/GLM-5.3
license: other
license_name: nvidia-open-model-license
library_name: Model Optimizer
tags:
- nvidia
- ModelOpt
- GLM-5
- quantized
- FP4
- fp4
---

# Model Overview

## Description:
The NVIDIA GLM-5.3 NVFP4 model is the quantized version of ZAI's GLM-5.3 model, which is an auto-regressive language model that uses an optimized transformer architecture. GLM-5.3 is a Mixture-of-Experts (MoE) model for reasoning, coding, and agentic tasks; it uses the same base model as GLM-5.2, with gains from post-training, and uses sparse attention (with an IndexShare indexer) to support a long context. For more information, please check [here](https://huggingface.co/zai-org/GLM-5.3). The NVIDIA GLM-5.3 NVFP4 model is quantized with [Model Optimizer](https://github.com/NVIDIA/Model-Optimizer).

This model is ready for commercial or non-commercial use.  <br>

## Third-Party Community Consideration
This model is not owned or developed by NVIDIA. This model has been developed and built to a third-party's requirements for this application and use case; see link to Non-NVIDIA [(GLM-5.3) Model Card](https://huggingface.co/zai-org/GLM-5.3) from ZAI.

### License/Terms of Use:
**License type:** NVIDIA Proprietary
**Governing Download Terms:**  Use of this model is governed by [NVIDIA Open Model Agreement](https://www.nvidia.com/en-us/agreements/enterprise-software/nvidia-open-model-agreement/). **Additional Information:** [GLM-5.3 License](https://huggingface.co/zai-org/GLM-5.3/blob/main/LICENSE).
Third-Party Notice Text File: The original GLM-5.3 model are licensed under the [GLM-5.3 License](https://huggingface.co/zai-org/GLM-5.3/blob/main/LICENSE), included in this repository. The [NVIDIA Open Model Agreement](https://www.nvidia.com/en-us/agreements/enterprise-software/nvidia-open-model-agreement/) does not modify or supersede the [GLM-5.3 License](https://huggingface.co/zai-org/GLM-5.3/blob/main/LICENSE) or its conditions.

### Deployment Geography:
Global <br>

### Use Case:
Developers looking to take off-the-shelf, pre-quantized models for deployment in AI Agent systems, chatbots, RAG systems, and other AI-powered applications. <br>

### Release Date:
Huggingface 09/10/2026 via https://huggingface.co/nvidia/GLM-5.3-NVFP4 <br>

## References
Nvidia Model Optimizer: https://github.com/NVIDIA/Model-Optimizer

## Model Architecture:
**Architecture Type:** Transformers  <br>
**Network Architecture:** GLM-5.3 (`GlmMoeDsaForCausalLM`) <br>
**Number of Model Parameters:** 753B in total and 40B activated <br>
**This model was developed based on [GLM-5.3](https://huggingface.co/zai-org/GLM-5.3)** <br>

## Input:
**Input Type(s):** Text <br>
**Input Format(s):** String <br>
**Input Parameters:** One-Dimensional (1D) <br>
**Other Properties Related to Input:** Context length up to 1M <br>

## Output:
**Output Type(s):** Text <br>
**Output Format:** String <br>
**Output Parameters:** 1D (One-Dimensional): Sequences <br>
**Other Properties Related to Output:** None <br>

Our AI models are designed and/or optimized to run on NVIDIA GPU-accelerated systems. By leveraging NVIDIA's hardware (e.g. GPU cores) and software frameworks (e.g., CUDA libraries), the model achieves faster training and inference times compared to CPU-only solutions. <br>

## Software Integration:
**Supported Runtime Engine(s):** <br>
* **SGLang** <br>

**Supported Hardware Microarchitecture Compatibility:** <br>
* NVIDIA Blackwell <br>

**Preferred Operating System(s):** <br>
* Linux <br>

The integration of foundation and fine-tuned models into AI systems requires additional testing using use-case-specific data to ensure safe and effective deployment. Following the V-model methodology, iterative testing and validation at both unit and system levels are essential to mitigate risks, meet technical and functional requirements, and ensure compliance with safety and ethical standards before deployment.

## Model Version(s):
The model version is NVFP4 1.0 version and is quantized with nvidia-modelopt **v0.47.0**<br>

## Training and Evaluation Datasets:

## Calibration Dataset:
** Link: [cnn_dailymail](https://huggingface.co/datasets/abisee/cnn_dailymail), [Nemotron-Post-Training-Dataset-v2](https://huggingface.co/datasets/nvidia/Nemotron-Post-Training-Dataset-v2) <br>
** Data Collection Method by dataset: Automated. <br>
** Labeling Method by dataset: Automated. <br>
** Properties: The cnn_dailymail dataset is an English-language dataset containing just over 300k unique news articles as written by journalists at CNN and the Daily Mail. The Nemotron-Post-Training-Dataset-v2 is a post-training dataset curated by NVIDIA containing multi-turn conversations across diverse topics. <br>

## Training Dataset:
** Data Modality: Undisclosed <br>
** Data Collection Method by dataset: Undisclosed <br>
** Labeling Method by dataset: Undisclosed <br>
** Properties: Undisclosed

## Evaluation Dataset:
* Datasets: MMLU Pro, GPQA Diamond, LiveCodeBench V6, SciCode, AIME 2025, AA-LCR, IFBench <br>
** Data Collection Method by dataset: Hybrid: Automated, Manually-Collected <br>
** Labeling Method by dataset: Hybrid: Manually-Labeled, Automated <br>
** Properties: We evaluated the model on text-based reasoning and coding benchmarks: MMLU Pro is a multi-task language understanding benchmark with challenging multiple-choice questions across diverse academic domains; GPQA Diamond contains 448 graduate-level multiple-choice questions written by domain experts in biology, physics, and chemistry; LiveCodeBench V6 contains competitive programming problems; SciCode evaluates scientific coding capabilities; AIME 2025 contains problems from the American Invitational Mathematics Examination; AA-LCR (Artificial Analysis Long Context Recall) evaluates a model's ability to accurately retrieve and recall information from long input contexts; IFBench is a benchmark for evaluating instruction-following capabilities across diverse and structured task constraints. <br>

## Inference:
**Acceleration Engine:** SGLang <br>
**Test Hardware:** NVIDIA Blackwell B300 <br>

## Post Training Quantization
This model was obtained by quantizing the weights and activations of GLM-5.3 to NVFP4 data type, ready for inference with SGLang. Only the weights and activations of the linear operators within transformer blocks in MoE are quantized. This optimization reduces the number of bits per parameter from 8 to 4, reducing the disk size and GPU memory requirements by approximately 1.66x.

## Usage

### SGLang

To serve this checkpoint with [SGLang](https://github.com/sgl-project/sglang), start from `lmsysorg/sglang:latest` and run:

```sh
pip install -U "transformers>=5.3.0" && \
python3 -m sglang.launch_server \
    --model-path nvidia/GLM-5.3-NVFP4 \
    --host 0.0.0.0 \
    --port 8000 \
    --served-model-name nvidia/GLM-5.3-NVFP4 \
    --tp-size 8 \
    --context-length 400000 \
    --quantization modelopt_fp4 \
    --tool-call-parser glm47 \
    --reasoning-parser glm45 \
    --trust-remote-code \
    --mem-fraction-static 0.90" 
```

## Evaluation
The accuracy benchmark results are presented in the table below:
<table>
  <tr>
   <td><strong>Precision</strong></td>
   <td><strong>MMLU Pro</strong></td>
   <td><strong>GPQA Diamond</strong></td>
   <td><strong>LiveCodeBench V6</strong></td>
   <td><strong>SciCode</strong></td>
   <td><strong>AIME 2025</strong></td>
   <td><strong>AA-LCR</strong></td>
   <td><strong>IFBench</strong></td>
   <td><strong>Terminal Bench 2.1</strong></td>
  </tr>
  <tr>
   <td>FP8</td>
   <td><strong>87.81</strong></td>
   <td><strong>91.79</strong></td>
   <td><strong>52.95</strong></td>
   <td><strong>58.65</strong></td>
   <td><strong>99.38</strong></td>
   <td><strong>69.75</strong></td>
   <td><strong>65.33</strong></td>
    <td><strong>85.67</strong></td>
  </tr>
  <tr>
   <td>NVFP4</td>
   <td><strong>87.88</strong></td>
   <td><strong>92.68</strong></td>
   <td><strong>53.55</strong></td>
   <td><strong>58.03</strong></td>
   <td><strong>99.53</strong></td>
   <td><strong>69.63</strong></td>
   <td><strong>66.00</strong></td>
    <td><strong>86.80</strong></td>
  </tr>
</table>

> Baseline: [GLM-5.3](https://huggingface.co/zai-org/GLM-5.3).
> Evaluation runtime: SGLang with tensor parallelism 8 across two 4-GPU nodes, a 400,000-token server context, reasoning parser `glm45`, tool-call parser `glm47`, and response caching disabled.
>
> Generation settings: `temperature=1.0`, `top_p=0.95`, `reasoning_effort=max`, and `max_new_tokens=320000`. AA-LCR used `max_new_tokens=16384` and parallelism 16; other benchmarks used parallelism 256.

## Model Limitations:
The base model was trained on data that contains toxic language and societal biases originally crawled from the internet. Therefore, the model may amplify those biases and return toxic responses especially when prompted with toxic prompts. The model may generate answers that may be inaccurate, omit key information, or include irrelevant or redundant text producing socially unacceptable or undesirable text, even if the prompt itself does not include anything explicitly offensive.

## Ethical Considerations

NVIDIA believes Trustworthy AI is a shared responsibility and we have established policies and practices to enable development for a wide array of AI applications. Developers should work with their internal model team to ensure this model meets requirements for the relevant industry and use case and addresses unforeseen product misuse.

Please report model quality, risk, security vulnerabilities or NVIDIA AI Concerns [here](https://www.nvidia.com/en-us/support/submit-security-vulnerability/).

