---
license: other
license_name: kimi-k3
library_name: vllm
base_model: moonshotai/Kimi-K3
pipeline_tag: text-generation
tags:
  - dspark
  - speculative-decoding
  - draft-model
  - mla
  - vllm
  - torchspec
  - kimi-k3
---

## Model Overview

**Inferact/Kimi-K3-DSpark** is an **MLA-native DSpark** draft model that accelerates [Kimi-K3](https://huggingface.co/moonshotai/Kimi-K3) on **[vLLM](https://github.com/vllm-project/vllm)**, served through vLLM's native `dspark` speculative method.

The draft trains on **target hidden states extracted from vLLM itself** — the same engine that serves it, so the numerics it learns from are the numerics it meets at inference. [TorchSpec](https://github.com/lightseekorg/TorchSpec) provides the loop, streaming those hidden states from live target inference into concurrent FSDP draft training.

**DSpark** = a block-diffusion backbone of 5 dense layers with non-causal attention, drafting 7 tokens in a single parallel pass, a low-rank sequential **Markov head** supplying the intra-block dependency, and a confidence head for resource-aware scheduling. Mirroring Kimi-K3's own MLA attention means draft and target share one KV layout (a compact 576-element latent per token), so the draft's pages unify with the target's cache — KV offloading and P/D disaggregation work with no separate page format.

---

## Performance

### Peak bs=1 decode: 464 tok/s

Under low-entropy real reasoning workload — Kimi-K3 + DSpark on vLLM can achieve **464 tok/s** using the public `vllm/vllm-openai:kimi-k3` image on 4 × GB300 at `bs=1 & tensor-parallel-size=16`.

### Speculator acceptance

Speculators do best on predictable, low-entropy work like the reasoning workload behind the 464 tok/s above, and worst on open-ended, high-entropy generation. So we measured **14 benchmarks** spanning math, code synthesis, real-world software engineering, multi-turn chat, RAG and QA, multilingual text, creative writing and long-context generation — all with the **Kimi-K3 chat template enabled** and production sampling parameters, with `temperature=0` reported alongside for reproducibility. Acceptance stays strong at long context too, verified on AA-LCR's ~95k-token multi-document prompts. That is the most comprehensive view we can give of how the speculator performs on real-world workloads.

Acceptance length, with 7 speculative tokens:

| benchmark | `temperature=0` | `temperature=1.0`, `top_p=0.95` | prompts |
|---|---|---|---|
| GSM8K | 5.64 | 5.44 | 1319 |
| HumanEval | 5.34 | 5.07 | 164 |
| MBPP | 4.44 | 4.31 | 256 |
| SPEED-Bench · coding | 4.38 | 4.22 | 80 |
| SPEED-Bench · multilingual | 4.21 | 4.10 | 80 |
| SPEED-Bench · RAG | 4.11 | 3.97 | 80 |
| MATH-500 | 3.82 | 3.77 | 500 |
| SPEED-Bench · low-entropy, 10k input | 3.72 | 3.66 | 512 |
| SWE-bench Pro | 3.35 | 3.11 | 128 |
| AA-LCR · ~95k input | 3.19 | 3.23 | 100 |
| MT-Bench | 3.14 | 3.06 | 80 |
| SPEED-Bench · QA | 3.07 | 2.98 | 80 |
| SPEED-Bench · writing | 2.79 | 2.69 | 80 |
| AIME 2026 | 2.72 | 2.64 | 30 |
| **mean** | **3.85** | **3.73** | |


**Benchmarks:** [GSM8K](https://huggingface.co/datasets/openai/gsm8k), [MATH-500](https://huggingface.co/datasets/HuggingFaceH4/MATH-500), [AIME 2026](https://huggingface.co/datasets/math-ai/aime26), [HumanEval](https://huggingface.co/datasets/openai/openai_humaneval), [MBPP](https://huggingface.co/datasets/Muennighoff/mbpp), [SWE-bench Pro](https://huggingface.co/datasets/ScaleAI/SWE-bench_Pro), [MT-Bench](https://huggingface.co/datasets/philschmid/mt-bench), [AA-LCR](https://huggingface.co/datasets/ArtificialAnalysis/AA-LCR) — 100 multi-document prompts of 71k–115k tokens — and six splits of [NVIDIA SPEED-Bench](https://huggingface.co/datasets/nvidia/SPEED-Bench): its `throughput_16k` low-entropy split at 10k-token input, plus five qualitative categories.

---

## Training

**Data — all responses regenerated on-policy by Kimi-K3 itself**, so the draft learns the target's own reasoning traces and chat formatting. Prompts come from public datasets:

- [`lightseekorg/kimi-mtp-dataset`](https://huggingface.co/datasets/lightseekorg/kimi-mtp-dataset) — general instruction prompts
- [`nvidia/OpenCodeInstruct`](https://huggingface.co/datasets/nvidia/OpenCodeInstruct) — single-turn coding
- A nine-category prompt pool from the NVIDIA **Nemotron** SFT/RL collections and [`CohereLabs/aya_dataset`](https://huggingface.co/datasets/CohereLabs/aya_dataset), spanning chat, code, multilingual, RAG/QA, math, structured output and safety. Evaluation-set prompts are excluded.

**Method:** DSpark with block_size=7, trained on a combined CE + L1 distribution-distillation objective against the target's post-final-norm hidden state, bf16. The draft consumes Kimi-K3 auxiliary hidden states from target layers (2, 23, 47, 71, 89) of 93. Roughly **two epochs** in total, on GB300 nodes.

Draft architecture, block size, sequence length, and loss weights are YAML-configurable — see the [TorchSpec repo](https://github.com/lightseekorg/TorchSpec).

---

## Quick Start

### Requirements

For serving Kimi-K3 itself — hardware, parallelism and engine flags — follow the official vLLM recipe: **[recipes.vllm.ai/moonshotai/Kimi-K3](https://recipes.vllm.ai/moonshotai/Kimi-K3)**.

### Enable the draft

Add to your Kimi-K3 `vllm serve` command:

```bash
--speculative-config '{"method": "dspark", "model": "Inferact/Kimi-K3-DSpark", "num_speculative_tokens": 7, "attention_backend": "FLASHINFER_MLA", "draft_sample_method": "probabilistic", "rejection_sample_method": "block"}'
```

### Sampling options

vLLM offers two knobs on top of the defaults, both used in the `temperature=1.0` column above:

- **`draft_sample_method`** — `probabilistic` samples the draft from its own distribution instead of taking its argmax. Pair it with a sampling client; use `greedy` when serving at `temperature=0` so the draft matches the client.
- **`rejection_sample_method`** — `block` verifies the drafted block as a unit rather than token by token. It is a no-op under greedy decoding (at `temperature=0` verification reduces to a deterministic argmax match), so it only applies to the sampling configuration.

The `temperature=0` column was produced with `{"draft_sample_method": "greedy"}` and no `rejection_sample_method`.
