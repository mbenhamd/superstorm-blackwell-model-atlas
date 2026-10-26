---

license: apache-2.0
license_link: https://ai.google.dev/gemma/docs/gemma_4_license
library_name: transformers
base_model:
- google/gemma-4-31B-it
- nvidia/Gemma-4-31B-IT-NVFP4
pipeline_tag: text-generation
tags:
- gemma4
- gemma-4-31b-it
- nvfp4
- modelopt
- vllm
- quantized
- nvidia
- lighthouse
model-index:
- name: gemma-4-31B-it-NVFP4-turbo
  results:
  - task:
      type: text-generation
    dataset:
      name: GPQA Diamond
      type: Idavidrein/gpqa
      config: gpqa_diamond
    metrics:
    - name: Accuracy
      type: accuracy
      value: 72.73
  - task:
      type: text-generation
    dataset:
      name: MMLU Pro
      type: TIGER-Lab/MMLU-Pro
    metrics:
    - name: Accuracy
      type: accuracy
      value: 83.93

---

<h1>⚡ Gemma 4 31B IT NVFP4 <i>Turbo</i></h1>

<div align="center">
  <img src="https://huggingface.co/LilaRest/gemma-4-31B-it-NVFP4-turbo/resolve/main/banner.png">
</div>

---

<h2 align="center"><b>➡️ Sponsored by <a href="https://clearbox.to?ref=turbo">Clearbox</a>. Turn Reddit into pipeline.</b></h2>

---

A repackaged [nvidia/Gemma-4-31B-IT-NVFP4](https://huggingface.co/nvidia/Gemma-4-31B-IT-NVFP4) that is **68% smaller** in GPU memory and **~2.5× faster** than the [base model](https://huggingface.co/google/gemma-4-31B-it), while retaining **nearly identical quality** (1-3% loss). Fits on a *single* RTX 5090 (🎉).

It fully leverages NVIDIA Blackwell FP4 tensor cores (RTX 5090, RTX PRO 6000, B200, and other SM 12.0+ GPUs with ≥20 GB VRAM) for **~2× higher concurrent throughput** than other quants like [prithivMLmods/gemma-4-31B-it-NVFP4](https://huggingface.co/prithivMLmods/gemma-4-31B-it-NVFP4) or [cyankiwi/gemma-4-31B-it-AWQ-4bit](https://huggingface.co/cyankiwi/gemma-4-31B-it-AWQ-4bit).

This variant is **text-only**, video/audio weights and encoders have been stripped. If you need video/audio support -> open an issue or PR.

## Benchmark

![Benchmark chart](bench/chart/benchmark.png)

> [!NOTE]  
> RTX PRO 6000, `vllm bench` @ 1K input / 200 output tokens. See [bench.sh](/bench/bench.sh).
>
> Note: We also ran ***⚡Turbo*** benchmark on RTX 5090, and it performed exactly the same because at 16k context, the performance is not limited by the GPU memory.

|                  | [Base model](https://huggingface.co/google/gemma-4-31B-it) | [NVIDIA quant](https://huggingface.co/nvidia/Gemma-4-31B-IT-NVFP4) | ***⚡ Turbo*** (this model)                  |
|------------------|------------------------------------------------------------|--------------------------------------------------------------------|---------------------------------------------|
| GPU memory       | 58.9 GiB                                                   | 31 GiB                                                             | **18.5 GiB** *(-68% base, -40% nvidia)*     |
| GPQA Diamond     | 75.71%                                                     | 75.46%                                                             | **72.73%** *(-2.98% base, -2.73% nvidia)*   |
| MMLU Pro         | 85.25%                                                     | 84.94%                                                             | **83.93%** *(-1.32% base, -1.01% nvidia)*   |
| Prefill          | 6352 tok/s                                                 | 11069 tok/s                                                        | **15359 tok/s** *(+142% base, +39% nvidia)* |
| Decode (single)  | 24.1 tok/s                                                 | 39.2 tok/s                                                         | **51 tok/s** *(+112% base, +30% nvidia)*    |
| Decode (batched) | 494 tok/s                                                  | 913 tok/s                                                          | **1244 tok/s** *(+152% base, +36% nvidia)*  |
| Concurrency      | 2.47 tok/s                                                 | 4.56 req/s                                                         | **6.22 req/s** *(+152% base, +36% nvidia)*  |


Other quants of similar size use kernel paths (compressed-tensors, Marlin) that don't leverage Blackwell's FP4 tensor cores, resulting in significantly lower prefill and concurrent throughput:


|                  | [prithivMLmods NVFP4](https://huggingface.co/prithivMLmods/gemma-4-31B-it-NVFP4) | [cyankiwi AWQ](https://huggingface.co/cyankiwi/gemma-4-31B-it-AWQ-4bit) | ***⚡ Turbo*** (this model) |
|------------------|----------------------------------------------------------------------------------|-------------------------------------------------------------------------|----------------------------|
| GPU memory       | 19.6 GiB                                                                         | 19.6 GiB                                                                | **18.5 GiB**               |
| Prefill          | 6647 tok/s                                                                       | 6626 tok/s                                                              | **15359 tok/s**            |
| Decode (single)  | 64.3 tok/s                                                                       | 64.4 tok/s                                                              | **51 tok/s**               |
| Decode (batched) | 757 tok/s                                                                        | 757 tok/s                                                               | **1244 tok/s**             |
| Concurrency      | 3.79 req/s                                                                       | 3.78 req/s                                                              | **6.22 req/s**             |


## Usage

Requirements:

- A **Blackwell GPU** (see [Compatibility](#compatibility))
- `transformers >= 5.5.0`
- `vllm >= 0.19` with CUDA 13.0
  > **Note:** `pip install vllm` installs CUDA 12, which doesn't support Blackwell FP4 tensor cores. Use one of the methods below.

### Docker (recommended)

We recommend using the `vllm/vllm-openai:cu130-nightly` Docker image, which ships with CUDA 13.0 and Blackwell support out of the box.

```bash
docker run --gpus all \
  -v ~/.cache/huggingface:/root/.cache/huggingface \
  -p 8000:8000 \
  vllm/vllm-openai:cu130-nightly \
  --model LilaRest/gemma-4-31B-it-NVFP4-turbo \
  --quantization modelopt \
  --max-model-len 16384 \
  --max-num-seqs 128 \
  --max-num-batched-tokens 8192 \
  --gpu-memory-utilization 0.95 \
  --kv-cache-dtype fp8 \
  --enable-prefix-caching \
  --trust-remote-code
```

> If you get `model type gemma4 not recognized`, run `pip install transformers>=5.5.0` inside the container.

### pip (CUDA 13.0 wheel)

```bash
pip install https://github.com/vllm-project/vllm/releases/download/v0.19.0/vllm-0.19.0+cu130-cp38-abi3-manylinux_2_35_x86_64.whl
pip install transformers>=5.5.0

vllm serve LilaRest/gemma-4-31B-it-NVFP4-turbo \
  --quantization modelopt \
  --max-model-len 16384 \
  --max-num-seqs 128 \
  --max-num-batched-tokens 8192 \
  --gpu-memory-utilization 0.95 \
  --kv-cache-dtype fp8 \
  --enable-prefix-caching \
  --trust-remote-code
```

### Key flags

- `--quantization modelopt` — required, activates NVIDIA's optimized CUTLASS kernels
- `--kv-cache-dtype fp8` — halves KV cache memory on Blackwell
- `--max-model-len 16384` — maximum context length per request. See [Compatibility](#compatibility) for max value per GPU.

## Tuning

The above benchmarks use a generic workload (1K input / 200 output tokens). You can tune vLLM flags for your specific use case:

- **High-throughput classification / short output** — Reduce `--max-model-len` and limit output tokens (`max_tokens` in the API request). Less KV cache pressure means more concurrent requests. Expect **14+ req/s** on RTX 5090 for classification workloads (~1K input, ~10 output tokens).
- **Long context** — Increase `--max-model-len` (up to ~25K on RTX 5090, ~180K on PRO 6000). Trade concurrent capacity for longer sequences.
- **Latency-sensitive** — Keep concurrency low. Single-request decode is ~51 tok/s with TTFT under 70ms — fast enough for interactive use.
- **Batch processing** — Push `--max-num-seqs` higher and use `--request-rate inf` with `--max-concurrency` to saturate the GPU. Peak throughput is ~6.2 req/s on RTX PRO 6000 at 1K/200 workload.

## Compatibility

**Blackwell (SM 12.0+) — full FP4 tensor core support:**


| GPU                | VRAM   | Works? | Max context | Notes                                                 |
|--------------------|--------|--------|-------------|-------------------------------------------------------|
| RTX 5090           | 32 GB  | ✅      | ~25k        | Primary target                                        |
| RTX PRO 6000       | 96 GB  | ✅      | ~180K       | Ideal for high-concurrency or long-context workloads. |
| B200               | 192 GB | ✅      | 262k (full) | Datacenter, untested                                  |
| B100               | 192 GB | ✅      | 262k (full) | Datacenter, untested                                  |
| RTX 5080 and lower | ≤16 GB | ❌      | —           | Not enough VRAM                                       |


Older GPUs (H100, A100, RTX 4090, etc.) may work without `--quantization modelopt` but they lack FP4 tensor cores, so you'll lose the optimized kernel path and performance will be significantly worse.

## Approach

Three changes were made:

1. **Quantized** all self-attention weights from BF16 → FP4 (RTN, group_size=16, matching modelopt NVFP4 format)
2. **Updated** architecture to `Gemma4ForCausalLM` and quantization config accordingly
3. **Stripped** the vision and audio encoder

Everything else is untouched — MLP layers keep NVIDIA's calibrated FP4, `embed_tokens` stays BF16, all norms preserved, so we retain all the [nvidia/Gemma-4-31B-IT-NVFP4](https://huggingface.co/nvidia/Gemma-4-31B-IT-NVFP4) optimizations.

#### Why RTN didn't hurt quality

RTN (Round-To-Nearest) is the simplest quantization method — no calibration data, fully reproducible. It worked here because:

- FP4 with group_size=16 and per-group scaling preserves relative weight distributions well
- Self-attention weights tend to be normally distributed near zero, where the FP4 grid has finest resolution (0, 0.5, 1.0, 1.5)
- MLP layers (more sensitive to quantization) keep NVIDIA's calibrated FP4
- `embed_tokens` stays BF16, preventing noise from propagating through all layers

## License

Apache 2.0 — same as the [base model](https://ai.google.dev/gemma/docs/gemma_4_license).

## Credits

- [Google DeepMind](https://deepmind.google/models/gemma/) for Gemma 4
- [NVIDIA](https://huggingface.co/nvidia/Gemma-4-31B-IT-NVFP4) for the modelopt NVFP4 checkpoint

