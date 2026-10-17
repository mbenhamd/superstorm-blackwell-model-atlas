# Kimi K3: serving on 8×B300

**Status: unbenchmarked candidates, rechecked 2026-10-16 (UTC).** The upstream recipes document serving paths; none was run on this node.

## B300 / vLLM v0.31.0 priority (October 17)

Native MXFP4 TP8; one eight-GPU KServe model group. Compare external Inferact DSpark for latency; native TP8+EP/MegaMoE for batching.

NVIDIA mixed is integration-unqualified, not proven blocked by open PRs. Old publisher patch imports removed classes; do not apply unchanged. New latency_specialized decoder is outside v0.31. Native MegaMoE is not interchangeable with NVFP4 kernels. These are selected-source candidates inside mandatory KServe, with no engine execution or measured B300 winner. [RR-KD-VLLM-KIMI-MODEL](https://raw.githubusercontent.com/vllm-project/vllm/db9527a46873454610df6dbedf79a36d6bf1a7f6/vllm/models/kimi_k3/nvidia/model.py) [Q31-CAT-V031-VLLM-MODELS-KIMI-K3-NVIDIA-KDA-PY](https://raw.githubusercontent.com/vllm-project/vllm/db9527a46873454610df6dbedf79a36d6bf1a7f6/vllm/models/kimi_k3/nvidia/kda.py) [Q31-CAT-KIMI-NV-SITECUSTOMIZE-PY](https://huggingface.co/nvidia/Kimi-K3-NVFP4/raw/b2428a0b83a8b712ff2e1a8448a103d4175341f1/runtime_patches/sitecustomize.py) [Q31-CAT-KIMI-SPECIALIZED-COMPARE-JSON](https://api.github.com/repos/vllm-project/vllm/compare/v0.31.0...49cb2bbf71cfd36ee5aa33d1e184b1cddff55294)

## Engine and topology

Start with a single eight-GPU target. For native K3, compare SGLang TP8 at 64K context against vLLM’s model-specific recipe. For the NVIDIA derivative, prefer the SGLang mixed-format path as the initial compatibility candidate, with the FlashInfer TRT-LLM MoE runner required by its recipe. Its published DCP8 setup differs from the plain TP8 target-only control. The cookbook disables symmetric memory under DCP; choose a documented topology before combining flags.

Establish target-only correctness first. Then attach the engine-specific drafter: Inferact’s MLA-native DSpark is documented for vLLM, while the RadixArk drafter is documented in the SGLang path. Tokenizer, hidden-state feature selection, target revision, drafter revision, KV precision, and speculative state rollback are one compatibility unit.

The claim that K3 has no documented DSpark or DFlash pair is incorrect. The base config has no native MTP stack, but these **external** artifacts exist:

| Draft candidate | Immutable revision | Documented applicability |
| --- | --- | --- |
| `Inferact/Kimi-K3-DSpark` | `cf6b8244620e7ea4b0651d214f28e89eac75bed6` | vLLM DSpark; five MLA layers and target features `[2, 23, 47, 71, 89]` |
| `RadixArk/Kimi-K3-DSpark` | `3c5bac301d9cf392706189d82ed947feca6c2f0f` | SGLang DSpark; five full-attention layers and features `[7, 23, 51, 67, 83]`; NVIDIA also documents it with its mixed export |
| `modal-labs/Kimi-K3-DFlash` | `c192d15a43407bf758b5ae0880d5c72052fef1de` | SGLang with native K3; six sliding-attention layers and features `[19, 37, 54, 66, 78, 90]`; default recommendation is block 8 although config/example use 16 |

These are documented family pairings, not locally verified target/draft/build tuples. DFlash's card reports generic training data without tools or agent traces; that makes tool-heavy acceptance an open question. The cookbook limits its DFlash recipes to Blackwell without pipeline parallelism or DP attention. Its native-K3 example does not establish equal behavior on NVIDIA's different export. [Inferact config](https://huggingface.co/Inferact/Kimi-K3-DSpark/raw/cf6b8244620e7ea4b0651d214f28e89eac75bed6/config.json), [RadixArk config](https://huggingface.co/RadixArk/Kimi-K3-DSpark/raw/3c5bac301d9cf392706189d82ed947feca6c2f0f/config.json), [DFlash card](https://huggingface.co/modal-labs/Kimi-K3-DFlash/raw/c192d15a43407bf758b5ae0880d5c72052fef1de/README.md), [DFlash config](https://huggingface.co/modal-labs/Kimi-K3-DFlash/raw/c192d15a43407bf758b5ae0880d5c72052fef1de/config.json).

Compare separate target-only and DSpark runs with natural acceptance. The SGLang cookbook marks some B300 rows as verified and other layouts as extrapolations; its simulated-acceptance results are capacity/performance experiments, not observed application acceptance. The published Inferact peak figure is not a measurement of the target eight-B300 node, and its written hardware count and TP degree need clarification; see the [DSpark audit](dspark.md).

[kimi-k3-VR](https://recipes.vllm.ai/moonshotai/Kimi-K3) [kimi-k3-GR](https://docs.sglang.io/cookbook/autoregressive/Moonshotai/Kimi-K3) [kimi-k3-CARD](https://huggingface.co/moonshotai/Kimi-K3/blob/f831ab66814297da540d832a5235f8e904f29d06/README.md) [HW](https://docs.nvidia.com/dgx/dgxb300-user-guide/introduction-to-dgxb300.html)

NVIDIA also publishes a vLLM route using a bundled runtime patch. Its existence prevents a blanket claim that this derivative is unsupported by vLLM; it does not validate a generic unpatched vLLM launch. The [precision report](precision.md) records the patch and still-open upstream PRs.

## Keep the export and recipe together

| Publisher route | Required distinction |
| --- | --- |
| NVIDIA mixed export, vLLM | Bundled patch; `modelopt_mixed`; `flashinfer_trtllm`; TP8, FP8 KV, memory utilization 0.90, context 196,608 and maximum 32 sequences |
| NVIDIA mixed export, SGLang | `flashinfer_trtllm`; config selects mixed quantization without a CLI quantization override; published recipe uses TP8/DCP8 with external RadixArk DSpark block 7 |
| Native MXFP4, vLLM MegaMoE | Separate native-format path requiring expert parallelism and the model's SiTU constants; its backend is not interchangeable with the NVIDIA path |

The proposed NVIDIA launch with `--quantization modelopt`, `deep_gemm_mega_moe`, expert-parallel all-to-all and memory utilization 0.93 is not the publisher-validated combination. Likewise, `modelopt_fp4` plus EP8 does not reproduce the mixed-export SGLang recipe. SGLang's stable mixed-config dispatcher identifies `modelopt_mixed`; DCP8 splits the attention history and is a different choice from EP8. The mutable development image is a historical recipe identity, not a release or digest pin. [NVIDIA recipe](https://huggingface.co/nvidia/Kimi-K3-NVFP4/blob/b2428a0b83a8b712ff2e1a8448a103d4175341f1/README.md), [stable SGLang mixed dispatcher](https://raw.githubusercontent.com/sgl-project/sglang/e00930c5489053f26d86b179cee0d087f846acbb/python/sglang/srt/layers/quantization/modelopt_quant.py), [native vLLM caller](https://raw.githubusercontent.com/vllm-project/vllm/9a16d43ef0413b0a2a222e7f5baa4498c291ae5b/vllm/models/kimi_k3/nvidia/model.py).

NVIDIA reports `fastsafetensors` brought its validated 8×B300 startup **to about 18 minutes**. That does not mean an 18-minute reduction, faster token generation, or the same cold-download time on another storage system. [Publisher loading observation](https://huggingface.co/nvidia/Kimi-K3-NVFP4/blob/b2428a0b83a8b712ff2e1a8448a103d4175341f1/README.md).

## Scope of the published AgentX figures

InferenceX reports **4,051 total tokens/s/GPU at 100 tokens/s/user** and **6,083 at 50** for its August 16, 2026 B300 frontier. Its API identifies P90 interactivity, one eight-GPU node, TP8/DCP8, EP1 and concurrency 1–70; it labels the runs as Mooncake DRAM offload with a reported 2,249 GB host allocation. Requests have varying conversation lengths. [Publisher summary](https://inferencex.semianalysis.com/run/kimi-k3-on-b300), [rows and workload metrics](https://inferencex.semianalysis.com/api/v1/benchmarks?model=Kimi-K3), [chart scope](https://inferencex.semianalysis.com/api/v1/views/inference?model=Kimi-K3&gpus=b300&sequence=agentic&metric=tpPerGpu&best=false&allPoints=true).

The retrieved server log identifies **native MXFP4**, FlashInfer TRT-LLM MXFP4/MXFP8, `TOKENSPEED_MLA`, FP8 KV, a 1,048,576-token cap, and image build `5894fdf98`. Its Mooncake connector also prints `enable_offload=False`, which conflicts with the API's offload labels; the effective host-offload behavior remains unresolved. DSpark proposes seven tokens with **synthetic acceptance length 3.84**; target and tokenizer revisions are unset. This cannot qualify the NVIDIA export or natural draft acceptance. [Published server-log excerpt](https://inferencex.semianalysis.com/api/v1/server-log?id=439935&file=results%2Fserver.log&offset=0&limit=28000).

Throughput includes input plus output tokens, with extensive prefix reuse. For example, concurrency eight records 5,180 total but only **40.63 generated tokens/s/GPU**. The two headline thresholds are frontier values rather than raw concurrency rows. Dividing them by per-user output speed does not yield a concurrent-user count. These remain externally reported results, with no local reproduction or immutable target/build qualification. [Underlying metrics](https://inferencex.semianalysis.com/api/v1/benchmarks?model=Kimi-K3).

A generic native command containing only TP8, memory utilization `0.86` and a 131,072-token cap is a load hypothesis, not an evidence-backed stable recommendation. The cap and memory fraction are tuning choices. The selected build must execute KDA, gated MLA, Attention Residuals and SiTU with the checkpoint's `4.0/25.0` constants, and use the `kimi_k3` reasoning/tool parsers for chat. The current vLLM recipe pairs FP8 KV with an MLA prefill backend and `use_prefill_query_quantization`; its Blackwell route names `TOKENSPEED_MLA`. Changing those settings needs its own qualification. Latest stable vLLM 0.31.0 contains native K3 source, but this does not establish end-to-end NVIDIA mixed-export qualification; the old publisher patch cannot be assumed compatible with this release. [vLLM recipe](https://recipes.vllm.ai/moonshotai/Kimi-K3), [release source](https://raw.githubusercontent.com/vllm-project/vllm/db9527a46873454610df6dbedf79a36d6bf1a7f6/vllm/models/kimi_k3/nvidia/model.py).

## Optimization questions

Sweep target-only versus 3/5/7-token drafting on real coding and multi-turn agent prompts. Measure accepted tokens, total emitted tokens, draft overhead, target verification cost, state-pool ceiling, TTFT and p95 token latency. Compare context 16K/64K/128K before attempting 1M. Test cancellation and resumption with non-empty speculative state.

Start with one scored prompt at concurrency 1, a three-turn chat retaining the full assistant reasoning/tool messages, and a small executable coding task. Repeat cold, with prefix reuse, and after cancellation. Then compare native target-only against the mixed export and each matching drafter separately. Keep topology, effort and output budget fixed; a DCP/ReplaySSM/draft combination cannot isolate a draft-only gain. Record time to a correct final answer as well as token speed. These are experiment ideas for an external runner, not completed results.

For any external experiment, record the actual GPU memory, topology, model/draft revisions, image digest and effective backends before comparing results.

## Remaining uncertainty

Exact B300 SXM6-AC OEM topology; all-FP8 artifact availability; exact installed-image ancestry of mixed-format fixes; maximum safe long-context concurrency; native-versus-NVFP4 quality for the target tool/language distribution; actual DSpark acceptance for the target workload.
