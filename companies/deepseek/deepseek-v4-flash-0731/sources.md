# DeepSeek V4 Flash 0731: sources

Re-retrieved on 2026-10-15 (UTC). Model cards, configurations and licenses below are linked to immutable repository revisions. Engine recipes and PR state are dated observations; they can change.

| Source ID | Primary artifact | Evidence boundary |
| --- | --- | --- |
| `deepseek-v4-flash-0731-CARD` | [DeepSeek V4 Flash 0731 card](https://huggingface.co/deepseek-ai/DeepSeek-V4-Flash-0731/blob/7872f01b1d1fe23eabc4c98b48bffcef5a386062/README.md) | Exact official release, bundled DSpark, both engine examples, encoding helpers, 384K output recommendation and MIT scope checked. |
| `deepseek-v4-flash-0731-CFG` | [DeepSeek V4 Flash 0731 config](https://huggingface.co/deepseek-ai/DeepSeek-V4-Flash-0731/raw/7872f01b1d1fe23eabc4c98b48bffcef5a386062/config.json) | Parsed immutable JSON; dimensions and all 46 compression entries verified. Root nextn metadata 1 differs from 3 reference DSpark stages. |
| `deepseek-v4-flash-0731-LICENSE` | [DeepSeek V4 Flash 0731 license](https://huggingface.co/deepseek-ai/DeepSeek-V4-Flash-0731/blob/7872f01b1d1fe23eabc4c98b48bffcef5a386062/LICENSE) | Exact MIT file retrieved; the card explicitly applies it to the repository and model weights. |
| `deepseek-v4-flash-0731-INFER-CFG` | [DeepSeek V4 Flash 0731 reference inference configuration](https://huggingface.co/deepseek-ai/DeepSeek-V4-Flash-0731/raw/7872f01b1d1fe23eabc4c98b48bffcef5a386062/inference/config.json) | Reference config sets 43 target layers and 3 draft stages; mixed FP4/FP8 settings and all 46 compression entries checked. |
| `deepseek-v4-flash-0731-INFER-SRC` | [DeepSeek V4 Flash 0731 reference inference source](https://huggingface.co/deepseek-ai/DeepSeek-V4-Flash-0731/blob/7872f01b1d1fe23eabc4c98b48bffcef5a386062/inference/model.py) | Packed FP4 with groups of 32/E8M0 scales, FP8 blocks of 128, zero-based feature IDs and DSparkBlock construction checked. Source inspection only. |
| `deepseek-v4-flash-0731-ENC` | [DeepSeek V4 Flash 0731 encoding documentation](https://huggingface.co/deepseek-ai/DeepSeek-V4-Flash-0731/blob/7872f01b1d1fe23eabc4c98b48bffcef5a386062/encoding/README.md) | Dedicated Python encoding/parsing contract and reasoning modes reviewed. |
| `deepseek-v4-flash-0731-FAMILY` | [DeepSeek V4 Flash preview-family card](https://huggingface.co/deepseek-ai/DeepSeek-V4-Flash/blob/60d8d70770c6776ff598c94bb586a859a38244f1/README.md) | 284B/13B is a preview-family claim; it is not transferred to the exact 0731 checkpoint count. |
| `deepseek-v4-flash-0731-VR` | [vLLM DeepSeek V4 Flash recipe](https://recipes.vllm.ai/deepseek-ai/DeepSeek-V4-Flash?features=tool_calling,reasoning&hardware=b300) | TP1/DP4+EP Blackwell baseline and exact 0731 DSpark path checked. Probabilistic 7-token recipe differs from the publisher’s greedy example. |
| `deepseek-v4-flash-0731-GR` | [SGLang DeepSeek V4 cookbook](https://docs.sglang.io/cookbook/autoregressive/DeepSeek/DeepSeek-V4) | Exact 0731 TP4/flashinfer_mxfp4/DSpark command; upstream reports 4 GB300 GPUs with v0.5.16. Parser names and 5 proposals/6 verification tokens checked; 304B scope unresolved. |

The global [source register](../../../evidence/sources.json) records these identifiers. [Validation](validation.md) distinguishes retrieved metadata and source inspection from GPU results. No full upstream checkout or model weights were produced by this audit.
