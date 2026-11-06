---
license: apache-2.0
pipeline_tag: text-generation
tags:
- speculative-decoding
- dflash2
- sglang
- kimi
base_model: moonshotai/Kimi-K3.1-Pro
inference: false
---

# Kimi-K3.1-Dflash2-Preview

## Overview

A DFlash2 speculator for
[Kimi-K3.1-Pro](https://huggingface.co/moonshotai/Kimi-K3.1-Pro), designed to
accelerate inference through speculative decoding with SGLang. In each step the
draft proposes a block of tokens in parallel from the target's hidden states, and
the target verifies the block in one forward pass.

This repository contains the BF16 draft weights and configuration. The target
model supplies the embeddings, LM head, tokenizer, and native chat template.
The draft is used alongside the target and is not a standalone language model.

The draft is a five-layer MLA stack. It reads hidden states from six target
layers, fuses them through one projection, and runs block-causal sliding-window
attention over the target's context. A low-rank candidate selector then picks
each proposed token from the draft's top-k candidates, conditioned on the token
before it, so the block is sampled as a path rather than position by position.

## Model Specifications

- **Base model:** `moonshotai/Kimi-K3.1-Pro` 
- **Format:** Single-file BF16 Safetensors, 2,784,811,008 parameters
- **Draft:** 5 MLA layers (DeepSeek-style multi-head latent attention), hidden
  size 7168, 96 heads, q LoRA rank 1536, KV LoRA rank 512, QK head dim 192
  (128 + 64 RoPE), V head dim 128, SwiGLU MLP 14336
- **Block convolutions:** a learned convolution over the block (kernel 2, group
  size 16) in the attention and MLP branches of every layer
- **Attention:** Block-causal sliding-window attention with a 1,024-token window
- **Verification width:** 5 tokens (1 current token + 4 draft tokens) as
  configured; the same weights also serve at 8 (see below)
- **Selector:** Rank 256, top-k 32
- **Auxiliary target layers:** `[7, 23, 51, 67, 83, 91]`
- **Configured context length:** 1,048,576 tokens (YaRN, factor 32), aligned
  with the target
- **Target weights:** Embedding and unembedding weights are loaded from the target

The configured context limit is distinct from the attention window. The config
alignment does not establish draft acceptance quality across the full 1M context.

## Evaluation Results

`acc_len` is the per-request acceptance length `L = C / V`, where `C` is the
number of completion tokens and `V` is the number of verification steps, averaged
equally across successful requests. Completion-token-weighted AL is
`sum(C * L) / sum(C)`; pooled AL is `sum(C) / sum(V)`. Every verification step
commits the accepted draft tokens plus one token from the target, so AL is at most
the verification width.

### Verification width 5 (1 current token + 4 draft tokens, as configured)

| Dataset | Samples | acc_len | Completion-token-weighted AL | Pooled AL |
|---|---:|---:|---:|---:|
| GSM8K | 1,319 | **4.259405** | 4.103988 | 4.063391 |
| AIME26 | 240 (30 × 8) | **3.231564** | 3.039857 | 3.019893 |
| GPQA Diamond | 198 | **3.275916** | 2.979262 | 2.960371 |

### Verification width 8 (1 current token + 7 draft tokens)

| Dataset | Samples | acc_len | Completion-token-weighted AL | Pooled AL |
|---|---:|---:|---:|---:|
| GSM8K | 1,319 | **5.780277** | 5.442283 | 5.287548 |
| AIME26 | 240 (30 × 8) | **3.696036** | 3.367764 | 3.320980 |
| GPQA Diamond | 198 | **3.768280** | 3.268278 | 3.227970 |

Measured with real DFlash2 and **block verification enabled**, `thinking_effort`
max, `temperature=1.0` and `top_p=0.95`, on one 8x B300 node (TP8) with FP8
target KV cache, FP8 draft KV cache and `cutedsl_mla` draft attention, using the
command below. The three suites ran concurrently against one server, with 32
client workers per suite and at most 64 running requests at 5 tokens (32 at 8
tokens). These results are not from a single-request-at-a-time evaluation.

All 3,514 requests (1,757 per width) finished with an end-of-turn token. None was
truncated (the longest used 104,938 of the 131,072-token context), and none needed
a retry. Mean completion length at width 5: GSM8K 344, AIME26 9,806 and GPQA
Diamond 5,761 tokens.

Prompts: each sample is one user turn rendered with the target's chat template.
GSM8K and AIME26 append "Please reason step by step, and put your final answer
within \boxed{}."; GPQA Diamond uses the simple-evals multiple-choice template
with options shuffled per question. AIME26 is the 30 AIME 2026 problems from
`MathArena/aime_2026`, sampled 8 times each with different seeds. Only acceptance
length is measured here, not answer accuracy.

## Serving with SGLang

The following example launches one TP8 replica with block verification, FP8 KV
caches for the target and the draft, and `cutedsl_mla` draft attention:

```bash
python -m sglang.launch_server \
  --model-path moonshotai/Kimi-K3.1-Pro \
  --trust-remote-code \
  --tp-size 8 \
  --mem-fraction-static 0.85 \
  --mamba-full-memory-ratio 1.0 \
  --reasoning-parser kimi_k3 \
  --tool-call-parser kimi_k3 \
  --kv-cache-dtype fp8_e4m3 \
  --disable-radix-cache \
  --max-running-requests 64 \
  --context-length 131072 \
  --speculative-algorithm DFLASH \
  --speculative-draft-model-path RadixArk/Kimi-K3.1-Dflash2-Preview \
  --speculative-draft-attention-backend cutedsl_mla \
  --speculative-draft-kv-cache-dtype fp8_e4m3 \
  --speculative-num-draft-tokens 5 \
  --speculative-use-block-verification \
  --host 127.0.0.1 \
  --port 30000
```

For an 8-token verification width, pass `--speculative-num-draft-tokens 8`. It
overrides the config's `block_size` of 5, and SGLang logs a warning. Also lower
`--max-running-requests` to 32: the target's speculative Mamba state cache grows
with verification width × running requests, and at 8 × 64 it leaves no memory for
the KV cache at `--mem-fraction-static 0.85` on B300.
