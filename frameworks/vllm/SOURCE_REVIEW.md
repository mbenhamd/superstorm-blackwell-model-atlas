# vLLM: focused source review

## Version ledger

Latest release retrieved: **v0.31.0**, published October 5, 2026. Inspected main: `f8460ef23659afd69046a81529ec2295e4c3f686`, commit time October 15, 2026, 20:58:25 UTC. Main’s latest commit updates the FlashMLA path for a newer DeepSeek version; that is not proof of a performance change to your exact 0731 model. [VREL](https://github.com/vllm-project/vllm/releases/tag/v0.31.0) [VHEAD](https://github.com/vllm-project/vllm/commit/f8460ef23659afd69046a81529ec2295e4c3f686)

A source commit is not a nightly container digest. No nightly wheel or container was downloaded or executed here. Read [nightly readiness](../../reports/nightly-readiness.md).

## Actual code ranges inspected

| File | Range | What was verified |
| --- | --- | --- |
| `vllm/model_executor/models/registry.py` | 1–350 | Class-to-module mapping and architecture interface imports |
| `vllm/models/kimi_k3/nvidia/dspark_mla.py` | 1–190 | Draft MLA construction, quantization configuration, feature projection and fused-reduction structure |
| Kimi NVIDIA implementation directory | directory listing | `kda.py`, `mla.py`, `model.py`, `latent_moe_runner.py`, `dspark_mla.py`, `mtp.py` are separate implementation areas |

[VREG](https://github.com/vllm-project/vllm/blob/f8460ef23659afd69046a81529ec2295e4c3f686/vllm/model_executor/models/registry.py) [VDS](https://github.com/vllm-project/vllm/blob/f8460ef23659afd69046a81529ec2295e4c3f686/vllm/models/kimi_k3/nvidia/dspark_mla.py)

## Findings that matter operationally

The registry maps newer text architectures to `vllm.models.deepseek_v4`, `vllm.models.glm5next`, `vllm.models.qwen4_exp` and `vllm.models.kimi_k3`, while some older families remain in the older model-executor namespace. Audits and patch instructions written for old paths can miss the active implementation. Use the pinned registry before searching for the hot path.

The DSpark draft layer explicitly constructs non-causal multi-token MLA, obtains a draft-specific quantization configuration and uses a target-derived feature projection. Its row-parallel outputs can defer reductions into fused all-reduce/RMSNorm operations. Therefore changing tensor parallelism, draft dtype or kernel fusion is not independent of the draft model’s correctness and performance. These are source-level observations from the inspected range, not an audit of every subsequent forward/verification path. [VREG](https://github.com/vllm-project/vllm/blob/f8460ef23659afd69046a81529ec2295e4c3f686/vllm/model_executor/models/registry.py) [VDS](https://github.com/vllm-project/vllm/blob/f8460ef23659afd69046a81529ec2295e4c3f686/vllm/models/kimi_k3/nvidia/dspark_mla.py)

## Open compatibility issue

PR #52406 describes FP8-block projection padding and trimming plus MLA scale absorption for Kimi’s ModelOpt attention. It remains open at retrieval. Its author distinguishes unit/static validation of the branch from the equivalent compatibility logic used for an eight-B300 evaluation. This distinction is preserved here: an author’s related hardware run is not validation of an arbitrary later nightly image. [KIMIVPR](https://github.com/vllm-project/vllm/pull/52406)

## Follow the complete request before production

After cloning the pinned source, trace model resolution → configuration/weight loader → quantization dispatch → attention/expert backend → scheduler/cache manager → draft verification → tokenizer/parser. Record the actual resolved classes and kernel names from a running process. Test unsupported shapes, empty expert batches, cancellation and graph replay. The provided clone and metadata tools are reproducibility aids, not evidence that this entire trace was executed here.
