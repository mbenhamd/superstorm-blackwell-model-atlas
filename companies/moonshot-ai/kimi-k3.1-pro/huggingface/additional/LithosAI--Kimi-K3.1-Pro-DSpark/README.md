---
license: other
license_name: kimi-k3.1-pro
license_link: LICENSE
base_model: moonshotai/Kimi-K3.1-Pro
pipeline_tag: text-generation
inference: false
tags:
  - speculative-decoding
  - dspark
  - draft-model
  - sglang
  - vllm
  - kimi-k3.1
---

# Kimi-K3.1-Pro-DSpark

**LithosAI** · draft model for lossless speculative decoding with
[Kimi-K3.1-Pro](https://huggingface.co/moonshotai/Kimi-K3.1-Pro)

A DSpark draft head. In each decode step it reads hidden states that the target has already computed, proposes a block
of tokens in one parallel pass, and the target verifies the block in one forward pass. Every token that is kept is
drawn from the target's own distribution, so outputs are exactly those of Kimi-K3.1-Pro; only the speed changes.

At block size 8 the head reaches a mean acceptance length of **3.448** over 10 public benchmarks
(math, science, code, software engineering, chat, writing, multilingual, RAG, QA, roleplay, summarization and 10K-token low-entropy inputs) and **3.281** on 95K-token AA-LCR prompts.

## Architecture

| Component | Value |
|---|---|
| Draft network | 5 dense decoder layers, hidden size 7168, SwiGLU FFN 14336 |
| Attention | grouped-query attention, 64 query heads and 16 KV heads of dim 64; bidirectional within the draft block |
| Target features | hidden states of target layers **7, 23, 67, 83, 91** (of 93), concatenated and fused by one linear projection |
| Block dependency | low-rank Markov head (rank 256) conditioning each drafted token on the one before it |
| Scheduling signal | confidence head (per-position acceptance estimate) |
| Shared with the target | token embedding and LM head (not stored here) |
| Positions | YaRN (factor 16 over 65,536; 1,048,576 positions configured) |
| Block size | 8: each step verifies 8 tokens, the current token plus 7 drafted tokens |
| Size | 2,249,289,601 parameters, BF16, one safetensors file |

The inference engine reads `dflash_config.target_layer_ids` from `config.json` and exports those five target layers to the draft.

## Evaluation

**Setup.** Kimi-K3.1-Pro on one 8x B300 node, tensor parallel 8, FP8 KV cache. Block size 8 (verify 8). Temperature 1.0, top-p 0.95. Up to 16 requests in
flight (8 for AA-LCR). Every benchmark is run on its full test set; all 5,399 requests succeeded.

**Prompts.** Each sample is one user turn rendered with the target's native chat template at `thinking_effort` max, with
no system prompt and no tools. GSM8K, MATH-500 and AIME 2026 append "Please reason step by step, and put your final
answer within \boxed{}." HumanEval asks to complete the given function; MBPP gives the task and its test asserts;
SWE-bench Pro gives the repository and the issue and asks for a patch; MT-Bench uses the first turn; SPEED-Bench uses
its prompts as given; GPQA Diamond uses the simple-evals multiple-choice template with the four options shuffled per question; multi-turn SPEED-Bench qualitative samples use their first turn; AA-LCR uses the official template with all documents of the question in
context.

**Metrics.** For each request, acceptance length `L = C / V`, where `C` is the number of completion tokens and `V` the
number of verify steps; every step commits the accepted drafted tokens plus one token from the target, so `L` is at
most 8. **acc_len** is `L` averaged equally over requests. *Pooled* is `sum(C) / sum(V)` over the benchmark.
*Position rate k* is the share of verify steps that accepted at least k drafted tokens.

| Domain | Benchmark | Prompts | Max tokens | acc_len | Pooled | Position rate, k = 1..7 |
|---|---|---:|---:|---:|---:|---|
| Math | GSM8K | 1,319 | 1,024 | **5.136** | 4.760 | 0.86 0.73 0.61 0.50 0.42 0.35 0.29 |
| Math | MATH-500 | 500 | 2,048 | **4.365** | 3.753 | 0.78 0.59 0.45 0.34 0.26 0.20 0.15 |
| Math | AIME 2026 | 30 | 4,096 | **2.967** | 2.796 | 0.68 0.44 0.28 0.18 0.11 0.07 0.04 |
| Science | GPQA Diamond | 198 | 4,096 | **3.022** | 2.794 | 0.68 0.44 0.28 0.17 0.11 0.07 0.04 |
| Code | HumanEval | 164 | 1,024 | **3.685** | 3.490 | 0.74 0.53 0.39 0.29 0.22 0.18 0.14 |
| Code | MBPP | 974 | 1,024 | **3.474** | 3.330 | 0.73 0.52 0.36 0.26 0.20 0.15 0.12 |
| Software engineering | SWE-bench Pro | 642 | 2,048 | **2.814** | 2.784 | 0.67 0.43 0.27 0.17 0.12 0.08 0.05 |
| Chat | MT-Bench | 80 | 1,024 | **3.078** | 2.605 | 0.64 0.38 0.23 0.15 0.10 0.07 0.05 |
| Mixed (11 categories) | SPEED-Bench qualitative | 880 | 1,024 | **3.033** | 2.835 | 0.68 0.43 0.27 0.18 0.12 0.09 0.06 |
| Low entropy, 10K-token inputs | SPEED-Bench throughput | 512 | 1,536 | **2.909** | 2.855 | 0.67 0.43 0.28 0.19 0.13 0.09 0.06 |
| | **Mean of the 10 benchmarks** | | | **3.448** | | |

**SPEED-Bench qualitative by category** (80 prompts each)

| Category | acc_len | Pooled | Position rate, k = 1..7 |
|---|---:|---:|---|
| Multilingual | **3.421** | 3.214 | 0.71 0.49 0.34 0.25 0.18 0.14 0.10 |
| RAG | **3.402** | 3.152 | 0.72 0.49 0.33 0.23 0.16 0.12 0.09 |
| Math | **3.323** | 2.975 | 0.70 0.46 0.30 0.20 0.14 0.10 0.07 |
| Coding | **3.266** | 3.193 | 0.72 0.49 0.34 0.24 0.18 0.13 0.10 |
| Summarization | **3.223** | 3.191 | 0.73 0.50 0.34 0.24 0.17 0.12 0.09 |
| Roleplay | **2.936** | 2.879 | 0.69 0.44 0.28 0.18 0.13 0.10 0.07 |
| QA | **2.911** | 2.764 | 0.68 0.43 0.27 0.17 0.10 0.07 0.04 |
| Reasoning | **2.909** | 2.853 | 0.69 0.44 0.28 0.18 0.12 0.09 0.06 |
| STEM | **2.846** | 2.805 | 0.68 0.43 0.27 0.17 0.12 0.08 0.06 |
| Humanities | **2.805** | 2.726 | 0.67 0.41 0.25 0.16 0.11 0.07 0.05 |
| Writing | **2.322** | 2.243 | 0.58 0.31 0.17 0.09 0.05 0.03 0.02 |

**Long context**

| Benchmark | Prompts | Prompt tokens | Max tokens | acc_len | Pooled | Position rate, k = 1..7 |
|---|---:|---|---:|---:|---:|---|
| AA-LCR | 100 | 95K mean (71K-115K) | 1,024 | **3.281** | 3.198 | 0.73 0.51 0.35 0.24 0.17 0.11 0.08 |

Per-benchmark counters (completion tokens, verify steps, accepted drafted tokens, the acceptance histogram and the
completion-token-weighted acceptance length) are in `benchmark_results.json`.

**Benchmarks:** [GSM8K](https://huggingface.co/datasets/openai/gsm8k) (main test), [MATH-500](https://huggingface.co/datasets/HuggingFaceH4/MATH-500), [AIME 2026](https://huggingface.co/datasets/MathArena/aime_2026), [GPQA Diamond](https://huggingface.co/datasets/Idavidrein/gpqa), [HumanEval](https://huggingface.co/datasets/openai/openai_humaneval), [MBPP](https://huggingface.co/datasets/google-research-datasets/mbpp) (all 974 problems of the full configuration), [SWE-bench Pro](https://huggingface.co/datasets/ScaleAI/SWE-bench_Pro) (public set), [MT-Bench](https://huggingface.co/datasets/philschmid/mt-bench), [SPEED-Bench](https://huggingface.co/datasets/nvidia/SPEED-Bench) (`qualitative` split and `throughput_16k` split, low-entropy category) and [AA-LCR](https://huggingface.co/datasets/ArtificialAnalysis/AA-LCR).

## Serving

Block size 8 as evaluated above: each step verifies 8 tokens (the current token plus 7 drafted tokens).

### SGLang

```bash
python -m sglang.launch_server \
  --model-path moonshotai/Kimi-K3.1-Pro \
  --trust-remote-code \
  --tp-size 8 \
  --kv-cache-dtype fp8_e4m3 \
  --speculative-algorithm DSPARK \
  --speculative-draft-model-path LithosAI/Kimi-K3.1-Pro-DSpark \
  --speculative-dspark-block-size 7 \
  --speculative-num-draft-tokens 8
```

### vLLM

```bash
vllm serve moonshotai/Kimi-K3.1-Pro \
  --trust-remote-code \
  --tensor-parallel-size 8 \
  --speculative-config '{"method": "dspark", "model": "LithosAI/Kimi-K3.1-Pro-DSpark", "num_speculative_tokens": 7}'
```

## Training

- **Data:** multi-turn agentic coding sessions whose responses were generated by Kimi-K3.1-Pro itself. Loss is applied
  to the model's own assistant turns; system, user and tool text is context only.
- **Features:** the target's own hidden states at the five tap layers, the same inputs the draft reads at inference.
- **Objective:** 5 drafted tokens per block; 0.1 cross-entropy + 0.9 L1 distillation against the target's final hidden
  state, plus a confidence BCE term (weight 1.0); top-p 0.95 targets.
- **Schedule:** learning rate 2.5e-5, two epochs, 2,048 supervised tokens per window with 512 tokens of preceding
  context, BF16, on 8x B300.

---

Built by [LithosAI](https://www.lithosai.com/).

License: the [Kimi K3.1-Pro License](LICENSE) of the target model, included in this repository.
