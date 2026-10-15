# Primary-source register

Audit retrieval dates use UTC on October 15, 2026. Immutable model/source URLs identify inspected artifacts; mutable recipes and branch metadata remain dated observations. See [audit report](AUDIT-2026-10-15.md) for scope and [source-access receipts](audits/2026-10-15/source-access.json) for the original 62 URL checks.

### HW: NVIDIA DGX B300 user guide

[Open primary source](https://docs.nvidia.com/dgx/dgxb300-user-guide/introduction-to-dgxb300.html)

Type: primary documentation. Retrieved: 2026-10-15 UTC.

### CC: NVIDIA CUDA GPU compute capabilities

[Open primary source](https://developer.nvidia.com/cuda/gpus)

Type: primary documentation. Retrieved: 2026-10-15 UTC.

### NV4: NVIDIA NVFP4 format explanation

[Open primary source](https://developer.nvidia.com/blog/introducing-nvfp4-for-efficient-and-accurate-low-precision-inference/)

Type: primary documentation. Retrieved: 2026-10-15 UTC.

### TE: Transformer Engine FP8/FP4 primer

[Open primary source](https://docs.nvidia.com/deeplearning/transformer-engine/examples/fp8_primer.html)

Type: primary documentation. Retrieved: 2026-10-15 UTC.

### TE4: Transformer Engine NVFP4 scaling

[Open primary source](https://docs.nvidia.com/deeplearning/transformer-engine/features/low_precision_training/nvfp4/nvfp4.html)

Type: primary documentation. Retrieved: 2026-10-15 UTC.

### CUDNN: cuDNN block scaling

[Open primary source](https://docs.nvidia.com/deeplearning/cudnn/latest/operations/BlockScaling.html)

Type: primary documentation. Retrieved: 2026-10-15 UTC.

### VREL: vLLM 0.31.0 release

[Open primary source](https://github.com/vllm-project/vllm/releases/tag/v0.31.0)

Type: official release metadata. Retrieved: 2026-10-15 UTC.

Official releases/latest page and API checked; prerelease=false, draft=false; published 2026-10-05T06:44:55Z.

### GREL: SGLang 0.5.21 release

[Open primary source](https://github.com/sgl-project/sglang/releases/tag/v0.5.21)

Type: official release metadata. Retrieved: 2026-10-15 UTC.

Official releases/latest page and API checked; prerelease=false, draft=false; published 2026-10-02T01:09:04Z.

### KREL: KServe 0.21.0 release

[Open primary source](https://github.com/kserve/kserve/releases/tag/v0.21.0)

Type: official release metadata. Retrieved: 2026-10-15 UTC.

Official releases/latest page and API checked; prerelease=false, draft=false; published 2026-09-25T17:04:20Z.

### VHEAD: vLLM inspected main commit

[Open primary source](https://github.com/vllm-project/vllm/commit/f8460ef23659afd69046a81529ec2295e4c3f686)

Type: pinned commit metadata. Retrieved: 2026-10-15 UTC.

Historical inspected source snapshot retained; current branch recorded separately.

### GHEAD: SGLang inspected main commit

[Open primary source](https://github.com/sgl-project/sglang/commit/877be2974aa151a984e52822c028276c2b1e9303)

Type: pinned commit metadata. Retrieved: 2026-10-15 UTC.

Historical inspected source snapshot retained; current branch recorded separately.

### VREG: vLLM model registry, inspected lines 1–350

[Open primary source](https://github.com/vllm-project/vllm/blob/f8460ef23659afd69046a81529ec2295e4c3f686/vllm/model_executor/models/registry.py)

Type: pinned source code. Retrieved: 2026-10-15 UTC.

Source re-read at the inspected revision; also byte-identical at separately recorded current main snapshot. No execution test.

### VDS: vLLM Kimi DSpark implementation

[Open primary source](https://github.com/vllm-project/vllm/blob/f8460ef23659afd69046a81529ec2295e4c3f686/vllm/models/kimi_k3/nvidia/dspark_mla.py)

Type: pinned source code. Retrieved: 2026-10-15 UTC.

Immutable revision: `f8460ef23659afd69046a81529ec2295e4c3f686`.

Raw source HTTP200; dense MLA, context projection, embedding alias, confidence/Markov heads, noncausal draft attention and fused reductions checked

Source re-read at the inspected revision; also byte-identical at separately recorded current main snapshot. No execution test.

### GQUANT: SGLang ModelOpt quantization, inspected lines 1–240

[Open primary source](https://github.com/sgl-project/sglang/blob/877be2974aa151a984e52822c028276c2b1e9303/python/sglang/srt/layers/quantization/modelopt_quant.py)

Type: pinned source code. Retrieved: 2026-10-15 UTC.

Source re-read at the inspected revision; also byte-identical at separately recorded current main snapshot. No execution test.

### KIMIPR: SGLang Kimi mixed-format compatibility PR

[Open primary source](https://github.com/sgl-project/sglang/pull/35077)

Type: pull-request metadata and author claims. Retrieved: 2026-10-15 UTC.

Official API HTTP200; merged2026-08-19T15:13:45Z, merge5f128395910dafb98c34083dc26cb790c7674d34; author8GB300 GSM8K197/200 and no speed measurement

Rechecked state=closed, merged=True, merged_at=2026-08-19T15:13:45Z. Author validation is not an independently reproduced result.

### KIMIVPR: vLLM Kimi attention compatibility PR

[Open primary source](https://github.com/vllm-project/vllm/pull/52406)

Type: pull-request metadata and author claims. Retrieved: 2026-10-15 UTC.

Official API HTTP200; open/unmerged, head271aa8deeb723650932f609b8291e4299f0d504b; branch unit/static validation differs from equivalent-path hardware evaluation

Rechecked state=open, merged=False, merged_at=None. Author validation is not an independently reproduced result.

### QPR: Mixed ModelOpt block-FP8 MTP fix; merged 2026-09-08

[Open primary source](https://github.com/vllm-project/vllm/pull/55513)

Type: pull-request metadata and author claims. Retrieved: 2026-10-15 UTC.

Rechecked state=closed, merged=True, merged_at=2026-09-08T22:47:22Z. Author validation is not an independently reproduced result.

### KS: KServe overview

[Open primary source](https://kserve.github.io/website/docs/intro)

Type: primary documentation. Retrieved: 2026-10-15 UTC.

Retrieved website identifies Version 0.20; v0.21.0 release schemas checked separately.

### KSRT: KServe generative runtime overview

[Open primary source](https://kserve.github.io/website/docs/model-serving/generative-inference/overview)

Type: primary documentation. Retrieved: 2026-10-15 UTC.

Retrieved website identifies Version 0.20; v0.21.0 release schemas checked separately.

### KSLLM: LLMInferenceService architecture

[Open primary source](https://kserve.github.io/website/docs/model-serving/generative-inference/llmisvc/llmisvc-overview)

Type: primary documentation. Retrieved: 2026-10-15 UTC.

Page contains simplified sizing examples and broad InferenceService limitations; do not treat its 7B/405B numbers as hardware limits. Other official multi-node guide documents an older InferenceService path. Retrieved website identifies Version 0.20; v0.21.0 release schemas checked separately.

### KSCFG: LLMInferenceService configuration

[Open primary source](https://kserve.github.io/website/docs/model-serving/generative-inference/llmisvc/llmisvc-configuration)

Type: primary documentation. Retrieved: 2026-10-15 UTC.

Retrieved website identifies Version 0.20; v0.21.0 release schemas checked separately.

### KSAPI: KServe CRD API

[Open primary source](https://kserve.github.io/website/docs/reference/crd-api)

Type: primary documentation. Retrieved: 2026-10-15 UTC.

Retrieved website identifies Version 0.20; v0.21.0 release schemas checked separately.

### KSMULTI: KServe multi-node guide

[Open primary source](https://kserve.github.io/website/docs/model-serving/generative-inference/multi-node)

Type: primary documentation. Retrieved: 2026-10-15 UTC.

Retrieved website identifies Version 0.20; v0.21.0 release schemas checked separately.

### kimi-k3-CARD: Kimi K3 publisher card

[Open primary source](https://huggingface.co/moonshotai/Kimi-K3/blob/f831ab66814297da540d832a5235f8e904f29d06/README.md)

Type: publisher model card. Retrieved: 2026-10-15 UTC.

Immutable revision: `f831ab66814297da540d832a5235f8e904f29d06`.

Immutable card retrieved successfully; architecture, parameter headlines, QAT and conversation protocol checked. No training or benchmark result reproduced.

### kimi-k3-CFG: Kimi K3 configuration

[Open primary source](https://huggingface.co/moonshotai/Kimi-K3/raw/f831ab66814297da540d832a5235f8e904f29d06/config.json)

Type: publisher configuration. Retrieved: 2026-10-15 UTC.

Immutable revision: `f831ab66814297da540d832a5235f8e904f29d06`.

Parsed immutable JSON; curated dimensions and 69 KDA / 24 MLA counts checked. Vocabulary is 163840; attention/shared/dense exclusions and unset activation quantization are explicit.

### glm-5.3-CARD: zai-org/GLM-5.3 README.md

[Open primary source](https://huggingface.co/zai-org/GLM-5.3/raw/ba32f8c19c8738e2c57c71798c601d477a7bf844/README.md)

Type: publisher model card. Retrieved: 2026-10-15 UTC.

Immutable revision: `ba32f8c19c8738e2c57c71798c601d477a7bf844`.

HTTP 200; pinned contents inspected; no GPU execution

### glm-5.3-CFG: zai-org/GLM-5.3 config.json

[Open primary source](https://huggingface.co/zai-org/GLM-5.3/raw/ba32f8c19c8738e2c57c71798c601d477a7bf844/config.json)

Type: publisher configuration. Retrieved: 2026-10-15 UTC.

Immutable revision: `ba32f8c19c8738e2c57c71798c601d477a7bf844`.

HTTP 200; pinned contents inspected; no GPU execution

### glm-5.3-flash-CARD: zai-org/GLM-5.3-Flash README.md

[Open primary source](https://huggingface.co/zai-org/GLM-5.3-Flash/raw/46a050bec13002ad29ee795c16e61cf4fa3c4a9c/README.md)

Type: publisher model card. Retrieved: 2026-10-15 UTC.

Immutable revision: `46a050bec13002ad29ee795c16e61cf4fa3c4a9c`.

HTTP 200; pinned contents inspected; no GPU execution

### glm-5.3-flash-CFG: zai-org/GLM-5.3-Flash config.json

[Open primary source](https://huggingface.co/zai-org/GLM-5.3-Flash/raw/46a050bec13002ad29ee795c16e61cf4fa3c4a9c/config.json)

Type: publisher configuration. Retrieved: 2026-10-15 UTC.

Immutable revision: `46a050bec13002ad29ee795c16e61cf4fa3c4a9c`.

HTTP 200; pinned contents inspected; no GPU execution

### deepseek-v4-flash-0731-CARD: DeepSeek V4 Flash 0731 card

[Open primary source](https://huggingface.co/deepseek-ai/DeepSeek-V4-Flash-0731/blob/7872f01b1d1fe23eabc4c98b48bffcef5a386062/README.md)

Type: publisher model card. Retrieved: 2026-10-15 UTC.

Immutable revision: `7872f01b1d1fe23eabc4c98b48bffcef5a386062`.

Exact official release, bundled DSpark, both engine examples, encoding helpers, 384K output recommendation and MIT scope checked.

### deepseek-v4-flash-0731-CFG: DeepSeek V4 Flash 0731 config

[Open primary source](https://huggingface.co/deepseek-ai/DeepSeek-V4-Flash-0731/raw/7872f01b1d1fe23eabc4c98b48bffcef5a386062/config.json)

Type: publisher configuration. Retrieved: 2026-10-15 UTC.

Immutable revision: `7872f01b1d1fe23eabc4c98b48bffcef5a386062`.

Parsed immutable JSON; dimensions and all 46 compression entries verified. Root nextn metadata 1 differs from 3 reference DSpark stages.

### qwen3.8-27b-CARD: Qwen 3.8 27B publisher model card

[Open primary source](https://huggingface.co/Qwen/Qwen3.8-27B/raw/1d4bf0f2ff6012fd82039f2fa52739d0dd7c60c0/README.md)

Type: publisher model card. Retrieved: 2026-10-15 UTC.

Immutable revision: `1d4bf0f2ff6012fd82039f2fa52739d0dd7c60c0`.

Publisher-owned repository API and immutable raw metadata retrieved successfully; no model weights downloaded.

### qwen3.8-27b-CFG: Qwen 3.8 27B configuration

[Open primary source](https://huggingface.co/Qwen/Qwen3.8-27B/raw/1d4bf0f2ff6012fd82039f2fa52739d0dd7c60c0/config.json)

Type: publisher configuration. Retrieved: 2026-10-15 UTC.

Immutable revision: `1d4bf0f2ff6012fd82039f2fa52739d0dd7c60c0`.

Publisher-owned repository API and immutable raw metadata retrieved successfully; no model weights downloaded.

### qwen3.8-flash-next-CARD: Qwen 3.8 Flash Next publisher model card

[Open primary source](https://huggingface.co/Qwen/Qwen3.8-Flash-Next/raw/de4b8e4d43b917e7706784d8bb445c9af86a3540/README.md)

Type: publisher model card. Retrieved: 2026-10-15 UTC.

Immutable revision: `de4b8e4d43b917e7706784d8bb445c9af86a3540`.

Publisher-owned repository API and immutable raw metadata retrieved successfully; no model weights downloaded.

### qwen3.8-flash-next-CFG: Qwen 3.8 Flash Next configuration

[Open primary source](https://huggingface.co/Qwen/Qwen3.8-Flash-Next/raw/de4b8e4d43b917e7706784d8bb445c9af86a3540/config.json)

Type: publisher configuration. Retrieved: 2026-10-15 UTC.

Immutable revision: `de4b8e4d43b917e7706784d8bb445c9af86a3540`.

Publisher-owned repository API and immutable raw metadata retrieved successfully; no model weights downloaded.

### gemma-4-31b-it-CARD: Gemma 4 31B IT publisher card at pinned revision

[Open primary source](https://huggingface.co/google/gemma-4-31B-it/raw/842da3794eaa0b77d5f08bae87a17459d91ff475/README.md)

Type: publisher model card. Retrieved: 2026-10-15 UTC.

Immutable revision: `842da3794eaa0b77d5f08bae87a17459d91ff475`.

Publisher identifies dense 31B family, text/image modalities without audio for this variant, 256K context and Apache-2.0.

### gemma-4-31b-it-CFG: Gemma 4 31B IT pinned configuration

[Open primary source](https://huggingface.co/google/gemma-4-31B-it/raw/842da3794eaa0b77d5f08bae87a17459d91ff475/config.json)

Type: publisher configuration. Retrieved: 2026-10-15 UTC.

Immutable revision: `842da3794eaa0b77d5f08bae87a17459d91ff475`.

All existing normalized config fields matched; 60 layer types count as 50 sliding and 10 full attention; audio_config is explicitly null.

### mistral-medium-3.5-CARD: Mistral Medium 3.5 pinned publisher card

[Open primary source](https://huggingface.co/mistralai/Mistral-Medium-3.5-128B/raw/22b2b868a15677cfa6061277ed2f653d1349a9ab/README.md)

Type: publisher model card. Retrieved: 2026-10-15 UTC.

Immutable revision: `22b2b868a15677cfa6061277ed2f653d1349a9ab`.

Confirms dense128B/text-image, reasoning none/high, vLLM recommendation and explicit SGLang TP8 recipe, plus correction commit link.

### mistral-medium-3.5-CFG: Mistral Medium 3.5 pinned configuration

[Open primary source](https://huggingface.co/mistralai/Mistral-Medium-3.5-128B/raw/22b2b868a15677cfa6061277ed2f653d1349a9ab/config.json)

Type: publisher configuration. Retrieved: 2026-10-15 UTC.

Immutable revision: `22b2b868a15677cfa6061277ed2f653d1349a9ab`.

All prior projection fields matched; corrected mscale_all_dim=0.0, mscale=1.0, beta_fast=4.0 and beta_slow=1.0 added to projection.

### kimi-k3-NV: NVIDIA Kimi K3 mixed NVFP4 card

[Open primary source](https://huggingface.co/nvidia/Kimi-K3-NVFP4/blob/b2428a0b83a8b712ff2e1a8448a103d4175341f1/README.md)

Type: publisher model card. Retrieved: 2026-10-15 UTC.

Immutable revision: `b2428a0b83a8b712ff2e1a8448a103d4175341f1`.

Mixed export, approximately 1.6 TB download, patched vLLM path on 8 B300 GPUs, SGLang development image and distinct NVIDIA/Kimi terms reviewed. Publisher results not reproduced.

### kimi-k3-DRAFT: Inferact Kimi K3 DSpark card

[Open primary source](https://huggingface.co/Inferact/Kimi-K3-DSpark/blob/cf6b8244620e7ea4b0651d214f28e89eac75bed6/README.md)

Type: publisher model card. Retrieved: 2026-10-15 UTC.

Immutable revision: `cf6b8244620e7ea4b0651d214f28e89eac75bed6`.

MLA draft for vLLM; acceptance conditions reviewed. Peak description leaves the relationship between 4 GB300 and TP16 unclear.

### kimi-k3-DRAFT-SG: RadixArk Kimi K3 DSpark card

[Open primary source](https://huggingface.co/RadixArk/Kimi-K3-DSpark/blob/3c5bac301d9cf392706189d82ed947feca6c2f0f/README.md)

Type: publisher model card. Retrieved: 2026-10-15 UTC.

Immutable revision: `3c5bac301d9cf392706189d82ed947feca6c2f0f`.

SGLang serving path and dataset-specific acceptance aggregation reviewed.

### kimi-k3-VR: vLLM Kimi K3 recipe

[Open primary source](https://recipes.vllm.ai/moonshotai/Kimi-K3)

Type: primary documentation. Retrieved: 2026-10-15 UTC.

Mutable recipe checked for native Kimi and Inferact DSpark paths. Older pre-release text coexists with newer deployment sections.

### kimi-k3-GR: SGLang Kimi K3 cookbook

[Open primary source](https://docs.sglang.io/cookbook/autoregressive/Moonshotai/Kimi-K3)

Type: primary documentation. Retrieved: 2026-10-15 UTC.

Mutable cookbook checked for DCP/state sizing and the NVFP4 image. B300 speed rows cite v0.5.18 at 71de97b2, input/output lengths 8192/1024 and simulated acceptance 4.5.

Some B300 DSpark results use simulated acceptance; exact verified cells distinguished from extrapolations.

### glm-5.3-NV: RedHatAI/GLM-5.3-NVFP4 README.md

[Open primary source](https://huggingface.co/RedHatAI/GLM-5.3-NVFP4/raw/c8917e4258572c405575855ff53effe58c17a38e/README.md)

Type: exporter model card. Retrieved: 2026-10-15 UTC.

Immutable revision: `c8917e4258572c405575855ff53effe58c17a38e`.

HTTP 200; pinned contents inspected; no GPU execution

### glm-5.3-VR: GLM 5.3 vLLM recipe

[Open primary source](https://recipes.vllm.ai/zai-org/GLM-5.3)

Type: primary engine documentation. Retrieved: 2026-10-15 UTC.

HTTP 200; current page re-read

Minimum-version labels conflict (0.29.0+ badge versus 0.28.0 text); five MTP proposals documented, not measured on target node.

### glm-5.3-GR: GLM 5.3 SGLang cookbook

[Open primary source](https://docs.sglang.io/cookbook/autoregressive/GLM/GLM-5.3)

Type: primary engine documentation. Retrieved: 2026-10-15 UTC.

HTTP 200; current page re-read

Current cookbook resolves reasoning parser auto to glm45, tool-call parser auto to glm47; glm45 tool parser does not parse newer token format. Recipe evidence, not local runtime verification.

### glm-5.3-flash-VR: GLM 5.3 Flash vLLM recipe

[Open primary source](https://recipes.vllm.ai/zai-org/GLM-5.3-Flash)

Type: primary engine documentation. Retrieved: 2026-10-15 UTC.

HTTP 200; current page re-read

Historical integration instruction remains; FlashInfer minimum differs (0.6.17 prerequisite versus 0.6.18 troubleshooting). TP4 and PD layout are documented candidates, not target validation.

### glm-5.3-flash-GR: GLM 5.3 Flash SGLang cookbook

[Open primary source](https://docs.sglang.io/cookbook/autoregressive/GLM/GLM-5.3-Flash)

Type: primary engine documentation. Retrieved: 2026-10-15 UTC.

HTTP 200; current page re-read

CUDA pairs FP8 KV with TRT-LLM DSA, BF16 KV with TileLang; PD preview has dummy-weight mechanical checks only and no speculative decoding. Parser roles: reasoning glm45, tools glm47. thinking:false advice conflicts with pinned template opening <think> unconditionally; do not treat that switch as verified.

### deepseek-v4-flash-0731-VR: vLLM DeepSeek V4 Flash recipe

[Open primary source](https://recipes.vllm.ai/deepseek-ai/DeepSeek-V4-Flash?features=tool_calling,reasoning&hardware=b300)

Type: primary documentation. Retrieved: 2026-10-15 UTC.

TP1/DP4+EP Blackwell baseline and exact 0731 DSpark path checked. Probabilistic 7-token recipe differs from the publisher’s greedy example.

### deepseek-v4-flash-0731-FAMILY: DeepSeek V4 Flash preview-family card

[Open primary source](https://huggingface.co/deepseek-ai/DeepSeek-V4-Flash/blob/60d8d70770c6776ff598c94bb586a859a38244f1/README.md)

Type: publisher model card. Retrieved: 2026-10-15 UTC.

Immutable revision: `60d8d70770c6776ff598c94bb586a859a38244f1`.

284B/13B is a preview-family claim; it is not transferred to the exact 0731 checkpoint count.

### qwen3.8-27b-FP8: Official Qwen 27B FP8 card

[Open primary source](https://huggingface.co/Qwen/Qwen3.8-27B-FP8/raw/017b9c7af6b5689d5dd426a76e0bc077eb5ca20a/README.md)

Type: publisher model card. Retrieved: 2026-10-15 UTC.

Immutable revision: `017b9c7af6b5689d5dd426a76e0bc077eb5ca20a`.

Publisher-owned repository API and immutable raw metadata retrieved successfully; no model weights downloaded.

### qwen3.8-27b-NV: NVIDIA mixed NVFP4/FP8 Qwen 27B card

[Open primary source](https://huggingface.co/nvidia/Qwen3.8-27B-NVFP4/raw/482ca0f3832238542f8f5295dde86b5f22711d80/README.md)

Type: publisher model card. Retrieved: 2026-10-15 UTC.

Immutable revision: `482ca0f3832238542f8f5295dde86b5f22711d80`.

Publisher-owned repository API and immutable raw metadata retrieved successfully; no model weights downloaded.

### qwen3.8-27b-VR: vLLM Qwen 27B recipe

[Open primary source](https://recipes.vllm.ai/Qwen/Qwen3.8-27B)

Type: primary documentation. Retrieved: 2026-10-15 UTC.

Current engine documentation retrieved; statements describe upstream documentation or measurements, not local serving validation.

Recipes are not immutable engine binaries.

### qwen3.8-27b-GR: SGLang Qwen 27B cookbook

[Open primary source](https://docs.sglang.io/cookbook/autoregressive/Qwen/Qwen3.8-27B)

Type: primary documentation. Retrieved: 2026-10-15 UTC.

Current engine documentation retrieved; statements describe upstream documentation or measurements, not local serving validation.

Recipes are not immutable engine binaries.

### qwen3.8-flash-next-NV: NVIDIA mixed Flash Next export card

[Open primary source](https://huggingface.co/nvidia/Qwen3.8-Flash-Next-NVFP4/raw/fc694b54fb0174e0913e6adf86691ef85a4ead47/README.md)

Type: publisher model card. Retrieved: 2026-10-15 UTC.

Immutable revision: `fc694b54fb0174e0913e6adf86691ef85a4ead47`.

Publisher-owned repository API and immutable raw metadata retrieved successfully; no model weights downloaded.

### qwen3.8-flash-next-VR: vLLM Flash Next recipe

[Open primary source](https://recipes.vllm.ai/Qwen/Qwen3.8-Flash-Next)

Type: primary documentation. Retrieved: 2026-10-15 UTC.

Current engine documentation retrieved; statements describe upstream documentation or measurements, not local serving validation.

Recipes are not immutable engine binaries.

### gemma-4-31b-it-FP8: Red Hat Gemma block FP8 pinned card

[Open primary source](https://huggingface.co/RedHatAI/gemma-4-31B-it-FP8-block/raw/d7242548c457ab4b45bd3adb8937f2659af4739d/README.md)

Type: exporter model card. Retrieved: 2026-10-15 UTC.

Immutable revision: `d7242548c457ab4b45bd3adb8937f2659af4739d`.

Names exact base; documents W8A8 block/group recipe and exclusions; advertised 50% memory saving is not a runtime measurement here.

### gemma-4-31b-it-NV: Red Hat Gemma NVFP4 pinned card

[Open primary source](https://huggingface.co/RedHatAI/gemma-4-31B-it-NVFP4/raw/5df75ccad9b74546f5be758a2a68acc2e16bbc9b/README.md)

Type: exporter model card. Retrieved: 2026-10-15 UTC.

Immutable revision: `5df75ccad9b74546f5be758a2a68acc2e16bbc9b`.

Names exact base; documents group-16 W4A4 with local activation scaling. Generic audio example conflicts with variant-specific publisher modality/config and is not accepted as audio support.

Example includes an audio limit; base 31B config has audio_config null. Do not infer audio capability.

### mistral-medium-3.5-TREE: Mistral pinned dual-layout file metadata

[Open primary source](https://huggingface.co/api/models/mistralai/Mistral-Medium-3.5-128B/tree/22b2b868a15677cfa6061277ed2f653d1349a9ab?recursive=false&expand=false)

Type: Hugging Face repository metadata. Retrieved: 2026-10-15 UTC.

Immutable revision: `22b2b868a15677cfa6061277ed2f653d1349a9ab`.

Lists three consolidated and three Transformers safetensors files as alternative layouts; file metadata alone is not a tensor-content equality proof.

### mistral-medium-3.5-FIXCFG: Mistral Transformers YaRN correction commit

[Open primary source](https://huggingface.co/mistralai/Mistral-Medium-3.5-128B/commit/c4be198050fb5789774a55b92ed697becfbf20ae)

Type: publisher configuration correction. Retrieved: 2026-10-15 UTC.

Immutable revision: `c4be198050fb5789774a55b92ed697becfbf20ae`.

Actual correction commit c4be198050fb5789774a55b92ed697becfbf20ae changes mscale_all_dim from1.0 to0.0; replaces duplicate mutable config citation.

### GREG: SGLang registry, inspected lines 1–159

[Open primary source](https://github.com/sgl-project/sglang/blob/877be2974aa151a984e52822c028276c2b1e9303/python/sglang/srt/models/registry.py)

Type: pinned source code. Retrieved: 2026-10-15 UTC.

Source re-read at the inspected revision; also byte-identical at separately recorded current main snapshot. No execution test.

### kimi-k3-LICENSE: Kimi K3 license

[Open primary source](https://huggingface.co/moonshotai/Kimi-K3/blob/f831ab66814297da540d832a5235f8e904f29d06/LICENSE)

Type: publisher license. Retrieved: 2026-10-15 UTC.

Immutable revision: `f831ab66814297da540d832a5235f8e904f29d06`.

Exact custom Kimi K3 license file retrieved and read.

### kimi-k3-NV-CFG: NVIDIA Kimi K3 mixed configuration

[Open primary source](https://huggingface.co/nvidia/Kimi-K3-NVFP4/raw/b2428a0b83a8b712ff2e1a8448a103d4175341f1/config.json)

Type: publisher configuration. Retrieved: 2026-10-15 UTC.

Immutable revision: `b2428a0b83a8b712ff2e1a8448a103d4175341f1`.

Parsed immutable ModelOpt mixed-precision configuration: expert groups of 16 and FP8_PB_WO attention entries. Module aliases are not counted as distinct layers.

### kimi-k3-NV-LICENSE: NVIDIA Kimi K3 checked-in license

[Open primary source](https://huggingface.co/nvidia/Kimi-K3-NVFP4/blob/b2428a0b83a8b712ff2e1a8448a103d4175341f1/LICENSE)

Type: publisher license. Retrieved: 2026-10-15 UTC.

Immutable revision: `b2428a0b83a8b712ff2e1a8448a103d4175341f1`.

Byte-identical to the selected base Kimi K3 license file; the card separately identifies the NVIDIA Open Model Agreement.

### kimi-k3-DRAFT-CFG: Inferact Kimi K3 DSpark config

[Open primary source](https://huggingface.co/Inferact/Kimi-K3-DSpark/raw/cf6b8244620e7ea4b0651d214f28e89eac75bed6/config.json)

Type: publisher configuration. Retrieved: 2026-10-15 UTC.

Immutable revision: `cf6b8244620e7ea4b0651d214f28e89eac75bed6`.

Five K3DSparkModel layers; target feature IDs [2, 23, 47, 71, 89]. Token and positional settings checked.

### kimi-k3-DRAFT-SG-CFG: RadixArk Kimi K3 DSpark config

[Open primary source](https://huggingface.co/RadixArk/Kimi-K3-DSpark/raw/3c5bac301d9cf392706189d82ed947feca6c2f0f/config.json)

Type: publisher configuration. Retrieved: 2026-10-15 UTC.

Immutable revision: `3c5bac301d9cf392706189d82ed947feca6c2f0f`.

Five full-attention layers, 64 query heads, 16 KV heads, feature IDs [7, 23, 51, 67, 83] and block size 7 verified.

### KIMIVPR-MIXED: vLLM ModelOpt mixed-dispatch PR

[Open primary source](https://github.com/vllm-project/vllm/pull/50617)

Type: primary documentation. Retrieved: 2026-10-15 UTC.

Official API confirms open/unmerged state. NVIDIA tracks this as part of the replacement for its runtime patch.

### KIMIVPR-SCALE: vLLM TRTLLM NVFP4 SiTU scaling PR

[Open primary source](https://github.com/vllm-project/vllm/pull/52405)

Type: primary documentation. Retrieved: 2026-10-15 UTC.

Official API confirms open/unmerged state. NVIDIA tracks this as part of the replacement for its runtime patch.

### GREL-KIMI-ANCESTRY: SGLang Kimi mixed NVFP4 fix ancestry in v0.5.21

[Open primary source](https://github.com/sgl-project/sglang/compare/5f128395910dafb98c34083dc26cb790c7674d34...v0.5.21)

Type: GitHub commit ancestry. Retrieved: 2026-10-15 UTC.

Official compare API confirms merge is ancestor of v0.5.21; source inclusion only, not a tested wheel/image

status=ahead, behind_by=0, merge_base=5f128395910dafb98c34083dc26cb790c7674d34; establishes source history inclusion, not installed-image contents or correctness.

### deepseek-v4-flash-0731-LICENSE: DeepSeek V4 Flash 0731 license

[Open primary source](https://huggingface.co/deepseek-ai/DeepSeek-V4-Flash-0731/blob/7872f01b1d1fe23eabc4c98b48bffcef5a386062/LICENSE)

Type: publisher license. Retrieved: 2026-10-15 UTC.

Immutable revision: `7872f01b1d1fe23eabc4c98b48bffcef5a386062`.

Exact MIT file retrieved; the card explicitly applies it to the repository and model weights.

### deepseek-v4-flash-0731-INFER-CFG: DeepSeek V4 Flash 0731 reference inference configuration

[Open primary source](https://huggingface.co/deepseek-ai/DeepSeek-V4-Flash-0731/raw/7872f01b1d1fe23eabc4c98b48bffcef5a386062/inference/config.json)

Type: publisher configuration. Retrieved: 2026-10-15 UTC.

Immutable revision: `7872f01b1d1fe23eabc4c98b48bffcef5a386062`.

Reference config sets 43 target layers and 3 draft stages; mixed FP4/FP8 settings and all 46 compression entries checked.

### deepseek-v4-flash-0731-INFER-SRC: DeepSeek V4 Flash 0731 reference inference source

[Open primary source](https://huggingface.co/deepseek-ai/DeepSeek-V4-Flash-0731/blob/7872f01b1d1fe23eabc4c98b48bffcef5a386062/inference/model.py)

Type: publisher source. Retrieved: 2026-10-15 UTC.

Immutable revision: `7872f01b1d1fe23eabc4c98b48bffcef5a386062`.

Packed FP4 with groups of 32/E8M0 scales, FP8 blocks of 128, zero-based feature IDs and DSparkBlock construction checked. Source inspection only.

### deepseek-v4-flash-0731-ENC: DeepSeek V4 Flash 0731 encoding documentation

[Open primary source](https://huggingface.co/deepseek-ai/DeepSeek-V4-Flash-0731/blob/7872f01b1d1fe23eabc4c98b48bffcef5a386062/encoding/README.md)

Type: publisher documentation. Retrieved: 2026-10-15 UTC.

Immutable revision: `7872f01b1d1fe23eabc4c98b48bffcef5a386062`.

Dedicated Python encoding/parsing contract and reasoning modes reviewed.

### deepseek-v4-flash-0731-GR: SGLang DeepSeek V4 cookbook

[Open primary source](https://docs.sglang.io/cookbook/autoregressive/DeepSeek/DeepSeek-V4)

Type: primary documentation. Retrieved: 2026-10-15 UTC.

Exact 0731 TP4/flashinfer_mxfp4/DSpark command; upstream reports 4 GB300 GPUs with v0.5.16. Parser names and 5 proposals/6 verification tokens checked; 304B scope unresolved.

### glm-5.3-INDEX: zai-org/GLM-5.3 model.safetensors.index.json

[Open primary source](https://huggingface.co/zai-org/GLM-5.3/resolve/ba32f8c19c8738e2c57c71798c601d477a7bf844/model.safetensors.index.json)

Type: checkpoint index metadata. Retrieved: 2026-10-15 UTC.

Immutable revision: `ba32f8c19c8738e2c57c71798c601d477a7bf844`.

HTTP 200; pinned contents inspected; no GPU execution

Index metadata total_size is serialized tensor bytes, not peak memory.

### glm-5.3-LICENSE: zai-org/GLM-5.3 LICENSE

[Open primary source](https://huggingface.co/zai-org/GLM-5.3/raw/ba32f8c19c8738e2c57c71798c601d477a7bf844/LICENSE)

Type: publisher license. Retrieved: 2026-10-15 UTC.

Immutable revision: `ba32f8c19c8738e2c57c71798c601d477a7bf844`.

HTTP 200; pinned contents inspected; no GPU execution

### glm-5.3-BF16-CARD: zai-org/GLM-5.3-BF16 README.md

[Open primary source](https://huggingface.co/zai-org/GLM-5.3-BF16/raw/abf42e6c0e53bc29a875511301e7b7fcd220315b/README.md)

Type: publisher model card. Retrieved: 2026-10-15 UTC.

Immutable revision: `abf42e6c0e53bc29a875511301e7b7fcd220315b`.

HTTP 200; pinned contents inspected; no GPU execution

### glm-5.3-BF16-CFG: zai-org/GLM-5.3-BF16 config.json

[Open primary source](https://huggingface.co/zai-org/GLM-5.3-BF16/raw/abf42e6c0e53bc29a875511301e7b7fcd220315b/config.json)

Type: publisher configuration. Retrieved: 2026-10-15 UTC.

Immutable revision: `abf42e6c0e53bc29a875511301e7b7fcd220315b`.

HTTP 200; pinned contents inspected; no GPU execution

### glm-5.3-BF16-INDEX: zai-org/GLM-5.3-BF16 model.safetensors.index.json

[Open primary source](https://huggingface.co/zai-org/GLM-5.3-BF16/resolve/abf42e6c0e53bc29a875511301e7b7fcd220315b/model.safetensors.index.json)

Type: checkpoint index metadata. Retrieved: 2026-10-15 UTC.

Immutable revision: `abf42e6c0e53bc29a875511301e7b7fcd220315b`.

HTTP 200; pinned contents inspected; no GPU execution

Index metadata total_size is serialized tensor bytes, not peak memory.

### glm-5.3-NV-CFG: RedHatAI/GLM-5.3-NVFP4 config.json

[Open primary source](https://huggingface.co/RedHatAI/GLM-5.3-NVFP4/raw/c8917e4258572c405575855ff53effe58c17a38e/config.json)

Type: exporter quantization configuration. Retrieved: 2026-10-15 UTC.

Immutable revision: `c8917e4258572c405575855ff53effe58c17a38e`.

HTTP 200; pinned contents inspected; no GPU execution

### glm-5.3-NV-INDEX: RedHatAI/GLM-5.3-NVFP4 model.safetensors.index.json

[Open primary source](https://huggingface.co/RedHatAI/GLM-5.3-NVFP4/resolve/c8917e4258572c405575855ff53effe58c17a38e/model.safetensors.index.json)

Type: checkpoint index metadata. Retrieved: 2026-10-15 UTC.

Immutable revision: `c8917e4258572c405575855ff53effe58c17a38e`.

HTTP 200; pinned contents inspected; no GPU execution

Index metadata total_size is serialized tensor bytes, not peak memory.

### glm-5.3-INFERACT-CARD: Inferact/GLM-5.3-NVFP4 README.md

[Open primary source](https://huggingface.co/Inferact/GLM-5.3-NVFP4/raw/ce67b36f3669192b5bb233819f0fda6c8a9837f8/README.md)

Type: exporter model card. Retrieved: 2026-10-15 UTC.

Immutable revision: `ce67b36f3669192b5bb233819f0fda6c8a9837f8`.

HTTP 200; pinned contents inspected; no GPU execution

### glm-5.3-INFERACT-CFG: Inferact/GLM-5.3-NVFP4 config.json

[Open primary source](https://huggingface.co/Inferact/GLM-5.3-NVFP4/raw/ce67b36f3669192b5bb233819f0fda6c8a9837f8/config.json)

Type: exporter quantization configuration. Retrieved: 2026-10-15 UTC.

Immutable revision: `ce67b36f3669192b5bb233819f0fda6c8a9837f8`.

HTTP 200; pinned contents inspected; no GPU execution

### glm-5.3-INFERACT-INDEX: Inferact/GLM-5.3-NVFP4 model.safetensors.index.json

[Open primary source](https://huggingface.co/Inferact/GLM-5.3-NVFP4/resolve/ce67b36f3669192b5bb233819f0fda6c8a9837f8/model.safetensors.index.json)

Type: checkpoint index metadata. Retrieved: 2026-10-15 UTC.

Immutable revision: `ce67b36f3669192b5bb233819f0fda6c8a9837f8`.

HTTP 200; pinned contents inspected; no GPU execution

Index metadata total_size is serialized tensor bytes, not peak memory.

### glm-5.3-META: zai-org/GLM-5.3 pinned Hub metadata

[Open primary source](https://huggingface.co/api/models/zai-org/GLM-5.3/revision/ba32f8c19c8738e2c57c71798c601d477a7bf844)

Type: publisher artifact metadata. Retrieved: 2026-10-15 UTC.

Immutable revision: `ba32f8c19c8738e2c57c71798c601d477a7bf844`.

HTTP 200; returned sha matches requested revision; safetensors parameter metadata inspected

Hub metadata is not an independent full checkpoint census.

### glm-5.3-BF16-HEADERS: GLM-5.3 BF16 MTP safetensors headers (five shards)

[Open primary source](https://huggingface.co/zai-org/GLM-5.3-BF16/tree/abf42e6c0e53bc29a875511301e7b7fcd220315b)

Type: publisher tensor-header metadata. Retrieved: 2026-10-15 UTC.

Immutable revision: `abf42e6c0e53bc29a875511301e7b7fcd220315b`.

HTTP 206 range reads; 791 tensor-shape products summed to 9,952,920,576; no tensor payload reads

Main estimate subtracts extra-layer count from Hub total; not full independent census.

### glm-5.3-flash-INDEX: zai-org/GLM-5.3-Flash model.safetensors.index.json

[Open primary source](https://huggingface.co/zai-org/GLM-5.3-Flash/resolve/46a050bec13002ad29ee795c16e61cf4fa3c4a9c/model.safetensors.index.json)

Type: checkpoint index metadata. Retrieved: 2026-10-15 UTC.

Immutable revision: `46a050bec13002ad29ee795c16e61cf4fa3c4a9c`.

HTTP 200; pinned contents inspected; no GPU execution

Index metadata total_size is serialized tensor bytes, not peak memory.

### glm-5.3-flash-LICENSE: zai-org/GLM-5.3-Flash LICENSE

[Open primary source](https://huggingface.co/zai-org/GLM-5.3-Flash/raw/46a050bec13002ad29ee795c16e61cf4fa3c4a9c/LICENSE)

Type: publisher license. Retrieved: 2026-10-15 UTC.

Immutable revision: `46a050bec13002ad29ee795c16e61cf4fa3c4a9c`.

HTTP 200; pinned contents inspected; no GPU execution

### glm-5.3-flash-BF16-CARD: zai-org/GLM-5.3-Flash-BF16 README.md

[Open primary source](https://huggingface.co/zai-org/GLM-5.3-Flash-BF16/raw/f9fed3bbc82291073373d67452e9f25317ef7577/README.md)

Type: publisher model card. Retrieved: 2026-10-15 UTC.

Immutable revision: `f9fed3bbc82291073373d67452e9f25317ef7577`.

HTTP 200; pinned contents inspected; no GPU execution

### glm-5.3-flash-BF16-CFG: zai-org/GLM-5.3-Flash-BF16 config.json

[Open primary source](https://huggingface.co/zai-org/GLM-5.3-Flash-BF16/raw/f9fed3bbc82291073373d67452e9f25317ef7577/config.json)

Type: publisher configuration. Retrieved: 2026-10-15 UTC.

Immutable revision: `f9fed3bbc82291073373d67452e9f25317ef7577`.

HTTP 200; pinned contents inspected; no GPU execution

### glm-5.3-flash-BF16-INDEX: zai-org/GLM-5.3-Flash-BF16 model.safetensors.index.json

[Open primary source](https://huggingface.co/zai-org/GLM-5.3-Flash-BF16/resolve/f9fed3bbc82291073373d67452e9f25317ef7577/model.safetensors.index.json)

Type: checkpoint index metadata. Retrieved: 2026-10-15 UTC.

Immutable revision: `f9fed3bbc82291073373d67452e9f25317ef7577`.

HTTP 200; pinned contents inspected; no GPU execution

Index metadata total_size is serialized tensor bytes, not peak memory.

### glm-5.3-flash-NV: RedHatAI/GLM-5.3-Flash-NVFP4 README.md

[Open primary source](https://huggingface.co/RedHatAI/GLM-5.3-Flash-NVFP4/raw/18d55bfd5a2194887738da73753975c9d3842f46/README.md)

Type: exporter model card. Retrieved: 2026-10-15 UTC.

Immutable revision: `18d55bfd5a2194887738da73753975c9d3842f46`.

HTTP 200; pinned contents inspected; no GPU execution

### glm-5.3-flash-NV-CFG: RedHatAI/GLM-5.3-Flash-NVFP4 config.json

[Open primary source](https://huggingface.co/RedHatAI/GLM-5.3-Flash-NVFP4/raw/18d55bfd5a2194887738da73753975c9d3842f46/config.json)

Type: exporter quantization configuration. Retrieved: 2026-10-15 UTC.

Immutable revision: `18d55bfd5a2194887738da73753975c9d3842f46`.

HTTP 200; pinned contents inspected; no GPU execution

### glm-5.3-flash-NV-INDEX: RedHatAI/GLM-5.3-Flash-NVFP4 model.safetensors.index.json

[Open primary source](https://huggingface.co/RedHatAI/GLM-5.3-Flash-NVFP4/resolve/18d55bfd5a2194887738da73753975c9d3842f46/model.safetensors.index.json)

Type: checkpoint index metadata. Retrieved: 2026-10-15 UTC.

Immutable revision: `18d55bfd5a2194887738da73753975c9d3842f46`.

HTTP 200; pinned contents inspected; no GPU execution

Index metadata total_size is serialized tensor bytes, not peak memory.

### glm-5.3-flash-META: zai-org/GLM-5.3-Flash pinned Hub metadata

[Open primary source](https://huggingface.co/api/models/zai-org/GLM-5.3-Flash/revision/46a050bec13002ad29ee795c16e61cf4fa3c4a9c)

Type: publisher artifact metadata. Retrieved: 2026-10-15 UTC.

Immutable revision: `46a050bec13002ad29ee795c16e61cf4fa3c4a9c`.

HTTP 200; returned sha matches requested revision; safetensors parameter metadata inspected

Hub metadata is not an independent full checkpoint census.

### qwen3.8-27b-FP8-CFG: Official Qwen 27B FP8 quantization configuration

[Open primary source](https://huggingface.co/Qwen/Qwen3.8-27B-FP8/raw/017b9c7af6b5689d5dd426a76e0bc077eb5ca20a/config.json)

Type: publisher configuration. Retrieved: 2026-10-15 UTC.

Immutable revision: `017b9c7af6b5689d5dd426a76e0bc077eb5ca20a`.

Publisher-owned repository API and immutable raw metadata retrieved successfully; no model weights downloaded.

### qwen3.8-27b-NV-CFG: NVIDIA Qwen 27B mixed configuration

[Open primary source](https://huggingface.co/nvidia/Qwen3.8-27B-NVFP4/raw/482ca0f3832238542f8f5295dde86b5f22711d80/config.json)

Type: publisher configuration. Retrieved: 2026-10-15 UTC.

Immutable revision: `482ca0f3832238542f8f5295dde86b5f22711d80`.

Publisher-owned repository API and immutable raw metadata retrieved successfully; no model weights downloaded.

### qwen3.8-27b-NV-QUANT: NVIDIA Qwen 27B quantization metadata

[Open primary source](https://huggingface.co/nvidia/Qwen3.8-27B-NVFP4/raw/482ca0f3832238542f8f5295dde86b5f22711d80/hf_quant_config.json)

Type: publisher configuration. Retrieved: 2026-10-15 UTC.

Immutable revision: `482ca0f3832238542f8f5295dde86b5f22711d80`.

Publisher-owned repository API and immutable raw metadata retrieved successfully; no model weights downloaded.

### qwen3.8-flash-next-FP8: Official Qwen Flash Next FP8 card

[Open primary source](https://huggingface.co/Qwen/Qwen3.8-Flash-Next-FP8/raw/236dfdf285828023ca3bcd3f37366c58a3469b13/README.md)

Type: publisher model card. Retrieved: 2026-10-15 UTC.

Immutable revision: `236dfdf285828023ca3bcd3f37366c58a3469b13`.

Publisher-owned repository API and immutable raw metadata retrieved successfully; no model weights downloaded.

### qwen3.8-flash-next-FP8-CFG: Official Qwen Flash Next FP8 quantization configuration

[Open primary source](https://huggingface.co/Qwen/Qwen3.8-Flash-Next-FP8/raw/236dfdf285828023ca3bcd3f37366c58a3469b13/config.json)

Type: publisher configuration. Retrieved: 2026-10-15 UTC.

Immutable revision: `236dfdf285828023ca3bcd3f37366c58a3469b13`.

Publisher-owned repository API and immutable raw metadata retrieved successfully; no model weights downloaded.

### qwen3.8-flash-next-NV-CFG: NVIDIA Flash Next mixed configuration

[Open primary source](https://huggingface.co/nvidia/Qwen3.8-Flash-Next-NVFP4/raw/fc694b54fb0174e0913e6adf86691ef85a4ead47/config.json)

Type: publisher configuration. Retrieved: 2026-10-15 UTC.

Immutable revision: `fc694b54fb0174e0913e6adf86691ef85a4ead47`.

Publisher-owned repository API and immutable raw metadata retrieved successfully; no model weights downloaded.

### qwen3.8-flash-next-NV-QUANT: NVIDIA Flash Next quantization metadata

[Open primary source](https://huggingface.co/nvidia/Qwen3.8-Flash-Next-NVFP4/raw/fc694b54fb0174e0913e6adf86691ef85a4ead47/hf_quant_config.json)

Type: publisher configuration. Retrieved: 2026-10-15 UTC.

Immutable revision: `fc694b54fb0174e0913e6adf86691ef85a4ead47`.

Publisher-owned repository API and immutable raw metadata retrieved successfully; no model weights downloaded.

### qwen3.8-flash-next-GR: SGLang Flash Next cookbook

[Open primary source](https://docs.sglang.io/cookbook/autoregressive/Qwen/Qwen3.8-Flash-Next)

Type: primary documentation. Retrieved: 2026-10-15 UTC.

Retrieved and inspected. PR 41046 adds NVIDIA TP1 B200/B300/GB300 recipes with verified=false; it explicitly claims no new GPU measurements.

Cookbook narrative has stale deployment-table and thinking/sampling statements; prefer pinned generator for recipe shape and publisher card for model behavior.

### qwen3.8-flash-next-GPR: SGLang exact NVIDIA Flash Next B300 recipe PR 41046

[Open primary source](https://github.com/sgl-project/sglang/pull/41046)

Type: upstream pull request. Retrieved: 2026-10-15 UTC.

Immutable revision: `a1eb691ab51bc461378b2fcca8991883add4f1b5`.

Retrieved and inspected. PR 41046 adds NVIDIA TP1 B200/B300/GB300 recipes with verified=false; it explicitly claims no new GPU measurements.

Merged 2026-09-24T21:19:01Z into main; six added cells explicitly unverified.

### qwen3.8-flash-next-GR-SOURCE: Pinned SGLang Flash Next recipe generator after PR 41046

[Open primary source](https://raw.githubusercontent.com/sgl-project/sglang/a1eb691ab51bc461378b2fcca8991883add4f1b5/docs/src/snippets/configs/Qwen/qwen3.8-flash-next.jsx)

Type: upstream source. Retrieved: 2026-10-15 UTC.

Immutable revision: `a1eb691ab51bc461378b2fcca8991883add4f1b5`.

B300 NVIDIA target-only cell inspected at lines 789-802; TP1, FlashInfer linear prefill/decode, BF16 SSM, reasoning-parser auto, verified=false.

Source recipe, not a tested container or local benchmark.

### gemma-4-31b-it-FP8-CFG: Red Hat Gemma block FP8 pinned configuration

[Open primary source](https://huggingface.co/RedHatAI/gemma-4-31B-it-FP8-block/raw/d7242548c457ab4b45bd3adb8937f2659af4739d/config.json)

Type: exporter configuration. Retrieved: 2026-10-15 UTC.

Immutable revision: `d7242548c457ab4b45bd3adb8937f2659af4739d`.

compressed-tensors; weight block_structure [128,128]; input group_size 128 and dynamic true; vision/lm_head/embeddings ignored.

### gemma-4-31b-it-NV-CFG: Red Hat Gemma NVFP4 pinned configuration

[Open primary source](https://huggingface.co/RedHatAI/gemma-4-31B-it-NVFP4/raw/5df75ccad9b74546f5be758a2a68acc2e16bbc9b/config.json)

Type: exporter configuration. Retrieved: 2026-10-15 UTC.

Immutable revision: `5df75ccad9b74546f5be758a2a68acc2e16bbc9b`.

nvfp4-pack-quantized; W4A4 group size16, tensor_group scales, input dynamic local; vision linears/lm_head ignored. Targets are Linear, not embedding modules.

### gemma-4-31b-it-BASE-TREE: Gemma BF16 pinned file metadata

[Open primary source](https://huggingface.co/api/models/google/gemma-4-31B-it/tree/842da3794eaa0b77d5f08bae87a17459d91ff475?recursive=false&expand=false)

Type: Hugging Face repository metadata. Retrieved: 2026-10-15 UTC.

Immutable revision: `842da3794eaa0b77d5f08bae87a17459d91ff475`.

Two safetensors files sum to 62546338248 bytes, including headers; metadata only, no weights downloaded.

### gemma-4-31b-it-FP8-TREE: Gemma FP8 pinned file metadata

[Open primary source](https://huggingface.co/api/models/RedHatAI/gemma-4-31B-it-FP8-block/tree/d7242548c457ab4b45bd3adb8937f2659af4739d?recursive=false&expand=false)

Type: Hugging Face repository metadata. Retrieved: 2026-10-15 UTC.

Immutable revision: `d7242548c457ab4b45bd3adb8937f2659af4739d`.

Two safetensors files sum to 33263238928 bytes, including headers; metadata only, no weights downloaded.

### gemma-4-31b-it-NV-TREE: Gemma NVFP4 pinned file metadata

[Open primary source](https://huggingface.co/api/models/RedHatAI/gemma-4-31B-it-NVFP4/tree/5df75ccad9b74546f5be758a2a68acc2e16bbc9b?recursive=false&expand=false)

Type: Hugging Face repository metadata. Retrieved: 2026-10-15 UTC.

Immutable revision: `5df75ccad9b74546f5be758a2a68acc2e16bbc9b`.

One safetensors file is listed as 23265401144 bytes, including header; metadata only, no weights downloaded.

### gemma-4-31b-it-LICENSE: Google Gemma Apache 2.0 license page

[Open primary source](https://ai.google.dev/gemma/apache_2)

Type: publisher license page. Retrieved: 2026-10-15 UTC.

Google base and derivative cards link to this publisher Apache 2.0 license page; no derivative-only inference is needed.

### mistral-medium-3.5-HF-INDEX: Mistral pinned Transformers weight index

[Open primary source](https://huggingface.co/mistralai/Mistral-Medium-3.5-128B/raw/22b2b868a15677cfa6061277ed2f653d1349a9ab/model.safetensors.index.json)

Type: publisher weight-index metadata. Retrieved: 2026-10-15 UTC.

Immutable revision: `22b2b868a15677cfa6061277ed2f653d1349a9ab`.

metadata.total_size=133605834656 bytes; this is tensor payload excluding safetensors headers.

### mistral-medium-3.5-NATIVE-INDEX: Mistral pinned consolidated weight index

[Open primary source](https://huggingface.co/mistralai/Mistral-Medium-3.5-128B/raw/22b2b868a15677cfa6061277ed2f653d1349a9ab/consolidated.safetensors.index.json)

Type: publisher weight-index metadata. Retrieved: 2026-10-15 UTC.

Immutable revision: `22b2b868a15677cfa6061277ed2f653d1349a9ab`.

metadata.total_size=133605834656 bytes; alternative layout has same reported payload.

### mistral-medium-3.5-LICENSE: Mistral pinned Modified MIT License

[Open primary source](https://huggingface.co/mistralai/Mistral-Medium-3.5-128B/raw/22b2b868a15677cfa6061277ed2f653d1349a9ab/LICENSE)

Type: publisher license file. Retrieved: 2026-10-15 UTC.

Immutable revision: `22b2b868a15677cfa6061277ed2f653d1349a9ab`.

Exact title and revenue restriction checked; the license condition concerns preceding-month global consolidated company/employer revenue exceeding US$20million.

### mistral-medium-3.5-GR: SGLang Mistral Medium3.5 deployment cookbook

[Open primary source](https://docs.sglang.io/cookbook/autoregressive/Mistral/Mistral-Medium-3.5)

Type: serving-engine documentation. Retrieved: 2026-10-15 UTC.

Documents exact static-FP8 artifact and both layouts; benchmark claims use4xH200. Its B300 TP2 recommendation is a recipe, not a universal TP minimum or local measurement.

### TOOL-SGLANG-ARGS: SGLang server arguments

[Open primary source](https://docs.sglang.io/docs/advanced_features/server_arguments)

Type: primary documentation. Retrieved: 2026-10-15 UTC.

Retrieved through web tool and relevant sections read

Confirmed --tp-size aliases, BF16 KV option, served-name and config controls; live docs, not installed-engine validation.

### TOOL-VLLM-ARGS: vLLM serve CLI

[Open primary source](https://docs.vllm.ai/en/latest/cli/serve/)

Type: primary documentation. Retrieved: 2026-10-15 UTC.

Retrieved through web tool and relevant sections read

Confirmed served-name, tokenizer/config identity overrides and documented current CLI; not proof of image compatibility.

### TOOL-KSERVE-CONFIG: KServe configuration

[Open primary source](https://kserve.github.io/website/docs/admin-guide/configurations)

Type: primary documentation. Retrieved: 2026-10-15 UTC.

Retrieved through web tool and relevant sections read

Standard deployment annotation and automatic service-account token defaults reviewed.

### TOOL-KSERVE-CRD: KServe v0.21.0 InferenceService CRD

[Open primary source](https://raw.githubusercontent.com/kserve/kserve/v0.21.0/config/crd/full/serving.kserve.io_inferenceservices.yaml)

Type: versioned upstream schema. Retrieved: 2026-10-15 UTC.

Retrieved through web tool and relevant sections read

Version-tagged schema includes predictor automountServiceAccountToken boolean; renderer now emits false. No live admission performed.

### TOOL-K8S-NAMES: Kubernetes object names

[Open primary source](https://kubernetes.io/docs/concepts/overview/working-with-objects/names/)

Type: primary documentation. Retrieved: 2026-10-15 UTC.

Retrieved through web tool and relevant sections read

DNS name boundaries checked for PVC validation.

### TOOL-K8S-LABELS: Kubernetes labels and selectors

[Open primary source](https://kubernetes.io/docs/concepts/overview/working-with-objects/labels/)

Type: primary documentation. Retrieved: 2026-10-15 UTC.

Retrieved through web tool and relevant sections read

Label key/prefix/value syntax and lengths checked for node-selector validation.

### VNIGHTLY-DOC: vLLM official installation and nightly channels

[Open primary source](https://docs.vllm.ai/en/latest/getting_started/installation/gpu/)

Type: primary documentation. Retrieved: 2026-10-15 UTC.

### GNIGHTLY-DOC: SGLang official installation and nightly channels

[Open primary source](https://docs.sglang.io/docs/get-started/install)

Type: primary documentation. Retrieved: 2026-10-15 UTC.

### VMAIN: vLLM main snapshot observed at 2026-10-15 21:52 UTC

[Open primary source](https://github.com/vllm-project/vllm/commit/e711723352670e811b0e904300d771471e28930d)

Type: pinned commit metadata. Retrieved: 2026-10-15 UTC.

Commit date 2026-10-15T21:51:57Z; subject: [ROCm] gfx1250 optimizations and model enablement (#58800). No binary tested.

### GMAIN: SGLang main snapshot observed at 2026-10-15 21:52 UTC

[Open primary source](https://github.com/sgl-project/sglang/commit/91f6ef23223d8415724b1bbfab415bb5977fca0c)

Type: pinned commit metadata. Retrieved: 2026-10-15 UTC.

Commit date 2026-10-15T21:11:51Z; subject: [DSv4.1] Fuse request-window KV copies (#44555). No binary tested.

### KMAIN: KServe master snapshot observed at 2026-10-15 21:52 UTC

[Open primary source](https://github.com/kserve/kserve/commit/22be2b0496eea4548a98395c3abccf48d8235385)

Type: pinned commit metadata. Retrieved: 2026-10-15 UTC.

Commit date 2026-10-15T19:47:34Z; subject: chore: update urllib3 security floor to 2.8.0 (#6387). No binary tested.

### VDIR: Kimi vLLM NVIDIA implementation directory at inspected commit

[Open primary source](https://github.com/vllm-project/vllm/tree/f8460ef23659afd69046a81529ec2295e4c3f686/vllm/models/kimi_k3/nvidia)

Type: pinned directory metadata. Retrieved: 2026-10-15 UTC.

Directory names checked; not a full review of all file contents.

### VREL-QWEN-ANCESTRY: vLLM mixed block-FP8 MTP fix ancestry in v0.31.0

[Open primary source](https://github.com/vllm-project/vllm/compare/60ad959b6f1a5c8f602edbd608c8decbc0788c50...v0.31.0)

Type: GitHub commit ancestry. Retrieved: 2026-10-15 UTC.

status=ahead, behind_by=0, merge_base=60ad959b6f1a5c8f602edbd608c8decbc0788c50; establishes source history inclusion, not installed-image contents or correctness.

### KCRD21: KServe v0.21.0 LLMInferenceService schema

[Open primary source](https://github.com/kserve/kserve/blob/d1482554fc4f66dd41aee70e01f5174e24f265bd/config/crd/full/llmisvc/serving.kserve.io_llminferenceservices.yaml)

Type: pinned source code. Retrieved: 2026-10-15 UTC.

Both v1alpha1 and v1alpha2 served; v1alpha2 storage version.

### KCONFIGCRD21: KServe v0.21.0 LLMInferenceServiceConfig schema

[Open primary source](https://github.com/kserve/kserve/blob/d1482554fc4f66dd41aee70e01f5174e24f265bd/config/crd/full/llmisvc/serving.kserve.io_llminferenceserviceconfigs.yaml)

Type: pinned source code. Retrieved: 2026-10-15 UTC.

Both v1alpha1 and v1alpha2 served; v1alpha2 storage version.

### KCONST21: KServe v0.21.0 deployment-mode constants

[Open primary source](https://github.com/kserve/kserve/blob/d1482554fc4f66dd41aee70e01f5174e24f265bd/pkg/constants/constants.go)

Type: pinned source code. Retrieved: 2026-10-15 UTC.

Standard deployment mode defined; legacy RawDeployment maps to Standard.

### VNIGHTLY-INDEX: vLLM CUDA 13 nightly wheel index

[Open primary source](https://wheels.vllm.ai/nightly/cu130/vllm/)

Type: published artifact metadata. Retrieved: 2026-10-15 UTC.

Mutable index/registry listing observed; wheel bytes and container layers not downloaded or executed.

### GNIGHTLY-INDEX: SGLang CUDA 13 nightly wheel index

[Open primary source](https://sgl-project.github.io/whl/cu130/sglang/)

Type: published artifact metadata. Retrieved: 2026-10-15 UTC.

Mutable index/registry listing observed; wheel bytes and container layers not downloaded or executed.

### GNIGHTLY-TAGS: SGLang published nightly Docker tag metadata

[Open primary source](https://hub.docker.com/v2/repositories/lmsysorg/sglang/tags?page_size=5&name=nightly&ordering=last_updated)

Type: published artifact metadata. Retrieved: 2026-10-15 UTC.

Mutable index/registry listing observed; wheel bytes and container layers not downloaded or executed.
