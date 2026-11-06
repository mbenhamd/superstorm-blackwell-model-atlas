---
library_name: transformers
pipeline_tag: image-text-to-text
tags:
- muse-glimmer
- nvfp4
- mxfp8
- modelopt
- quantized
- sglang
base_model: meta-models/Muse-Glimmer-30B
inference: false
---

# Muse Glimmer — NVFP4/MXFP8 (vendor recipe)

## Overview

The vendor-recipe quantized checkpoint of **Muse Glimmer**, packed for
serving with SGLang. This is the model vendor's own `fp_awq` mixed-precision
recipe (`MIXED_PRECISION`): **NVFP4** (E2M1, group 16) on most projections,
**MXFP8** (E4M3, group 32) on the higher-sensitivity set (`v_proj`,
`down_proj`, `lm_head`), norms in bf16 — 18.3 GiB versus 52 GiB for the bf16
export. Grab it and serve it directly by repo id; no conversion step needed.



## Model Specifications

- **Base model:** `meta-models/Muse-Glimmer-30B` (Muse Glimmer bf16 export)
- **Format:** Safetensors, 5 shards, 18.34 GiB
- **Recipe:** vendor `fp_awq` hand-off packed with the SGLang fork's
  `convert_fp_awq_to_hf.py` (default flags — the recipe as shipped);
  quantization map in `hf_quant_config.json` (`quant_algo: MIXED_PRECISION`)
- **Language model:** 52 layers, hidden 6656, 32 Q / 2 KV heads, vocab 202,048
- **Text-only serving** is recommended (`--language-model-only`); the vision
  tower ships in the base export, not in this quantized checkpoint

## Evaluation Results

Measured on 1× DGX Spark (GB10), SGLang, 1024 in / 1024 out, greedy:

| BS | output tok/s | vs bf16 target | + DFlash draft (sim acc=5) |
|---:|---:|---:|---:|
| 1 | 12.1 | 2.7× | 36.4 |
| 4 | 47.7 | 2.7× | 156.2 |
| 8 | 92.2 | 2.6× | 300.7 |

Notes: decode is memory-bound, so the speedup tracks the 52→18 GiB weight
reduction. On GB10, quantized *prefill* is slower than bf16 at batch ≥ 4
(~650 vs ~1500 input tok/s) — decode-heavy workloads win, prefill-heavy
workloads should measure. Correctness smoke-verified (greedy arithmetic and
generation with correct stop tokens); full accuracy suite pending.

## Serving with SGLang

Requires the SGLang fork with Muse Glimmer support
([sgl-project/sglang#34262](https://github.com/sgl-project/sglang/pull/34262), model
support PR #3) until merged upstream.

```bash
sglang serve \
  --model-path RadixArk/Muse-Glimmer-NVFP4 \
  --reasoning-parser muse \
  --tool-call-parser muse \
  --language-model-only \
  --tp-size 1 \
  --mem-fraction-static 0.85 \
  --host 0.0.0.0 --port 30000
```

With speculative decoding (pairs with
[meta-models/Muse-Glimmer-30B-assistant](https://huggingface.co/meta-models/Muse-Glimmer-30B-assistant)):

```bash
sglang serve \
  --model-path RadixArk/Muse-Glimmer-NVFP4 \
  --reasoning-parser muse \
  --tool-call-parser muse \
  --language-model-only \
  --speculative-algorithm DFLASH \
  --speculative-draft-model-path meta-models/Muse-Glimmer-30B-assistant \
  --speculative-dflash-block-size 5 \
  --tp-size 1 \
  --mem-fraction-static 0.85 \
  --host 0.0.0.0 --port 30000
```

Hardware notes:
- Fits a 32 GB RTX 5090 (the bf16 export does not).
- **DGX Spark / GB10 (unified memory): use `--mem-fraction-static 0.40`
  (0.38 with DFlash).** Higher fractions let the KV pool consume the shared
  CPU/GPU pool and can OOM the machine during load.
- Sampling: temperature 0.95, top_p 1.0 (greedy only for determinism checks).
  Do not add `<|eom|>` (200007) as an EOS token — it breaks parallel tool
  calling; `generation_config.json` already carries the correct stops.
