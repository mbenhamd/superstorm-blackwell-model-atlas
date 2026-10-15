# Stable, main and nightly are different objects

Release pages and GitHub metadata were rechecked October 15, 2026 UTC. Branch snapshots below were retrieved at 21:52 UTC; they are observations at that time, not promises that a moving branch remains unchanged.

| Component | Latest stable release | Inspected source snapshot | Separately observed main/master | Binary tested here |
| --- | --- | --- | --- | --- |
| vLLM | 0.31.0, October 5 | `f8460ef23659afd69046a81529ec2295e4c3f686` | `e711723352670e811b0e904300d771471e28930d` | None |
| SGLang | 0.5.21, October 2 | `877be2974aa151a984e52822c028276c2b1e9303` | `91f6ef23223d8415724b1bbfab415bb5977fca0c` | None |
| KServe | 0.21.0, September 25 | Selected release CRD/constants files at `d1482554fc4f66dd41aee70e01f5174e24f265bd`; no full controller review | `22be2b0496eea4548a98395c3abccf48d8235385` (master) | None |

[VREL](https://github.com/vllm-project/vllm/releases/tag/v0.31.0) [GREL](https://github.com/sgl-project/sglang/releases/tag/v0.5.21) [KREL](https://github.com/kserve/kserve/releases/tag/v0.21.0) [VHEAD](https://github.com/vllm-project/vllm/commit/f8460ef23659afd69046a81529ec2295e4c3f686) [GHEAD](https://github.com/sgl-project/sglang/commit/877be2974aa151a984e52822c028276c2b1e9303)

[VMAIN](https://github.com/vllm-project/vllm/commit/e711723352670e811b0e904300d771471e28930d) [GMAIN](https://github.com/sgl-project/sglang/commit/91f6ef23223d8415724b1bbfab415bb5977fca0c) [KMAIN](https://github.com/kserve/kserve/commit/22be2b0496eea4548a98395c3abccf48d8235385). The two vLLM and two SGLang files in the source reviews were also fetched at these branch snapshots; each matched the earlier inspected file byte for byte. This does not extend the review to other files or dependencies.

A nightly tag can move, lag main, include additional patches or use a different dependency set. Its architecture-specific kernels can differ by CUDA build. Pin a digest and record the embedded engine commit, torch/CUDA versions, FlashInfer/FlashMLA/DeepGEMM versions, compiler target and model revision. A source SHA does not make a binary reproducible unless its dependencies and build are also fixed.

## Published nightly metadata checked separately

The official installation pages describe nightly distribution channels. Their indexes were checked at approximately 21:58 UTC, without downloading or executing the wheels or container layers. A filename or registry record establishes a published reference, not the behavior or embedded dependencies of its binary. [VNIGHTLY-DOC](https://docs.vllm.ai/en/latest/getting_started/installation/gpu/) [GNIGHTLY-DOC](https://docs.sglang.io/docs/get-started/install)

| Channel | Observed reference | Evidence boundary |
| --- | --- | --- |
| vLLM CUDA 13 wheel index | `0.32.0rc1.dev255+gf8460ef23`, x86_64 and aarch64 wheel links | The published link refers to the older inspected source, not the later main snapshot |
| SGLang CUDA 13 wheel index | `0.5.22.dev20261015+ga12814c158`, CPython 3.12, x86_64 | Version and checksum are index metadata; wheel bytes were not checked |
| SGLang CUDA 13 development image | `nightly-dev-cu13-20261015-a6a8c560`, amd64 and arm64 manifests | Registry index digest `sha256:0a1ba33aa4e032b8c5bcebdc69c45664074c032074add4f7db01629ec1fcc381`; no image was pulled |

[VNIGHTLY-INDEX](https://wheels.vllm.ai/nightly/cu130/vllm/) [GNIGHTLY-INDEX](https://sgl-project.github.io/whl/cu130/sglang/) [GNIGHTLY-TAGS](https://hub.docker.com/v2/repositories/lmsysorg/sglang/tags?page_size=5&name=nightly&ordering=last_updated)

These channels carry different source identifiers. The same registry listing also contains a newer CUDA 13.4 nightly with only an arm64 manifest; newest publication time alone does not select an image for an x86_64 B300 node. KServe has no nightly binary selected or tested in this atlas.

## Concrete update checks from this research

SGLang Kimi mixed NVFP4 support PR #35077 merged August 19. vLLM Kimi FP8-attention PR #52406 remains open. vLLM Flash Next mixed MTP PR #55513 merged September 8. GitHub ancestry checks place the two merged fixes in the v0.5.21 and v0.31.0 source histories respectively. That establishes release-source inclusion, not the contents or correctness of an installed image. NVIDIA’s separately patched Kimi vLLM container must be evaluated on its own terms. [KIMIPR](https://github.com/sgl-project/sglang/pull/35077) [KIMIVPR](https://github.com/vllm-project/vllm/pull/52406) [QPR](https://github.com/vllm-project/vllm/pull/55513) [GREL-KIMI-ANCESTRY](https://github.com/sgl-project/sglang/compare/5f128395910dafb98c34083dc26cb790c7674d34...v0.5.21) [VREL-QWEN-ANCESTRY](https://github.com/vllm-project/vllm/compare/60ad959b6f1a5c8f602edbd608c8decbc0788c50...v0.31.0) [kimi-k3-NV](https://huggingface.co/nvidia/Kimi-K3-NVFP4/blob/b2428a0b83a8b712ff2e1a8448a103d4175341f1/README.md)

## Upgrade gate

Resolve the new artifact to a digest, inventory its actual versions, load the exact pinned checkpoint, run target-only and speculative correctness, compare quality and long-context behavior, then benchmark the fixed workload. Include cancellation, prefix eviction and graph replay. Promote only after the regression threshold and latency objective pass; retain the previous digest and model metadata for rollback.

`scripts/clone_upstreams.py` can materialize the inspected revisions without modifying an existing checkout and defaults to printing commands. `scripts/fetch_metadata.py` resolves immutable model revisions without downloading weights. Selected source files and metadata were successfully retrieved over HTTPS during this audit; the earlier full-clone failure remains a historical event. Neither metadata retrieval nor cloning constitutes a serving test.
