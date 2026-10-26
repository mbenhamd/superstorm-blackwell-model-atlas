---
license: cc-by-nc-nd-4.0
library_name: transformers
pipeline_tag: text-generation
base_model:
  - zai-org/GLM-5.3-Flash
inference: false
tags:
  - dflash
  - dflash2
  - speculative-decoding
  - block-diffusion
  - draft-model
  - sglang
---

# GLM-5.3-Flash-DFlash2

[Blog](https://inco.ai/blog/dflash2/) | [GitHub](https://github.com/z-lab/dflash)

This repository contains the DFlash 2 draft model for
[`zai-org/GLM-5.3-Flash`](https://huggingface.co/zai-org/GLM-5.3-Flash).
It is not a standalone language model: it runs inside a speculative
decoding server and drafts tokens for the target model to verify.

DFlash 2 is a block-diffusion drafter for speculative decoding. It predicts
a whole block of tokens in a single pass and keeps the top candidates at
every position. A lightweight selector then traces one coherent path through them.
Two-tap dynamic convolutions in the backbone keep the draft from decaying
toward the end of the block. Decoding is lossless: greedy output
matches the target model exactly, and sampling preserves its distribution.

<div align="center">
  <img src="assets/dflash2-figure.png" alt="DFlash 2: parallel block drafting with a candidate path selector" width="100%">
</div>

## Quick Start

Serve with [SGLang](https://github.com/sgl-project/sglang):

```bash
pip install "sglang[all] @ git+https://github.com/sgl-project/sglang.git@refs/pull/36708/head#subdirectory=python"

sglang serve \
  --model-path zai-org/GLM-5.3-Flash \
  --trust-remote-code \
  --speculative-algorithm DFLASH \
  --speculative-draft-model-path incoai/GLM-5.3-Flash-DFlash2 \
  --speculative-draft-attention-backend fa4
```

See the [blog post](https://inco.ai/blog/dflash2/) for more details.

## Evaluation

Benchmark numbers for this checkpoint are being re-measured and will be
published here once final.

## License

This model is released under
[CC BY-NC-ND 4.0](https://creativecommons.org/licenses/by-nc-nd/4.0/)
for research and evaluation. For commercial licensing, contact
[contact@inco.ai](mailto:contact@inco.ai).

## Citation

If you find DFlash 2 useful, please cite:

```bibtex
@misc{inco2026dflash2,
  title  = {{DFlash 2: Keep Drafting Parallel}},
  author = {{Inco AI}},
  year   = {2026},
  month  = {August},
  url    = {https://inco.ai/blog/dflash2/}
}
```

Please also cite the original DFlash paper:

```bibtex
@inproceedings{chen2026dflash,
  title     = {{DFlash: Block Diffusion for Flash Speculative Decoding}},
  author    = {Chen, Jian and Liang, Yesheng and Liu, Zhijian},
  booktitle = {International Conference on Machine Learning (ICML)},
  year      = {2026}
}
```
