# Gemma 4 31B IT: architecture

## Revision check, 2026-10-16

The supplied report's `fb9ae262347c3945692f09a612f8bb189def854f` is a valid older snapshot. The current repository still resolves to the atlas pin `842da3794eaa0b77d5f08bae87a17459d91ff475`. Their retrieved `config.json` bytes match, and the pinned tree metadata identifies the same weight LFS objects, index, processor and tokenizer vocabulary. Their cards, `chat_template.jinja` and `tokenizer_config.json` differ; the newer tokenizer configuration adds `response_template`. This is material protocol drift even without evidence of changed weight objects. Preserve the chosen target and template hashes in each run. No tensors were downloaded. [RR-GM-GEMMA-USER-REV](https://huggingface.co/api/models/google/gemma-4-31B-it/revision/fb9ae262347c3945692f09a612f8bb189def854f), [RR-GM-GEMMA-USER-TREE](https://huggingface.co/api/models/google/gemma-4-31B-it/tree/fb9ae262347c3945692f09a612f8bb189def854f?recursive=false&expand=false), [gemma-4-31b-it-BASE-TREE](https://huggingface.co/api/models/google/gemma-4-31B-it/tree/842da3794eaa0b77d5f08bae87a17459d91ff475?recursive=false&expand=false).

## Data flow

Vision/text → [five local sliding layers → one global layer] ×10 with dense MLPs → tied output head + logit soft-cap → sampling.

## What the dense count means

Every token traverses the ordinary dense attention and feed-forward layers; there is no expert router selecting a small subset of MLPs. This does not make “all 31B weights on every token” an exact accounting rule. Input embeddings are lookups, the tied embedding/output matrix is one shared parameter set, and the vision encoder processes image inputs rather than each text decode step. The separate assistant adds its own work only when drafting is enabled. [TOPM-GEMMA-BASE-CFG](https://huggingface.co/google/gemma-4-31B-it/raw/842da3794eaa0b77d5f08bae87a17459d91ff475/config.json), [TOPM-GEMMA-V-GEMMA](https://github.com/vllm-project/vllm/blob/db9527a46873454610df6dbedf79a36d6bf1a7f6/vllm/model_executor/models/gemma4.py).

Table 1 of the technical report lists rounded counts of **1.410B embedding + 29.290B einsum parameters = 30.700B text parameters**, with **0.550B vision** and **0.500B drafter** in separate columns. These are publisher component counts, not an exact checkpoint census or measured per-token active count. They explain why the 31B label should not be used to infer either multimodal residency or speculative memory. The current paper is arXiv **2607.02770v2, revised July 24, 2026**, rechecked October 16. [TOPM-GEMMA-PAPER](https://arxiv.org/html/2607.02770v2#S1.T1), [TOPM-GEMMA-PAPER-RECORD](https://arxiv.org/abs/2607.02770).

## How the parts work together

Five local sliding-attention layers are followed by one global layer. Local attention keeps recent context within a bounded window, while global layers provide long-distance interaction. This substantially changes the cache shape relative to 60 uniform full-attention layers.

Local and global attention have different KV-head counts and head dimensions. The publisher describes unified keys and values in the global layers. This same-layer behavior is distinct from the configuration’s `num_kv_shared_layers: 0`. A formula that allocates separate K and V buffers in every layer is therefore an assumption about storage, not a deduction from the config. Inspect the selected engine’s allocator before claiming an exact physical cache size.

The feed-forward blocks are dense and use the configured GELU approximation. Tied embeddings and output-head behavior matter both for loading and for quantization exclusions. Final logit soft-capping changes how scores reach the sampler; it must remain in the generation path.

Image features are processed through the vision tower before text generation. The presence of audio token identifiers elsewhere in a shared family configuration is not proof of an audio encoder in this specific variant. Capability must be checked at the concrete model, processor and runtime level.

The architecture facts above are drawn from the publisher card and configuration; the workload consequences are analytical interpretation. [gemma-4-31b-it-CARD](https://huggingface.co/google/gemma-4-31B-it/blob/842da3794eaa0b77d5f08bae87a17459d91ff475/README.md) [gemma-4-31b-it-CFG](https://huggingface.co/google/gemma-4-31B-it/raw/842da3794eaa0b77d5f08bae87a17459d91ff475/config.json)

## Configuration extraction

This is a **selected, normalized projection**, not a byte-for-byte copy of the complete config. Field labels have been made comparable across models. Layer indices explicitly state zero-based or one-based conventions.

| Property | Value |
| --- | --- |
| architecture_class | Gemma4ForConditionalGeneration |
| model_type | gemma4 |
| layers | 60 |
| hidden_size | 5376 |
| intermediate_size | 21504 |
| enable_moe_block | False |
| local_attention_layers | 50 |
| global_attention_layers | 10 |
| attention_heads | 32 |
| local_kv_heads | 16 |
| local_head_dim | 256 |
| global_kv_heads | 4 |
| global_head_dim | 512 |
| attention_k_eq_v | True |
| sliding_window | 1024 |
| max_position_embeddings | 262144 |
| vocab_size | 262144 |
| tie_word_embeddings | True |
| activation | gelu_pytorch_tanh |
| final_logit_softcapping | 30 |
| full_rope_theta | 1000000 |
| full_partial_rotary_factor | 0.25 |
| local_rope_theta | 10000 |
| num_kv_shared_layers | 0 |
| audio_config | null (explicit in the pinned configuration) |
| vision_hidden_size | 1152 |
| vision_head_dim | 72 |
| vision_intermediate_size | 4304 |
| vision_default_output_length | 280 |


Source for the extraction: [gemma-4-31b-it-CFG](https://huggingface.co/google/gemma-4-31B-it/raw/842da3794eaa0b77d5f08bae87a17459d91ff475/config.json). Headline counts, modality descriptions and advertised extended context are additionally drawn from [gemma-4-31b-it-CARD](https://huggingface.co/google/gemma-4-31B-it/blob/842da3794eaa0b77d5f08bae87a17459d91ff475/README.md). A `transformers_version` metadata field is not by itself proof of a minimum compatible package version.

## Memory and performance consequences

The pinned base repository lists 62,546,338,248 bytes of BF16 safetensors files, including file headers (about 62.55 decimal GB). This weight magnitude makes TP1 a reasonable B300 candidate; actual startup headroom still needs measuring. The rounded 31B family label is not an exact tensor census. [gemma-4-31b-it-BASE-TREE](https://huggingface.co/api/models/google/gemma-4-31B-it/tree/842da3794eaa0b77d5f08bae87a17459d91ff475?recursive=false&expand=false)

Lower precision can free memory for more requests or longer inputs. Multiple TP1 replicas use separate GPUs and separate weight copies; they do not create extra GPUs. Compare their aggregate throughput and per-request latency with tensor sharding under the same node budget.

Local and global cache pools need compatible budgeting. A user who sends many maximum-length requests can exhaust global cache even though most layers use a short window. Vision preprocessing adds its own transient memory; count image size and number, not merely the number of HTTP requests.

Repository file metadata and any cache calculations are not measured GPU allocations. [Memory mathematics](../../../reports/memory-math.md) explains the formulas and their limits. [gemma-4-31b-it-CARD](https://huggingface.co/google/gemma-4-31B-it/blob/842da3794eaa0b77d5f08bae87a17459d91ff475/README.md) [gemma-4-31b-it-CFG](https://huggingface.co/google/gemma-4-31B-it/raw/842da3794eaa0b77d5f08bae87a17459d91ff475/config.json) [HW](https://docs.nvidia.com/dgx/dgxb300-user-guide/introduction-to-dgxb300.html)

## What this report does not establish

Physical KV allocation under attention_k_eq_v in the selected engine; exact export-level SGLang compatibility; correct tool template at the final image revision; local B300 quality and latency.

## Separate assistant checkpoint

Fresh inspection still identifies Google's matching `google/gemma-4-31B-it-assistant` at `627c5ec1458b9086b841a91e0512fd31fd2fbbf1`. Its configuration declares `Gemma4AssistantForCausalLM`, BF16, four decoder layers, hidden size 1,024, backbone hidden size 5,376 and four KV-sharing layers. The target has 60 layers and zero cross-layer KV-sharing layers; these are separate configurations. The single listed assistant weight file is 939,042,560 bytes including its header, not a measured GPU allocation. [TOPM-GEMMA-DRAFT-CFG](https://huggingface.co/google/gemma-4-31B-it-assistant/raw/627c5ec1458b9086b841a91e0512fd31fd2fbbf1/config.json), [TOPM-GEMMA-DRAFT-TREE](https://huggingface.co/api/models/google/gemma-4-31B-it-assistant/tree/627c5ec1458b9086b841a91e0512fd31fd2fbbf1?recursive=true&expand=false).

In vLLM v0.31.0 source, the assistant performs Q-only attention over target-owned KV. Its three sliding layers map to the target's final sliding layer and its full-attention layer maps to the final full layer: zero-based target layers **58 and 59** for this configuration. All four assistant layers run for one proposed token; the runtime sets `n_predict=1`, so four assistant layers do not mean four parallel next-token heads. SGLang v0.5.21 implements the same typed cache ownership through its frozen-KV assistant path. Cache mapping, draft precision and rollback remain part of exact-build qualification. [TOPM-GEMMA-V-DRAFT](https://github.com/vllm-project/vllm/blob/db9527a46873454610df6dbedf79a36d6bf1a7f6/vllm/model_executor/models/gemma4_mtp.py), [TOPM-GEMMA-V-PROPOSER](https://github.com/vllm-project/vllm/blob/db9527a46873454610df6dbedf79a36d6bf1a7f6/vllm/v1/spec_decode/gemma4.py), [TOPM-GEMMA-V-SPEC](https://github.com/vllm-project/vllm/blob/db9527a46873454610df6dbedf79a36d6bf1a7f6/vllm/config/speculative.py), [TOPM-GEMMA-G-DRAFT](https://github.com/sgl-project/sglang/blob/e00930c5489053f26d86b179cee0d087f846acbb/python/sglang/srt/models/gemma4_mtp.py).

The public artifacts do not disclose every training-data, optimization or implementation detail. This report does not fill missing details with assumptions or present a complete formal reconstruction of private training.
