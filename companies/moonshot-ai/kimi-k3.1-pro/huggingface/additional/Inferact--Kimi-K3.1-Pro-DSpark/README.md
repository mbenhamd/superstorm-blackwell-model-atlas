---
tags:
  - speculative-decoding
  - dspark
  - speculators
  - vllm
---

# Kimi K3.1 Pro DSpark

DSpark draft model for speculative decoding with Kimi K3.1 Pro. This is our latest checkpoint that replaces
[Kimi-K3.1-Pro-DSpark-preview](https://huggingface.co/Inferact/Kimi-K3.1-Pro-DSpark-preview).

This checkpoint is a joint effort with the Red Hat AI Speculators team, using the vLLM project's
[Speculators](https://github.com/vllm-project/speculators) library.

| Component | Value |
| --- | --- |
| Layers | 5 dense decoder layers, 2.5B parameters (BF16) |
| Attention | Grouped-query attention with a 2,048-token sliding window in every layer; 96 query heads, 16 KV heads, head dim 64 |
| Hidden size / FFN | 7168 / 14336 |
| Input | hidden states from 5 target layers |
| Draft block | 7 tokens per forward pass |
| Heads | Markov head (rank 512), confidence head; embedding and LM head shared with the target |
| Context | 1,048,576 tokens; each draft layer attends to the last 2,048 |

## Sliding-window attention

Every draft layer uses a 2,048-token sliding window, so the draft's attention cost and KV cache stay fixed as
the context grows. This keeps drafting efficient at long context, up to Kimi K3.1 Pro's 1M tokens.

## Evaluation settings

- **Server:** `--speculative-config '{"method":"dspark","model":"Inferact/Kimi-K3.1-Pro-DSpark","num_speculative_tokens":7,"draft_sample_method":"probabilistic","rejection_sample_method":"block"}'`
- **Client:** chat completions, temperature 1.0, top_p 0.95, full test set per benchmark.
- **Metric:** acceptance length = 1 + accepted draft tokens / drafts (counts the bonus token).

## Serving with vLLM

```bash
docker run --gpus all \
  --privileged --ipc=host -p 8000:8000 \
  -v ~/.cache/huggingface:/root/.cache/huggingface \
  -e VLLM_ENGINE_READY_TIMEOUT_S=3600 \
  vllm/vllm-openai:kimi-k31 moonshotai/Kimi-K3.1-Pro \
  --trust-remote-code \
  --enable-expert-parallel \
  --tensor-parallel-size 8 \
  --moe-backend deep_gemm_mega_moe \
  --all2all-backend flashinfer_nvlink_one_sided \
  --load-format fastsafetensors \
  --enable-auto-tool-choice \
  --tool-call-parser kimi_k3 \
  --reasoning-parser kimi_k3 \
  --speculative-config '{"model":"Inferact/Kimi-K3.1-Pro-DSpark","num_speculative_tokens":5,"method":"dspark","draft_sample_method":"probabilistic"}' \
  --kv-cache-dtype nvfp4_ds_mla \
  --decode-context-parallel-size 8
```

## Per-position draft acceptance

Positions 1–7 refer to the proposed draft tokens. Rates are percentages of verification steps.

| Benchmark | Prompts | Max tokens | Acceptance length | Position 1 | Position 2 | Position 3 | Position 4 | Position 5 | Position 6 | Position 7 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| GSM8K | 1,319 | 1,024 | **5.566** | 91% | 82% | 72% | 64% | 56% | 49% | 43% |
| HumanEval | 164 | 1,024 | 4.660 | 86% | 71% | 59% | 49% | 40% | 34% | 28% |
| MBPP | 974 | 1,024 | 4.376 | 84% | 68% | 55% | 44% | 35% | 28% | 23% |
| MATH-500 | 500 | 2,048 | 4.445 | 84% | 69% | 56% | 45% | 37% | 30% | 24% |
| SPEED-Bench low entropy | 302 | 1,536 | 3.619 | 78% | 58% | 42% | 31% | 23% | 17% | 13% |
| SPEED-Bench coding | 80 | 4,096 | 4.159 | 81% | 64% | 50% | 40% | 32% | 27% | 22% |
| MT-Bench | 80 | 1,024 | 3.393 | 76% | 54% | 38% | 27% | 20% | 14% | 11% |
| SWE-bench Pro | 642 | 2,048 | 3.302 | 75% | 53% | 37% | 26% | 18% | 13% | 9% |
| AIME 2026 | 30 | 4,096 | 3.429 | 77% | 56% | 40% | 28% | 20% | 14% | 10% |
| **Pooled** | — | — | **3.864** | **79%** | **61%** | **46%** | **35%** | **27%** | **21%** | **17%** |

## SpeedBench acceptance

| Category | Conversations | Model calls | Max tokens | Acceptance length | Draft acceptance |
| --- | ---: | ---: | ---: | ---: | ---: |
| Coding | 80 | 89 | 4,096 | 4.0957 | 44.22% |
| Humanities | 80 | 88 | 4,096 | 3.0354 | 29.08% |
| Math | 80 | 98 | 4,096 | 3.2025 | 31.46% |
| QA | 80 | 80 | 4,096 | 3.4800 | 35.43% |
| RAG | 80 | 105 | 4,096 | 4.2890 | 46.99% |
| Reasoning | 80 | 190 | 4,096 | 3.5954 | 37.08% |
| STEM | 80 | 86 | 4,096 | 3.1874 | 31.25% |
| Writing | 80 | 84 | 4,096 | 2.8243 | 26.06% |
| Multilingual | 80 | 80 | 4,096 | 4.0903 | 44.15% |
| Summarization | 80 | 80 | 4,096 | 4.1758 | 45.37% |
| Roleplay | 80 | 158 | 4,096 | 3.0310 | 29.01% |
| **Pooled** | **880** | **1,138** | **4,096** | **3.2690** | **32.41%** |

## Long context acceptance

| Benchmark | Prompts | Prompt tokens | Max tokens | Acceptance length | Position 1 | Position 2 | Position 3 | Position 4 | Position 5 | Position 6 | Position 7 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| AA-LCR | 100 | 95K mean | 1,024 | **3.935** | 81% | 64% | 49% | 37% | 27% | 21% | 15% |
| BEAM 128K | 400 | 97K–125K | 2,048 | 3.516 | 78% | 58% | 41% | 29% | 20% | 14% | 10% |
| BEAM 1M | 700 | 826K–1.04M | 2,048 | 3.421 | 77% | 56% | 40% | 28% | 19% | 13% | 9% |

### Throughput and interactivity

![image](https://cdn-uploads.huggingface.co/production/uploads/67f401f4bb5b52cdad90f9a7/wXzGbHI9Whia-M1LxGtFL.png)

