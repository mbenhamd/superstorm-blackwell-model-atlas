---
tags:
  - speculative-decoding
  - dspark
  - speculators
  - vllm
---

> **Preview checkpoint.** We are working on a stronger version of this draft and will release it soon.

# Kimi K3.1 Pro DSpark (preview)

DSpark draft model for Kimi K3.1 Pro.

| Component | Value |
| --- | --- |
| Layers | 5 dense decoder layers, 2.7B parameters (BF16) |
| Attention | MLA, full causal; 96 heads, query/KV LoRA rank 1536/512 |
| Hidden size / FFN | 7168 / 14336 |
| Input | hidden states from 5 target layers |
| Draft block | 7 tokens per forward pass |
| Heads | Markov head (rank 512), confidence head; embedding and LM head shared with the target |
| Context | 1,048,576 tokens (YaRN, factor 32) |

## Evaluation settings

- **Server:** `--speculative-config '{"method":"dspark","model":"Inferact/Kimi-K3.1-Pro-DSpark-preview","num_speculative_tokens":7,"draft_sample_method":"probabilistic","rejection_sample_method":"block"}'`
- **Client:** `vllm-bench` chat completions, temperature 1.0, top_p 0.95, full test set per
  benchmark.
- **Metric:** acceptance length = 1 + accepted draft tokens / drafts (counts the bonus token).

## Results

| Benchmark | Prompts | Max tokens | Acceptance length | Accept rate, positions 1-7 |
| --- | ---: | ---: | ---: | --- |
| GSM8K | 1,319 | 1,024 | **4.597** | 0.86 0.71 0.59 0.48 0.39 0.32 0.26 |
| HumanEval | 164 | 1,024 | 3.585 | 0.76 0.56 0.41 0.30 0.23 0.18 0.14 |
| MBPP | 974 | 1,024 | 3.520 | 0.77 0.56 0.41 0.29 0.21 0.16 0.12 |
| MATH-500 | 500 | 2,048 | 3.824 | 0.80 0.62 0.46 0.35 0.26 0.19 0.14 |
| SPEED-Bench low entropy (10K-token inputs) | 512 | 1,536 | 2.930 | 0.70 0.46 0.30 0.19 0.13 0.09 0.06 |
| MT-Bench | 80 | 1,024 | 2.812 | 0.69 0.44 0.27 0.17 0.11 0.07 0.05 |
| SWE-bench Pro | 642 | 2,048 | 2.741 | 0.67 0.43 0.27 0.16 0.10 0.06 0.04 |
| AIME 2026 | 30 | 4,096 | 2.973 | 0.71 0.49 0.32 0.20 0.13 0.08 0.05 |
| **Pooled** | | | **3.154** | 0.72 0.50 0.34 0.23 0.16 0.11 0.08 |

## Long context

| Benchmark | Prompts | Prompt tokens | Max tokens | Acceptance length | Accept rate, positions 1-7 |
| --- | ---: | ---: | ---: | ---: | --- |
| AA-LCR | 100 | 95K mean | 1,024 | **3.501** | 0.75 0.57 0.42 0.30 0.22 0.15 0.10 |
| BEAM 128K | 400 | 97K-125K | 2,048 | 2.954 | 0.71 0.48 0.31 0.20 0.13 0.08 0.05 |
| BEAM 1M | 700 | 826K-1.04M | 2,048 | 2.765 | 0.70 0.45 0.28 0.16 0.09 0.05 0.03 |
