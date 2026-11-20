---
library_name: transformers
pipeline_tag: image-text-to-text
tags:
- fp4
- nvfp4
- vllm
- llm-compressor
- compressed-tensors
base_model: Qwen/Qwen3.8-Flash-Next
provider: Qwen
name: RedHatAI/Qwen3.8-Flash-Next-NVFP4
readme: https://huggingface.co/RedHatAI/Qwen3.8-Flash-Next-NVFP4/blob/main/README.md
validated_on:
  - RHOAI 3.6.0
  - RHAIIS 3.6.0
  - vLLM 0.31.0
---

# RedHatAI/Qwen3.8-Flash-Next-NVFP4

## Model Overview
- **Model Architecture:** Qwen4ExpForConditionalGeneration
  - **Input:** Text / Image / Video
  - **Output:** Text
- **Model Optimizations:**
  - **Weight quantization:** FP4
  - **Activation quantization:** FP4
- **Release Date:** 2026-08-27
- **Version:** 1.0
- **Model Developers:** RedHatAI

This model is a quantized version of [Qwen/Qwen3.8-Flash-Next](https://huggingface.co/Qwen/Qwen3.8-Flash-Next). It was evaluated to assess its quality in comparison to the unquantized model.

### Model Optimizations

This model was obtained by quantizing the weights and activations of the Mixture-of-Experts (MoE) experts in [Qwen/Qwen3.8-Flash-Next](https://huggingface.co/Qwen/Qwen3.8-Flash-Next) to NVFP4 (FP4) data type, ready for inference with vLLM.

This reduces the per-weight precision of the MoE expert parameters from 16 to 4 bits, substantially reducing their memory and disk footprint, while the rest of the model is kept in its original BF16 precision.

Only the weights and activations of the MoE expert linear operators are quantized using [LLM Compressor](https://github.com/vllm-project/llm-compressor).

## Deployment

### vLLM Serving

```
vllm serve RedHatAI/Qwen3.8-Flash-Next-NVFP4 \
  --tensor-parallel-size 4 \
  --enable-auto-tool-choice \
  --tool-call-parser qwen3_coder \
  --reasoning-parser qwen3
```

Adjust the tensor-parallel size and other hardware-specific settings to your deployment — see the [vLLM recipe for Qwen3.8-Flash-Next](https://recipes.vllm.ai/Qwen/Qwen3.8-Flash-Next).

## Creation

This model was created by applying [LLM Compressor](https://github.com/vllm-project/llm-compressor) with calibration samples from [open-perfectblend](https://huggingface.co/datasets/mlabonne/open-perfectblend) (1024 samples).

## Evaluation

On average, the RedHatAI checkpoint shows the highest accuracy recovery of **99.1%** over the Inferact's **97.6%** and NVIDIA's **98.0%**, likely due to differences in calibration data and observer implementations.
All of the evals were collected through [Inspect](https://github.com/UKGovernmentBEIS/inspect_ai) with vLLM server and single seed evaluations.

### Accuracy

<table>
  <thead>
    <tr>
      <th>Category</th>
      <th>Benchmark</th>
      <th align="center"><div align="center">Qwen/Qwen3.8-Flash-Next<br>(baseline)</div></th>
      <th align="center"><div align="center">RedHatAI/Qwen3.8-Flash-Next-NVFP4<br>(this model)</div></th>
      <th align="center"><div align="center">Inferact/Qwen3.8-Flash-Next-NVFP4</div></th>
      <th align="center"><div align="center">nvidia/Qwen3.8-Flash-Next-NVFP4</div></th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><b>Reasoning</b></td>
      <td>GPQA Diamond</td>
      <td align="center"><div align="center">90.4</div></td>
      <td align="center"><div align="center"><b>92.9</b></div></td>
      <td align="center"><div align="center">91.4</div></td>
      <td align="center"><div align="center">92.4</div></td>
    </tr>
    <tr>
      <td><b>Knowledge</b></td>
      <td>MMLU-Pro</td>
      <td align="center"><div align="center">88.5</div></td>
      <td align="center"><div align="center"><b>88.2</b></div></td>
      <td align="center"><div align="center">88.0</div></td>
      <td align="center"><div align="center">88.0</div></td>
    </tr>
    <tr>
      <td><b>Math</b></td>
      <td>AIME 2026</td>
      <td align="center"><div align="center">96.7</div></td>
      <td align="center"><div align="center"><b>100</b></div></td>
      <td align="center"><div align="center"><b>100</b></div></td>
      <td align="center"><div align="center"><b>100</b></div></td>
    </tr>
    <tr>
      <td rowspan="5"><b>Coding &amp; Agents</b></td>
      <td>LiveCodeBench</td>
      <td align="center"><div align="center">95.0</div></td>
      <td align="center"><div align="center"><b>95.0</b></div></td>
      <td align="center"><div align="center">94.0</div></td>
      <td align="center"><div align="center"><b>95.0</b></div></td>
    </tr>
    <tr>
      <td>Terminal-Bench 2.1</td>
      <td align="center"><div align="center">85.5</div></td>
      <td align="center"><div align="center">86.1</div></td>
      <td align="center"><div align="center">84.5</div></td>
      <td align="center"><div align="center"><b>86.4</b></div></td>
    </tr>
    <tr>
      <td>SWE-bench Verified</td>
      <td align="center"><div align="center">80.6</div></td>
      <td align="center"><div align="center">79.4</div></td>
      <td align="center"><div align="center"><b>79.8</b></div></td>
      <td align="center"><div align="center"><b>79.8</b></div></td>
    </tr>
    <tr>
      <td>SWE-bench Pro</td>
      <td align="center"><div align="center">62.9</div></td>
      <td align="center"><div align="center"><b>63.6</b></div></td>
      <td align="center"><div align="center">60.9</div></td>
      <td align="center"><div align="center">62.8</div></td>
    </tr>
    <tr>
      <td>DeepSWE 1.1</td>
      <td align="center"><div align="center">66.0</div></td>
      <td align="center"><div align="center"><b>62.3</b></div></td>
      <td align="center"><div align="center">58.1</div></td>
      <td align="center"><div align="center">56.7</div></td>
    </tr>
  </tbody>
</table>

### Recovery

Recovery is the quantized model's score as a percentage of the unquantized [Qwen/Qwen3.8-Flash-Next](https://huggingface.co/Qwen/Qwen3.8-Flash-Next) score, capped at 100%: min(score / unquantized score × 100, 100).

<table>
  <thead>
    <tr>
      <th>Category</th>
      <th>Benchmark</th>
      <th align="center"><div align="center">RedHatAI/Qwen3.8-Flash-Next-NVFP4<br>(this model)</div></th>
      <th align="center"><div align="center">Inferact/Qwen3.8-Flash-Next-NVFP4</div></th>
      <th align="center"><div align="center">nvidia/Qwen3.8-Flash-Next-NVFP4</div></th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><b>Reasoning</b></td>
      <td>GPQA Diamond</td>
      <td align="center"><div align="center"><b>100</b></div></td>
      <td align="center"><div align="center"><b>100</b></div></td>
      <td align="center"><div align="center"><b>100</b></div></td>
    </tr>
    <tr>
      <td><b>Knowledge</b></td>
      <td>MMLU-Pro</td>
      <td align="center"><div align="center"><b>99.6</b></div></td>
      <td align="center"><div align="center">99.4</div></td>
      <td align="center"><div align="center">99.4</div></td>
    </tr>
    <tr>
      <td><b>Math</b></td>
      <td>AIME 2026</td>
      <td align="center"><div align="center"><b>100</b></div></td>
      <td align="center"><div align="center"><b>100</b></div></td>
      <td align="center"><div align="center"><b>100</b></div></td>
    </tr>
    <tr>
      <td rowspan="5"><b>Coding &amp; Agents</b></td>
      <td>LiveCodeBench</td>
      <td align="center"><div align="center"><b>100</b></div></td>
      <td align="center"><div align="center">98.9</div></td>
      <td align="center"><div align="center"><b>100</b></div></td>
    </tr>
    <tr>
      <td>Terminal-Bench 2.1</td>
      <td align="center"><div align="center"><b>100</b></div></td>
      <td align="center"><div align="center">98.8</div></td>
      <td align="center"><div align="center"><b>100</b></div></td>
    </tr>
    <tr>
      <td>SWE-bench Verified</td>
      <td align="center"><div align="center">98.5</div></td>
      <td align="center"><div align="center">99.0</div></td>
      <td align="center"><div align="center"><b>99.1</b></div></td>
    </tr>
    <tr>
      <td>SWE-bench Pro</td>
      <td align="center"><div align="center"><b>100</b></div></td>
      <td align="center"><div align="center">96.8</div></td>
      <td align="center"><div align="center">99.9</div></td>
    </tr>
    <tr>
      <td>DeepSWE 1.1</td>
      <td align="center"><div align="center"><b>94.3</b></div></td>
      <td align="center"><div align="center">88.0</div></td>
      <td align="center"><div align="center">85.9</div></td>
    </tr>
    <tr>
      <td colspan="2"><b>Average</b></td>
      <td align="center"><div align="center"><b>99.1</b></div></td>
      <td align="center"><div align="center">97.6</div></td>
      <td align="center"><div align="center">98.0</div></td>
    </tr>
  </tbody>
</table>