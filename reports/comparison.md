# Cross-model comparison

## Architecture and deployment implications

| Model | Architecture identity | Native positional limit | First engine/topology decision |
| --- | --- | --- | --- |
| Kimi K3 | 2.8T total / 104B active; hybrid KDA + gated MLA; latent MoE | 1,048,576 | SGLang first for NVIDIA mixed NVFP4; vLLM and SGLang race for native MXFP4 |
| GLM 5.3 | Approximately 743B main / 39B active; MLA with DSA; native FP8 packaging | 1,048,576 | vLLM FP8 and RedHat/Inferact NVFP4 first; SGLang challenger |
| GLM 5.3 Flash | 320B total / 18B active; KDA + NoPE sparse MLA + mHC; multimodal | 1,048,576 | SGLang Blackwell FP8 initial candidate; vLLM FP8 and NVFP4 head-to-head |
| DeepSeek V4 Flash 0731 | V4 Flash family; compressed/sparse attention, mHC, built-in DSpark | 1,048,576 | vLLM native mixed-format baseline; SGLang alternative after exact 0731 protocol check |
| Qwen 3.8 27B | Dense 27B language model; Gated DeltaNet + gated full attention; multimodal | 262,144 | vLLM TP1 BF16/FP8 and SGLang TP1; test NVFP4 rather than assuming it wins |
| Qwen 3.8 Flash Next | 125B main + 51B n-gram + 4B MTP; 6B active main; GDN + QSA | 262,144 | vLLM first for the exact NVIDIA mixed NVFP4 export; qualify SGLang separately |
| Gemma 4 31B IT | Dense multimodal 31B; 5 sliding layers per global-attention layer | 262,144 | vLLM TP1 BF16/FP8/NVFP4 comparison; SGLang challenger with export-level probe |
| Mistral Medium 3.5 | Dense 128B; 88 language layers, GQA, Pixtral vision; static FP8 export | 262,144 | vLLM first, producer-endorsed; TP2/4 versus TP8 measured at equal workload |


Each row links to its independently populated [company/model report](../README.md). Counts use different publisher scopes; this is not a leaderboard. DeepSeek’s recipe gives a 284B/13B family headline while the exact auxiliary census remains unperformed.

## The important distinctions

Kimi is the capacity-heavy latent-MoE hybrid. GLM 5.3 uses sparse MLA without inheriting Flash’s recurrent architecture. GLM Flash combines KDA, sparse MLA, mHC and vision. DeepSeek 0731 has compressed/sparse attention and a bundled DSpark path. Qwen 27B is dense but hybrid. Flash Next adds a major n-gram table and differently quantized auxiliary path. Gemma is dense with heterogeneous local/global attention. Mistral is dense GQA with a full-history cache. These are different memory and scheduling problems, not eight names for the same Transformer.

Primary extraction sources: [kimi-k3-CFG](https://huggingface.co/moonshotai/Kimi-K3/raw/main/config.json) [glm-5.3-CFG](https://huggingface.co/zai-org/GLM-5.3/raw/main/config.json) [glm-5.3-flash-CFG](https://huggingface.co/zai-org/GLM-5.3-Flash/raw/main/config.json) [deepseek-v4-flash-0731-CFG](https://huggingface.co/deepseek-ai/DeepSeek-V4-Flash-0731/raw/main/config.json) [qwen3.8-27b-CFG](https://huggingface.co/Qwen/Qwen3.8-27B/raw/main/config.json) [qwen3.8-flash-next-CFG](https://huggingface.co/Qwen/Qwen3.8-Flash-Next/raw/de4b8e4d43b917e7706784d8bb445c9af86a3540/config.json) [gemma-4-31b-it-CFG](https://huggingface.co/google/gemma-4-31B-it/raw/main/config.json) [mistral-medium-3.5-CFG](https://huggingface.co/mistralai/Mistral-Medium-3.5-128B/blob/main/config.json)

## There is no defensible universal winner yet

A useful comparison fixes the task distribution, prompt/output lengths, quality threshold, reasoning settings and latency objective. Compare per-node goodput for capacity planning and per-request latency for interactivity. Do not rank engines by unrelated benchmark rows from B200, GB300, RTX Blackwell and an unspecified B300 OEM node.

Choose a starting engine using evidence of the exact checkpoint path and the team’s operational constraints. Promote a candidate only after correctness and workload tests. vLLM and SGLang can both be benchmarked without changing the KServe lifecycle design for a basic single-node service; advanced disaggregation and routing require engine-specific integrations. [KSRT](https://kserve.github.io/website/docs/model-serving/generative-inference/overview) [KSLLM](https://kserve.github.io/website/docs/model-serving/generative-inference/llmisvc/llmisvc-overview)

## Suggested workload portfolios

For short interactive chat, prioritize first-content latency and stable output pacing; include target-only baselines because drafting is not free. For coding agents, preserve multi-turn reasoning/tool serialization and measure actual draft acceptance. For long documents, constrain context and concurrency explicitly and measure retrieval quality. For multimodal tasks, include image preprocessing/encoder time and enforce input limits. For high-volume endpoints, compare independent small-model replicas against wider TP groups at equal node occupancy.

[Benchmark protocol](../benchmarks/PROTOCOL.md) defines a reproducible experiment rather than claiming an unmeasured result.
