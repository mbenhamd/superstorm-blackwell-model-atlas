# Cross-model comparison

## Architecture and deployment implications

| Model | Architecture identity and parameter scope | Configured positional limit | First engine/topology decision |
| --- | --- | --- | --- |
| [Kimi K3](../companies/moonshot-ai/kimi-k3/README.md) | Rounded 2.8T total / 104B active; hybrid KDA + gated MLA; latent MoE | 1,048,576 | SGLang initial candidate for NVIDIA mixed NVFP4; compare vLLM and SGLang for native MXFP4 |
| [GLM 5.3](../companies/z-ai/glm-5.3/README.md) | Approximately 743.38B main + 9.95B serialized MTP; 39B active headline; MLA with DSA; native FP8 packaging | 1,048,576 | vLLM FP8 and RedHat/Inferact NVFP4 first; SGLang challenger |
| [GLM 5.3 Flash](../companies/z-ai/glm-5.3-flash/README.md) | Rounded 320B / 18B active; 321.323B Hub count; KDA + NoPE sparse MLA + mHC; multimodal | 1,048,576 | SGLang Blackwell FP8 initial candidate; compare vLLM FP8 and NVFP4 |
| [DeepSeek V4 Flash 0731](../companies/deepseek/deepseek-v4-flash-0731/README.md) | Exact count unresolved; compressed/sparse attention, mHC, built-in DSpark | 1,048,576 | vLLM TP1/DP4+EP baseline and SGLang documented TP4 comparator; qualify eight-GPU adaptations |
| [Qwen 3.8 27B](../companies/alibaba-qwen/qwen3.8-27b/README.md) | Rounded 27B dense language model; Gated DeltaNet + gated full attention; multimodal | 262,144 | vLLM TP1 BF16/FP8 and SGLang TP1; evaluate NVFP4 at equal quality |
| [Qwen 3.8 Flash Next](../companies/alibaba-qwen/qwen3.8-flash-next/README.md) | Approximately 125B main + 51B n-gram + 4B MTP, vision not separately counted; 6B active main; GDN + QSA | 262,144 | vLLM TP8 baseline for the NVIDIA mixed export; SGLang documented TP1 candidate, unverified on B300 |
| [Gemma 4 31B IT](../companies/google/gemma-4-31b-it/README.md) | Rounded 31B dense multimodal model; 5 sliding layers per global-attention layer | 262,144 | vLLM TP1 BF16/FP8/NVFP4 comparison; SGLang challenger with export-level probe |
| [Mistral Medium 3.5](../companies/mistral-ai/mistral-medium-3.5/README.md) | Rounded 128B dense model; 88 language layers, GQA, Pixtral vision; static FP8 export | 262,144 | vLLM publisher TP8 baseline; compare TP2/4 and publisher-documented SGLang at equal workload |


Each model links to its report and exact artifact evidence. Counts use different scopes and are not a leaderboard. GLM 5.3’s complete checkpoint count is about 753.33B including MTP. DeepSeek’s vLLM recipe gives a 284B/13B family headline while SGLang’s 0731 cookbook says 304B/13B; their accounting has not been reconciled into an exact target-plus-draft census. Positional limits are configuration values, sometimes including RoPE scaling, and do not establish training context, serving-image support or long-context quality. None of the topology recommendations is a local B300 measurement.

## The important distinctions

Kimi is the capacity-heavy latent-MoE hybrid. GLM 5.3 uses sparse MLA without inheriting Flash’s recurrent architecture. GLM Flash combines KDA, sparse MLA, mHC and vision. DeepSeek 0731 has compressed/sparse attention and a bundled DSpark path. Qwen 27B is dense but hybrid. Flash Next adds a major n-gram table and differently quantized auxiliary path. Gemma is dense with heterogeneous local/global attention. Mistral is dense GQA with a full-history cache. These are different memory and scheduling problems, not eight names for the same Transformer.

Primary extraction sources: [kimi-k3-CFG](https://huggingface.co/moonshotai/Kimi-K3/raw/f831ab66814297da540d832a5235f8e904f29d06/config.json) [glm-5.3-CFG](https://huggingface.co/zai-org/GLM-5.3/raw/ba32f8c19c8738e2c57c71798c601d477a7bf844/config.json) [glm-5.3-flash-CFG](https://huggingface.co/zai-org/GLM-5.3-Flash/raw/46a050bec13002ad29ee795c16e61cf4fa3c4a9c/config.json) [deepseek-v4-flash-0731-CFG](https://huggingface.co/deepseek-ai/DeepSeek-V4-Flash-0731/raw/7872f01b1d1fe23eabc4c98b48bffcef5a386062/config.json) [qwen3.8-27b-CFG](https://huggingface.co/Qwen/Qwen3.8-27B/raw/1d4bf0f2ff6012fd82039f2fa52739d0dd7c60c0/config.json) [qwen3.8-flash-next-CFG](https://huggingface.co/Qwen/Qwen3.8-Flash-Next/raw/de4b8e4d43b917e7706784d8bb445c9af86a3540/config.json) [gemma-4-31b-it-CFG](https://huggingface.co/google/gemma-4-31B-it/raw/842da3794eaa0b77d5f08bae87a17459d91ff475/config.json) [mistral-medium-3.5-CFG](https://huggingface.co/mistralai/Mistral-Medium-3.5-128B/blob/22b2b868a15677cfa6061277ed2f653d1349a9ab/config.json)

## There is no defensible universal winner yet

A useful comparison fixes the task distribution, prompt/output lengths, quality threshold, reasoning settings and latency objective. Compare per-node goodput for capacity planning and per-request latency for interactivity. Do not rank engines by unrelated benchmark rows from B200, GB300, RTX Blackwell and an unspecified B300 OEM node.

Choose a starting engine using evidence of the exact checkpoint path and the team’s operational constraints. Promote a candidate only after correctness and workload tests. vLLM and SGLang can both be benchmarked without changing the KServe lifecycle design for a basic single-node service; advanced disaggregation and routing require engine-specific integrations. [KSRT](https://kserve.github.io/website/docs/model-serving/generative-inference/overview) [KSLLM](https://kserve.github.io/website/docs/model-serving/generative-inference/llmisvc/llmisvc-overview)

## Suggested workload portfolios

For short interactive chat, prioritize first-content latency and stable output pacing; include target-only baselines because drafting is not free. For coding agents, preserve multi-turn reasoning/tool serialization and measure actual draft acceptance. For long documents, constrain context and concurrency explicitly and measure retrieval quality. For multimodal tasks, include image preprocessing/encoder time and enforce input limits. For high-volume endpoints, compare independent small-model replicas against wider TP groups at equal node occupancy.

[Benchmark protocol](../benchmarks/PROTOCOL.md) defines a reproducible experiment rather than claiming an unmeasured result.
