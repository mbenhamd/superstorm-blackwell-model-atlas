# Superstorm · Blackwell model atlas

**Eight model-family reports. Six company directories. An 8×B300 research baseline, audited October 15, 2026.**

Begin with [START_HERE](START_HERE.md), read the [comparison](reports/comparison.md), then open the model relevant to your workload. [GLOSSARY](GLOSSARY.md) explains the acronyms and gives everyday analogies. [LIMITATIONS](LIMITATIONS.md) states exactly what was and was not verified. The accompanying `ATLAS.html` is an offline reading edition.

## Company → architecture → precision → runtime

| Company | Model | Starting hypothesis |
| --- | --- | --- |
| moonshot-ai | [Kimi K3](companies/moonshot-ai/kimi-k3/README.md) | SGLang initial candidate for NVIDIA mixed NVFP4; compare vLLM and SGLang for native MXFP4 |
| z-ai | [GLM 5.3](companies/z-ai/glm-5.3/README.md) | vLLM FP8 and RedHat/Inferact NVFP4 first; SGLang challenger |
| z-ai | [GLM 5.3 Flash](companies/z-ai/glm-5.3-flash/README.md) | SGLang Blackwell FP8 initial candidate; vLLM FP8 and NVFP4 head-to-head |
| deepseek | [DeepSeek V4 Flash 0731](companies/deepseek/deepseek-v4-flash-0731/README.md) | vLLM TP1/DP4+EP baseline and SGLang documented TP4 comparator; qualify eight-GPU adaptations |
| alibaba-qwen | [Qwen 3.8 27B](companies/alibaba-qwen/qwen3.8-27b/README.md) | Compare vLLM and SGLang TP1 BF16, FP8 and NVIDIA mixed NVFP4; no measured winner |
| alibaba-qwen | [Qwen 3.8 Flash Next](companies/alibaba-qwen/qwen3.8-flash-next/README.md) | vLLM TP8 baseline for the NVIDIA mixed export; SGLang documented TP1 candidate, unverified on B300 |
| google | [Gemma 4 31B IT](companies/google/gemma-4-31b-it/README.md) | vLLM TP1 BF16/FP8/NVFP4 comparison; SGLang challenger with export-level probe |
| mistral-ai | [Mistral Medium 3.5](companies/mistral-ai/mistral-medium-3.5/README.md) | vLLM publisher TP8 baseline; compare TP2/4 and publisher-documented SGLang at equal workload |

Each model directory contains an architecture report, precision report, serving report, validation plan, source index and machine-readable record. Quantized NVIDIA/RedHat/Inferact derivatives live under their original model family, so the same architecture is not counted repeatedly.

## Precision and evidence boundaries

Kimi K3's native release is MXFP4/MXFP8, not NVFP4; NVIDIA's NVFP4 export is a different mixed checkpoint. An ideal all-FP8 2.8T target exceeds the advertised 2.304 TB memory of eight 288 GB GPUs before caches. DeepSeek's July-31 release uses its own mixed FP4/FP8 and DSpark path. Qwen Flash Next's 125B core omits a separately reported 51B n-gram table and 4B MTP module. “Fits in memory” and “fastest” remain different claims. [kimi-k3-CARD](https://huggingface.co/moonshotai/Kimi-K3/blob/f831ab66814297da540d832a5235f8e904f29d06/README.md) [HW](https://docs.nvidia.com/dgx/dgxb300-user-guide/introduction-to-dgxb300.html) [deepseek-v4-flash-0731-CFG](https://huggingface.co/deepseek-ai/DeepSeek-V4-Flash-0731/raw/7872f01b1d1fe23eabc4c98b48bffcef5a386062/config.json) [qwen3.8-flash-next-CARD](https://huggingface.co/Qwen/Qwen3.8-Flash-Next/raw/de4b8e4d43b917e7706784d8bb445c9af86a3540/README.md)

## Reading and implementation map

[Hardware](hardware/B300-8GPU.md) covers B300 identity, memory and topology. [Memory math](reports/memory-math.md) separates weights, token KV and recurrent state. [Precision and kernels](reports/precision-and-kernels.md) explains format versus execution. [Framework decisions](frameworks/DECISION.md), [vLLM source review](frameworks/vllm/SOURCE_REVIEW.md), [SGLang source review](frameworks/sglang/SOURCE_REVIEW.md) and [KServe architecture](frameworks/kserve/ARCHITECTURE.md) justify the runtime/control-plane split. [Nightly readiness](reports/nightly-readiness.md) tracks current source versus released binaries.

[Profiles](profiles/README.md) contain 34 launch experiments, including blocked/probe statuses rather than fake guarantees. [Benchmark protocol](benchmarks/PROTOCOL.md) defines fair comparisons. [Evidence](evidence/README.md) includes source IDs, upstream references and retrieval limitations.

```bash
python scripts/validate_repo.py
python -m unittest discover -s tests -v
python scripts/memory.py weights --parameters-b 2800 --format fp8
python scripts/preflight.py --output preflight.local.json
python scripts/launch.py --profile profiles/qwen3.8-27b.bf16.vllm.baseline.json
python scripts/clone_upstreams.py
python scripts/fetch_metadata.py --help
```

The last three commands are safe discovery/dry-run paths; neither weights nor external resources are created by default. Engine execution requires explicit gates and a locally pinned model. KServe rendering emits JSON only and requires an immutable image digest and existing model PVC. Installation, downloads and deployment are deliberate operator actions, not automatic side effects.

## Snapshot and validation

vLLM latest release retrieved: **0.31.0**, inspected source `f8460ef23659afd69046a81529ec2295e4c3f686`. SGLang latest release retrieved: **0.5.21**, inspected source `877be2974aa151a984e52822c028276c2b1e9303`. KServe latest release retrieved: **0.21.0**. These are release observations and retained source-inspection commits. Separately observed current main references and nightly index metadata are recorded in the evidence lock; no container image was tested. [VREL](https://github.com/vllm-project/vllm/releases/tag/v0.31.0) [VHEAD](https://github.com/vllm-project/vllm/commit/f8460ef23659afd69046a81529ec2295e4c3f686) [GREL](https://github.com/sgl-project/sglang/releases/tag/v0.5.21) [GHEAD](https://github.com/sgl-project/sglang/commit/877be2974aa151a984e52822c028276c2b1e9303) [KREL](https://github.com/kserve/kserve/releases/tag/v0.21.0)

See [VALIDATION](VALIDATION.md) for actual local test results and the [audit report](evidence/AUDIT-2026-10-15.md) for findings and coverage. No GPU serving results were measured. The original assembly's clone failures are retained as historical evidence; direct HTTPS retrieval and Git fetch succeeded during this audit. Selected immutable metadata and source files were rechecked. Complete upstream trees and model weight tensors are not bundled.

The primary reusable data are `catalog/models.json`, `catalog/profiles.json`, `evidence/sources.json` and `evidence/upstreams.lock.json`. Original authored material uses [LICENSE](LICENSE); upstream code, model weights and derivative checkpoints retain their own terms.

Regenerate the offline edition with `python3 scripts/build_atlas.py`; use `python3 scripts/build_atlas.py --check` to detect stale content. Embedded source hashes identify the Markdown used to build each article.
