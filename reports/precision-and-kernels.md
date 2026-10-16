# Precision, serialization and kernels

**NVFP4 evidence refreshed October 16, 2026 UTC.** Numeric definitions, selected released vLLM source and a separate main snapshot were inspected. The equations and byte ratios below are calculations; this atlas contains no reproduced inference, throughput or quality results.

## A precision name is not a deployment contract

| Term | Meaning | Common mistake |
| --- | --- | --- |
| BF16 | 16-bit floating representation with broad exponent range | Calling dequantized FP4 weights the original BF16 model |
| FP8 | Eight-bit floating family, often E4M3 for inference | Ignoring block, channel, tensor and dynamic-activation schemes |
| MXFP8 | Microscaled FP8 with shared block scale | Treating it as the same packing as ordinary FP8 |
| MXFP4 | Four-bit values with microscaling, typically 32-value blocks | Renaming it NVFP4 |
| NVFP4 | E2M1 values, commonly one E4M3 scale per 16 values plus an outer FP32 scale | Assuming all tensors or all recipes use the same precision and scale layout |
| W4A4 | Four-bit weights and activations for the affected operators | Assuming routers, KV cache and vision are also four-bit |
| W4A16 | Four-bit weights with higher-precision activations | Expecting the same compute path as W4A4 |
| Weight-only FP8 | Weights compressed; activation treatment is loader/kernel-specific | Assuming its exporter label fixes runtime activation precision |

The representations and scale distinctions are documented by NVIDIA. E2M1, E4M3 and E8M0 refer to exponent/mantissa layouts, not model sizes. [NV4](https://developer.nvidia.com/blog/introducing-nvfp4-for-efficient-and-accurate-low-precision-inference/) [TE](https://docs.nvidia.com/deeplearning/transformer-engine/examples/fp8_primer.html) [TE4](https://docs.nvidia.com/deeplearning/transformer-engine/features/low_precision_training/nvfp4/nvfp4.html) [CUDNN](https://docs.nvidia.com/deeplearning/cudnn/latest/operations/BlockScaling.html)

## What an NVFP4 value actually represents

The four data bits hold **one sign bit, two exponent bits and one explicit fraction bit**, with exponent bias 1. The E2M1 magnitudes are `0, 0.5, 1, 1.5, 2, 3, 4, 6`. With signs there are **16 bit patterns but 15 distinct numerical values**: positive and negative zero compare numerically equal. E2M1 has a subnormal magnitude of 0.5 and no infinity or NaN encoding. These are the unscaled values; a weight represented by them can lie far outside ±6 after scaling. [ATTQ-OCPMX](https://www.opencompute.org/documents/ocp-microscaling-formats-mx-v1-0-spec-final-pdf), [ATTQ-E2M1](https://docs.nvidia.com/cuda/cuda-math-api/cuda_math_api/struct____nv__fp4__e2m1.html).

For the ordinary one-dimensional group-16 NVFP4 scheme, write a reconstructed element as:

$$
\widehat{x}_{b,i}=g\,s_b\,q_{b,i},\qquad
q_{b,i}\in\mathrm{E2M1},\quad s_b\in\mathrm{E4M3},\quad g\in\mathrm{FP32}.
$$

Here `b` identifies a group of 16 elements, `s_b` is its local scale, and `g` is the outer tensor scale. In this equation both scales are **dequantization multipliers**. NVIDIA's Transformer Engine description gives the reference amax rule below for a nonzero tensor, with `A` its maximum absolute value and `a_b` the block maximum:

$$
g=\frac{A}{448\times6},\qquad
s_b=Q_{\mathrm{E4M3}}\!\left(\frac{a_b}{6g}\right),\qquad
q_{b,i}=Q_{\mathrm{E2M1}}\!\left(\frac{x_{b,i}}{g s_b}\right).
$$

`Q` includes the conversion's rounding and saturation rules. Zero blocks need explicit handling to avoid division by zero. This is an explanation of hierarchical scaling, not a requirement that every exporter recompute `A` at every invocation: inference activation outer scales can come from calibration while block scales are computed at runtime. Rounding, clipping and scale search are recipe choices. Transformer Engine also documents a **16×16 weight-scaling training recipe**; it must not be silently substituted for the group-16 inference layout used in the catalog. [ATTQ-TE-NV](https://docs.nvidia.com/deeplearning/transformer-engine/features/low_precision_training/nvfp4/nvfp4.html), [ATTQ-CUDNN](https://docs.nvidia.com/deeplearning/cudnn/latest/operations/BlockScaling.html), [ATTQ-V-MODELOPT-STABLE](https://github.com/vllm-project/vllm/blob/db9527a46873454610df6dbedf79a36d6bf1a7f6/vllm/model_executor/layers/quantization/modelopt.py#L1989).

**A field named `scale` may store the reciprocal of this equation's scale.** The released vLLM ModelOpt loader treats `weight_scale_2` as a dequantization multiplier; its compressed-tensors loader inverts the serialized `weight_global_scale`. Both produce the internal multiplier consumed by the kernel. For W4A4 it also combines the weight and activation outer multipliers into `alpha = g_weight × g_input`; local scales still vary inside the dot product. Copying a scale tensor between these exporters without its convention changes the represented model. [ATTQ-V-MODELOPT-STABLE](https://github.com/vllm-project/vllm/blob/db9527a46873454610df6dbedf79a36d6bf1a7f6/vllm/model_executor/layers/quantization/modelopt.py#L1940), [ATTQ-V-CT-NV-STABLE](https://github.com/vllm-project/vllm/blob/db9527a46873454610df6dbedf79a36d6bf1a7f6/vllm/model_executor/layers/quantization/compressed_tensors/schemes/compressed_tensors_w4a4_nvfp4.py#L95).

### NVFP4, MXFP4 and INT4: what changes

| Representation | Value grid within a group | Scale structure | Ideal stored bits per represented element |
| --- | --- | --- | --- |
| NVFP4, group 16 | Nonuniform E2M1 grid | One 8-bit E4M3 scale per 16 values; outer FP32 tensor scale | `4 + 8/16 + 32/N = 4.5 + 32/N` for one outer scale and `N` elements |
| OCP MXFP4, group 32 | The same E2M1 grid | One 8-bit E8M0 power-of-two scale per 32 values | `4 + 8/32 = 4.25` |
| Grouped symmetric INT4 | Uniform integer steps, with scheme-defined signed range | A scale per group of `G`; zero point fixed by the scheme | `4 + scale_bits/G` |
| Grouped affine INT4 | Uniform steps shifted by a zero point: `x̂ = s(q − z)` | Scale and, when stored, zero point per group | `4 + (scale_bits + zero_point_bits)/G` |

The floating formats' layouts follow NVIDIA and OCP; the INT4 equation follows ordinary affine quantization. ONNX distinguishes signed INT4 `[-8, 7]` from unsigned four-bit `[0, 15]`; particular symmetric schemes may reserve an endpoint. Thus “INT4” does not specify AWQ/GPTQ calibration, group size, scale precision, zero-point packing or activation precision. [ATTQ-NVFORMAT](https://developer.nvidia.com/blog/introducing-nvfp4-for-efficient-and-accurate-low-precision-inference/), [ATTQ-OCPMX](https://www.opencompute.org/documents/ocp-microscaling-formats-mx-v1-0-spec-final-pdf), [ATTQ-INT4](https://onnx.ai/onnx/operators/onnx__QuantizeLinear.html).

**Calculated storage examples:** ignoring outer scales, NVFP4's 4.5 bits give about **3.56×** compression against a 16-bit tensor and **1.78×** against an unscaled 8-bit tensor, rather than 4× and 2×. Its local-scale representation uses about **5.88% more bytes** than MXFP4's 4.25 bits. An illustrative INT4 group of 128 with one FP16 scale costs 4.125 bits/value; adding a packed four-bit zero point makes 4.15625. These are representation calculations, not whole-model memory savings. Mixed tensors, outer scales per shard/expert, padding, repacking, allocator overhead and workspaces change actual storage and residency; see [memory accounting](memory-math.md).

NVFP4's smaller groups can limit how many values share an outlier's scale, and E4M3 can represent fractional scales that E8M0 cannot. Those mechanisms can reduce error, but **NVFP4 does not universally handle outliers better than MXFP4 or INT4**. An outlier can still dominate its own group, values can underflow, and clipping or calibration can favor a different grid. NVIDIA's favorable examples and benchmark results concern stated distributions and recipes; they are not a perplexity bound or an all-model accuracy guarantee. [ATTQ-NVFORMAT](https://developer.nvidia.com/blog/introducing-nvfp4-for-efficient-and-accurate-low-precision-inference/).

## Four layers of compatibility

**Numeric format:** bit layout, scale data types and granularity. **Serialized representation:** tensor names, packed shapes, exclusions, exporter metadata. **Mathematical operator:** activation, bias, normalization, router weighting, clamping and residual behavior. **Runtime implementation:** supported kernel, alignment, repacking, sharding and target GPU architecture.

A failure at any layer can break the result. In the inspected SGLang code, FP4 GEMM selects different W4A4 and W4A16 paths and checks whether FlashInfer functionality is available. Padding rules differ across kernel families. In the Kimi fixes, correct scale loading and SiTU activation behavior are as important as selecting four-bit matrix multiplication. [GQUANT](https://github.com/sgl-project/sglang/blob/877be2974aa151a984e52822c028276c2b1e9303/python/sglang/srt/layers/quantization/modelopt_quant.py) [KIMIPR](https://github.com/sgl-project/sglang/pull/35077) [KIMIVPR](https://github.com/vllm-project/vllm/pull/52406)

### Hardware family is part of that contract

B200/GB200 are **SM100**, B300/GB300 **SM103**, RTX Blackwell examples **SM120**, and GB10/DGX Spark **SM121** in NVIDIA's current table. These compute capabilities require distinct kernel support. In vLLM 0.31.0, the native CUTLASS FP4 entry point has separate compiled SM100-family and SM120-family implementations and requires CUDA runtime 12.8 or newer. A suitable GPU does not prove that the installed binary contains the required implementation. [ATTQ-CC](https://developer.nvidia.com/cuda/gpus), [ATTQ-V-FP4ENTRY-STABLE](https://github.com/vllm-project/vllm/blob/db9527a46873454610df6dbedf79a36d6bf1a7f6/csrc/libtorch_stable/quantization/fp4/nvfp4_scaled_mm_entry.cu#L41).

Hopper and Ampere can execute some compressed FP4 checkpoints through other arithmetic, but that is not native Blackwell FP4 Tensor Core execution. Similarly, an open format does not imply universal hardware acceleration: AMD explicitly identifies CDNA4 MI350/MI355 as supporting native MXFP4 acceleration and says **MI300/CDNA3 does not accelerate MXFP4**. Loading, converting or emulating a checkpoint on MI300 is a different claim. [ATTQ-V-MARLINUTIL-STABLE](https://github.com/vllm-project/vllm/blob/db9527a46873454610df6dbedf79a36d6bf1a7f6/vllm/model_executor/layers/quantization/utils/marlin_utils_fp4.py#L158), [ATTQ-AMD-MX](https://rocm.docs.amd.com/projects/atom/en/latest/online_quantization_best_practices.html).

## Exporter differences in this catalog

Kimi’s native routed-expert MXFP4/MXFP8 scheme is distinct from NVIDIA’s mixed NVFP4/FP8 export; neither description means that every tensor or runtime activation uses that format. RedHat and Inferact GLM 5.3 quantize main routed experts to NVFP4 while retaining MTP precision. RedHat GLM Flash instead combines main routed-expert NVFP4 with FP8 MTP experts. [Kimi precision](../companies/moonshot-ai/kimi-k3/precision.md) [GLM precision](../companies/z-ai/glm-5.3/precision.md) [GLM Flash precision](../companies/z-ai/glm-5.3-flash/precision.md)

NVIDIA Qwen 27B mixes NVFP4 MLP/head with FP8 attention. Its card and quantization metadata disagree on the ModelOpt version; preserve the actual files and record that discrepancy. NVIDIA Flash Next retains BF16 components and an FP8 n-gram table. RedHat Gemma excludes vision, embeddings and head from Transformer-block quantization. Mistral uses static-activation FP8. Each linked precision report records the exact artifacts and primary sources; a single NVFP4 loader flag cannot express all these contracts. [Qwen 27B precision](../companies/alibaba-qwen/qwen3.8-27b/precision.md) [Flash Next precision](../companies/alibaba-qwen/qwen3.8-flash-next/precision.md) [Gemma precision](../companies/google/gemma-4-31b-it/precision.md) [Mistral precision](../companies/mistral-ai/mistral-medium-3.5/precision.md)

## How vLLM executes an NVFP4 checkpoint

The official release lookup at **09:29 UTC on October 16** still identifies **v0.31.0**, published October 5, at `db9527a46873454610df6dbedf79a36d6bf1a7f6`. The separately inspected main commit is `07f3857fb93772fed64e06642cdb0b8c03e0b249`, committed October 16 at 09:07:05 UTC. The distinctions below are source observations at those identities; no wheel or image was qualified. [ATTQ-VREL](https://api.github.com/repos/vllm-project/vllm/releases/latest), [ATTQ-VTAG](https://api.github.com/repos/vllm-project/vllm/git/ref/tags/v0.31.0), [ATTQ-VMAIN](https://github.com/vllm-project/vllm/commit/07f3857fb93772fed64e06642cdb0b8c03e0b249).

For a supported linear layer, the loader reads packed weights, group scales, outer scales and exclusions, then chooses a kernel and prepares its layout. ModelOpt `NVFP4` and `W4A16_NVFP4` have different activation contracts; compressed-tensors has its own schema and scale conventions. Both released loaders reach `init_nvfp4_linear_kernel(use_a16=...)`. Weights may need scale swizzling and dimension padding; these transformations are not new calibration or restoration of the original BF16 weights. [ATTQ-V-MODELOPT-STABLE](https://github.com/vllm-project/vllm/blob/db9527a46873454610df6dbedf79a36d6bf1a7f6/vllm/model_executor/layers/quantization/modelopt.py#L2307), [ATTQ-V-CT-NV-STABLE](https://github.com/vllm-project/vllm/blob/db9527a46873454610df6dbedf79a36d6bf1a7f6/vllm/model_executor/layers/quantization/compressed_tensors/schemes/compressed_tensors_w4a4_nvfp4.py#L28), [ATTQ-V-NV-UTILS-STABLE](https://github.com/vllm-project/vllm/blob/db9527a46873454610df6dbedf79a36d6bf1a7f6/vllm/model_executor/layers/quantization/utils/nvfp4_utils.py).

| Execution path | What the inspected source does | Boundary |
| --- | --- | --- |
| Native W4A4 linear | Quantizes runtime input to E2M1 plus local scales, multiplies packed FP4 operands through a suitable CUTLASS/FlashInfer implementation, applies scales, and returns the original activation dtype | A W4A4 matrix multiplication does not make residuals, normalization or attention history four-bit |
| Marlin linear | Uses NVFP4 weight compression with FP16/BF16 activation arithmetic; the NVFP4 path rejects an INT8/FP8 activation override | Its CUDA capability predicate is SM75+, with remaining binary, shape and model constraints; this is W4A16, not native W4A4 |
| Humming linear | Accepts NVFP4 weights, checks CUDA/SM75+ and package availability, then resolves an input schema; it can fall back to a compatible higher precision input schema | “Humming” alone does not establish A4, A8 or A16 arithmetic |
| FlashInfer CuTe-DSL W4A16 | Uses BF16 input and NVFP4 weights; its explicit support predicate covers SM100/103 and SM12x when the required API exists | BF16 input is required; selection differs by release and device |
| Emulation | Reconstructs low-precision values and performs higher precision arithmetic | This can establish a software path, not native FP4 performance or original-model accuracy |

These rows describe the released implementation and its support predicates, rather than a complete model compatibility list. [ATTQ-V-NV-CUTLASS-STABLE](https://github.com/vllm-project/vllm/blob/db9527a46873454610df6dbedf79a36d6bf1a7f6/vllm/model_executor/kernels/linear/nvfp4/cutlass.py), [ATTQ-V-NV-FLASHINFER-STABLE](https://github.com/vllm-project/vllm/blob/db9527a46873454610df6dbedf79a36d6bf1a7f6/vllm/model_executor/kernels/linear/nvfp4/flashinfer.py), [ATTQ-V-MARLINUTIL-STABLE](https://github.com/vllm-project/vllm/blob/db9527a46873454610df6dbedf79a36d6bf1a7f6/vllm/model_executor/layers/quantization/utils/marlin_utils_fp4.py#L158), [ATTQ-V-NV-HUMMING-STABLE](https://github.com/vllm-project/vllm/blob/db9527a46873454610df6dbedf79a36d6bf1a7f6/vllm/model_executor/kernels/linear/nvfp4/humming.py), [ATTQ-V-HUM-SCHEMA-STABLE](https://github.com/vllm-project/vllm/blob/db9527a46873454610df6dbedf79a36d6bf1a7f6/vllm/model_executor/layers/quantization/utils/humming/schema.py#L261), [ATTQ-V-NV-EMULATION-STABLE](https://github.com/vllm-project/vllm/blob/db9527a46873454610df6dbedf79a36d6bf1a7f6/vllm/model_executor/kernels/linear/nvfp4/emulation.py).

In **v0.31.0**, CUDA W4A4 selection with `--linear-backend auto` and without the batch-invariance override begins with FlashInfer CuTe-DSL, FlashInfer CUTLASS, FlashInfer B12x and vLLM CUTLASS, each subject to its support check. The CuTe-DSL W4A4 implementation checks SM10x; the B12x implementation is a separate SM12x candidate. `--linear-backend` requests a backend; it is not a universal hardware-enablement switch. The dispatcher can also try weight-only or emulated implementations. **Do not promise that an arbitrary pre-Blackwell model will load automatically**: linear-layer selection does not validate the model's MoE, attention, cache, exporter or activation requirements. [ATTQ-V-LINEAR-STABLE](https://github.com/vllm-project/vllm/blob/db9527a46873454610df6dbedf79a36d6bf1a7f6/vllm/model_executor/kernels/linear/__init__.py#L551), [ATTQ-V-NV-FLASHINFER-STABLE](https://github.com/vllm-project/vllm/blob/db9527a46873454610df6dbedf79a36d6bf1a7f6/vllm/model_executor/kernels/linear/nvfp4/flashinfer.py#L112).

For an explicitly **W4A16** layer, released source already prefers FlashInfer CuTe-DSL on SM100/103 when available and otherwise forces Marlin under `auto`. The release's ModelOpt documentation still says that `auto` selects Marlin; the precise source is more specific. On **main `07f3857…`**, Humming moves directly ahead of Marlin on **SM90**, and W4A16 automatic selection permits that route. This main change is not a B300/Hopper equivalence or a released performance result. [ATTQ-V-LINEAR-STABLE](https://github.com/vllm-project/vllm/blob/db9527a46873454610df6dbedf79a36d6bf1a7f6/vllm/model_executor/kernels/linear/__init__.py#L1120), [ATTQ-V-DOC-STABLE](https://github.com/vllm-project/vllm/blob/db9527a46873454610df6dbedf79a36d6bf1a7f6/docs/features/quantization/modelopt.md#L25), [ATTQ-V-LINEAR-MAIN](https://github.com/vllm-project/vllm/blob/07f3857fb93772fed64e06642cdb0b8c03e0b249/vllm/model_executor/kernels/linear/__init__.py#L1184), [ATTQ-V-HUM-PRIORITY-MAIN](https://github.com/vllm-project/vllm/blob/07f3857fb93772fed64e06642cdb0b8c03e0b249/vllm/model_executor/layers/quantization/utils/humming/priority.py).

**MoE selection is separate.** The released NVFP4 MoE selector tries FlashInfer TRTLLM, CuTe-DSL variants, FlashInfer CUTLASS, vLLM CUTLASS and other candidates against the actual configuration. It filters for requirements such as activation layout and SwiGLU clamping and can reject the deployment. `--moe-backend` therefore describes different work from `--linear-backend`; neither chooses an attention backend. Record the selected implementation for each affected operator. [ATTQ-V-NV-ORACLE-STABLE](https://github.com/vllm-project/vllm/blob/db9527a46873454610df6dbedf79a36d6bf1a7f6/vllm/model_executor/layers/fused_moe/oracle/nvfp4.py#L182).

The useful performance hypothesis is specific: native W4A4 may benefit a compute-heavy matrix multiplication, while weight compression may benefit bandwidth-bound decode or permit more residency. Runtime quantization, scale traffic, repacking, launch overhead and the untouched operators can consume those gains. The wrappers returning FP16/BF16 output also explain why even a quantized QKV projection would not imply four-bit attention computation. In this atlas, several exports retain higher precision attention projections in the first place.

For how attention consumes the resulting activations and history, continue with [FlashAttention, FA4 and sparse attention](attention-and-fa4.md). That chapter separates attention arithmetic from weight formats and cache storage.

## FP8 KV is independent

Weight precision changes model operations. KV precision changes stored attention history. Recurrent-state precision changes an additional state representation. Test these separately: baseline weights + baseline cache; low-precision weights + unchanged cache; then lower-precision cache/state. Otherwise an accuracy difference cannot be assigned to its cause.

The SGLang Qwen recipe identifies an exporter-dependent default: some derivative exports default `auto` KV to FP8, whereas NVIDIA’s export leaves it BF16 without an explicit setting. Matching command text with `auto` therefore does not necessarily match effective precision. [qwen3.8-27b-GR](https://docs.sglang.io/cookbook/autoregressive/Qwen/Qwen3.8-27B)

“Always use FP8 cache/indexers and never FP4” is not a supported rule across these architectures. The inspected vLLM release exposes distinct ordinary FP8, NVFP4 and model-specific compressed-cache formats; the reader, scale layout and model determine which is valid. A main-KV flag does not also configure a sparse indexer or recurrent state. QSA's indexer setting has its own restricted contract, and a supported four-bit main-cache path does not imply four-bit top-k indexing. Conversely, a hypothetical lower-precision indexer cannot be declared corrupt without an implementation and quality evidence. [TOPR-V-CACHE](https://raw.githubusercontent.com/vllm-project/vllm/db9527a46873454610df6dbedf79a36d6bf1a7f6/vllm/config/cache.py), [Qwen sparse-state details](../companies/alibaba-qwen/qwen3.8-flash-next/serving.md).

### Where `nvfp4_4over6` belongs

In both the inspected stable release and main, `nvfp4_4over6` is a **KV-cache dtype**, selected with **`--kv-cache-dtype nvfp4_4over6`**. It is not an NVFP4 weight quantizer or a value for `--linear-backend`. The cache writer evaluates two E4M3-rounded scale candidates derived from the 16-value block maximum divided by 6 or by 4, reconstructs their E2M1 values, and picks the lower squared-error candidate (ties retain the `/6` candidate). It stores the same packed values and block-scale layout as ordinary `nvfp4`; the reader does not need a separate four-over-six data format. Local reconstruction-error selection does not guarantee better perplexity or latency. [ATTQ-V-CACHE-STABLE](https://github.com/vllm-project/vllm/blob/db9527a46873454610df6dbedf79a36d6bf1a7f6/vllm/config/cache.py#L123), [ATTQ-V-FP4KVCUDA-STABLE](https://github.com/vllm-project/vllm/blob/db9527a46873454610df6dbedf79a36d6bf1a7f6/csrc/libtorch_stable/nvfp4_kv_cache_kernels.cu#L74), [ATTQ-V-CACHE-MAIN](https://github.com/vllm-project/vllm/blob/07f3857fb93772fed64e06642cdb0b8c03e0b249/vllm/config/cache.py).

In **v0.31.0**, the inspected ordinary NVFP4 cache integration requires FlashInfer's **SM100-family TRTLLM path for both prefill and decode**. Main `07f3857…` also exposes ordinary **`nvfp4`** through an FA2-based FlashInfer route on SM80/90/120 families, rejecting head size 64, attention sinks and DCP. That added route explicitly excludes **`nvfp4_4over6`** because its writer has no scale search. Thus the main extension must not be described as released support, native FP4 attention on Ampere/Hopper, or wider four-over-six support. The model-specific `nvfp4_ds_mla` cache is another contract. See [the vLLM attention review](../frameworks/vllm/SOURCE_REVIEW.md#attention-backends-fa4-and-nvfp4-cache) for exact backend and architecture boundaries. [ATTQ-V-FICACHE-STABLE](https://github.com/vllm-project/vllm/blob/db9527a46873454610df6dbedf79a36d6bf1a7f6/vllm/v1/attention/backends/flashinfer.py#L498), [ATTQ-V-FICACHE-MAIN](https://github.com/vllm-project/vllm/blob/07f3857fb93772fed64e06642cdb0b8c03e0b249/vllm/v1/attention/backends/flashinfer.py#L529).

## Why four-bit can win, and why it can lose

A lower-byte representation may reduce weight bandwidth and let a larger useful batch or cache fit. It can also introduce scale handling, conversion, padding, calibration error and backend constraints. At low concurrency, synchronization and launch overhead may dominate the saved arithmetic. At long context, attention-history traffic can dominate expert weights. These are reasons to measure, not reasons to reject quantization.

The active-parameter count alone cannot establish that an MoE is launch-bound or that FP8 must beat NVFP4. As an illustrative routing model, if each of $B$ tokens independently chooses $k$ of $N$ experts uniformly, the expected number of distinct experts used in that layer is

$$
\mathbb{E}[U] = N\left[1-\left(1-\frac{k}{N}\right)^B\right].
$$

This follows by summing each expert's probability of being chosen at least once. Real routing is neither uniform nor independent, but the example shows why a batch can touch far more weights than one token's active count suggests. Expert reuse, tokens per expert, cache residency, communication and kernel shape jointly determine the bottleneck. A dense model's total count likewise includes tensors such as embeddings or modality-specific modules that need not all participate as full matrix multiplications for every text token.

Neither “NVFP4 loses less than 1%” nor “FP8 varies less than 0.3%” is a property of the format. Retain the exact exporter, task, baseline and absolute-versus-relative score convention with any such observation. The [Gemma variants](../companies/google/gemma-4-31b-it/precision.md) and [Kimi mixed export](../companies/moonshot-ai/kimi-k3/precision.md) illustrate why precision labels alone do not establish those quality or speed bounds.

The decision metric is successful, quality-accepted work under a latency objective. A faster kernel with a regression in tool arguments or retrieval is not a production improvement. Publisher results can establish plausibility, but they do not establish quality or performance for a different prompt/image distribution, sampling configuration or software dependency set.

## Calibration and quality gates

Use a representative holdout with coding, tool use, instruction following, multilingual questions, long context and vision where supported. Freeze the tokenizer, chat serialization and reasoning effort. Include repeated seeds for stochastic tests and paired comparisons. Report absolute differences, sample sizes and uncertainty rather than only a rounded “recovery” percentage.

A native quantization-aware-trained release and a post-training quantized derivative are not the same intervention. Do not attribute the former’s quality to an exporter conversion that was never evaluated. [kimi-k3-CARD](https://huggingface.co/moonshotai/Kimi-K3/blob/f831ab66814297da540d832a5235f8e904f29d06/README.md) [qwen3.8-27b-NV](https://huggingface.co/nvidia/Qwen3.8-27B-NVFP4/raw/482ca0f3832238542f8f5295dde86b5f22711d80/README.md) [glm-5.3-NV](https://huggingface.co/RedHatAI/GLM-5.3-NVFP4/raw/c8917e4258572c405575855ff53effe58c17a38e/README.md)
