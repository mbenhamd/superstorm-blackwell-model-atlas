# Stable, main and nightly are different objects

| Component | Latest release retrieved | Inspected source | Binary artifact tested here |
| --- | --- | --- | --- |
| vLLM | 0.31.0, October 5 | `f8460ef23659afd69046a81529ec2295e4c3f686` | None |
| SGLang | 0.5.21, October 2 | `877be2974aa151a984e52822c028276c2b1e9303` | None |
| KServe | 0.21.0, September 25 | Release metadata/docs; no pinned full source review | None |

[VREL](https://github.com/vllm-project/vllm/releases/tag/v0.31.0) [GREL](https://github.com/sgl-project/sglang/releases/tag/v0.5.21) [KREL](https://github.com/kserve/kserve/releases/tag/v0.21.0) [VHEAD](https://github.com/vllm-project/vllm/commit/f8460ef23659afd69046a81529ec2295e4c3f686) [GHEAD](https://github.com/sgl-project/sglang/commit/877be2974aa151a984e52822c028276c2b1e9303)

A nightly tag can move, lag main, include additional patches or use a different dependency set. Its architecture-specific kernels can differ by CUDA build. Pin a digest and record the embedded engine commit, torch/CUDA versions, FlashInfer/FlashMLA/DeepGEMM versions, compiler target and model revision. A source SHA does not make a binary reproducible unless its dependencies and build are also fixed.

## Concrete update checks from this research

SGLang Kimi mixed NVFP4 support PR #35077 merged August 19. vLLM Kimi FP8-attention PR #52406 remains open. vLLM Flash Next mixed MTP PR #55513 merged September 8. Old model-card language calling all these fixes “pending” is therefore not a reliable current-status report. Conversely, a merged PR does not prove an installed image contains it. [KIMIPR](https://github.com/sgl-project/sglang/pull/35077) [KIMIVPR](https://github.com/vllm-project/vllm/pull/52406) [QPR](https://github.com/vllm-project/vllm/pull/55513)

## Upgrade gate

Resolve the new artifact to a digest, inventory its actual versions, load the exact pinned checkpoint, run target-only and speculative correctness, compare quality and long-context behavior, then benchmark the fixed workload. Include cancellation, prefix eviction and graph replay. Promote only after the regression threshold and latency objective pass; retain the previous digest and model metadata for rollback.

`scripts/clone_upstreams.py` can materialize the inspected main revisions on a networked host without modifying an existing checkout. It defaults to printing commands. `scripts/fetch_metadata.py` resolves immutable model revisions without downloading weights. Neither script retroactively changes the verification level of this ZIP.
