# Qwen 3.8 27B: vLLM v0.31.0 on B300

## vLLM v0.32.0 update (October 18)

Pinned NVIDIA mixed NVFP4 TP1, FlashInfer/BF16 KV and matched compile/admission controls across v0.31/v0.32; inspect activation-quant fusion. ModelOpt mixed NVFP4 optimization predicate repaired; mixed loader support already existed.

Eligible compilation/fusion required; no B300 performance transfer from SM121 PR. See the [v0.32 B300 source review and experiment priorities](../../../reports/vllm-v032-upgrade.md) and `vllm_v032_b300_review` in the [model catalog](../../../catalog/models.json). The version-specific analysis below retains its original scope; no runtime result or launch-array migration is implied.

Both Qwen families also change image normalization and M-RoPE table allocation in v0.32. Record resolved CPU/GPU preprocessing, processor revision and video-pruning state; the smaller shared rotary table is not a model-wide memory multiplier. Details and source identities are in the [v0.32 Qwen additions](../../../reports/vllm-v032-upgrade.md#changes-shared-by-both-qwen-families).

**Review: October 17, 2026 UTC.** Scope: immutable checkpoints and selected vLLM release source, not an executed serving image. All candidates run inside the required **KServe** platform. No B300 correctness, quality or performance result was reproduced.

## Recommended investigation order

Start with **TP1, target-only, 32K service context**. Hold the full-attention backend and BF16 KV constant while comparing BF16, official FP8 and NVIDIA mixed NVFP4 weights. Then change KV precision, attention backend and MTP separately. Official FP8 is the first conservative quantized candidate because it uses more weight bits and retains the output head in higher precision; this is a rationale for investigation, not a measured quality ranking. NVIDIA mixed NVFP4 is the first efficiency candidate when weight bandwidth or capacity is the priority. [Precision evidence](precision.md).

| Question | Matched comparison | Expected benefit and limit |
| --- | --- | --- |
| FP8 or NVFP4 weights? | Official FP8 vs NVIDIA mixed; FlashInfer + BF16 KV for both; retain BF16 weights as quality anchor | NVIDIA files are 29.0% smaller; actual resident memory, speed and task quality remain unmeasured |
| FP8 KV worth using? | Each quantized target: FlashInfer + BF16 KV vs FlashInfer + E4M3 KV | Half the ordinary full-attention KV payload; scale handling and attention arithmetic can change quality |
| Does FA4 reduce latency? | NVIDIA mixed: FlashInfer + BF16 KV vs FA4 + BF16 KV | Isolates backend choice; FA4 is not an established latency winner |
| Does MTP help? | Same candidate with drafting off, then 1/2/3 proposed tokens | Trades fewer target decode steps for draft/verification and recurrent-state costs |
| Best use of eight GPUs? | Eight independent TP1 replicas vs fewer TP2/TP4 groups | TP1 avoids model-parallel collectives; wider TP may still improve single-request latency |

Use the same admission limits, token budget, prompt/output distributions, thinking policy, tools and image/video limits. Check identical serialized input token IDs, padding/attention masks and template behavior across export-owned tokenizers; pinning each export separately does not prove equivalent preprocessing. This comparison changes the complete quantized export, including activation quantization and exclusions, not just weight bitwidth. The supplied FlashInfer and FA4 examples changed both `max-num-seqs` and `max-num-batched-tokens`; their timings would conflate scheduling with backend/cache effects. Compare unique prompts, growing chat histories and complete coding episodes separately. TTFT, inter-token latency, p95 completion, useful node throughput and task success answer different questions; detailed execution belongs in the separate execution repository.

## Exact release and publisher evidence

The release examined is **v0.31.0**, commit `db9527a46873454610df6dbedf79a36d6bf1a7f6`. NVIDIA identifies GB300 and vLLM, but its example uses mutable `vllm/vllm-openai:nightly`; it does not establish that this release was the tested build. That example uses TP4, utilization 0.85, 32 sequences, 32,768 batched tokens, a 262,144 context cap and E4M3 KV. Its quality table is not explicitly tied to every example setting. TP1 is a B300 candidate derived from architecture/capacity and source support, not NVIDIA's measured optimum. [ATTV-TAG](https://api.github.com/repos/vllm-project/vllm/git/ref/tags/v0.31.0) [qwen3.8-27b-NV](https://huggingface.co/nvidia/Qwen3.8-27B-NVFP4/raw/482ca0f3832238542f8f5295dde86b5f22711d80/README.md)

v0.31.0 detects the NVIDIA checkpoint's `MIXED_PRECISION` metadata as `modelopt_mixed`. Let the checkpoint select its quantization loader; forcing blanket `--quantization fp8` would misdescribe this export. `--dtype bfloat16` sets unquantized/activation boundaries while preserving NVFP4 and FP8 weight/kernel paths. Choosing FlashInfer attention does not select the linear-layer kernel. [ATTQ-V-MODELOPT-STABLE](https://raw.githubusercontent.com/vllm-project/vllm/db9527a46873454610df6dbedf79a36d6bf1a7f6/vllm/model_executor/layers/quantization/modelopt.py) [ATTQ-V-LINEAR-STABLE](https://raw.githubusercontent.com/vllm-project/vllm/db9527a46873454610df6dbedf79a36d6bf1a7f6/vllm/model_executor/kernels/linear/__init__.py)

## Backend and cache constraints

| Item | v0.31.0 finding | Configuration consequence |
| --- | --- | --- |
| Ordinary causal full-attention on SM103 | Automatic priority considers FlashInfer before FlashAttention, subject to compatibility | Specify `--attention-backend FLASHINFER` for a controlled comparison; omission is not an observed dispatch result |
| FA4 with Qwen's 256-dimensional heads | Dedicated hd256 route excludes quantized KV. Its version resolver changes to FA2, then FP8-KV backend validation rejects the combination | Explicit `FLASH_ATTN` + FP8 KV is **not a usable FA2 fallback**; use BF16 KV for this FA4 candidate |
| FA4 block geometry | 128-token kernel pages; framework blocks may be larger multiples of 128 | Omit `--block-size` initially; record resolved framework and kernel sizes |
| Hybrid architecture | 16 full-attention layers and 48 Gated DeltaNet layers use separate paths | Full-attention flags do not turn GDN into FA4 |
| GDN prefill | Auto selects FlashInfer for SM10x/key dimension 128 when CUDA runtime is at least 13; otherwise another eligible path | Record CUDA and resolved GDN backend independently |
| GDN state | Configured SSM state is FP32; cache `auto` respects it | E4M3 KV does not quantize recurrent state to FP8 |

Source: [ATTV-S-CUDA](https://raw.githubusercontent.com/vllm-project/vllm/db9527a46873454610df6dbedf79a36d6bf1a7f6/vllm/platforms/cuda.py) [ATTV-S-FA-UTIL](https://raw.githubusercontent.com/vllm-project/vllm/db9527a46873454610df6dbedf79a36d6bf1a7f6/vllm/v1/attention/backends/fa_utils.py) [ATTV-S-FA](https://raw.githubusercontent.com/vllm-project/vllm/db9527a46873454610df6dbedf79a36d6bf1a7f6/vllm/v1/attention/backends/flash_attn.py) [Q31-S-GDN](https://raw.githubusercontent.com/vllm-project/vllm/db9527a46873454610df6dbedf79a36d6bf1a7f6/vllm/model_executor/layers/mamba/gdn/qwen_gdn_linear_attn.py) [TOPM-GEMMA-V-CONFIG](https://raw.githubusercontent.com/vllm-project/vllm/db9527a46873454610df6dbedf79a36d6bf1a7f6/vllm/model_executor/models/config.py) [qwen3.8-27b-CFG](https://huggingface.co/Qwen/Qwen3.8-27B/raw/1d4bf0f2ff6012fd82039f2fa52739d0dd7c60c0/config.json)

Either `--attention-backend FLASHINFER` or `--attention-config '{"backend":"FLASHINFER"}'` is valid; specifying both backend fields raises an error. The FA4 field is `flash_attn_version`. Its compatible request still requires the selected image's kernel availability and feature checks. [ATTV-S-CONFIG](https://raw.githubusercontent.com/vllm-project/vllm/db9527a46873454610df6dbedf79a36d6bf1a7f6/vllm/config/attention.py) [ATTV-S-ARGS](https://raw.githubusercontent.com/vllm-project/vllm/db9527a46873454610df6dbedf79a36d6bf1a7f6/vllm/engine/arg_utils.py)

## Matched target-only configuration references

The example is the **BF16-KV NVIDIA mixed candidate**, inside a KServe pod allocated one GPU. The tokenizer revision is pinned to the same repository revision; preserve processor/template files and pin the runtime image digest separately. Numbers below are common experimental controls, not universal defaults. Multimodal input limits remain part of the workload specification.

```bash
vllm serve nvidia/Qwen3.8-27B-NVFP4 \
  --revision 482ca0f3832238542f8f5295dde86b5f22711d80 \
  --tokenizer-revision 482ca0f3832238542f8f5295dde86b5f22711d80 \
  --tensor-parallel-size 1 \
  --dtype bfloat16 \
  --attention-backend FLASHINFER \
  --kv-cache-dtype bfloat16 \
  --max-model-len 32768 \
  --gpu-memory-utilization 0.90 \
  --max-num-seqs 32 \
  --max-num-batched-tokens 16384 \
  --enable-chunked-prefill \
  --enable-prefix-caching \
  --reasoning-parser qwen3 \
  --enable-auto-tool-choice \
  --tool-call-parser qwen3_coder \
  --host 0.0.0.0 --port 8000
```

For the **throughput/capacity candidate**, replace only the cache argument with `--kv-cache-dtype fp8_e4m3`. For the **FA4 candidate**, keep BF16 KV and replace the backend argument with:

```text
--attention-config '{"backend":"FLASH_ATTN","flash_attn_version":4}'
```

The BF16 and official-FP8 references use their respective model IDs and exact revisions in [sources](sources.md), with every other control unchanged. Six release-specific references are consolidated in [the configuration catalog](../../../catalog/configurations.json); their IDs contain `.vllm.v031.`. Older records retain their historical identities. Parser registration is source-checked, not proof of every streaming/tool sequence. [Q31-V-STABLE-REASONING](https://raw.githubusercontent.com/vllm-project/vllm/db9527a46873454610df6dbedf79a36d6bf1a7f6/vllm/reasoning/__init__.py) [Q31-V-STABLE-TOOLS](https://raw.githubusercontent.com/vllm-project/vllm/db9527a46873454610df6dbedf79a36d6bf1a7f6/vllm/tool_parsers/__init__.py)

### FP8 scales: corrected v0.31 guidance

**`--calculate-kv-scales` was removed before v0.31.0.** Do not put it in these commands. Issue #37554 was a historical Qwen3.5-35B-A3B/SM120 report on older releases and is closed; its workaround is not a current Qwen3.8/B300 interface. The removal merge is an ancestor of the release. [Q31-V-KVSCALE-ISSUE](https://api.github.com/repos/vllm-project/vllm/issues/37554) [Q31-V-KVSCALE-REMOVAL](https://api.github.com/repos/vllm-project/vllm/pulls/49389) [Q31-V-KVSCALE-REMOVAL-IN-STABLE](https://api.github.com/repos/vllm-project/vllm/compare/dd11df04f3b7046c40f13e586ac38a3725bc3c03...db9527a46873454610df6dbedf79a36d6bf1a7f6?per_page=1)

Removing the flag does **not** establish calibrated KV scales. The inspected loader uses checkpoint K/V scales when present and otherwise defaults to 1.0; Q/prob scales also have defaults. NVIDIA's weight metadata has no KV quantization algorithm. Neither silence in logs nor successful loading demonstrates accurate E4M3 attention. Record effective scales and compare long code, repeated/branched conversations and multimodal quality against BF16 KV. FlashInfer's quantized-cache path may also change query arithmetic, so this is not purely a storage-format experiment. [Q31-V-STABLE-KVSCALES](https://raw.githubusercontent.com/vllm-project/vllm/db9527a46873454610df6dbedf79a36d6bf1a7f6/vllm/model_executor/layers/quantization/kv_cache.py) [qwen3.8-27b-NV-QUANT](https://huggingface.co/nvidia/Qwen3.8-27B-NVFP4/raw/482ca0f3832238542f8f5295dde86b5f22711d80/hf_quant_config.json) [ATTV-S-FI](https://raw.githubusercontent.com/vllm-project/vllm/db9527a46873454610df6dbedf79a36d6bf1a7f6/vllm/v1/attention/backends/flashinfer.py)

### Native MTP and recurrent checkpoints

All three artifacts contain one native MTP layer; multiple proposal steps reuse it. For NVIDIA mixed, a three-token candidate adds:

```text
--mamba-cache-mode align
--speculative-config '{"method":"mtp","num_speculative_tokens":3,"revision":"482ca0f3832238542f8f5295dde86b5f22711d80"}'
```

Use 1/2/3 as separate proposal counts, each with the **matching target revision**. In v0.31.0 the native draft inherits the target model and quantization, but its revision field does not automatically inherit target `--revision`; pin it explicitly. The MTP decoder uses full attention. It rejects Mamba cache mode `all`; `align` is compatible with the prefix/chunked-prefill model configuration and stores recurrent checkpoints at eligible boundaries. [TOPQ-VLLM-STABLE-SPEC-CONFIG](https://raw.githubusercontent.com/vllm-project/vllm/db9527a46873454610df6dbedf79a36d6bf1a7f6/vllm/config/speculative.py) [Q31-V-STABLE-QWEN-MTP](https://raw.githubusercontent.com/vllm-project/vllm/db9527a46873454610df6dbedf79a36d6bf1a7f6/vllm/model_executor/models/qwen3_5_mtp.py) [TOPM-GEMMA-V-CONFIG](https://raw.githubusercontent.com/vllm-project/vllm/db9527a46873454610df6dbedf79a36d6bf1a7f6/vllm/model_executor/models/config.py)

NVIDIA's `mtp.*` internals are unquantized, but the reused **output head remains NVFP4**. The official FP8 artifact has a different draft precision map. Compare native target/draft behavior with its own target-only baseline; neither target load success nor proposal acceptance alone proves quality or speed. Count rollback state, verification buffers and draft execution. [qwen3.8-27b-NV-CFG](https://huggingface.co/nvidia/Qwen3.8-27B-NVFP4/raw/482ca0f3832238542f8f5295dde86b5f22711d80/config.json) [TOPQ-27FP8-INDEX](https://huggingface.co/Qwen/Qwen3.8-27B-FP8/resolve/017b9c7af6b5689d5dd426a76e0bc077eb5ca20a/model.safetensors.index.json) [Q31-V-STABLE-MTP-SHARING](https://raw.githubusercontent.com/vllm-project/vllm/db9527a46873454610df6dbedf79a36d6bf1a7f6/vllm/v1/worker/gpu/spec_decode/eagle/utils.py) [ATTQ-V-MODELOPT-STABLE](https://raw.githubusercontent.com/vllm-project/vllm/db9527a46873454610df6dbedf79a36d6bf1a7f6/vllm/model_executor/layers/quantization/modelopt.py)

Keep automatic CUDA-graph resolution initially and record effective target/draft graph modes. GDN capture is limited to eligible batch shapes; graphs are not guaranteed for every operation. `--enforce-eager` also changes warmup/compilation behavior, so it is a debugging alternative rather than the normal MTP configuration. [FP8V-S-CONFIG](https://raw.githubusercontent.com/vllm-project/vllm/db9527a46873454610df6dbedf79a36d6bf1a7f6/vllm/config/vllm.py) [Q31-V-STABLE-GDN-META](https://raw.githubusercontent.com/vllm-project/vllm/db9527a46873454610df6dbedf79a36d6bf1a7f6/vllm/v1/attention/backends/gdn_attn.py)

### Compilation-cache and prefix-reuse caveats

The open #58203 report initially described Qwen3.8 FP8 + multimodal MTP startup failure on v0.30/B200. Follow-up attributed it to reusing AOT artifacts between all-zero modality limits and image-enabled settings; a separate `VLLM_CACHE_ROOT` reportedly allowed the latter. The inspected v0.31 model hash still omits those modality-limit fields. Keep compilation caches separate when switching such modality profiles; changing only `compilation_config.cache_dir` does not isolate the inspected AOT path. This is a reported failure mechanism corroborated by selected source, not a reproduced B300 result or a general ban on multimodal MTP. [Q31-V-MTP-MM-ISSUE](https://api.github.com/repos/vllm-project/vllm/issues/58203) [Q31-V-MTP-MM-FOLLOWUP](https://api.github.com/repos/vllm-project/vllm/issues/58203/comments?per_page=100) [TOPM-GEMMA-V-OVERRIDE](https://raw.githubusercontent.com/vllm-project/vllm/db9527a46873454610df6dbedf79a36d6bf1a7f6/vllm/config/model.py) [Q31-V-STABLE-AOT-CACHE](https://raw.githubusercontent.com/vllm-project/vllm/db9527a46873454610df6dbedf79a36d6bf1a7f6/vllm/compilation/decorators.py)

Open hybrid-prefix/MTP reports cover several older builds, exporters and hardware configurations. Qualify warm/reused prefixes, branches, concurrent arrivals, cancellation and rollback on the exact image. Do not import a patch or disable protective draft block dropping merely because a performance thread reports a gain. [Q31-V-HYBRID-MTP-ISSUE](https://api.github.com/repos/vllm-project/vllm/issues/53912) [Q31-V-MTP-PREFIX-PERF](https://api.github.com/repos/vllm-project/vllm/issues/53670)

## Capacity and KServe placement

The full-attention KV payload is `2 × 16 layers × 4 KV heads × 256 dimensions × tokens × bytes`. At 262,144 tokens this is **16 GiB BF16 or 8 GiB FP8 per independent history**, before recurrent/conv state, multimodal data, weights, graphs and allocator overhead. Consequently, 32 maximum-length FP8 histories or 16 BF16 histories each require **256 GiB of KV alone**. Under a literal 288 GB reference assumption, a 0.90 executor budget is only about 241.4 GiB. `max-num-seqs` is an admission cap, not a guarantee that every admitted sequence reaches maximum context simultaneously. Prefix sharing can reduce physical use; distinct histories cannot assume it. [Memory derivation](../../../reports/memory-math.md).

Raise context from 32K to the needed service window only after capacity and quality qualification. The native 262,144 limit includes input and generated tokens. TP1 replication is the starting node-throughput comparison; TP2/TP4 remain single-request latency alternatives. Use up to eight KServe replicas with one GPU and one TP1 engine each, subject to actual capacity and rollout policy. Route stable conversation prefixes consistently while respecting load/health. Eight replicas do not form a TP8 model group. The installed KServe resource kind/runtime template is still unknown; the upstream reference version does not identify that cluster. [KServe integration](../../../frameworks/kserve/ARCHITECTURE.md).

## Prompt and generation contract

The pinned publisher template uses thinking and `preserve_thinking` by default; documented effort levels are `xhigh` (default), `medium` and `low`. Setting `preserve_thinking=false` retains reasoning associated with the latest user message rather than stripping every reasoning block. Saving the actual serialized conversation matters: preservation changes prompt length and prefix-reuse opportunities. [qwen3.8-27b-CARD](https://huggingface.co/Qwen/Qwen3.8-27B/raw/1d4bf0f2ff6012fd82039f2fa52739d0dd7c60c0/README.md), [RR-QWEN-27-PIN-CHAT_TEMPLATE](https://huggingface.co/Qwen/Qwen3.8-27B/raw/1d4bf0f2ff6012fd82039f2fa52739d0dd7c60c0/chat_template.jinja).

| Workload / mode | Explicit request settings | Practical consequence |
| --- | --- | --- |
| Direct chat or extraction / non-thinking | `chat_template_kwargs.enable_thinking=false`; temperature 0.7, top-p 0.8, top-k 20, min-p 0, presence penalty 1.5, repetition penalty 1 | Bound the final-answer budget to the task; structured output still depends on the selected parser and API support. |
| Coding, research or multi-turn tools / thinking | `enable_thinking=true`, `preserve_thinking=true`; temperature 1.0, top-p 0.95, top-k 20, min-p 0, presence penalty 0, repetition penalty 1; state `reasoning_effort` explicitly | Lower effort can save tokens per turn while increasing failed attempts; complete-task latency includes retries and tool time. |
| Images or video | Keep the same mode settings and pin processor, image limits and frame-sampling policy | Count visual tokens and preserved reasoning inside the input-plus-output context budget. |

The numbers are publisher recommendations, not measured B300 tuning. Parameter support differs across APIs. The ordinary vLLM recipe uses `--reasoning-parser qwen3` and, for tools, `--enable-auto-tool-choice --tool-call-parser qwen3_coder`; NVIDIA's SGLang example names `qwen3` and `qwen3_coder` too. Parser-free configurations do not establish the corresponding reasoning/tool API behavior. [qwen3.8-27b-VR](https://recipes.vllm.ai/Qwen/Qwen3.8-27B), [qwen3.8-27b-NV](https://huggingface.co/nvidia/Qwen3.8-27B-NVFP4/raw/482ca0f3832238542f8f5295dde86b5f22711d80/README.md).

## Extended context and SGLang comparison

The publisher's YaRN example places `rope_parameters` under `text_config`: `rope_type=yarn`, `rope_theta=10000000`, `partial_rotary_factor=0.25`, `mrope_interleaved=true`, `mrope_section=[11,11,10]`, and `original_max_position_embeddings=262144`. Factor 2 targets 524,288 tokens; factor 4 accompanies the 1,000,000-token example. vLLM uses `--hf-overrides` and SGLang `--json-model-override-args`, with their respective longer-context override environment variables. This changes positional behavior even for short prompts, so it belongs to a separate long-context service policy. [qwen3.8-27b-CARD](https://huggingface.co/Qwen/Qwen3.8-27B/raw/1d4bf0f2ff6012fd82039f2fa52739d0dd7c60c0/README.md).


The SGLang cookbook documents the exact NVIDIA export and a native `EAGLE`/`NEXTN` chain; its step/draft-token counts are not interchangeable with vLLM's proposal count. Preserve engine-specific scale handling and recurrent-cache behavior when comparing it. The vLLM recipe's low-latency NVFP4 measurements concern an Inferact export and other hardware; they do not establish NVIDIA/B300/v0.31 results. [TOPQ-SGL-STABLE-RECIPE27](https://raw.githubusercontent.com/sgl-project/sglang/e00930c5489053f26d86b179cee0d087f846acbb/docs/src/snippets/configs/Qwen/qwen3.8-27b.jsx) [qwen3.8-27b-VR](https://recipes.vllm.ai/Qwen/Qwen3.8-27B) [qwen3.8-27b-GR](https://docs.sglang.io/cookbook/autoregressive/Qwen/Qwen3.8-27B)

## Remaining evidence needed

Exact image/digest and resolved kernels; real per-GPU residency under modality/context/concurrency limits; native MTP/prefix rollback correctness; matched task quality and latency/goodput; actual KServe integration. None of the source-derived candidates is a demonstrated production winner.
