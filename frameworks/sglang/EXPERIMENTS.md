# SGLang experiments for one 8×B300 node

**Planned experiments; no serving results.** Start with the [shared experiment roadmap](../../reports/EXPERIMENTS.md), [manifest template](../../benchmarks/experiment.template.json), [benchmark protocol](../../benchmarks/PROTOCOL.md), [hardware inventory](../../hardware/B300-8GPU.md) and [source review](SOURCE_REVIEW.md). These plans preserve the atlas's exact model revisions. A new recipe or successful import does not turn a compatibility probe into a validated profile.

## Common controls and decision gates

Retain checkpoint, tokenizer, template and optional drafter revisions; image platform/digest or wheel hash; SGLang source identity; CUDA, driver, PyTorch, FlashInfer and communication versions; environment variables; rendered arguments; effective backends; node inventory; payload hashes; and raw responses. Confirm the desired source change is included. The observed wheel, development container and current main have different source abbreviations. [GEXP-NIGHTLY-WHEELS](https://sgl-project.github.io/whl/cu130/sglang/), [GEXP-NIGHTLY-TAGS](https://hub.docker.com/v2/repositories/lmsysorg/sglang/tags?page_size=10&name=nightly&ordering=last_updated).

Predeclare quality thresholds, allowed regression margins, p95 TTFT/TPOT budgets and failure policy. Match real prompts, visual payload limits, reasoning mode, sampling and stop conditions. Sweep 4K/16K/32K inputs first, then longer inputs only after qualification. **Serialized input tokens, including template and visual tokens, plus the requested output budget must fit both the configured and model context limits.** A 32K input plus output does not fit a 32K context cap; skip that cell or qualify a larger cap separately. Include concurrency 1/8/32 where capacity permits and load immediately below saturation. Randomize order, repeat independent runs and retain failures and uncertainty.

Use successful request goodput at the declared quality/latency targets as the common decision metric. Also retain p50/p95/p99 TTFT, generation and end-to-end latency, output tokens per total wall time, error rate, per-rank HBM peaks and CPU memory. Network chunk spacing is not token timing unless individual emission timestamps are available. Reject faster treatments that fail quality or reliability.

Real target prefill and natural draft acceptance are required for service/quality results. Fake KV/prefill, simulated acceptance, dummy weights and truncated synthetic models belong in separately labeled mechanical probes. Single-batch timings are diagnostics: SGLang documents that one batch does not represent steady-state serving. [GEXP-BENCH](https://docs.sglang.io/docs/developer_guide/benchmark_and_profiling).

## Model coverage

| Model | First SGLang comparison | Follow-ups |
| --- | --- | --- |
| Kimi K3 | One TP8 target; native and NVIDIA mixed NVFP4 evaluated separately | G02/G03 state/reuse; G06 DSpark; G07 graphs |
| GLM 5.3 | FP8 TP8 compatibility probe | G05 dispatch; G08 topology; G03 reuse |
| GLM 5.3 Flash | FP8 TP4 target; then two isolated TP4 groups versus TP8 | G02 state; G06 MTP; G09 proposed 4+4 PD adaptation |
| DeepSeek V4 Flash 0731 | Documented four-GPU path, then separate qualification of the atlas's TP8 target-only adaptation | G06 bundled DSpark; G07 sparse prefill; G08 topology |
| Qwen 3.8 27B | TP1 BF16/FP8/NVIDIA mixed NVFP4 with KV dtype matched | G02/G04 state; G06 MTP; G08 eight replicas |
| Qwen 3.8 Flash Next | Exact NVIDIA TP1 compatibility probe | G05 mixed expert dispatch; G06/G07 NEXTN after target-only qualification |
| Gemma 4 31B IT | Exact RedHat NVFP4 TP1 compatibility probe | G05 export qualification; G08 replicas; conditional G10 |
| Mistral Medium 3.5 | Publisher FP8 TP8 compatibility probe | G07 interference; G08 narrower TP; parser/image checks |

These are choices, not eight measured support claims. The [profile index](../../profiles/INDEX.md) retains immutable identities and statuses. Preserve each model's encoding, modality, reasoning and tool constraints. DeepSeek's documented four-GPU run includes DSpark; removing speculation is a new target-only qualification step. [GEXP-DEEPSEEK](https://docs.sglang.io/cookbook/autoregressive/DeepSeek/DeepSeek-V4).

## G01 — Stable, dated nightly and pinned-main qualification

**Question and treatments.** Compare v0.5.21, one dated nightly with resolved provenance, and a build from `4e0609ea277d09393d752fcb79181e3416d94c56` when the patch under study postdates that nightly. Keep the checkpoint and effective settings fixed. If dependencies or defaults necessarily change, report a whole-build comparison; isolate individual patches only through a separate controlled build pair.

**Measurements and gate.** Record load/capture time, model class, module quantization methods, attention/MoE/cache backends, effective weight/KV/state dtypes and startup pool capacities. Pass target-only quality, streaming, stop/EOS, reasoning, tools and supported image checks before load testing. Reject unexplained fallback, missing scales, NaNs, invalid protocol, OOM or excess quality regression. Loading failure is a result; do not substitute a neighboring derivative. [GEXP-SRC-REG](https://raw.githubusercontent.com/sgl-project/sglang/4e0609ea277d09393d752fcb79181e3416d94c56/python/sglang/srt/models/registry.py).

## G02 — Recurrent-state and token-KV allocation

**Question and treatments.** Find the limiting pool for Qwen 27B, GLM Flash and Kimi. Begin without speculation. At fixed total memory reservation, compare the baseline split with lower/higher state allocations chosen from boot measurements. Use the build's documented `--mamba-full-memory-ratio` or `--max-mamba-cache-size`, recording which determines allocation. Fix active-state dtype, radix strategy, tracking interval and scheduler. Repeat feasible splits with speculation and ReplaySSM separately.

**Measurements and gate.** Retain token capacity, active/cached state slots, verify/replay allocation, effective request cap, retractions and component hit lengths. Do not transfer Qwen's slot formula to GLM or Flash Next's additional state. Exercise branching, partial hits, eviction, cancellation and speculative rejection. Reject state corruption, growing unreclaimed allocations or an unnoticed concurrency-cap change. Extra state is beneficial only if goodput improves without starving KV. [GEXP-QWEN](https://docs.sglang.io/cookbook/autoregressive/Qwen/Qwen3.8-27B), [GEXP-GLMFLASH](https://docs.sglang.io/cookbook/autoregressive/GLM/GLM-5.3-Flash), [GEXP-PR40517](https://github.com/sgl-project/sglang/pull/40517).

## G03 — Prefix reuse, core selection and HiCache pressure

**Question and treatments.** Compare GPU-only reuse, L1+L2, then L1+L2+L3 after backend provisioning. Use a no-reuse control and branching conversations whose prefixes cross measured device/host budgets. Within a compatible configuration, compare `SGLANG_UNIFIED_RADIX_TREE_CORE_BACKEND=python` and `rust`; the logged concrete core defines the treatment. Keep routing fixed so replicas receive equal reuse opportunities.

**Measurements and gate.** Separate cold, GPU-hit, host-hit and storage-hit runs. Record component hit lengths, recomputed tokens, eviction/retraction, CPU cost, transfer bytes/latency, host peak memory and storage I/O. Exercise splits, flushes, storage timeout and transfer cancellation. Reject contamination, incomplete hybrid-state restoration or leaks. If both selections resolve to Python, mark the core comparison inapplicable. Cross-instance reuse requires configured shared L3; L2 is instance-private. [GEXP-SRC-TREECORE](https://raw.githubusercontent.com/sgl-project/sglang/4e0609ea277d09393d752fcb79181e3416d94c56/python/sglang/srt/mem_cache/unified_cache/tree_core_registry.py), [GEXP-HICACHE](https://docs.sglang.io/docs/advanced_features/hicache_design).

## G04 — Int8 cached-state checkpoints

**Question and treatments.** Compare `--enable-int8-mamba-checkpoint` off/on on a compatible hybrid model. First fix cached-slot count to measure memory/conversion cost; then fix total cache memory to measure useful retained-prefix capacity. Keep active-state and KV dtypes unchanged. This is present in stable source and does not require the latest nightly.

**Measurements and gate.** Include scale/conv memory, restoration cost, TTFT and hit rate. Evaluate long continuations after one restore and repeated branch/store/restore cycles, including arithmetic, tools and distant recall. Compare with uncached and full-precision cached controls. Reject quality loss or pressure merely displaced into the active pool. The temporal store is lossy; approximate component-capacity claims do not predict total process memory or application quality. [GEXP-STABLE-MAMBA](https://raw.githubusercontent.com/sgl-project/sglang/e00930c5489053f26d86b179cee0d087f846acbb/python/sglang/srt/mem_cache/mamba_checkpoint_pool.py), [GEXP-SRC-MAMBA](https://raw.githubusercontent.com/sgl-project/sglang/4e0609ea277d09393d752fcb79181e3416d94c56/python/sglang/srt/mem_cache/mamba_checkpoint_pool.py).

## G05 — Export precision and kernel dispatch

**Question and treatments.** Compare Qwen 27B's three exact exports at fixed KV/state precision. Separately qualify mixed NVIDIA Kimi/Flash Next and the exact Gemma derivative. For a fixed export, compare only model/build-supported backends. GLM Flash's FP8-KV/TRT-LLM-DSA and BF16-KV/TileLang-DSA are **paired treatments**: their difference cannot be attributed solely to weight or cache precision.

**Measurements and gate.** Record loaded methods, scales/exclusions, actual kernels, load/repacking peaks, resident memory, prefill/decode cost and held-out quality. Cover low-load decode and large prefill batches. Check Flash Next main and MTP experts separately before speculation. Reject silent fallback/dequantization or wrong scaling even when text appears plausible. Unsupported combinations remain rejected cells, without forcing a quantization flag. [GEXP-PR38726](https://github.com/sgl-project/sglang/pull/38726), [GEXP-SRC-QUANT](https://raw.githubusercontent.com/sgl-project/sglang/4e0609ea277d09393d752fcb79181e3416d94c56/python/sglang/srt/layers/quantization/modelopt_quant.py), [GEXP-GLMFLASH](https://docs.sglang.io/cookbook/autoregressive/GLM/GLM-5.3-Flash).

## G06 — Natural MTP/DSpark acceptance and load crossover

**Question and treatments.** After G01, compare target-only with the existing Qwen 27B/GLM Flash MTP and Kimi DSpark profiles. Sweep only depths supported by the pinned recipe/build, holding MTP top-k at one. DeepSeek 0731 uses bundled DSpark rather than Kimi's external drafter. Fix target sampling, reasoning effort and topology; the atlas's plain Kimi target-only and DCP speculative profiles do not by themselves isolate speculation.

**Measurements and gate.** Record accepted/proposed draft tokens, verification calls, committed tokens, the bonus-token convention, draft/verify time, queueing and state memory. Separate coding, tools, short answers and long reasoning across feasible concurrency. Exercise rejection, cancellation and resumed prefixes. Reject state or protocol errors and quality regression. High acceptance alone does not establish lower total cost. Current GLM Flash speculative paths exclude DP-attention, so that combination is not a valid cell. [GEXP-KIMI](https://docs.sglang.io/cookbook/autoregressive/Moonshotai/Kimi-K3), [GEXP-DEEPSEEK](https://docs.sglang.io/cookbook/autoregressive/DeepSeek/DeepSeek-V4), [GEXP-GLMFLASH](https://docs.sglang.io/cookbook/autoregressive/GLM/GLM-5.3-Flash).

## G07 — Graph replay, input preparation and prefill interference

**Question and treatments.** Compare normal graph execution with the build's supported eager control, then vary chunked-prefill size at fixed concurrency/context. Resolve flags against that build: current docs expose per-phase graph controls, while older releases may differ. Test main-only Qwen NEXTN fusion after G05/G06. Trace whether DeepSeek 0731 executes the changed compressed-length helper. Kimi pipeline/dynamic-chunk profiling is a separate topology-qualified subcase after G08.

**Measurements and gate.** Interleave long incoming prompts and short decodes. Record capture time/memory, graph hits/fallbacks, CPU launch/synchronization cost, prefill duration and decode tail latency. Exercise batch transitions, padding, final partial chunks, supported custom positions/images and aborts. Reject replay/eager quality divergence outside tolerance, mapping overruns, profiling leaks or SLO failure. The Kimi patch's synthetic six-layer B200 check does not qualify full K3. [GEXP-ARGS](https://docs.sglang.io/docs/advanced_features/server_arguments), [GEXP-PR41175](https://github.com/sgl-project/sglang/pull/41175), [GEXP-PR43604](https://github.com/sgl-project/sglang/pull/43604), [GEXP-PR44557](https://github.com/sgl-project/sglang/pull/44557).

## G08 — Eight-GPU allocation and expert-routing correctness

**Question and treatments.** For qualified Qwen/Gemma paths compare eight TP1 replicas with four TP2 or two TP4 groups when supported. Compare GLM Flash two-TP4 versus TP8. Reduce Mistral TP only after real-weight capacity and correctness gates. Retain Kimi's eight-GPU target until a smaller complete group qualifies. Vary MoE EP/DP/TP only within documented combinations, recording attention/expert groups and actual GPU membership. EP can reuse another group and is not necessarily another multiplicative GPU dimension.

**Measurements and gate.** Compare total-node goodput, per-rank memory/expert load, collective time/bytes, routing imbalance and cache locality at equal offered load. Include unequal batches and skewed traffic. Regress main #40498's padding sentinel when local expert mapping is active; mark it inapplicable for a backend bypassing that mapping. Reject missing/double reductions, bad padding, rank hangs and layouts exceeding eight GPUs. [GEXP-SRC-EP](https://raw.githubusercontent.com/sgl-project/sglang/4e0609ea277d09393d752fcb79181e3416d94c56/python/sglang/srt/layers/moe/token_dispatcher/standard.py), [GEXP-PR40498](https://github.com/sgl-project/sglang/pull/40498).

## G09 — Four-plus-four prefill/decode separation

**Upstream baseline.** The cookbook's preview mechanically exercises **TP2 prefill + TP2 decode on four GB300 GPUs with dummy weights**. It uses NIXL transfer, BF16 KV, TileLang for both DSA phases and the Triton MoE runner. It provides no real-weight load or accuracy result. The Playground's Mooncake selection is a separate path, and the ordinary Blackwell `flashinfer_trtllm` MoE runner is explicitly untested under PD. [GEXP-GLMFLASH](https://docs.sglang.io/cookbook/autoregressive/GLM/GLM-5.3-Flash).

**Question and treatments.** The **TP4 prefill + TP4 decode layout is this atlas's proposed eight-GPU adaptation**. Qualify it with real weights using the preview's NIXL/BF16-KV/TileLang-DSA/Triton-MoE combination. Keep speculation and prefill CP disabled and the two roles at equal TP size. Give the roles distinct NCCL ports, match the router's prefill bootstrap port, and retain the documented single-node NIXL settings in both environments: `UCX_NET_DEVICES=lo` and `UCX_TLS=tcp,cuda_copy,cuda_ipc,self,sm`. Compare against two colocated TP4 replicas with the same KV/DSA/MoE settings to isolate disaggregation. Test alternate backends or Mooncake separately after qualification; compare TP8 colocated separately. Kimi with eight GPUs per role exceeds the node budget and cannot be relabeled 4+4 without new capacity/support evidence.

**Measurements and gate.** Sweep prompt/output mixture and arrival rate. Record transfer bytes/time, bootstrap latency, queues and idle time per role, HBM and client goodput. Cover prefix hits/misses, cancellation during transfer, role failure and subsequent requests. Validate every required state component/layout; use transfer checksums where supported. Reject stale/incomplete state, unbounded queues or worse whole-service goodput despite faster isolated decode. Dummy-weight checks cannot pass this gate. [GEXP-GLMFLASH](https://docs.sglang.io/cookbook/autoregressive/GLM/GLM-5.3-Flash), [GEXP-PD](https://docs.sglang.io/docs/advanced_features/pd_disaggregation).

## G10 — Main-only SWA tail backups

**Question and treatments.** After G03 qualifies an SWA component in `buffer_only` host mode, compare default off with `SGLANG_ENABLE_HICACHE_SWA_TAIL_ONLY_BACKUP=1` on a build containing #44173. Fix pool/storage settings and confirm the intended code path. Gemma's architectural sliding window alone does not prove support for this runtime/pool combination.

**Measurements and gate.** Cover short/long nodes, splits, internal-prefix hits and distinct window sizes. Retain bytes and operations per pool, prefetch stalls, recomputed tokens and TTFT. Force misses and interrupted writes, then compare continuations with an uncached reference. Reject false storage-hit beliefs, missing sidecars, wrong tails or quality loss. Adopt reduced I/O only when it improves the real workload. [GEXP-PR44173](https://github.com/sgl-project/sglang/pull/44173), [GEXP-SRC-SWA](https://raw.githubusercontent.com/sgl-project/sglang/4e0609ea277d09393d752fcb79181e3416d94c56/python/sglang/srt/mem_cache/buffer_mode/pipeline.py).

## G11 — Conditional Confidential Computing scheduler probe

**Question and treatments.** Inventory CC status first; mark inapplicable when absent. In an existing CC environment, compare a qualified pre-change build with one containing #36810 under the same CC mode/dependencies. Verify worker selection. Do not change the server's security mode as a performance treatment.

**Measurements and gate.** Trace result D2H copies, scheduler launch/idle intervals, queues and generation latency. Cover all ranks, logprobs if used, cancellation and copy failure. Check device ownership and error propagation instead of consumption of invalid host results. The implementation moves copying off the scheduling thread; it supplies no universal B300 speed claim. [GEXP-PR36810](https://github.com/sgl-project/sglang/pull/36810), [GEXP-SRC-CC](https://raw.githubusercontent.com/sgl-project/sglang/4e0609ea277d09393d752fcb79181e3416d94c56/python/sglang/srt/managers/async_d2h_copy_worker.py).

## G12 — Optional open-PR reasoning-history probe

**Question and treatments.** For an application using Anthropic Messages, compare a qualified baseline against an isolated build containing PR #40965's observed patch `9f9415c5072aaf89f3359c238649eac7bc85acc7`. Record base, patch and resulting build identities. Recheck status before execution: it was open at retrieval and is not an ordinary nightly feature.

**Measurements and gate.** With fixed Qwen template/history inspect rendered next-turn input for reasoning/content separation, thinking-only turns, ordinary text and tool responses. Then evaluate multi-turn quality and token budgets, retaining an equivalent OpenAI route as a reference if applicable. Reject duplicate/lost reasoning, malformed history and increased truncation. This is protocol correctness, with no serving-speed hypothesis. [GEXP-PR40965](https://github.com/sgl-project/sglang/pull/40965), [GEXP-PR40965-PATCH](https://github.com/sgl-project/sglang/pull/40965.patch).

## Interpreting results

Run G01 before optimization. Select follow-ups from measured constraints: G02/G04 for state pressure, G03/G10 for reuse/I/O, G05 for exports/kernels, G06/G07 for decode/scheduling, and G08/G09 for node allocation. G11/G12 require their stated environments. Test interactions only after individual treatments pass and record each combination separately. Update a profile's evidence only with actual qualified results; retain unsuccessful runs and exact provenance.
