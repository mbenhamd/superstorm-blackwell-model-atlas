# SGLang v0.5.22: B300 configuration and optimization review

**Reviewed October 19, 2026.** Compare release commit `baa9befa381511cd4d56f83980951e5a45fffc6d` with v0.5.21 `e00930c5489053f26d86b179cee0d087f846acbb`. The target is the existing eight-family catalog on one 8×B300 node, served through **mandatory KServe**. These are selected source findings and proposed experiments; no serving binary, model weights or GPU workload was executed. [S0522-RELEASE](https://api.github.com/repos/sgl-project/sglang/releases/tags/v0.5.22) [S0522-TAG-PEELED](https://api.github.com/repos/sgl-project/sglang/git/tags/35ce313293052f8362e0829e7512bc9bc3d336c9)

## What to prioritize

1. **Upgrade correctness and API compatibility first.** Recheck hybrid prefix state with speculation plus structured output, request cancellation, graph replay and tool/reasoning serialization.
2. **Exploit the model-specific changes.** Qwen Flash Next's QSA/NEXTN processing and GLM Flash's prefill graphs/DFlash are substantial leads. GLM flagship gains a DCP+MTP path with a material FP8 DCP8 caveat.
3. **Keep the eight-GPU resource budget fixed.** Compare replicas against wider model groups. Attention DP partitions work inside a TP group; it is distinct from independent model replicas.
4. **Separate weight, main KV, sparse-index and recurrent-state precision.** No release-wide instruction to force FP8 everywhere follows from these changes.
5. **Measure service results through KServe.** Engine decode throughput, time to visible answer, cache reuse, completed agent tasks and rollout readiness are different outcomes.

## Release, image and dependency identities

The release was published at **02:55:19 UTC on October 19**. Its annotated tag object is `35ce313293052f8362e0829e7512bc9bc3d336c9`; the peeled commit above is the source identity. Fresh upstream release checks also identify vLLM **v0.32.0** and KServe **v0.21.0**; these do not identify installed software. [S0522-RELEASE](https://api.github.com/repos/sgl-project/sglang/releases/tags/v0.5.22) [RR-GM-VLLM-RELEASE](https://api.github.com/repos/vllm-project/vllm/releases/latest) [ATTR-K-RELEASE](https://api.github.com/repos/kserve/kserve/releases/latest)

| Component | v0.5.22 source declaration | Consequence |
| --- | --- | --- |
| Python / container base | Python ≥3.11; Dockerfile defaults Python 3.12, CUDA 13.0.3, Ubuntu 24.04 | Qualify the complete image; an unconstrained install on Python 3.10 can resolve an older compatible release |
| PyTorch / Transformers / tokenizers | `2.14.1` / `5.19.0` / `0.23.2` | Repeat serialization, processor and extension compatibility checks |
| FlashInfer / CuTe DSL | `flashinfer_python[cu13]==0.7.1` / `nvidia-cutlass-dsl[cu13]==4.8.0` | Kernel behavior belongs to the resolved dependency artifact as well as SGLang |
| SGLang kernel / DeepGEMM / DeepEP | `0.4.9` / `0.2.2` / `0.1.2.post1` | Do not combine an old kernel environment with a new Python package and assume release equivalence |
| FlashAttention-4 | `>=4.0.0b18` | An open lower bound is not an immutable FA4 pin; record the actual installed package |
| InstantTensor | Optional extra, `>=0.1.9` | The new loader is not implied merely by installing the core package |

These are source declarations, not inspected container contents. [S0522-DEPS](https://raw.githubusercontent.com/sgl-project/sglang/baa9befa381511cd4d56f83980951e5a45fffc6d/python/pyproject.toml) [S0522-DOCKER](https://raw.githubusercontent.com/sgl-project/sglang/baa9befa381511cd4d56f83980951e5a45fffc6d/docker/Dockerfile)

`lmsysorg/sglang:v0.5.22` was inspected through registry metadata. The manifest bytes hash to the advertised index digest:

| Object | Digest |
| --- | --- |
| Multi-platform index | `sha256:e3a4f06001a29542fc4a8638536d9ffc5eb9c9942b08603c09b19a56eae4a1ae` |
| Linux amd64 manifest | `sha256:5fc09edb6a0bb1d5b6992b543723c66d08f86d7a507e951e87e0d05db4ac766e` |
| Linux arm64 manifest | `sha256:06441be3de19a816ddbac917535e920cbfc7fc43171abc08417394f43634ffb6` |

Choose the platform matching the actual host CPU. No layer or image configuration was inspected, and source provenance was not attested. [S0522-SGLANG-IMAGE](https://hub.docker.com/v2/repositories/lmsysorg/sglang/tags/v0.5.22) [S0522-IMAGE-INDEX](https://registry-1.docker.io/v2/lmsysorg/sglang/manifests/v0.5.22)

At 18:54 UTC, main was `678913a0f029394ad1f4ee64d1439421e9ea56ef`; the CUDA13 index advertised `0.5.23.dev20261019+g7f96dc6874` for CPython 3.12/Linux x86_64. Neither is the v0.5.22 release identity. The wheel was not downloaded, its advertised hash was not verified, and main was observed as metadata only. Prefer the release comparison first; qualify a development artifact separately for a specific missing fix. [RR-GM-SGLANG-MAIN](https://api.github.com/repos/sgl-project/sglang/commits/main) [GNIGHTLY-INDEX](https://sgl-project.github.io/whl/cu130/sglang/)

## Argument semantics and migration

### Topology: replicas, attention DP and EP

Use `--attn-dp-size N` for attention DP. `--dp-size N` now identifies **independent model replicas**. The legacy `--dp-size N --enable-dp-attention` is translated with a warning. Final code rejects simultaneous replica DP >1 and attention DP >1; contrary to the release-note wording, the deprecated boolean alongside an already explicit attention-DP size can be cleared rather than rejected. Use only the new spelling. The special legacy DeepSeek CP migration warns about future rejection after December 31; this release does not implement a date-enforced cutoff. [S0522-R-PARALLEL](https://raw.githubusercontent.com/sgl-project/sglang/baa9befa381511cd4d56f83980951e5a45fffc6d/python/sglang/srt/arg_groups/parallel_hook.py) [S0522-R-MODEL-BASE](https://raw.githubusercontent.com/sgl-project/sglang/baa9befa381511cd4d56f83980951e5a45fffc6d/python/sglang/srt/arg_groups/model_override_base.py)

For PP1, subject to model support and divisibility:

| Configuration | GPU accounting / meaning |
| --- | --- |
| `--tp-size 1 --dp-size 8` | Eight independent one-GPU model replicas |
| `--tp-size 4 --dp-size 2` | Two independent four-GPU replicas; eight GPUs total |
| `--tp-size 8 --attn-dp-size 8 --ep-size 8` | One eight-rank group; attention TP1 and expert TP1; no multiplication to 64 GPUs |
| Attention TP width | `TP / (attention_DP × attention_CP)` |
| MoE TP width | `TP / (EP × MoE_DP)` |
| Ordinary replica GPU count | `replica_DP × TP × PP`; DCP is not an additional GPU multiplier |

These equations establish group sizes, not model eligibility. Under attention DP, the implementation divides the prefill chunk budget by its width and multiplies scheduling conservativeness by 0.3. Explicit running-request limits are also divided per attention-DP worker and capped by available state slots. Log effective per-worker values; identical CLI numbers can describe different workloads. [S0522-R-TOPOLOGY](https://raw.githubusercontent.com/sgl-project/sglang/baa9befa381511cd4d56f83980951e5a45fffc6d/python/sglang/srt/runtime_context.py) [S0522-R-PARALLEL](https://raw.githubusercontent.com/sgl-project/sglang/baa9befa381511cd4d56f83980951e5a45fffc6d/python/sglang/srt/arg_groups/parallel_hook.py) [S0522-R-STATEPOOL](https://raw.githubusercontent.com/sgl-project/sglang/baa9befa381511cd4d56f83980951e5a45fffc6d/python/sglang/srt/mem_cache/kv_cache_configurator.py)

### Migration and correctness changes

| Change | Action |
| --- | --- |
| Hybrid speculative decoding + grammar-truncated output could select an unwritten recurrent checkpoint | Recheck cached continuation across state-track boundaries. The fix calculates the retained committed length; it matters to actual GDN/KDA speculative/structured-output paths |
| `tc_piecewise` / `tc_compiler` graph controls removed | Reconcile phase-specific `--cuda-graph-backend-prefill` and `--cuda-graph-backend-decode`; use only eligible `disabled`, `breakable`, `full` settings |
| Decode capture cap follows max running requests when not explicitly supplied | Match effective graph buckets across releases before attributing memory or latency gains |
| `ChunkCache` removed; disabled reuse uses applicable unified/pure-SWA cache | Include disabled-cache, streaming-session and beam-search compatibility cases where used; release notes document narrower supported cache factories |
| DSpark `FAST_SAMPLING`, `FOLDED_SAMPLING`, `OPT_FUSED_GREEDY_MARKOV` variables retired | Remove stale no-op tuning. Final `SGLANG_DSPARK_FOLDED_PROPOSAL` and opt-in `SGLANG_DSPARK_USE_GREEDY_DRAFT` are different controls |
| Host-receive threshold encoding flips | `--disaggregation-decode-host-receive-threshold 1` disables, `0` always receives on host. Current help reports no built-in backend supports it; qualify any custom integration |
| Chat/API output changes | Absent `tool_calls` is omitted; streaming `created` stays constant; DeepSeek `tool_choice:"none"` excludes tool schemas. Recheck actual client parsing |

Sources: [S0522-R-GRAMMAR](https://raw.githubusercontent.com/sgl-project/sglang/baa9befa381511cd4d56f83980951e5a45fffc6d/python/sglang/srt/managers/scheduler_components/batch_result_processor.py) [S0522-R-GRAPH](https://raw.githubusercontent.com/sgl-project/sglang/baa9befa381511cd4d56f83980951e5a45fffc6d/python/sglang/srt/arg_groups/cuda_graph_hook.py) [S0522-R-MEMORY](https://raw.githubusercontent.com/sgl-project/sglang/baa9befa381511cd4d56f83980951e5a45fffc6d/python/sglang/srt/arg_groups/memory_hook.py) [S0522-S-ENV](https://raw.githubusercontent.com/sgl-project/sglang/baa9befa381511cd4d56f83980951e5a45fffc6d/python/sglang/srt/environ.py) [S0522-R-PD-FIELDS](https://raw.githubusercontent.com/sgl-project/sglang/baa9befa381511cd4d56f83980951e5a45fffc6d/python/sglang/srt/arg_groups/fields/disagg.py) [S0522-R-PROTOCOL](https://raw.githubusercontent.com/sgl-project/sglang/baa9befa381511cd4d56f83980951e5a45fffc6d/python/sglang/srt/entrypoints/openai/protocol.py) [S0522-RELEASE](https://api.github.com/repos/sgl-project/sglang/releases/tags/v0.5.22)

Prefill graph auto-selection is conditional. GLM Flash becomes eligible for the default breakable path; Kimi KDA and DeepSeek V4 retain automatic restrictions. Explicitly forcing a graph mode bypasses parts of auto-selection and does not establish compatibility. Treat startup time, graph scratch and capture coverage as part of the result. [S0522-R-GRAPH](https://raw.githubusercontent.com/sgl-project/sglang/baa9befa381511cd4d56f83980951e5a45fffc6d/python/sglang/srt/arg_groups/cuda_graph_hook.py)

### Later experiments: state replay and CPU KV

**ReplaySSM is already in 0.5.21.** Decode replay uses `--enable-linear-replayssm`, a default ring length of 16 through `--linear-replayssm-cache-len`, and requires compatible linear backend, no PD and `--mamba-radix-cache-strategy no_buffer`. The field's actual cache strategy defaults to `auto`, so a help-string reference to a universal `no_buffer` default is misleading. Speculative replay uses the separate `--enable-linear-replayssm-spec`, has linear-chain/backend/model gates, and cannot combine with decode replay. Unspecified speculative SSM dtype becomes FP32; lowering it needs long-sequence quality validation. Replay records still occupy memory. [S0522-R-REPLAY](https://raw.githubusercontent.com/sgl-project/sglang/baa9befa381511cd4d56f83980951e5a45fffc6d/python/sglang/srt/arg_groups/attention_hook.py) [S0522-R-MAMBA](https://raw.githubusercontent.com/sgl-project/sglang/baa9befa381511cd4d56f83980951e5a45fffc6d/python/sglang/srt/arg_groups/mamba_hook.py) [S0522-R-OVERRIDES](https://raw.githubusercontent.com/sgl-project/sglang/baa9befa381511cd4d56f83980951e5a45fffc6d/python/sglang/srt/arg_groups/overrides.py) [S0522-R-STATEPOOL](https://raw.githubusercontent.com/sgl-project/sglang/baa9befa381511cd4d56f83980951e5a45fffc6d/python/sglang/srt/mem_cache/kv_cache_configurator.py)

**HiSparse now admits constrained EAGLE/MTP**, resolving contradictory entries in the release notes. Final validation requires an eligible DSA/V4/MiniMax sparse model, `--enable-hisparse --disable-radix-cache`, no mixed chunks, no adaptive speculation and `--speculative-eagle-topk 1`. DSA BF16 and FP8 cache routes have distinct allowed backends. This is not a Qwen27/Kimi universal memory option, and losing radix reuse can be costly for chat/agents. Compare only after measured history capacity pressure justifies CPU traffic. [S0522-R-HISPARSE](https://raw.githubusercontent.com/sgl-project/sglang/baa9befa381511cd4d56f83980951e5a45fffc6d/python/sglang/srt/arg_groups/hisparse_hook.py)

Health-generation requests now use a separate DP round-robin counter and avoid refreshing ordinary load budgets. PD abort acknowledgments wait for outstanding transfer drainage before releasing storage. These are useful lifecycle corrections, but do not prove readiness probes are free or that a KServe pod termination safely drains all client streams. [S0522-R-HEALTH](https://raw.githubusercontent.com/sgl-project/sglang/baa9befa381511cd4d56f83980951e5a45fffc6d/python/sglang/srt/managers/data_parallel_controller.py) [S0522-R-DRAIN](https://raw.githubusercontent.com/sgl-project/sglang/baa9befa381511cd4d56f83980951e5a45fffc6d/python/sglang/srt/disaggregation/common/conn.py)


## Common configuration controls

The [complete release-scoped argument reference](https://github.com/sgl-project/sglang/blob/baa9befa381511cd4d56f83980951e5a45fffc6d/docs/docs/advanced_features/server_arguments.mdx) is the full inventory. The following subset matters most for the catalog. Numeric ranges below are **proposed search values**, not engine defaults or measured optima.

| Control | Source behavior / meaning | First experiment |
| --- | --- | --- |
| `--model-path`, `--revision` | Target path and repository revision; omitted revision follows default branch | Use immutable staged target/tokenizer/processor files, and independently pin any drafter |
| `--dtype bfloat16` | Unquantized model/activation boundaries; does not undo checkpoint quantization | Hold constant while comparing complete FP8/NVFP4 exports; avoid blanket quantization overrides on mixed exports |
| `--context-length` | Service cap; unset follows model config | 32K for Qwen27/Gemma; 64K for large-model qualification; 128K+ as a separate capacity/quality step |
| `--mem-fraction-static` | Static allocation budget, including weights and cache; unset is resolved later | Start 0.88, or lower for large startup/state peaks; compare 0.90 only after worst-case memory is understood |
| `--max-running-requests` | Running request cap; unset resolves with runtime/model constraints | 16/32/64, then 128 if useful and feasible; measure queueing, retraction and state slots |
| `--max-queued-requests` | Queue cap; ignored in disaggregated mode | Set admission/backpressure deliberately with KServe routing and timeouts |
| `--chunked-prefill-size` | Maximum tokens per prefill chunk; `-1` disables chunking | 4096/8192/16384; off only where backend/graph constraints permit |
| `--max-prefill-tokens` | Field default 16384; documented effective bound also considers maximum context | Do not equate this to vLLM's total batched-token budget or assume it is a hard 16K prompt cap |
| `--schedule-policy` | Field default `fcfs`; `lpm` is available | FCFS vs longest-prefix-match with repeated sessions; check fairness and p95, not only cache hits |
| `--schedule-conservativeness` | Default 1.0; higher is more conservative | Raise only if recurrent retraction suggests admission is too aggressive |
| `--disable-radix-cache` | Reuse is enabled at the field default | Toggle for cache-control experiments; model hooks and special modes may constrain the effective setting |
| `--mamba-full-memory-ratio`, `--max-mamba-cache-size` | State/KV split and direct state-pool cap | Track resolved recurrent slots alongside KV pages; more KV can reduce useful hybrid concurrency |
| `--kv-cache-dtype` | `auto`, `bfloat16`/`bf16`, `fp8_e4m3`, `fp8_e5m2`, `mxfp8`, `nvfp4`, `fp4_mx_block16` are declared choices | Use model-specific compatible controls; bare `fp8` is not a declared choice. CLI presence does not establish every backend combination |
| `--qsa-indexer-dtype` | QSA compressed index cache/query dtype; separate from main KV | Flash Next only: `bfloat16` vs `fp8_e4m3`, target-only first |
| `--attention-backend`; split prefill/decode backend flags | Backend/layout/shape compatibility is model-specific | Follow the family table; do not apply ordinary FA4 to every DSA/QSA/KDA path |
| `--stream-interval` | Field default 1; buffers output tokens for streaming | 1 vs 4 only after GPU tuning; measure first useful visible token and tool-argument delivery |

The exact field definitions and resolution limits remain authoritative. FP8 KV scaling must be checked in the selected implementation/export; the CLI's scale-file help warns that missing scales can otherwise default to 1.0. This is not a direction to load an unrelated model's scale file. [S0522-MODEL-FIELDS](https://raw.githubusercontent.com/sgl-project/sglang/baa9befa381511cd4d56f83980951e5a45fffc6d/python/sglang/srt/arg_groups/fields/model.py) [S0522-SCHEDULE](https://raw.githubusercontent.com/sgl-project/sglang/baa9befa381511cd4d56f83980951e5a45fffc6d/python/sglang/srt/arg_groups/fields/schedule.py) [S0522-PARALLEL](https://raw.githubusercontent.com/sgl-project/sglang/baa9befa381511cd4d56f83980951e5a45fffc6d/python/sglang/srt/arg_groups/fields/parallel.py) [S0522-SERVING](https://raw.githubusercontent.com/sgl-project/sglang/baa9befa381511cd4d56f83980951e5a45fffc6d/python/sglang/srt/arg_groups/fields/serving.py)

### Backend and memory controls: applicability before sweeps

A parser choice is not a supported model/layout combination. Leave page size unset for the first family-specific configuration: its field defaults to `None`, and resolution may choose 64 for TRT-LLM MHA or compressed QSA, or 128 for ordinary non-MLA SM10x FA4. The final generic fallback of 1 is not a B300-wide recommendation. [S0522-R-OVERRIDES](https://raw.githubusercontent.com/sgl-project/sglang/baa9befa381511cd4d56f83980951e5a45fffc6d/python/sglang/srt/arg_groups/overrides.py) [S0522-Q-Q4-OVERRIDE](https://raw.githubusercontent.com/sgl-project/sglang/baa9befa381511cd4d56f83980951e5a45fffc6d/python/sglang/srt/arg_groups/model_overrides/qwen4_exp.py)

| Control | v0.5.22 interpretation on B300 | Useful comparison |
| --- | --- | --- |
| `--fp8-gemm-backend` | Ordinary block-FP8 and MXFP8 have separate dispatchers. `flashinfer_cutedsl` is accepted by the MXFP8 dense route but has no branch in the ordinary block-FP8 dispatcher, which raises an error | For a compatible block-FP8 layer, compare resolved `auto` with `deep_gemm`, `flashinfer_trtllm` or `flashinfer_cutlass`; inspect the actual dispatch. Auto prioritizes available DeepGEMM |
| `--fp4-gemm-backend` | B300's eligible dense NVFP4 auto path selects CuTe DSL; forcing TRT-LLM can require different weight preparation | Compare eligible `auto`, `flashinfer_cutedsl`, `flashinfer_cudnn` and `flashinfer_cutlass` after confirming the exact export route |
| `--bf16-gemm-backend` | Auto selects CuTe DSL on SM100/103, except deterministic inference selects Torch; explicit CuTe DSL plus deterministic inference rejects. `gemv` is Hopper-only | Compare actual unquantized BF16 layers with Torch while holding determinism constant; this does not select the MoE backend |
| `--hicache-size` | Explicit size overrides the ratio and bypasses automatic host-memory-fraction sizing | Budget host RAM across all KServe pods, PLE tables and other consumers; do not assume each pod receives a safe node-wide budget |
| `--radix-eviction-policy` | `lru`, `lfu`, `slru`, `priority`, `tlru`; TLRU needs additional validated threshold configuration | Start with LRU versus LFU/SLRU under demonstrated eviction pressure, holding routing and working set fixed |

Sources: [S0522-F-FP8](https://raw.githubusercontent.com/sgl-project/sglang/baa9befa381511cd4d56f83980951e5a45fffc6d/python/sglang/srt/layers/quantization/fp8_utils.py) [S0522-F-FP4](https://raw.githubusercontent.com/sgl-project/sglang/baa9befa381511cd4d56f83980951e5a45fffc6d/python/sglang/srt/layers/quantization/fp4_utils.py) [S0522-F-BF16](https://raw.githubusercontent.com/sgl-project/sglang/baa9befa381511cd4d56f83980951e5a45fffc6d/python/sglang/srt/layers/quantization/unquant.py) [S0522-F-MEMORY](https://raw.githubusercontent.com/sgl-project/sglang/baa9befa381511cd4d56f83980951e5a45fffc6d/python/sglang/srt/arg_groups/fields/memory.py)

Speculation controls also need their resolved algorithm. Adaptive speculation supports constrained EAGLE/EAGLE3 top-k1 paths; unsupported combinations can warn and fall back to static settings. `--speculative-draft-window-size` has no effect on DSpark. The built-in EAGLE/MTP draft-decode window is ignored when the draft already has native sliding-window attention; DFlash consumes its window separately. Gemma's resolved frozen-KV algorithm still excludes block verification. Record effective settings so an ignored option is not mistaken for a measured ablation. [S0522-F-ADAPTIVE](https://raw.githubusercontent.com/sgl-project/sglang/baa9befa381511cd4d56f83980951e5a45fffc6d/python/sglang/srt/speculative/adaptive_spec_params.py) [S0522-K-SPEC-ARGS](https://raw.githubusercontent.com/sgl-project/sglang/baa9befa381511cd4d56f83980951e5a45fffc6d/python/sglang/srt/arg_groups/fields/spec.py) [S0522-Q-SPEC-HOOK](https://raw.githubusercontent.com/sgl-project/sglang/baa9befa381511cd4d56f83980951e5a45fffc6d/python/sglang/srt/arg_groups/speculative_hook.py)

For MoE, CuTe DSL NVFP4 plus DeepEP resolves `auto` to `low_latency` and rejects explicit `normal`; DeepEP normal disables both graph phases. `--moe-dense-tp-size` accepts unset, 1 or TP, not any arbitrary smaller value. Treat overlap, communication, quantization and graph settings as a supported combination. `--num-reserved-decode-tokens` belongs to the disaggregated decode preallocation queue, so it is not a general colocated-service headroom knob. [S0522-F-SCHEDULER](https://raw.githubusercontent.com/sgl-project/sglang/baa9befa381511cd4d56f83980951e5a45fffc6d/python/sglang/srt/managers/scheduler.py) [S0522-S-MOE](https://raw.githubusercontent.com/sgl-project/sglang/baa9befa381511cd4d56f83980951e5a45fffc6d/python/sglang/srt/arg_groups/moe_hook.py) [S0522-F-VALIDATION](https://raw.githubusercontent.com/sgl-project/sglang/baa9befa381511cd4d56f83980951e5a45fffc6d/python/sglang/srt/arg_groups/validation_hook.py) [S0522-R-PD-FIELDS](https://raw.githubusercontent.com/sgl-project/sglang/baa9befa381511cd4d56f83980951e5a45fffc6d/python/sglang/srt/arg_groups/fields/disagg.py)

### Engine-process skeleton inside a KServe workload

This is a **composition template**, not a complete model recipe or Kubernetes manifest. Supply the architecture-specific additions below and an immutable model snapshot; inspect the resolved backend, page size, cache dtype and state pools in the selected image. Do not copy vLLM-only switches such as `--enable-prefix-caching`, `--gpu-memory-utilization`, `--max-num-seqs` or `--attention-config.indexer_kv_dtype` into SGLang.

```bash
python3 -m sglang.launch_server \
  --model-path "${IMMUTABLE_MODEL_SNAPSHOT}" \
  --served-model-name "${SERVICE_MODEL_NAME}" \
  --tp-size "${TP}" \
  --dtype bfloat16 \
  --context-length "${QUALIFIED_CONTEXT}" \
  --mem-fraction-static 0.88 \
  --max-running-requests 32 \
  --chunked-prefill-size 8192 \
  --enable-metrics \
  --host 0.0.0.0 --port 8000
```

The metrics switch is declared in the release [observability fields](https://raw.githubusercontent.com/sgl-project/sglang/baa9befa381511cd4d56f83980951e5a45fffc6d/python/sglang/srt/arg_groups/fields/observability.py). Do not add a draft or force quantization/backend/page settings until the target-only recipe is understood. Mixed formats, recurrent layers and sparse attention make a generic complete command misleading.

## Model-by-model implications and arguments

| Family | First useful experiment in 0.5.22 | Primary constraint |
| --- | --- | --- |
| Qwen3.8-27B | TP1, explicit BF16 KV control, then FP8 KV and MTP | Hybrid state/grammar correctness; ordinary FA4 FP8 prefill remains constrained |
| Qwen3.8 Flash Next | TP4+EP4, QSA indexer BF16 vs FP8, then NEXTN/MTP | Indexer precision is separate; full-stack Qwen CP port is absent from this release |
| Gemma4-31B | TP1 target-only, text vs image backend controls; separate pinned assistant | Default TRT-LLM image-token attention is causal; assistant resolves to its own frozen-KV algorithm |
| GLM5.3 | TP8 target-only DCP1→2→4; native MTP separately | FP8 DCP8 reaches reported 64-head sparse-kernel corruption |
| GLM5.3 Flash | TP4, BCG/KDA phase controls; native MTP then external DFlash | Flash prefill CP disables BCG; flagship DCP does not transfer |
| DeepSeek V4 Flash0731 | Exact native TP4 bundled DSpark; then replica comparison | V4.1 headlines and NVIDIA-export DSpark are not 0731 native qualification |
| Kimi K3 | TP8, Triton vs FlashInfer KDA prefill; then pinned DSpark | Native MXFP4 and mixed NVIDIA NVFP4 use distinct runner contracts |
| Mistral Medium3.5 | Publisher TP8 control, target-only vs EAGLE, then narrower TP probes | Native draft serialization and vision processing need exact-version checks |

### Qwen3.8-27B

Use TP1 first, then compare eight TP1 KServe replicas with narrower counts of wider groups. The public architecture maps to the Qwen3.5-family implementation; QSA/EP optimizations do not apply to this dense model. Hold target/export, BF16 KV and FP32 recurrent state constant for the release A/B. A source-derived control fragment is:

```bash
--tp-size 1 --dtype bfloat16 \
--attention-backend trtllm_mha --kv-cache-dtype bfloat16 \
--mamba-ssm-dtype float32 --mamba-radix-cache-strategy extra_buffer_lazy \
--linear-attn-prefill-backend flashinfer --linear-attn-decode-backend triton
```

The exact NVIDIA mixed export resolves to `modelopt_mixed`; avoid forcing uniform `modelopt_fp4`. Compare official FP8 and NVIDIA mixed weights with identical KV/state first. Then independently change main KV to `fp8_e4m3`. A BF16-state/FlashInfer GDN decode arm changes a different numerical component and needs its own quality comparison. `extra_buffer_lazy` rejects PD; the explicit strategy above applies to the collocated service. [S0522-Q-Q35-OVERRIDE](https://raw.githubusercontent.com/sgl-project/sglang/baa9befa381511cd4d56f83980951e5a45fffc6d/python/sglang/srt/arg_groups/model_overrides/qwen3_5.py) [S0522-Q-MODEL-CONFIG](https://raw.githubusercontent.com/sgl-project/sglang/baa9befa381511cd4d56f83980951e5a45fffc6d/python/sglang/srt/configs/model_config.py) [S0522-Q-Q35-RECIPES](https://raw.githubusercontent.com/sgl-project/sglang/baa9befa381511cd4d56f83980951e5a45fffc6d/docs/src/snippets/configs/Qwen/qwen3.8-27b.jsx) [S0522-R-MAMBA](https://raw.githubusercontent.com/sgl-project/sglang/baa9befa381511cd4d56f83980951e5a45fffc6d/python/sglang/srt/arg_groups/mamba_hook.py)

Native MTP fragment: `--speculative-algorithm NEXTN --speculative-num-steps 3 --speculative-eagle-topk 1 --speculative-num-draft-tokens 4 --linear-attn-verify-backend triton`. NEXTN normalizes to EAGLE for this bundled draft; three steps/one branch/four verification tokens does not guarantee four accepted output tokens. Compare off and 1/2/3 steps with a corresponding valid verification budget. [S0522-Q-SPEC-HOOK](https://raw.githubusercontent.com/sgl-project/sglang/baa9befa381511cd4d56f83980951e5a45fffc6d/python/sglang/srt/arg_groups/speculative_hook.py)

Release changes include auxiliary capture/overlap fixes for external EAGLE3/DFLASH paths, stage-boundary changes and the shared grammar/state correction. The packed-verification extension hook does not establish an active built-in backend; the inspected source has a capability consumer but no built-in opt-in. Native MTP implementation is largely unchanged. [S0522-Q-Q35-MODEL](https://raw.githubusercontent.com/sgl-project/sglang/baa9befa381511cd4d56f83980951e5a45fffc6d/python/sglang/srt/models/qwen3_5.py) [S0522-R-GRAMMAR](https://raw.githubusercontent.com/sgl-project/sglang/baa9befa381511cd4d56f83980951e5a45fffc6d/python/sglang/srt/managers/scheduler_components/batch_result_processor.py)

**FA4 remains an implementation probe here, even with BF16 KV.** SGLang's ordinary paged wrapper passes used-cache lengths, while the SM10x dedicated hd256 kernel rejects `seqused_q/seqused_k`, split KV, descales and other features. The non-MLA SM10x FA4 path also forces page128. The atlas's vLLM FA4 comparison cannot be copied into SGLang as established support. [S0522-Q-FA4-WRAPPER](https://raw.githubusercontent.com/sgl-project/sglang/baa9befa381511cd4d56f83980951e5a45fffc6d/python/sglang/kernels/ops/attention/flash_attention_v4.py) [S0522-Q-FA4-HD256](https://raw.githubusercontent.com/sgl-project/sglang/baa9befa381511cd4d56f83980951e5a45fffc6d/python/sglang/kernels/ops/attention/flash_attn/cute/sm100_hd256_2cta_fmha_forward.py)

The additional [output-head precision experiment](../companies/alibaba-qwen/qwen3.8-27b/precision.md#sglang-0522-isolate-output-head-precision) compares separately pinned RadixArk NVFP4 exports with FP4 versus BF16 heads. Keep KV dtype explicit and establish matching body/input provenance before attributing a result to the head.

### Qwen3.8 Flash Next

Start official FP8 **TP4+EP4**, BF16 KV and FP32 GDN state, then compare two independent four-GPU groups on this node. New work includes fused QSA preparation/block expansion, context-bounded index scoring, NEXTN replay metadata/input preparation, text-only breakable prefill graphs and preservation of QSA/PLE side state across HiCache. [S0522-Q-QSA-INDEXER](https://raw.githubusercontent.com/sgl-project/sglang/baa9befa381511cd4d56f83980951e5a45fffc6d/python/sglang/srt/layers/attention/qsa/qsa_indexer.py) [S0522-Q-QSA-BACKEND](https://raw.githubusercontent.com/sgl-project/sglang/baa9befa381511cd4d56f83980951e5a45fffc6d/python/sglang/srt/layers/attention/qwen_sparse_attn_backend.py) [S0522-Q-Q4-MODEL](https://raw.githubusercontent.com/sgl-project/sglang/baa9befa381511cd4d56f83980951e5a45fffc6d/python/sglang/srt/models/qwen4_exp.py) [S0522-Q-QSA-HOST](https://raw.githubusercontent.com/sgl-project/sglang/baa9befa381511cd4d56f83980951e5a45fffc6d/python/sglang/srt/mem_cache/pool_host/qsa.py)

The high-value first delta is **`--qsa-indexer-dtype bfloat16` vs `fp8_e4m3`**, target-only, holding main KV fixed. Auto remains BF16. FP8 affects compressed index K and index Q scoring; the pending ring remains BF16 and main KV is unchanged. The PR's B300 evidence covers official FP8 TP4+EP4 target-only accuracy, explicitly excludes MTP validation and supplies no speed result. Then test main KV FP8 independently; only afterward combine the FP8 indexer with NEXTN steps3/topk1/draft4. [S0522-Q-QSA-DTYPE](https://raw.githubusercontent.com/sgl-project/sglang/baa9befa381511cd4d56f83980951e5a45fffc6d/python/sglang/srt/mem_cache/qsa_kv_pool.py) [S0522-Q-INDEXER-PR](https://api.github.com/repos/sgl-project/sglang/pulls/39614) [S0522-Q-Q4-OVERRIDE](https://raw.githubusercontent.com/sgl-project/sglang/baa9befa381511cd4d56f83980951e5a45fffc6d/python/sglang/srt/arg_groups/model_overrides/qwen4_exp.py) [S0522-Q-SPEC-HOOK](https://raw.githubusercontent.com/sgl-project/sglang/baa9befa381511cd4d56f83980951e5a45fffc6d/python/sglang/srt/arg_groups/speculative_hook.py)

Compressed QSA requires page64. Compare text-only `--cuda-graph-backend-prefill disabled` vs `breakable`, stressing changing prefix/request shapes and MTP replay. PLE host offload is its own capacity/NUMA/transfer tradeoff; explicit `--no-ple-offload-embedding` provides the GPU-resident control. HiCache must be tested through eviction/reload of QSA, PLE and recurrent state together. [S0522-Q-Q4-OVERRIDE](https://raw.githubusercontent.com/sgl-project/sglang/baa9befa381511cd4d56f83980951e5a45fffc6d/python/sglang/srt/arg_groups/model_overrides/qwen4_exp.py) [S0522-Q-Q4-RECIPES](https://raw.githubusercontent.com/sgl-project/sglang/baa9befa381511cd4d56f83980951e5a45fffc6d/docs/src/snippets/configs/Qwen/qwen3.8-flash-next.jsx) [S0522-Q-QSA-HOST](https://raw.githubusercontent.com/sgl-project/sglang/baa9befa381511cd4d56f83980951e5a45fffc6d/python/sglang/srt/mem_cache/pool_host/qsa.py)

The headline **242→271 tokens/s** concerns four B200 with **BF16 weights/KV/indexer, TP4/EP1, FP32 GDN, GPU PLE, concurrency1 and no speculation**. The guarded fusion also excludes attention-DP, LoRA and two-batch overlap and requires CustomAllReduceV2. It does not establish a 12% FP8/NVFP4/MTP gain on B300. [S0522-Q-Q4-BF16](https://raw.githubusercontent.com/sgl-project/sglang/baa9befa381511cd4d56f83980951e5a45fffc6d/python/sglang/srt/layers/moe/qwen4_decode.py) [S0522-Q-BF16-PR](https://api.github.com/repos/sgl-project/sglang/pulls/42175)

**Do not configure Flash Next prefill CP as release-supported.** The complete Qwen CP model port is on main but not an ancestor of this release; the release's collocated CP registry names GLM Flash only. QSA kernels alone do not establish full integration. NVIDIA TP1 on B300 also remains a compatibility probe: its recipe says `verified:false`; a distinct GB300 recipe's verification label refers to an older build and substantial host cache/PLE allocation. [S0522-S-GLM-CP](https://raw.githubusercontent.com/sgl-project/sglang/baa9befa381511cd4d56f83980951e5a45fffc6d/python/sglang/srt/arg_groups/cp_tp_group_sharing_hook.py) [S0522-Q-CP-ANCESTRY](https://api.github.com/repos/sgl-project/sglang/compare/0d130f191574c3dbb7d402caf344084e91ded585...baa9befa381511cd4d56f83980951e5a45fffc6d?per_page=1) [S0522-Q-Q4-RECIPES](https://raw.githubusercontent.com/sgl-project/sglang/baa9befa381511cd4d56f83980951e5a45fffc6d/docs/src/snippets/configs/Qwen/qwen3.8-flash-next.jsx)

### Gemma4-31B IT

Start **TP1, target-only, Triton attention, BF16 KV** with the base quality anchor, then separately qualify Red Hat FP8-block and NVFP4 exports. For text-only traffic, compare `--attention-backend triton` and `trtllm_mha` at fixed export/cache. On SM10x, the existing automatic choice is TRT-LLM MHA; the cookbook warns its image-token attention is causal and recommends Triton for image quality. Image and text results must stay separate. [S0522-Q-GEMMA-OVERRIDE](https://raw.githubusercontent.com/sgl-project/sglang/baa9befa381511cd4d56f83980951e5a45fffc6d/python/sglang/srt/arg_groups/model_overrides/gemma4.py) [S0522-Q-GEMMA-RECIPE](https://raw.githubusercontent.com/sgl-project/sglang/baa9befa381511cd4d56f83980951e5a45fffc6d/docs/cookbook/autoregressive/Google/Gemma4.mdx)

The new FA4 hd512/image-mask work is **SM90/H200 evidence**. Gemma also has local hd256 layers, whose dedicated SM10x FA4 kernel rejects local attention and image-mask callbacks. Do not treat this release as a B300 FA4 recommendation for Gemma. [S0522-Q-GEMMA-FA4-PR](https://api.github.com/repos/sgl-project/sglang/pulls/42019) [S0522-Q-FA4-HD256](https://raw.githubusercontent.com/sgl-project/sglang/baa9befa381511cd4d56f83980951e5a45fffc6d/python/sglang/kernels/ops/attention/flash_attn/cute/sm100_hd256_2cta_fmha_forward.py)

There is an exact separate assistant experiment for the BF16 target, using `google/gemma-4-31B-it-assistant@627c5ec1458b9086b841a91e0512fd31fd2fbbf1`:

```bash
--speculative-algorithm NEXTN \
--speculative-draft-model-path "${IMMUTABLE_GEMMA_ASSISTANT_SNAPSHOT}" \
--speculative-num-steps 5 --speculative-eagle-topk 1 \
--speculative-num-draft-tokens 6
```

The engine resolves this assistant to **`FROZEN_KV_MTP`**. EAGLE3 and the new `--speculative-use-block-verification` are rejected for this route. Assistant support predates this release; the new work changes stage/embedding placement. Upstream tests use TP2/Triton, so TP1 B300 and quantized-target combinations each require qualification. Include local/global cache occupancy, image grounding, tool continuation and cancellation. [S0522-Q-SPEC-HOOK](https://raw.githubusercontent.com/sgl-project/sglang/baa9befa381511cd4d56f83980951e5a45fffc6d/python/sglang/srt/arg_groups/speculative_hook.py) [S0522-Q-GEMMA-MODEL](https://raw.githubusercontent.com/sgl-project/sglang/baa9befa381511cd4d56f83980951e5a45fffc6d/python/sglang/srt/models/gemma4_causal.py) [S0522-Q-GEMMA-RECIPE](https://raw.githubusercontent.com/sgl-project/sglang/baa9befa381511cd4d56f83980951e5a45fffc6d/docs/cookbook/autoregressive/Google/Gemma4.mdx)

### GLM5.3 flagship

The new DSA DCP implementation stripes target latent KV while index keys and draft KV remain replicated. It widens allocation metadata and reuses sparse top-k remapping. The available memory gain is therefore smaller than dividing every history/state byte by DCP. First keep official FP8, TP8, DCP1 and no draft; then test this **DCP2 fragment**, followed by DCP4 if correctness and memory pass:

```bash
--tp-size 8 --dcp-size 2 \
--dsa-prefill-backend trtllm --dsa-decode-backend trtllm \
--kv-cache-dtype fp8_e4m3
```

Native MTP is a separate delta, with SGLang's triplet:

```bash
--speculative-algorithm EAGLE \
--speculative-num-steps 5 --speculative-eagle-topk 1 \
--speculative-num-draft-tokens 6
```

This selects the bundled next-token path; no external EAGLE model is implied. DCP requires the supported Blackwell TRT-LLM sparse route and compatible attention-TP divisibility. It excludes prefill CP, HiSparse, HiCache, PD, unified memory, pooled index keys and tree drafting. `--dcp-comm-backend a2a`, `fi_a2a` and `ag_rs` are later communication comparisons; auto can choose the FlashInfer path in a supported Blackwell MNNVL domain. Query-projection replication trades redundant work/weights for less communication. [S0522-S-DCP](https://raw.githubusercontent.com/sgl-project/sglang/baa9befa381511cd4d56f83980951e5a45fffc6d/python/sglang/srt/layers/attention/dsa/dsa_dcp.py) [S0522-S-DSA-OVERRIDE](https://raw.githubusercontent.com/sgl-project/sglang/baa9befa381511cd4d56f83980951e5a45fffc6d/python/sglang/srt/arg_groups/model_overrides/deepseek_v2.py) [S0522-S-DCP-DOC](https://raw.githubusercontent.com/sgl-project/sglang/baa9befa381511cd4d56f83980951e5a45fffc6d/docs/docs/advanced_features/dcp.mdx)

**Do not use FP8 DCP8 as the initial candidate.** Open FlashInfer issue #6389 reports B300 sparse MLA corruption for FP8 Q/KV with 64 query heads, short partially filled KV and sufficiently many rows. At TP8, DCP8 gathers 64 heads; DCP2/4 gather 16/32. The inspected release chunks rows but does not split heads. The issue's BF16 and split-32 controls are useful diagnostic candidates, not a production guarantee. Its author expects the same affected kernel artifact in 0.7.1; an open issue plus inspected call path is a qualification risk, not a locally reproduced result. [S0522-S-FI6389](https://api.github.com/repos/flashinfer-ai/flashinfer/issues/6389) [S0522-S-PR43735](https://api.github.com/repos/sgl-project/sglang/pulls/43735) [S0522-S-DCP](https://raw.githubusercontent.com/sgl-project/sglang/baa9befa381511cd4d56f83980951e5a45fffc6d/python/sglang/srt/layers/attention/dsa/dsa_dcp.py)

**DeepEP v2 is another separate experiment.** The flagship is newly registered; use a compatible FP8/BF16 target, `--moe-a2a-backend deepep_v2 --deepep-v2-mode direct --moe-runner-backend deep_gemm`, with EP/group dimensions explicitly specified. The path rejects NVFP4/FP4 experts, disables prefill graphs/shared-expert fusion and rejects overlap modes. Its dispatch budget defaults to 128 tokens/rank through `SGLANG_DEEPEP_V2_NUM_MAX_DISPATCH_TOKENS_PER_RANK`; tune only with buffer/memory accounting. A draft cannot simply inherit this A2A backend. Start target-only. [S0522-S-MOE](https://raw.githubusercontent.com/sgl-project/sglang/baa9befa381511cd4d56f83980951e5a45fffc6d/python/sglang/srt/arg_groups/moe_hook.py) [S0522-S-MOE-REGISTRY](https://raw.githubusercontent.com/sgl-project/sglang/baa9befa381511cd4d56f83980951e5a45fffc6d/python/sglang/srt/configs/moe_model_registry.py) [S0522-S-MOE-QUANT](https://raw.githubusercontent.com/sgl-project/sglang/baa9befa381511cd4d56f83980951e5a45fffc6d/python/sglang/srt/layers/moe/fused_moe_triton/layer.py) [S0522-S-ENV](https://raw.githubusercontent.com/sgl-project/sglang/baa9befa381511cd4d56f83980951e5a45fffc6d/python/sglang/srt/environ.py)

The release cookbook's **experimental NVFP4** label refers to `RadixArk/GLM-5.3-NVFP4` and its unfilled benchmark cells. It is not a shared qualification status for NVIDIA, Red Hat and Inferact exports. Compare their own precision metadata, published evidence and runtime contracts. [S0522-F-GLM-COOKBOOK](https://raw.githubusercontent.com/sgl-project/sglang/baa9befa381511cd4d56f83980951e5a45fffc6d/docs/cookbook/autoregressive/GLM/GLM-5.3.mdx)

### GLM5.3 Flash

Three actual changes justify separate comparisons:

- Breakable prefill graphs become eligible by default; old GLM-specific 4096-token pins are removed. Compare `--cuda-graph-backend-prefill disabled` vs `breakable` at fixed chunk/capture limits.
- Eligible safe-gate KDA prefill automatically selects FlashInfer on SM100/103. Compare explicit `--linear-attn-prefill-backend triton` vs `flashinfer`.
- Speculative KDA verification defaults to `nv_cutedsl` on the eligible SM100-class path. Compare `--linear-attn-verify-backend triton` vs `nv_cutedsl`; the latter requires its BF16 input, FP32 state/conv, head128/conv4/linear-chain shape contract, with fallbacks outside it.

These defaults can change both memory and latency with an unchanged command. Retain exact artifact/state dtype and inspect effective dispatch. Native MTP uses the same EAGLE steps5/topk1/draft6 triplet above. [S0522-R-GRAPH](https://raw.githubusercontent.com/sgl-project/sglang/baa9befa381511cd4d56f83980951e5a45fffc6d/python/sglang/srt/arg_groups/cuda_graph_hook.py) [S0522-S-KDA](https://raw.githubusercontent.com/sgl-project/sglang/baa9befa381511cd4d56f83980951e5a45fffc6d/python/sglang/srt/layers/attention/linear/kda_backend.py) [S0522-S-GLM-SPEC-DEFAULT](https://raw.githubusercontent.com/sgl-project/sglang/baa9befa381511cd4d56f83980951e5a45fffc6d/python/sglang/srt/arg_groups/glm5_next_hook.py)

**Long unique prefill:** with TP4, investigate `--enable-prefill-cp --cp-strategy interleave --attn-cp-size 4 --ep-size 1 --moe-dense-tp-size 4`. This shards attention/index work while KDA/MoE retain TP and KDA needs sequence gathering. CP must equal TP; it excludes DCP, mixed chunks, PD and external DFlash, and **forces prefill graphs off**. Native MTP with topk1 is allowed. Compare CP and BCG as separate arms. Flagship DCP is rejected here because this model's pooled index keys have `index_kpool=4`. [S0522-S-GLM-CP](https://raw.githubusercontent.com/sgl-project/sglang/baa9befa381511cd4d56f83980951e5a45fffc6d/python/sglang/srt/arg_groups/cp_tp_group_sharing_hook.py) [S0522-S-DSA-OVERRIDE](https://raw.githubusercontent.com/sgl-project/sglang/baa9befa381511cd4d56f83980951e5a45fffc6d/python/sglang/srt/arg_groups/model_overrides/deepseek_v2.py) [S0522-S-GLM-CP-TEST](https://raw.githubusercontent.com/sgl-project/sglang/baa9befa381511cd4d56f83980951e5a45fffc6d/test/registered/cp/test_glm53_flash_cp.py)

**DFlash artifact terms:** the pinned `incoai/GLM-5.3-Flash-DFlash2` card declares **CC-BY-NC-ND-4.0**, describes research/evaluation use and points to separate commercial licensing. The target's MIT license does not apply automatically to this draft. This provenance was missing from the initial upgrade review and is now recorded in the catalog and lock. [S0522-S-DFLASH-CARD](https://huggingface.co/incoai/GLM-5.3-Flash-DFlash2/raw/bf582e4eacc1810f76656d1811693ff6c6737d2a/README.md)

**DFlash:** upstream PR #42489 reports 1091.85→1199.72 decode tokens/s for TP8 on 8×B300, concurrency1, 8192 input/1024 output, greedy sampling and six paired requests. It uses separate `incoai/GLM-5.3-Flash-DFlash2@bf582e4eacc1810f76656d1811693ff6c6737d2a`, block8, BF16 draft, FA4 draft attention, Triton verify, radix disabled and tightly bounded graph/token pools. Its target revision differs from the retained atlas target; matching config/index bytes do not prove identical weights. This supports a narrow DFlash experiment, not a 10% native-MTP or concurrent-service gain. [S0522-S-PR42489](https://api.github.com/repos/sgl-project/sglang/pulls/42489) [S0522-S-DFLASH-GIST](https://api.github.com/gists/f373c375a5ee9abe2089c6c648deb4d4) [S0522-S-DFLASH-CFG](https://huggingface.co/incoai/GLM-5.3-Flash-DFlash2/raw/bf582e4eacc1810f76656d1811693ff6c6737d2a/config.json)

After a target-only control, the draft fragment is `--speculative-algorithm DFLASH --speculative-draft-model-path <immutable-draft-snapshot> --speculative-dflash-block-size 8 --speculative-draft-model-quantization unquant --speculative-draft-attention-backend fa4 --speculative-draft-kv-cache-dtype bfloat16`. Keep this distinct from native MTP and prefill CP. Compare two independent TP4 KServe groups against one TP8 group at the same eight-GPU budget.

### DeepSeek V4 Flash0731

Use the exact July-31 model and encoder. The release cookbook contains a native **TP4 + `--moe-runner-backend flashinfer_mxfp4` + bundled `DSPARK`** route; compare target-only before drafting. `--speculative-dspark-block-size 5` means five proposals/six verify positions, matching this draft config. The cookbook uses `--swa-full-tokens-ratio 0.1`; treat it as a model-specific pool choice and measure actual SWA/long-history pressure. With attention DP and a MoE draft, attention TP must be one (`--attn-dp-size` equal to TP). [S0522-S-DSV4-RECIPE](https://raw.githubusercontent.com/sgl-project/sglang/baa9befa381511cd4d56f83980951e5a45fffc6d/docs/src/snippets/configs/deepseek-ai/deepseek-v4.jsx) [S0522-S-DSPARK-WORKER](https://raw.githubusercontent.com/sgl-project/sglang/baa9befa381511cd4d56f83980951e5a45fffc6d/python/sglang/srt/speculative/dspark_components/dspark_worker_v2.py)

NVIDIA's retained NVFP4 card explicitly says DSpark was **not exercised** in its export validation; the newer TP4+DSpark cookbook cell is marked in progress. Keep that combination an export compatibility probe. A native MXFP4 result does not qualify the NVIDIA derivative. [deepseek-v4-flash-0731-NV-CARD](https://huggingface.co/nvidia/DeepSeek-V4-Flash-0731-NVFP4/raw/f1caa71142bd0be02f728c79f75042ac1e461579/README.md) [S0522-S-DSV4-RECIPE](https://raw.githubusercontent.com/sgl-project/sglang/baa9befa381511cd4d56f83980951e5a45fffc6d/docs/src/snippets/configs/deepseek-ai/deepseek-v4.jsx)

The new interleave-CP/breakable-graph path can be investigated with `--enable-prefill-cp --cp-strategy interleave --attn-cp-size <TP> --cuda-graph-backend-prefill breakable`, PP1 and explicit bounded capture shapes. Default BCG remains disabled for V4 memory pressure; the PR states final GPU end-to-end validation was pending. This is a long-prefill integration probe. [S0522-S-CP-BCG](https://raw.githubusercontent.com/sgl-project/sglang/baa9befa381511cd4d56f83980951e5a45fffc6d/python/sglang/srt/layers/cp/bcg.py) [S0522-R-GRAPH](https://raw.githubusercontent.com/sgl-project/sglang/baa9befa381511cd4d56f83980951e5a45fffc6d/python/sglang/srt/arg_groups/cuda_graph_hook.py) [S0522-S-PR38603](https://api.github.com/repos/sgl-project/sglang/pulls/38603)

Final DSpark controls are `SGLANG_DSPARK_USE_GREEDY_DRAFT=0` by default and `SGLANG_DSPARK_FOLDED_PROPOSAL=1` by default. Test each independently with fixed target sampling and natural acceptance. The retired `FOLDED_SAMPLING=AUTO/FORCE` knob should not appear in new configurations. Draft graph capture can be disabled when less than 1 GB remains after target initialization. V4.1 throughput, Markov-head and bounded-replay headlines do not establish gains on 0731. [S0522-S-ENV](https://raw.githubusercontent.com/sgl-project/sglang/baa9befa381511cd4d56f83980951e5a45fffc6d/python/sglang/srt/environ.py) [S0522-S-DSPARK-WORKER](https://raw.githubusercontent.com/sgl-project/sglang/baa9befa381511cd4d56f83980951e5a45fffc6d/python/sglang/srt/speculative/dspark_components/dspark_worker_v2.py)

### Kimi K3

Keep native MXFP4 TP8 as the first target-only control. Its automatic runner is `flashinfer_mxfp4`; NVIDIA's mixed NVFP4/FP8 artifact retains a distinct explicit `--moe-runner-backend flashinfer_trtllm` contract. No all-FP8 Kimi artifact is established. Generic MegaMoE/layout changes do not qualify a new mixed-export combination. [kimi-k3-CFG](https://huggingface.co/moonshotai/Kimi-K3/raw/f831ab66814297da540d832a5235f8e904f29d06/config.json) [S0522-K-NV-CARD](https://huggingface.co/nvidia/Kimi-K3-NVFP4/raw/b2428a0b83a8b712ff2e1a8448a103d4175341f1/README.md) [S0522-K-KIMI-OVERRIDES](https://raw.githubusercontent.com/sgl-project/sglang/baa9befa381511cd4d56f83980951e5a45fffc6d/python/sglang/srt/arg_groups/model_overrides/kimi_k3.py) [S0522-K-MODELOPT](https://raw.githubusercontent.com/sgl-project/sglang/baa9befa381511cd4d56f83980951e5a45fffc6d/python/sglang/srt/layers/quantization/modelopt_quant.py)

The most useful new B300 comparison is **Triton vs FlashInfer KDA prefill**, using `--linear-attn-prefill-backend`. FlashInfer's new checkpoint path requires bounded gates, supported shapes and a positive checkpoint interval divisible by32; two-batch overlap and FULL prefill graphs are excluded. Compare long-prompt TTFT and resumed-prefix correctness. SM103 PTX KDA existed before this release; the new PTX hardware expansion is SM100. [S0522-S-KDA](https://raw.githubusercontent.com/sgl-project/sglang/baa9befa381511cd4d56f83980951e5a45fffc6d/python/sglang/srt/layers/attention/linear/kda_backend.py) [S0522-K-KDA-FI](https://raw.githubusercontent.com/sgl-project/sglang/baa9befa381511cd4d56f83980951e5a45fffc6d/python/sglang/srt/layers/attention/linear/kernels/kda_flashinfer_prefill.py) [S0522-K-KDA-PTX](https://raw.githubusercontent.com/sgl-project/sglang/baa9befa381511cd4d56f83980951e5a45fffc6d/python/sglang/srt/layers/attention/linear/kernels/kda_ptx.py)

After target-only qualification, attach **`RadixArk/Kimi-K3-DSpark@3c5bac301d9cf392706189d82ed947feca6c2f0f`** through an immutable draft snapshot and `--speculative-algorithm DSPARK`. Sweep `--speculative-dspark-block-size 3`, 5, 7; block7 means eight verify positions. DCP1/2/4/8 is an existing separate experiment, not new support; DCP+DSpark requires `SGLANG_RAGGED_VERIFY_MODE=static`. Existing hooks choose model-specific MLA/KDA routes and disable symmetric memory under DCP. Do not apply GLM's DSA DCP8 issue indiscriminately to Kimi's different MLA implementation. [kimi-k3-DRAFT-SG-CFG](https://huggingface.co/RadixArk/Kimi-K3-DSpark/raw/3c5bac301d9cf392706189d82ed947feca6c2f0f/config.json) [S0522-K-KIMI-HOOK](https://raw.githubusercontent.com/sgl-project/sglang/baa9befa381511cd4d56f83980951e5a45fffc6d/python/sglang/srt/arg_groups/kimi_k3_hook.py) [S0522-K-KIMI-OVERRIDES](https://raw.githubusercontent.com/sgl-project/sglang/baa9befa381511cd4d56f83980951e5a45fffc6d/python/sglang/srt/arg_groups/model_overrides/kimi_k3.py) [S0522-K-SPEC-ARGS](https://raw.githubusercontent.com/sgl-project/sglang/baa9befa381511cd4d56f83980951e5a45fffc6d/python/sglang/srt/arg_groups/fields/spec.py)

Validate scale-preserving quantized front-buffer handling, shared-expert sharding under alternate groups, uncommitted DSpark slot masking and grammar/prefix resume. The KDA head-width fix does not change the inspected K3 dimensions because both old/new config values are128. Responses/Messages now retain inline system-instruction positions for Kimi; include mid-history instructions and tool results in the actual KServe API test. [S0522-K-MODEL](https://raw.githubusercontent.com/sgl-project/sglang/baa9befa381511cd4d56f83980951e5a45fffc6d/python/sglang/srt/models/kimi_k3.py) [S0522-K-DSPARK-KV](https://raw.githubusercontent.com/sgl-project/sglang/baa9befa381511cd4d56f83980951e5a45fffc6d/python/sglang/srt/speculative/dspark_components/dspark_kv_inject.py) [S0522-R-GRAMMAR](https://raw.githubusercontent.com/sgl-project/sglang/baa9befa381511cd4d56f83980951e5a45fffc6d/python/sglang/srt/managers/scheduler_components/batch_result_processor.py) [S0522-K-CHAT-ENCODING](https://raw.githubusercontent.com/sgl-project/sglang/baa9befa381511cd4d56f83980951e5a45fffc6d/python/sglang/srt/entrypoints/openai/chat_encoding.py) [S0522-K-RESPONSES](https://raw.githubusercontent.com/sgl-project/sglang/baa9befa381511cd4d56f83980951e5a45fffc6d/python/sglang/srt/entrypoints/openai/serving_responses.py) [S0522-K-MESSAGES](https://raw.githubusercontent.com/sgl-project/sglang/baa9befa381511cd4d56f83980951e5a45fffc6d/python/sglang/srt/entrypoints/anthropic/serving.py)

### Mistral Medium3.5

SGLang remains a compatibility candidate against the existing publisher-oriented vLLM reference. EAGLE already existed in0.5.21. Start with publisher TP8, target-only, conservative context/admission, then its exact separate EAGLE artifact. Preserve `--dtype bfloat16 --tool-call-parser mistral --reasoning-parser mistral`; the BF16 boundary does not dequantize all stored FP8 weights. The EAGLE delta is:

```bash
--speculative-algorithm EAGLE \
--speculative-draft-model-path "${IMMUTABLE_MISTRAL_EAGLE_SNAPSHOT}" \
--speculative-num-steps 3 --speculative-eagle-topk 1 \
--speculative-num-draft-tokens 4
```

The draft pin is `d31694b0f55b51d4d962b5c3dbf0e03d1f019275`, distinct from target `22b2b868a15677cfa6061277ed2f653d1349a9ab`. Native draft serialization, alternative target layouts and tokenizer files must remain intact. Explore TP1/2/4 only after weight, full-history KV, draft and vision workspace capacity checks. [mistral-medium-3.5-EAGLE-CARD](https://huggingface.co/mistralai/Mistral-Medium-3.5-128B-EAGLE/raw/d31694b0f55b51d4d962b5c3dbf0e03d1f019275/README.md) [mistral-medium-3.5-EAGLE-PARAMS](https://huggingface.co/mistralai/Mistral-Medium-3.5-128B-EAGLE/raw/d31694b0f55b51d4d962b5c3dbf0e03d1f019275/params.json) [mistral-medium-3.5-CFG](https://huggingface.co/mistralai/Mistral-Medium-3.5-128B/raw/22b2b868a15677cfa6061277ed2f653d1349a9ab/config.json)

Release changes include EAGLE shared decoder/residual boundaries, Pixtral rotary embedding API and axial image positions, and cached native-format detection after Hub lookup failure. Test non-square/multiple images, native draft restart from complete staged files, tool streams and reasoning effort through KServe. Cached-format detection does not fetch missing files offline. No model-specific speedup follows from these source changes. [S0522-K-MISTRAL-EAGLE](https://raw.githubusercontent.com/sgl-project/sglang/baa9befa381511cd4d56f83980951e5a45fffc6d/python/sglang/srt/models/mistral_eagle.py) [S0522-K-PIXTRAL](https://raw.githubusercontent.com/sgl-project/sglang/baa9befa381511cd4d56f83980951e5a45fffc6d/python/sglang/srt/models/pixtral.py) [S0522-K-FORMAT](https://raw.githubusercontent.com/sgl-project/sglang/baa9befa381511cd4d56f83980951e5a45fffc6d/python/sglang/srt/arg_groups/model_path_hook.py)


## Additional B300 mechanisms worth measuring

### SM103 sampling softmax

v0.5.22 can dispatch the probability-softmax operation to FlashInfer's Cake implementation for **compute capability exactly 10.3**, contiguous CUDA FP32 2-D logits, batch rows **1–64**, vocabulary **128256–262144**, vocabulary divisible by eight, and an available Cake module. The ordinary sampler's deterministic mode uses Torch softmax instead. This is a sampling operation, not FA4 attention or an across-the-board B300 speed multiplier. [S0522-CAKE](https://raw.githubusercontent.com/sgl-project/sglang/baa9befa381511cd4d56f83980951e5a45fffc6d/python/sglang/kernels/cake_kernels/sampling.py) [S0522-SAMPLING](https://raw.githubusercontent.com/sgl-project/sglang/baa9befa381511cd4d56f83980951e5a45fffc6d/python/sglang/kernels/ops/sampling/__init__.py) [S0522-SAMPLER](https://raw.githubusercontent.com/sgl-project/sglang/baa9befa381511cd4d56f83980951e5a45fffc6d/python/sglang/srt/layers/sampler.py)

Use natural sampled outputs and record whether this path actually runs. A greedy-only or deterministic test can miss the optimization. Compare small-batch decode and sampling cost without changing temperature/top-k/top-p; retain a separate deterministic correctness control. No extra general-purpose launch flag is required by the inspected dispatcher.

### InstantTensor and readiness

`--load-format instanttensor` selects the new loader for **Safetensors** and the PyTorch CUDA device interface. It requires the optional package, accepts loader-specific configuration, uses distributed process groups and copies loaded tensors into engine-owned weights. Its communicator can retain memory during serving. Native Mistral-format loading is a separate path; do not force this format for every model. [S0522-LOAD](https://raw.githubusercontent.com/sgl-project/sglang/baa9befa381511cd4d56f83980951e5a45fffc6d/python/sglang/srt/model_loader/weight_utils.py) [S0522-LOADER](https://raw.githubusercontent.com/sgl-project/sglang/baa9befa381511cd4d56f83980951e5a45fffc6d/python/sglang/srt/model_loader/loader.py) [S0522-LOAD-DOC](https://raw.githubusercontent.com/sgl-project/sglang/baa9befa381511cd4d56f83980951e5a45fffc6d/docs/docs/advanced_features/model_loading.mdx)

Compare `auto`/the existing qualified loader against InstantTensor with the **same local staged bytes and storage-cache state**. Measure weight-read time, peak host/HBM, retained communicator memory, repacking, graph capture and KServe-ready time separately. The release's “10× faster” headline does not establish a 10× reduction in full service startup. This is especially valuable for Kimi/GLM restarts, if their actual export route selects this iterator. [S0522-RELEASE](https://api.github.com/repos/sgl-project/sglang/releases/tags/v0.5.22)

## Recommended experiment order

These are experiment definitions for the separate execution repository. Retain the same target/export/draft revisions, tokenized requests, sampling/reasoning policy, modality, KServe routing and GPU allocation within each release comparison. The first A/B is **0.5.21 vs 0.5.22 with explicit matched effective settings**; the second allows the new defaults. A changed default is an experimental variable.

| Stage | Comparison | Required observations / rejection condition |
| --- | --- | --- |
| 1. Correctness | Target-only; then cache reuse; then exact draft; then grammar/tools | Branch/edit/cancel/retry, prefix eviction, state/page boundaries, graph/eager consistency, tool JSON and reasoning retention. Reject stale-state/cross-request contamination or invalid tools |
| 2. Placement | Narrow feasible TP vs wider TP; replicas at fixed eight GPUs | Per-rank HBM after load/capture, actual EP/attention-DP/DCP groups, usable state slots, TTFT/TPOT. Weight-only fit is insufficient |
| 3. Precision | Complete FP8 vs NVFP4 export; then main KV; then indexer | Matched tokenization, quality, actual memory and resolved kernels. Keep recurrent and draft precision explicit |
| 4. Speculation | Off vs supported shallow/medium proposal depth | Natural accepted length, proposed/accepted tokens, target verify time, draft time/HBM, output latency and whole-task success |
| 5. Scheduling / graphs | Chunk size, running cap, FCFS/LPM, eligible graph mode | Queue time, p95/p99 visible latency, retraction, graph memory/capture cost and throughput at fixed latency target |
| 6. Platform operation | KServe restart/drain, routing affinity, readiness, stream cancellation | Full ready time, failed/duplicated requests, lost cache locality, parser/API behavior, sustained session goodput |

### Three workload regimes

| Workload | Initial coverage | Primary outcome |
| --- | --- | --- |
| Unique prompt | Inputs 1K/8K/32K; outputs 128/2K; concurrency 1/8/32. Add 128K only to qualified configurations | TTFT, first useful answer token, TPOT/ITL, output tokens/s, end-to-end p95 |
| Growing chat | 8/32/64 sessions, repeated tool/system prefixes, edits/branches, idle gaps, eviction and cancellation | Turn-level p95, reused tokens, state-pool pressure, resume time and successful turns/node-hour |
| Coding agents | Same repository/task harness, tools, reasoning and output budgets; concurrency 1/4/16 then feasible saturation | Resolved tasks/node-hour, wall time, tool failure/retry count; inference and tool execution time separated |

Use both open-loop arrivals and closed-loop concurrency when finding capacity. Warm graph/kernel runs and cold startup are separate populations. At least repeated runs with variability are needed before calling small differences meaningful. Count **generated output**, newly processed input and reused cached input separately; cache-inclusive throughput is not decode speed. Traffic replay can compare system behavior, while task-solving success requires actual agent episodes.

For long context, repeat retrieval and tool correctness after precision changes. For speculative tests use real language/code and natural acceptance; synthetic forced acceptance is a kernel diagnostic, not serving evidence. Choose winners per workload and quality floor rather than a universal engine ranking.

### v0.5.22 benchmark semantics that affect conclusions

The current implementation is `python -m sglang.benchmark.serving`; `sglang.bench_serving` remains a deprecated entry point. The observations below come from source inspection, not executed benchmarks. They correct common interpretations of the proposed benchmark commands. [S0522-F-BENCH-SHIM](https://raw.githubusercontent.com/sgl-project/sglang/baa9befa381511cd4d56f83980951e5a45fffc6d/python/sglang/bench_serving.py) [S0522-F-BENCH](https://raw.githubusercontent.com/sgl-project/sglang/baa9befa381511cd4d56f83980951e5a45fffc6d/python/sglang/benchmark/serving.py)

| Proposed workload / metric | What the implementation actually does | Required control |
| --- | --- | --- |
| Random 1024 input / 4096 output | Default `--random-range-ratio 0.0` samples requested lengths from 1–1024 and 1–4096. Expected lengths are 512.5 and 2048.5 before input processing | Set `--random-range-ratio 1` for fixed requested lengths; pin dataset/tokenizer. Native `/generate` can use `--tokenize-prompt` to avoid text decode/re-encode drift |
| `random` dataset identity | Repeats/truncates tokenized ShareGPT text; an absent/invalid path can trigger a download | Supply the same existing dataset snapshot; do not describe it as independent random token IDs |
| `--request-rate 5 --max-concurrency 64` | Poisson scheduled arrivals queue behind a client semaphore; request timing starts after acquiring that slot | Record client admission delay separately. Reported TTFT/E2E do not include that wait, and actual HTTP arrival rate can fall below the offered rate |
| `agentic-trace` | Feeds generated assistant text into later turns, but retains only message role/content, drops tool-call fields and joins reasoning with visible content | Use for sequential text replay. It neither executes tools nor proves faithful tool/reasoning serialization or coding-task success |
| Agentic output budget | Default 220 output tokens per turn; controlled by `--sharegpt-output-len`. Chat benchmark requests ignore EOS by default | Explicitly choose cap and stopping policy; `--disable-ignore-eos` enables natural stopping |
| Agentic request count | `--num-prompts 128 --agentic-max-turns 8` loads at most 128 available conversations and at most eight nonempty turns each | A small sample is not replicated to 128; count actual conversations and HTTP turns separately |
| Shared-prefix 16 groups ×16 prompts ×4 turns | Creates 256 conversations /1024 HTTP turns; group counts determine dataset size. The synthetic prefix is prepended to the first user message | Use `sglang-oai-chat`; call lengths synthetic targets, not exact server tokens or a true system-role template |
| Multi-turn input throughput | Main summary input totals remain zero because the caller supplies no single-turn input list to metric calculation | Use detailed `input_lens` or cache-report prompt totals; preserve streamed usage and verify server token accounting |
| Warmup and flush | Warmup repeats the first dataset row, caps output at 32, and replays all turns for a multi-turn row. `--flush-cache` flushes afterward; SGLang CI also enables flushing. Otherwise warmed state remains | A run starting with empty cache subsequently warms. One load-balanced flush does not establish all replicas/cache tiers were cleared |

Source paths: [S0522-F-BENCH](https://raw.githubusercontent.com/sgl-project/sglang/baa9befa381511cd4d56f83980951e5a45fffc6d/python/sglang/benchmark/serving.py) [S0522-F-LENGTHS](https://raw.githubusercontent.com/sgl-project/sglang/baa9befa381511cd4d56f83980951e5a45fffc6d/python/sglang/benchmark/datasets/common.py) [S0522-F-RANDOM](https://raw.githubusercontent.com/sgl-project/sglang/baa9befa381511cd4d56f83980951e5a45fffc6d/python/sglang/benchmark/datasets/random.py) [S0522-F-TRACE](https://raw.githubusercontent.com/sgl-project/sglang/baa9befa381511cd4d56f83980951e5a45fffc6d/python/sglang/benchmark/datasets/agentic_trace.py) [S0522-F-PREFIX](https://raw.githubusercontent.com/sgl-project/sglang/baa9befa381511cd4d56f83980951e5a45fffc6d/python/sglang/benchmark/datasets/generated_shared_prefix.py)

For **fixed-work, saturated serial serving** through an integration exposing native `/generate`, the corrected command structure is:

```bash
python -m sglang.benchmark.serving \
  --backend sglang --base-url "${KSERVE_BASE_URL}" \
  --model "${MODEL_SNAPSHOT}" \
  --tokenizer "${TOKENIZER_SNAPSHOT}" \
  --dataset-name random --dataset-path "${PINNED_SHAREGPT_JSON}" \
  --num-prompts 256 --random-input-len 1024 \
  --random-output-len 4096 --random-range-ratio 1 --tokenize-prompt \
  --max-concurrency 1 --warmup-requests 16 \
  --output-details --output-file decode-c1.jsonl
```

This includes prefill and network time; it is not an isolated decode-kernel result. For native `/generate`, independently confirm the endpoint's loaded model revision and tokenizer: these client arguments do not select or validate the server model. The route, snapshots and output location are supplied by the separate execution repository. For natural-stopping trace replay use the chat backend, an existing trace JSON containing `conversations`, an explicit `--sharegpt-output-len`, and `--disable-ignore-eos`. Tool correctness requires a separate agent harness. No downloadable benchmark kit or sample attachment was supplied with the reviewed external report; its claimed syntax checks cannot be independently assessed.

For synthetic prefix popularity, compare `--gsp-group-distribution uniform` with `zipf` plus a positive `--gsp-zipf-alpha`; set `--gsp-range-ratio 1` explicitly. Zipf changes group probabilities while retaining the total conversation count. LRU/LFU/SLRU are server controls; `--cache-report` only observes reuse. Multi-turn concurrency caps whole conversations, and aggregate JSONL appends one record per run with detail arrays, rather than one line per HTTP request. [S0522-F-BENCH](https://raw.githubusercontent.com/sgl-project/sglang/baa9befa381511cd4d56f83980951e5a45fffc6d/python/sglang/benchmark/serving.py) [S0522-F-PREFIX](https://raw.githubusercontent.com/sgl-project/sglang/baa9befa381511cd4d56f83980951e5a45fffc6d/python/sglang/benchmark/datasets/generated_shared_prefix.py)

**KServe endpoint contract:** `sglang` appends `/generate`, `sglang-oai` appends `/v1/completions`, and `sglang-oai-chat` appends `/v1/chat/completions`. Supply the correct routed base URL without duplicating `/v1`; omitted host/port defaults to `http://0.0.0.0:30000`. Readiness polls `/v1/models`; tokenizer discovery can expose a server-local path unusable by the client, so pass an explicit client-accessible tokenizer snapshot. Custom `--header` values apply to generation requests but not all discovery/control requests: a Host-header-only routing workaround is incomplete. Confirm usage streaming, authentication and replica targeting in the installed integration. [S0522-F-BENCH](https://raw.githubusercontent.com/sgl-project/sglang/baa9befa381511cd4d56f83980951e5a45fffc6d/python/sglang/benchmark/serving.py)

## KServe integration requirements

The installed KServe version, resource kind, runtime template and gateway remain unknown. Pin the engine image and model snapshot in that existing integration; verify the resource's accepted fields and actual container command/args rather than assuming `LLMInferenceService` or a vLLM default runtime works unchanged with SGLang. Match probes, served-model names, port 8000, streaming timeouts, metrics discovery, GPU resources and model mounts to the installed contract.

Prefer **one explicit model group per KServe replica** when studying replica placement: eight TP1 pods, two TP4 pods or one TP8 pod if feasible. This keeps GPU accounting and cache ownership visible. Engine-level `--dp-size` is a separate routing design; stacking both replica layers can accidentally multiply capacity requests. Cache affinity requires configured routing; a radix cache in each engine does not itself provide cross-pod affinity.

An eight-GPU pod leaves no GPUs for a simultaneous replacement on this node. Qualify drain/stop/start behavior and readiness budgets. P/D separation, HiSparse and host/storage cache tiers remain later experiments: each consumes capacity, bandwidth or cache semantics that must justify its cost on a fixed eight-GPU node. Read the [KServe integration analysis](../frameworks/kserve/ARCHITECTURE.md).

The engine's `--admin-api-key` alone does **not** protect ordinary inference; that requires `--api-key` when engine authentication is used. Health/readiness/metrics paths bypass these keys. Match generation and management access to the existing KServe ingress contract. [S0522-F-AUTH](https://raw.githubusercontent.com/sgl-project/sglang/baa9befa381511cd4d56f83980951e5a45fffc6d/python/sglang/srt/utils/auth.py)

## Evidence limits

This review covers selected release diffs and model/configuration contracts, not all 950 release PRs. Its independent reviews challenged model scope, defaults, quantized layouts and release-note contradictions. Source existence, a parser choice and a publisher benchmark do not certify the selected binary or B300 deployment. Per-model structured findings are in `sglang_v0522_b300_review` in the [model catalog](../catalog/models.json); the existing 40 configuration arrays retain their original release identities.
