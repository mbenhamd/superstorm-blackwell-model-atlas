---
pipeline_tag: text-generation
base_model:
- moonshotai/Kimi-K3
license: other
license_name: nvidia-open-model-license
license_link: https://www.nvidia.com/en-us/agreements/enterprise-software/nvidia-open-model-agreement/
library_name: Model Optimizer
tags:
- nvidia
- ModelOpt
- Kimi-K3
- quantized
- FP4
- fp4
---
# Model Overview

## Description:

The NVIDIA Kimi-K3-NVFP4 model is the quantized version of Moonshot AI's Kimi-K3 model, which is an auto-regressive language model that uses an optimized transformer architecture. Kimi-K3 is a flagship, natively multimodal Mixture-of-Experts (MoE) model designed for long-horizon coding, end-to-end knowledge work, game development, deep reasoning, and visual-agent use cases. It has 2.8 trillion total parameters and a native 1,048,576-token context window.For more information, please check [here](https://huggingface.co/moonshotai/Kimi-K3). The NVIDIA Kimi-K3 NVFP4 model is quantized with [Model Optimizer](https://github.com/NVIDIA/Model-Optimizer).

This model is ready for commercial or non-commercial use.    

## References

- Nvidia Model Optimizer: [https://github.com/NVIDIA/Model-Optimizer](https://github.com/NVIDIA/Model-Optimizer)
- Kimi-K3 model card: [https://huggingface.co/moonshotai/Kimi-K3](https://huggingface.co/moonshotai/Kimi-K3)



### License/Terms of Use:

**Governing Terms:** Use of this model is governed by the [NVIDIA Open Model Agreement](https://www.nvidia.com/en-us/agreements/enterprise-software/nvidia-open-model-agreement/).
**Additional Information:** [Kimi K3 License](https://huggingface.co/moonshotai/Kimi-K3/blob/main/LICENSE). **Kimi K3**.

### Deployment Geography:

Global   

### Use Case:

Kimi-K3 use case: developers and inference providers who need ready-to-deploy, pre-quantized multimodal agentic models for NVIDIA GPU inference, including long-horizon coding, visual-agent workflows, game-development tasks, and end-to-end knowledge work.   

### Release Date:

Hugging Face 08/14/2026 via [https://huggingface.co/nvidia/Kimi-K3-NVFP4](https://huggingface.co/nvidia/Kimi-K3-NVFP4)

## Model Architecture:

**Architecture Type:** Transformers    

**Network Architecture:** Mixture-of-Experts transformer using Kimi Delta Attention (KDA), Attention Residuals (AttnRes), and Stable LatentMoE   

**Number of Model Parameters:** 2.8T total parameters; 16 of 896 experts are activated per token   

## Input:

**Input Type(s):** Text, Image, Video   

**Input Format(s):** String, Binary(Base64 encoded), Binary(Base64 encoded)   

**Input Parameters:** One-Dimensional (1D), Two-Dimensional (2D), Three-Dimensional (3D)   

**Other Properties Related to Input:** Native context length: 1,048,576 tokens. Images may be supplied as base64-encoded data, and video-file inputs are supported.   

## Output:

**Output Type(s):** Text   

**Output Format:** String   

**Output Parameters:** 1D (One-Dimensional): Sequences   

**Other Properties Related to Output:** Outputs may include natural-language responses, code, structured JSON, tool-call requests, agent coordination instructions, reasoning content, and generated artifacts depending on serving configuration and application-level tooling. The maximum completion length is configurable up to 1,048,576 tokens.   

Our AI models are designed and/or optimized to run on NVIDIA GPU-accelerated systems. By leveraging NVIDIA's hardware (e.g. GPU cores) and software frameworks (e.g., CUDA libraries), the model achieves faster training and inference times compared to CPU-only solutions.   

## Software Integration:

**Supported Runtime Engine(s):**   

- vLLM
- SGLang

**Supported Hardware Microarchitecture Compatibility:**   

- NVIDIA Blackwell - B200 and B300

**Preferred Operating System(s):**   

- Linux

The integration of foundation and fine-tuned models into AI systems requires additional testing using use-case-specific data to ensure safe and effective deployment. Following the V-model methodology, iterative testing and validation at both unit and system levels are essential to mitigate risks, meet technical and functional requirements, and ensure compliance with safety and ethical standards before deployment.

## Model Version(s):

The model version is Kimi-K3 NVFP4 version 1.0 and is quantized with nvidia-modelopt **v0.45.0**    

## Training and Evaluation Datasets:

No calibration or additional training data was used to produce this checkpoint. Evaluation was performed using the benchmarks listed under Evaluation Dataset. The methods noted under Training and Testing Datasets below describe the data collection and labeling methods used by the third party to train and test the underlying model.

## Calibration Dataset:

No calibration dataset was used. The MXFP4-to-NVFP4 expert conversion used `input_scale=1.0`, and attention projection weights were quantized directly to 128×128 per-block FP8.

## Training Dataset:

**Data Collection Method by dataset:** Hybrid: manually-collected, Automated   

**Labeling Method by dataset:** Hybrid: manually-labelled, Automated   

**Data Modality:** Text, Image, Video   

**Training Data Size:** Undisclosed   

**Properties:** Undisclosed   

## Testing Dataset:

**Data Collection Method by dataset:** Hybrid: manually-collected, Automated   

**Labeling Method by dataset:** Hybrid: manually-labelled, Automated   

**Properties:** Undisclosed   

## Evaluation Dataset:

- Datasets: GPQA Diamond, SciCode, Tau2-bench Telecom, MMMU-Pro, AA-LCR, and Terminal-Bench 2.1

**Data Collection Method by dataset:** Hybrid: Automated, manually-collected   

**Labeling Method by dataset:** Hybrid: manually-labelled, Automated   

**Properties:** The evaluation covers graduate-level reasoning, scientific coding, tool-using telecom agents, multimodal reasoning, long-context reasoning, and terminal-based software-engineering tasks.

## Inference:

**Acceleration Engine:** vLLM, SGLang   

**Test Hardware:** 8 NVIDIA Blackwell B300 GPUs

**Reasoning Mode:** Always-on reasoning. The `reasoning_effort` field supports `low`, `high`, and `max`; the default is `max`.

**Recommended Generation Parameters:** `temperature=1.0`, `n=1`, `presence_penalty=0`, and `frequency_penalty=0`. Use `top_p=0.95` for single-step tasks and `top_p=1.0` for agentic tasks.

## Post Training Quantization

This model was obtained from Kimi-K3 without calibration data. The source MXFP4 routed-expert weights were converted to NVFP4 using `input_scale=1.0`, while the supported attention projection weights in KDA and MLA were quantized to 128×128 per-block FP8. Other checkpoint tensors retain their original precision. The checkpoint is ready for inference with vLLM and SGLang.

## Usage

### vLLM

This checkpoint was validated on 8 NVIDIA B300 GPUs with the public [`vllm/vllm-openai:kimi-k3`](https://hub.docker.com/r/vllm/vllm-openai/tags?name=kimi-k3) image. At validation time, the image included vLLM `0.1.dev19262+gb6bbf29dd.d20260727`. The compatibility patch included in this repository is required for this serving configuration.

Native vLLM support is being upstreamed to replace the compatibility patch. Generic mixed `FP8_PB_WO` dispatch and DeepGEMM preparation are tracked in [vLLM PR #50617](https://github.com/vllm-project/vllm/pull/50617), Kimi-K3 fused-projection support in [vLLM PR #52406](https://github.com/vllm-project/vllm/pull/52406), and the TRTLLM NVFP4 SiTU scale correction in [vLLM PR #52405](https://github.com/vllm-project/vllm/pull/52405). Continue using the bundled patch until those changes are included in a released vLLM build.

```sh
hf download nvidia/Kimi-K3-NVFP4 \
  runtime_patches/sitecustomize.py \
  --local-dir kimi-k3-runtime

docker run --rm --gpus all --ipc=host --network=host \
  --shm-size=64g \
  -e HF_TOKEN \
  -e PYTHONPATH=/k3-runtime-patches \
  -e KIMI_K3_FIX_MM_PROMPT_UPDATES=1 \
  -e KIMI_K3_NVFP4_SITU_G1_SCALE=1 \
  -e KIMI_K3_FP8_PB=1 \
  -e VLLM_USE_DEEP_GEMM=0 \
  -e VLLM_USE_V2_MODEL_RUNNER=1 \
  -e VLLM_USE_RUST_FRONTEND=0 \
  -v "$HOME/.cache/huggingface:/root/.cache/huggingface" \
  -v "$PWD/kimi-k3-runtime/runtime_patches:/k3-runtime-patches:ro" \
  vllm/vllm-openai:kimi-k3 \
  nvidia/Kimi-K3-NVFP4 \
    --served-model-name kimi-k3-nvfp4 \
    --host 0.0.0.0 \
    --port 8000 \
    --trust-remote-code \
    --quantization modelopt_mixed \
    --load-format fastsafetensors \
    --tensor-parallel-size 8 \
    --moe-backend flashinfer_trtllm \
    --gpu-memory-utilization 0.90 \
    --max-model-len 196608 \
    --max-num-batched-tokens 8192 \
    --max-num-seqs 32 \
    --kv-cache-dtype fp8 \
    --attention-config '{"mla_prefill_backend":"TRTLLM_RAGGED","use_prefill_query_quantization":true}' \
    --attention-backend FLASHINFER_MLA \
    --enable-prefix-caching \
    --enable-chunked-prefill \
    --max-cudagraph-capture-size 32 \
    --enable-auto-tool-choice \
    --tool-call-parser kimi_k3 \
    --reasoning-parser kimi_k3
```

The first launch downloads approximately 1.6 TB into the mounted Hugging Face cache. The `fastsafetensors` loader reduced the validated 8xB300 startup time to about 18 minutes; the default loader was substantially slower.

The 196,608-token limit is the validated TP8 setting rather than the model's architectural maximum. Adjust context length and concurrency together based on available memory.

### SGLang

This checkpoint serves on 8 NVIDIA B300 GPUs with [`lmsysorg/sglang:dev-dev-kimi-k3-nvfp4`](https://hub.docker.com/r/lmsysorg/sglang/tags?name=dev-dev-kimi-k3-nvfp4), a CUDA 13 build cut from the head of the SGLang support PR. No runtime patch and no registry authentication are required.

Native SGLang support for the mixed NVFP4 / `FP8_PB_WO` checkpoint is tracked in [SGLang PR #35077](https://github.com/sgl-project/sglang/pull/35077). Until that lands in a released build, use the image above — a pip-installed SGLang cannot load this checkpoint.

`--moe-runner-backend flashinfer_trtllm` is required rather than optional: the automatic resolution never engages the TRT-LLM deferred-finalize path, and `flashinfer_cutlass` has no SiTU kernel for the routed experts. The quantization scheme is read from the checkpoint's own config, so no `--quantization` flag is needed.

```sh
docker run --rm --gpus all --ipc=host --network=host \
  --shm-size=64g \
  -e HF_TOKEN \
  -v "$HOME/.cache/huggingface:/root/.cache/huggingface" \
  lmsysorg/sglang:dev-dev-kimi-k3-nvfp4 \
  sglang serve \
    --trust-remote-code \
    --model-path nvidia/Kimi-K3-NVFP4 \
    --served-model-name kimi-k3-nvfp4 \
    --tp-size 8 \
    --dcp-size 8 \
    --mem-fraction-static 0.85 \
    --reasoning-parser kimi_k3 \
    --tool-call-parser kimi_k3 \
    --host 0.0.0.0 \
    --port 30000 \
    --moe-runner-backend flashinfer_trtllm \
    --speculative-algorithm DSPARK \
    --speculative-draft-model-path RadixArk/Kimi-K3-DSpark \
    --speculative-dspark-block-size 7 \
    --enable-linear-replayssm-spec
```

The three `--speculative-*` flags turn on DSPARK speculative decoding, the cookbook's default operating point for this model; drop them to serve without speculation. Context length is left at the checkpoint's own value — narrow it with `--context-length`, and tune it together with concurrency against available memory.

Further operating points — the low-latency and high-throughput tiers, GB200/GB300 multi-node recipes, and prefill/decode disaggregation — are generated by the [SGLang Kimi-K3 cookbook](https://docs.sglang.io/cookbook/autoregressive/Moonshotai/Kimi-K3), where NVFP4 is the **Quantization** row of the deployment panel.



## Evaluation

The table compares the original Kimi-K3 checkpoint (native MXFP4 routed experts and BF16 attention) with this checkpoint (NVFP4 routed experts and per-block FP8 attention). Higher is better.

| Benchmark | Original Kimi-K3 | Kimi-K3-NVFP4 |
| --- | ---: | ---: |
| GPQA Diamond | 0.9321 | 0.9277 |
| SciCode | 0.58376 | 0.5858 |
| MMMU-Pro | 0.8063 | 0.7983 |
| AA-LCR | 0.7500 | 0.7506 |
| IFBench | 0.7440 | 0.7493 |
| Terminal-Bench 2.1 | 0.8034 | 0.8020 |

Both models were evaluated with `temperature=1.0` and `top_p=0.95`. The maximum generation length was 65,536 tokens, with uncapped generation for Terminal-Bench.




## Model Limitations:

The base model was trained on data that contains toxic language and societal biases originally crawled from the internet. Therefore, the model may amplify those biases and return toxic responses especially when prompted with toxic prompts. The model may generate answers that may be inaccurate, omit key information, or include irrelevant or redundant text producing socially unacceptable or undesirable text, even if the prompt itself does not include anything explicitly offensive.

## Ethical Considerations

NVIDIA believes Trustworthy AI is a shared responsibility and we have established policies and practices to enable development for a wide array of AI applications. Developers should work with their internal model team to ensure this model meets requirements for the relevant industry and use case and addresses unforeseen product misuse.

Please make sure you have proper rights and permissions for all input image and video content; if image or video includes people, personal health information, or intellectual property, the image or video generated will not blur or maintain proportions of image subjects included.

Please report model quality, risk, security vulnerabilities or NVIDIA AI Concerns [here](https://www.nvidia.com/en-us/support/submit-security-vulnerability/).    
