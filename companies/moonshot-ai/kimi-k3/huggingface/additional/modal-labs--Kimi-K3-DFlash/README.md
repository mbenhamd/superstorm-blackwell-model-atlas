---
pipeline_tag: text-generation
library_name: transformers
base_model:
  - moonshotai/Kimi-K3
license: other
license_name: kimi-k3
license_link: https://huggingface.co/moonshotai/Kimi-K3/blob/main/LICENSE
inference: false
tags:
  - dflash
  - speculative-decoding
  - speculative-decoding-draft
  - block-diffusion
  - draft-model
  - diffusion-language-model
  - efficiency
  - kimi
  - kimi-k3
  - sglang
---

# Kimi-K3-DFlash

[Paper](https://arxiv.org/abs/2602.06036) | [Github](https://github.com/z-lab/dflash) | [Blog](https://z-lab.ai/projects/dflash)

This repository contains a DFlash draft model for `moonshotai/Kimi-K3` trained only on a generic data mix (no tool calls, agentic traces, etc). It is not a standalone language model. It is intended to be paired with the target model in a speculative decoding server.

DFlash uses a lightweight block diffusion draft model to propose multiple tokens in parallel. The target model verifies those proposals, improving serving throughput while preserving the target model's output distribution.

## Quick Start

This model should be used with an inference server that supports DFlash speculative decoding. An example SGLang deployment is:

```bash
export SGLANG_ENABLE_OVERLAP_PLAN_STREAM=1

python -m sglang.launch_server \
  --model-path moonshotai/Kimi-K3 \
  --trust-remote-code \
  --speculative-algorithm DFLASH \
  --speculative-draft-model-path modal-labs/Kimi-K3-DFlash \
  --speculative-dflash-block-size 16 \
  --speculative-draft-attention-backend trtllm_mha \
  --attention-backend trtllm_mla \
  --linear-attn-prefill-backend ptx_kda \
  --linear-attn-decode-backend triton \
  --linear-attn-verify-backend triton \
  --enable-gdn-replayssm-spec \
  --linear-replayssm-cache-len 32 \
  --moe-runner-backend flashinfer_mxfp4 \
  --cuda-graph-backend-prefill breakable \
  --cuda-graph-max-bs-prefill 16384 \
  --tp-size 8 \
  --mem-fraction-static 0.88 \
  --host 0.0.0.0 \
  --port 30000
```

Block size `8` is the recommended default. Block size `16` gives longer accept lengths.

## Benchmark Results

On certain workloads we have measured peak per-request decode throughput approaching 900 output tok/s at concurrency 1 with an experimental block size 16 `nv_cutedsl` linear attention verify backend (877 tok/s on GSM8K and 862 tok/s on MATH500).

### Setup

- Runtime: SGLang on 8x NVIDIA B300 GPUs, tensor parallel size 8, `bfloat16`
- Backends: `trtllm_mla` target attention, `trtllm_mha` DFlash draft attention, `ptx_kda` linear attention prefill, `triton` linear attention decode and verify, `flashinfer_mxfp4` MoE runner
- Workloads: GSM8K, MATH500, HumanEval, MBPP, MT-Bench, LongBench-v2 (samples up to 128k tokens), and a long-context HumanEval variant (cold 64k-token prefix) with the Kimi chat template
- Decoding: greedy, thinking enabled, max output length 4096 tokens
- Accept length: `completion_tokens / spec_verify_ct` per generation turn, averaged across generation turns

### Accept Length

Mean accept length at concurrency 1.

| Workload | DFlash block=8 | DFlash block=16 |
| --- | --- | --- |
| gsm8k | 5.905 | 7.984 |
| math500 | 4.951 | 6.194 |
| humaneval | 6.013 | 8.358 |
| humaneval-long | 5.948 | 8.217 |
| mbpp | 5.365 | 6.738 |
| mt-bench | 4.202 | 4.921 |
| longbench-v2 | 3.455 | 3.688 |

## Acknowledgements

Special thanks to our close collaborators [Jian Chen](https://jianchen.me/) and [Zhijian Liu](https://zhijianliu.com/) from [Z-Lab](https://z-lab.ai/) — we are deeply grateful for the thoughtful discussions, careful ablations, and genuine spirit of collaboration that made this release possible. This model is also mirrored on their Hugging Face at:

- [`z-lab/Kimi-K3-DFlash`](https://huggingface.co/z-lab/Kimi-K3-DFlash)

## Citation

If you find DFlash useful, please cite the original paper:

```bibtex
@article{chen2026dflash,
  title   = {{DFlash: Block Diffusion for Flash Speculative Decoding}},
  author  = {Chen, Jian and Liang, Yesheng and Liu, Zhijian},
  journal = {arXiv preprint arXiv:2602.06036},
  year    = {2026}
}
```