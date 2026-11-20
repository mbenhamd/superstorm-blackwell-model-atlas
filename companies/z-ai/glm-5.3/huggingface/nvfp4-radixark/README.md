---
pipeline_tag: text-generation
base_model:
- zai-org/GLM-5.3-BF16
license: other
library_name: Model Optimizer
language:
- en
- zh
tags:
- RadixArk
- ModelOpt
- GLM-5.3
- quantized
- FP4
- fp4
- NVFP4
---

# Model Overview

## Description:

The RadixArk GLM-5.3-NVFP4 model is the quantized version of [zai-org/GLM-5.3-BF16](https://huggingface.co/zai-org/GLM-5.3-BF16). The quantization was produced at RadixArk using [NVIDIA Model Optimizer](https://github.com/NVIDIA/Model-Optimizer), following an expert-only NVFP4 W4A4 recipe.

**Run on [SGLang](https://github.com/sgl-project/sglang)**: launch command and per-platform recipes in the [GLM-5.3 cookbook](https://cookbook.sglang.io/autoregressive/GLM/GLM-5.3).

## Third-Party Community Consideration

This model is not owned or developed by RadixArk. It is a quantized derivative of Z.ai's model; see the upstream [GLM-5.3 model card](https://huggingface.co/zai-org/GLM-5.3-BF16) for the source model's capabilities, training information, limitations, and license.

### License/Terms of Use:

[Z.AI Model License](./LICENSE) (MIT-style)

### Deployment Geography:

Global <br>

### Use Case: <br>

Developers looking to deploy an off-the-shelf, pre-quantized model for agentic engineering, coding, long-horizon tool use, and reasoning workloads. <br>

### Release Date: <br>

Hugging Face 08/28/2026 via https://huggingface.co/RadixArk/GLM-5.3-NVFP4 <br>

## Model Architecture:

**Architecture Type:** Transformer (Sparse Mixture-of-Experts with sparse attention) <br>
**Network Architecture:** GLM-5.3 (`GlmMoeDsaForCausalLM`) — 78 decoder layers (3 dense MLP + 75 MoE), 256 routed experts per MoE layer (top-8) + 1 shared expert, IndexShare indexer, 1 MTP layer <br>
**Number of Model Parameters:** 753B total, ~40B activated per token <br>

## Input:

**Input Type(s):** Text <br>
**Input Format(s):** String <br>
**Other Properties Related to Input:** Context length up to 1M (1,048,576 tokens). <br>

## Output:

**Output Type(s):** Text <br>
**Output Format:** String <br>

## Software Integration:

**Supported Runtime Engine(s):** <br>
* SGLang <br>

**Supported Hardware Microarchitecture Compatibility:** <br>
* NVIDIA Blackwell (this checkpoint was produced and validated on B300) <br>

**Preferred Operating System(s):** <br>
* Linux <br>

## Model Version(s):

Quantized with [NVIDIA Model Optimizer](https://github.com/NVIDIA/Model-Optimizer), commit `7ff81dd795b13a0a70e01db701305aa4b57f40b0` (`v0.47.0.dev91`). <br>

## Training, Testing, and Evaluation Datasets:

### Calibration Data:

Calibration used 1,024 samples at sequence length 512, drawn from Model Optimizer's default `cnn_nemotron_v2_mix` combination. The combination splits the sample budget evenly across its two members: 512 samples from [`abisee/cnn_dailymail`](https://huggingface.co/datasets/abisee/cnn_dailymail) (config `3.0.0`, `train` split) and 512 from [`nvidia/Nemotron-Post-Training-Dataset-v2`](https://huggingface.co/datasets/nvidia/Nemotron-Post-Training-Dataset-v2) (`stem`, `chat`, `math`, `code` splits). Activation scales were fit by max calibration. <br>

### Training Dataset:

RadixArk did not train or fine-tune this checkpoint. Training information is inherited from the upstream [GLM-5.3 model card](https://huggingface.co/zai-org/GLM-5.3-BF16). <br>

### Evaluation Dataset:

The model was evaluated on GSM8K, AIME 2026, Terminal-Bench 2.1, and DeepSWE. <br>

## Post Training Quantization

The routed experts of the 75 MoE layers use NVFP4 W4A4 quantization with group size 16 — 57,600 linear entries, or 96.2% of parameters — with FP8-E4M3 block scales and static per-tensor activation scales. Sparse attention including the IndexShare indexer, shared experts, routers, the three dense MLP layers, all norms, embeddings, `lm_head`, and all MTP tensors retain the source BF16 precision. Checkpoint size is reduced from 1,507 GB to 465 GB.

## Usage

The following SGLang configuration uses eight NVIDIA Blackwell GPUs:

```sh
sglang serve \
  --model-path RadixArk/GLM-5.3-NVFP4 \
  --tp-size 8 \
  --quantization modelopt_fp4 \
  --reasoning-parser glm45 \
  --tool-call-parser glm47 \
  --speculative-algorithm EAGLE \
  --speculative-num-steps 5 \
  --speculative-eagle-topk 1 \
  --speculative-num-draft-tokens 6 \
  --host 0.0.0.0 \
  --port 30000
```

The MTP layer is retained in BF16, so EAGLE speculative decoding is supported. For other deployment topologies and hardware-specific configurations, see the [SGLang GLM-5.3 cookbook](https://cookbook.sglang.io/autoregressive/GLM/GLM-5.3).

### Evaluation

The benchmark results below were produced with this NVFP4 checkpoint on NVIDIA Blackwell GPUs using SGLang.

| Benchmark | Evaluation protocol | Score |
|---|---|---:|
| GSM8K | Full 1,319-example split, single-shot, sgl-eval, `temperature=1.0`, `top_p=0.95` | **97.42% (1,285/1,319)** |
| Terminal-Bench 2.1 | terminus-2 harness, `temperature=1.0`, `top_p=0.95` | **86.5% (77/89)** |
| DeepSWE | mini-swe-agent harness, `temperature=0.95`, `top_p=1.0` | **68.1% (77/113)** |
| AIME 2026 | 30 problems x 16 rollouts, pass@1, sgl-eval, `temperature=1.0`, `top_p=0.95` | **94.17%** (majority@16 **100%**) |

GSM8K and AIME 2026 were run with `max_tokens=131072` and GLM-5.3's default `Reasoning Effort: Max`; measured against the BF16 source under the identical protocol and build, GSM8K is an exact match and AIME 2026 pass@1 is within run-to-run noise. All reported evaluations were text-only.

## Model Limitations:

The base model may generate inaccurate, incomplete, irrelevant, biased, or otherwise undesirable responses. Developers should evaluate the model for their intended use case and apply appropriate safeguards.

## Ethical Considerations

RadixArk believes trustworthy AI is a shared responsibility. Developers should ensure that use of this model complies with the upstream license and meets the safety, privacy, and reliability requirements of their application.