# vLLM: focused source review

## Version ledger

Latest stable release rechecked on October 15, 2026: **v0.31.0**, published October 5. The inspected source snapshot is `f8460ef23659afd69046a81529ec2295e4c3f686`, committed October 15 at 20:58:25 UTC. Its commit updates the FlashMLA path for DeepSeek V4.1; that does not establish a change to the exact 0731 model. [VREL](https://github.com/vllm-project/vllm/releases/tag/v0.31.0) [VHEAD](https://github.com/vllm-project/vllm/commit/f8460ef23659afd69046a81529ec2295e4c3f686)

A separate main-branch lookup at 21:52 UTC returned `e711723352670e811b0e904300d771471e28930d`, committed at 21:51:57 UTC for ROCm gfx1250 work. Both source files below were retrieved at that revision and were byte-identical to the inspected snapshot. This comparison covers those files, not the whole engine or its dependencies. [VMAIN](https://github.com/vllm-project/vllm/commit/e711723352670e811b0e904300d771471e28930d)

A source commit is not a nightly container digest. No nightly wheel or container was downloaded or executed here. Read [nightly readiness](../../reports/nightly-readiness.md).

## Actual code ranges inspected

| File | Range | What was verified |
| --- | --- | --- |
| `vllm/model_executor/models/registry.py` | 1–350 | Class-to-module mapping and architecture interface imports |
| `vllm/models/kimi_k3/nvidia/dspark_mla.py` | 1–190 | Draft MLA construction, quantization configuration, feature projection and fused-reduction structure |
| Kimi NVIDIA implementation directory | directory listing | Separate KDA, MLA, latent-MoE, DSpark and MTP files; a listing does not constitute a review of their contents |

[VREG](https://github.com/vllm-project/vllm/blob/f8460ef23659afd69046a81529ec2295e4c3f686/vllm/model_executor/models/registry.py) [VDS](https://github.com/vllm-project/vllm/blob/f8460ef23659afd69046a81529ec2295e4c3f686/vllm/models/kimi_k3/nvidia/dspark_mla.py) [VDIR](https://github.com/vllm-project/vllm/tree/f8460ef23659afd69046a81529ec2295e4c3f686/vllm/models/kimi_k3/nvidia)

## Findings that matter operationally

The registry maps newer text architectures to `vllm.models.deepseek_v4`, `vllm.models.glm5next`, `vllm.models.qwen4_exp` and `vllm.models.kimi_k3`, while some older families remain in the older model-executor namespace. Audits and patch instructions written for old paths can miss the active implementation. Use the pinned registry before searching for the hot path.

The DSpark draft layer explicitly constructs non-causal multi-token MLA, obtains a draft-specific quantization configuration and uses a target-derived feature projection. Its row-parallel outputs can defer reductions into fused all-reduce/RMSNorm operations. Therefore changing tensor parallelism, draft dtype or kernel fusion is not independent of the draft model’s correctness and performance. These are source-level observations from the inspected range, not an audit of every subsequent forward/verification path. [VREG](https://github.com/vllm-project/vllm/blob/f8460ef23659afd69046a81529ec2295e4c3f686/vllm/model_executor/models/registry.py) [VDS](https://github.com/vllm-project/vllm/blob/f8460ef23659afd69046a81529ec2295e4c3f686/vllm/models/kimi_k3/nvidia/dspark_mla.py)

## Open compatibility issue

PR #52406 describes FP8-block projection padding and trimming plus MLA scale absorption for Kimi’s ModelOpt attention. It remains open at retrieval. Its author distinguishes unit/static validation of the branch from the equivalent compatibility logic used for an eight-B300 evaluation. This distinction is preserved here: an author’s related hardware run is not validation of an arbitrary later nightly image. [KIMIVPR](https://github.com/vllm-project/vllm/pull/52406)

NVIDIA separately documents a Kimi NVFP4 deployment using its patched vLLM container and bundled runtime patches. An open upstream PR does not erase that documented path, and the patched container is not interchangeable with an unmodified stable vLLM image. Review and pin that artifact independently. [kimi-k3-NV](https://huggingface.co/nvidia/Kimi-K3-NVFP4/blob/b2428a0b83a8b712ff2e1a8448a103d4175341f1/README.md)

## Follow the complete request before production

After cloning the pinned source, trace model resolution → configuration/weight loader → quantization dispatch → attention/expert backend → scheduler/cache manager → draft verification → tokenizer/parser. Record the actual resolved classes and kernel names from a running process. Test unsupported shapes, empty expert batches, cancellation and graph replay. The provided clone and metadata tools are reproducibility aids, not evidence that this entire trace was executed here.
