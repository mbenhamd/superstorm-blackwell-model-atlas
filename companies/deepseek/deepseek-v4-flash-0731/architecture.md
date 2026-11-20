# DeepSeek V4 Flash 0731: architecture

Fresh report review: **2026-10-16 (UTC)**. The supplied revision `76e0fd0ce5001be043ce4db9c8db38fae83496ed` resolves, and its configuration is byte-identical to the retained atlas revision `7872f01b1d1fe23eabc4c98b48bffcef5a386062`. The retrieved cards differ only by a `conversational` metadata tag. Current `main` resolves to the atlas pin; the alternate revision is absent from the retrieved current-main history. This establishes two retrievable snapshots, without inferring their ancestry from modification dates or asserting equality of all checkpoint files. [Alternate config](https://huggingface.co/deepseek-ai/DeepSeek-V4-Flash-0731/raw/76e0fd0ce5001be043ce4db9c8db38fae83496ed/config.json), [current repository metadata](https://huggingface.co/api/models/deepseek-ai/DeepSeek-V4-Flash-0731), [current history](https://huggingface.co/api/models/deepseek-ai/DeepSeek-V4-Flash-0731/commits/main).

## Data flow

Tokens → recent-window + compressed selected history → mHC streams → hash/routed experts → output; bundled DSpark features → proposals → target verifies.

## How the parts work together

The configuration exposes several interacting mechanisms: compressed attention representations, indexed sparse retrieval, a short sliding window, multiple hyper-connected streams, and routed experts. Its compression schedule alternates different compression ratios after the initial uncompressed layers. Draft-related entries also appear in the serialized schedule, so its length must not be used as the main layer count.

The local window protects access to recent tokens while the compressed and selected representations provide longer-range access. A sparse index budget is a selection budget, not the model’s maximum context length. The maximum positional setting and the available GPU cache are again separate constraints.

The model uses a specific router score function and scaling, plus bounded SwiGLU behavior. A generic MoE wrapper that changes the gate normalization or clipping would alter inference even if every checkpoint tensor loaded successfully.

The release bundles DSpark-related structure, including selected target-layer features and a Markov component. The configured block size, an engine’s proposal count, and the number of tokens emitted after verification are different quantities. Never “correct” the checkpoint’s block setting to match an example CLI argument without checking that implementation’s semantics.

The architecture facts above are drawn from the publisher card and configuration; the workload consequences are analytical interpretation. [deepseek-v4-flash-0731-CARD](https://huggingface.co/deepseek-ai/DeepSeek-V4-Flash-0731/blob/7872f01b1d1fe23eabc4c98b48bffcef5a386062/README.md) [deepseek-v4-flash-0731-CFG](https://huggingface.co/deepseek-ai/DeepSeek-V4-Flash-0731/raw/7872f01b1d1fe23eabc4c98b48bffcef5a386062/config.json)

## Configuration extraction

This is a **selected, normalized projection**, not a byte-for-byte copy of the complete config. Field labels have been made comparable across models. Layer indices explicitly state zero-based or one-based conventions.

| Property | Value |
| --- | --- |
| architecture_class | DeepseekV4ForCausalLM |
| model_type | deepseek_v4 |
| layers | 43 |
| hidden_size | 4096 |
| attention_heads | 64 |
| num_key_value_heads | 1 |
| head_dim | 512 |
| routed_experts | 256 |
| experts_per_token | 6 |
| shared_experts | 1 |
| moe_intermediate_size | 2048 |
| expert_dtype | fp4 |
| quant_method | fp8 |
| quant_format | e4m3 |
| scale_format | ue8m0 |
| weight_block_size | 128, 128 |
| hc_mult | 4 |
| hc_sinkhorn_iters | 20 |
| index_heads | 64 |
| index_head_dim | 128 |
| index_topk | 512 |
| num_hash_layers | 3 |
| nextn_layers (root-config metadata) | 1 |
| dspark_stages_reference_inference | 3 |
| o_groups | 8 |
| o_lora_rank | 1024 |
| q_lora_rank | 1024 |
| qk_rope_head_dim | 64 |
| sliding_window | 128 |
| max_position_embeddings | 1048576 |
| rope_type | yarn |
| rope_factor | 16 |
| original_max_position_embeddings | 65536 |
| rope_theta | 10000 |
| compress_rope_theta | 160000 |
| router_score | sqrtsoftplus |
| router_scale | 1.5 |
| swiglu_limit | 10 |
| vocab_size | 129280 |
| dspark_block_size | 5 |
| dspark_target_layer_ids (zero-based in reference inference) | 40, 41, 42 |
| dspark_markov_rank | 256 |
| compression_schedule_description | 43 target entries: 0, 0, then alternating 4 and 128, ending in 4; three trailing 0 entries for reference DSpark stages |


Source for the extraction: [deepseek-v4-flash-0731-CFG](https://huggingface.co/deepseek-ai/DeepSeek-V4-Flash-0731/raw/7872f01b1d1fe23eabc4c98b48bffcef5a386062/config.json). Headline counts, modality descriptions and advertised extended context are additionally drawn from [deepseek-v4-flash-0731-CARD](https://huggingface.co/deepseek-ai/DeepSeek-V4-Flash-0731/blob/7872f01b1d1fe23eabc4c98b48bffcef5a386062/README.md). A `transformers_version` metadata field is not by itself proof of a minimum compatible package version.

The full 46-entry compression array is present in the pinned publisher configuration. The root config's `num_nextn_predict_layers=1` is metadata, not a verified count of DSpark stages: the same revision's reference inference config sets `n_mtp_layers=3`, and its implementation builds three `DSparkBlock` stages under `mtp.*`. That namespace does not make the checkpoint compatible with an ordinary MTP speculative method. The reference loop also confirms that target feature IDs 40, 41 and 42 are zero-based. [Reference inference config](https://huggingface.co/deepseek-ai/DeepSeek-V4-Flash-0731/raw/7872f01b1d1fe23eabc4c98b48bffcef5a386062/inference/config.json), [reference implementation](https://huggingface.co/deepseek-ai/DeepSeek-V4-Flash-0731/blob/7872f01b1d1fe23eabc4c98b48bffcef5a386062/inference/model.py).

## Target and draft weights

The July 31 checkpoint contains **284,332,240,471 target weights** and **19,845,850,983 additional DSpark weights**. The November 20 census covered all 72,317 indexed tensors in 48 safetensors headers at `7872f01b1d1f`. Each I8 expert byte stores two logical FP4 weights. Each remaining floating-point weight contributes one. The reference shares the target embedding and output head with all three draft stages. Each appears once in the index. [Tensor index](https://huggingface.co/deepseek-ai/DeepSeek-V4-Flash-0731/resolve/7872f01b1d1fe23eabc4c98b48bffcef5a386062/model.safetensors.index.json) [Pinned shard inventory](https://huggingface.co/deepseek-ai/DeepSeek-V4-Flash-0731/tree/7872f01b1d1fe23eabc4c98b48bffcef5a386062) [Publisher reference implementation](https://huggingface.co/deepseek-ai/DeepSeek-V4-Flash-0731/blob/7872f01b1d1fe23eabc4c98b48bffcef5a386062/inference/model.py)

| Component | Routed expert weights | Other logical weights | Total logical weights | Serialized payload including scales and routing IDs |
| --- | ---: | ---: | ---: | ---: |
| Target, 43 layers | 277,025,390,592 | 7,306,849,879 | 284,332,240,471 | 156,015,698,140 B |
| Bundled DSpark, three stages | 19,327,352,832 | 518,498,151 | 19,845,850,983 | 10,862,838,300 B |
| Complete checkpoint | 296,352,743,424 | 7,825,348,030 | 304,178,091,454 | 166,878,536,440 B |

The routed subtotal can also be calculated from 46 target and draft blocks, each with 256 experts and three 4,096 × 2,048 matrices. The weight counts exclude 9,261,408,000 E8M0 quantization scales and 2,327,040 fixed integer token-to-expert assignments. The Hub reports 304,180,418,494 logical elements, exactly the combined weight count plus those assignments. The files occupy 166,886,535,336 bytes including headers. Per-rank weight residency depends on sharding, repacking and whether the loader instantiates the draft. [Hub metadata at the serving revision](https://huggingface.co/api/models/deepseek-ai/DeepSeek-V4-Flash-0731/revision/7872f01b1d1fe23eabc4c98b48bffcef5a386062) [Reference dimensions](https://huggingface.co/deepseek-ai/DeepSeek-V4-Flash-0731/raw/7872f01b1d1fe23eabc4c98b48bffcef5a386062/inference/config.json)

The target alone rounds to 284B. Including the draft gives the 304B headline in NVIDIA’s 0731 card and SGLang’s model table. SGLang’s recipe selector labels the same checkpoint 284B. NVIDIA lists 13B active without an exact counting rule. For the target, six routed experts per layer contribute 6.493B logical weights. Including all other target weights and omitting the input embedding table gives 13.270B under that explicit convention. [NVIDIA model card](https://huggingface.co/nvidia/DeepSeek-V4-Flash-0731-NVFP4/blob/f1caa71142bd0be02f728c79f75042ac1e461579/README.md) [SGLang model table](https://raw.githubusercontent.com/sgl-project/sglang/297e54fd105e974cdf401e5b4d20253a22c16f90/docs/cookbook/autoregressive/DeepSeek/DeepSeek-V4.mdx) [SGLang recipe selector](https://raw.githubusercontent.com/sgl-project/sglang/297e54fd105e974cdf401e5b4d20253a22c16f90/docs/src/snippets/configs/deepseek-ai/deepseek-v4.jsx)

## Memory and performance consequences

The native checkpoint combines FP4 routed experts, FP8 projections and higher-precision components. Compressed history, sliding windows, sparse indexes and DSpark have separate allocation rules.

Persistent memory includes recent-window attention data, compressed-history KV, indexer data, C4/C128 compression state and draft state. The four mHC streams are forward activations, not four independent copies of the whole history cache. SGLang separately exposes compression-state precision, so changing `--kv-cache-dtype` alone does not describe every cache/state allocation. Measure these pools and graph workspaces individually; the 128-token window and sparse index budget do not make total serving memory constant with context. [Reference attention and mHC source](https://huggingface.co/deepseek-ai/DeepSeek-V4-Flash-0731/blob/7872f01b1d1fe23eabc4c98b48bffcef5a386062/inference/model.py), [SGLang state guidance](https://docs.sglang.io/cookbook/autoregressive/DeepSeek/DeepSeek-V4).

A 1,048,576-token positional ceiling follows the configured YaRN factor 16 and original 65,536 positions; that equality does not measure usable cache or long-context quality. [Memory mathematics](../../../reports/memory-math.md) explains the formulas and their limits. [deepseek-v4-flash-0731-CARD](https://huggingface.co/deepseek-ai/DeepSeek-V4-Flash-0731/blob/7872f01b1d1fe23eabc4c98b48bffcef5a386062/README.md) [deepseek-v4-flash-0731-CFG](https://huggingface.co/deepseek-ai/DeepSeek-V4-Flash-0731/raw/7872f01b1d1fe23eabc4c98b48bffcef5a386062/config.json) [HW](https://docs.nvidia.com/dgx/dgxb300-user-guide/introduction-to-dgxb300.html)

## What this report does not establish

The exact publisher convention for active parameters, kernel selection in the serving image and per-rank runtime memory remain open. Capacity, application quality and throughput through KServe require measurements on the B300 node.

The public artifacts do not disclose every training-data, optimization or implementation detail. This report does not fill missing details with assumptions or present a complete formal reconstruction of private training.
