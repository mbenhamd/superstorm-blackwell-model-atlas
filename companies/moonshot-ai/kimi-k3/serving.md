# Kimi K3: serving on 8×B300

**Status: unbenchmarked candidates, rechecked 2026-10-16 (UTC).** The upstream recipes document serving paths; none was run on this node.

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

Compare separate target-only and DSpark runs with natural acceptance. The SGLang cookbook marks some B300 rows as verified and other layouts as extrapolations; its simulated-acceptance results are capacity/performance experiments, not observed application acceptance. The published Inferact peak figure is not a measurement of your eight-B300 node, and its written hardware count and TP degree need clarification; see the [DSpark audit](dspark.md).

[kimi-k3-VR](https://recipes.vllm.ai/moonshotai/Kimi-K3) [kimi-k3-GR](https://docs.sglang.io/cookbook/autoregressive/Moonshotai/Kimi-K3) [kimi-k3-CARD](https://huggingface.co/moonshotai/Kimi-K3/blob/f831ab66814297da540d832a5235f8e904f29d06/README.md) [HW](https://docs.nvidia.com/dgx/dgxb300-user-guide/introduction-to-dgxb300.html)

NVIDIA also publishes a vLLM route using a bundled runtime patch. Its existence prevents a blanket claim that this derivative is unsupported by vLLM; it does not validate a generic unpatched vLLM launch. The [precision report](precision.md) records the patch and still-open upstream PRs.

A generic native command containing only TP8, memory utilization `0.86` and a 131,072-token cap is a load hypothesis, not an evidence-backed stable recommendation. The cap and memory fraction are tuning choices. The selected build must execute KDA, gated MLA, Attention Residuals and SiTU with the checkpoint's `4.0/25.0` constants, and use the `kimi_k3` reasoning/tool parsers for chat. The current vLLM recipe pairs FP8 KV with an MLA prefill backend and `use_prefill_query_quantization`; its Blackwell route names `TOKENSPEED_MLA`. Changing those settings needs its own qualification. Latest stable vLLM 0.31.0 contains native K3 source, but this does not discharge NVIDIA mixed-export patch requirements. [vLLM recipe](https://recipes.vllm.ai/moonshotai/Kimi-K3), [release source](https://raw.githubusercontent.com/vllm-project/vllm/db9527a46873454610df6dbedf79a36d6bf1a7f6/vllm/models/kimi_k3/nvidia/model.py).

## Optimization questions

Sweep target-only versus 3/5/7-token drafting on real coding and multi-turn agent prompts. Measure accepted tokens, total emitted tokens, draft overhead, target verification cost, state-pool ceiling, TTFT and p95 token latency. Compare context 16K/64K/128K before attempting 1M. Test cancellation and resumption with non-empty speculative state.

Start with one scored prompt at concurrency 1, a three-turn chat retaining the full assistant reasoning/tool messages, and a small executable coding task. Repeat cold, with prefix reuse, and after cancellation. Then compare native target-only against the mixed export and each matching drafter separately. Keep topology, effort and output budget fixed; a DCP/ReplaySSM/draft combination cannot isolate a draft-only gain. Record time to a correct final answer as well as token speed. These are experiment ideas for an external runner, not completed results.

For any external experiment, record the actual GPU memory, topology, model/draft revisions, image digest and effective backends before comparing results.

## Remaining uncertainty

Exact B300 SXM6-AC OEM topology; all-FP8 artifact availability; exact installed-image ancestry of mixed-format fixes; maximum safe long-context concurrency; native-versus-NVFP4 quality on your tools and languages; actual DSpark acceptance on your workload.
