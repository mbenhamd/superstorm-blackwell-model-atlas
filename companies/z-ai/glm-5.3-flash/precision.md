# GLM 5.3 Flash: precision and provenance

The official FP8 and BF16 variants and the exact RedHat derivative were rechecked at immutable revisions on 2026-10-16; the repository heads still resolve to the retained pins.

| Variant | Pinned artifact | Precision contract from configuration | Index tensor bytes |
| --- | --- | --- | --- |
| fp8 | [zai-org/GLM-5.3-Flash](https://huggingface.co/zai-org/GLM-5.3-Flash/raw/46a050bec13002ad29ee795c16e61cf4fa3c4a9c/config.json) | Block FP8 E4M3, 128×128 weight blocks, dynamic activations and explicit exclusions | 328,326,771,576 |
| bf16 | [zai-org/GLM-5.3-Flash-BF16](https://huggingface.co/zai-org/GLM-5.3-Flash-BF16/raw/f9fed3bbc82291073373d67452e9f25317ef7577/config.json) | BF16 reference with a small FP32 component; no quantization config | 642,646,653,816 |
| nvfp4 | [RedHatAI/GLM-5.3-Flash-NVFP4](https://huggingface.co/RedHatAI/GLM-5.3-Flash-NVFP4/raw/18d55bfd5a2194887738da73753975c9d3842f46/config.json) | compressed-tensors: main routed experts NVFP4 W4A4; MTP routed experts FP8 W8A8; other modules excluded | 197,816,133,372 |

The figures come from `metadata.total_size` in each pinned index, linked in [sources](sources.md). Native FP8 is **305.78 GiB** and RedHat NVFP4 is **184.23 GiB** of serialized tensors. Thus approximately 306 GiB and 185 GiB are useful rounded payload references, not measured GPU allocations. RedHat's export is about 39.75% smaller by this metric than the official FP8 artifact; a four-bit label does not imply a 50% reduction for the whole mixed checkpoint. [TOPG-FLASH-INDEX](https://huggingface.co/zai-org/GLM-5.3-Flash/resolve/46a050bec13002ad29ee795c16e61cf4fa3c4a9c/model.safetensors.index.json) [TOPG-FLASH-NV-INDEX](https://huggingface.co/RedHatAI/GLM-5.3-Flash-NVFP4/resolve/18d55bfd5a2194887738da73753975c9d3842f46/model.safetensors.index.json)

FP8 is a useful native-artifact baseline, but the 18B active headline does not establish that execution is dominated by kernel launches or that FP8 outperforms NVFP4. Batch size, prompt length, expert traffic, cache/state work and the selected kernels can change the limiting cost. The payload reduction creates potential memory headroom; a latency or throughput advantage remains a workload hypothesis.

## Exact RedHat contract

The NVFP4 group targets the routed-expert projection weights and activations in zero-based main layers 3–44, with group size 16. A second group targets MTP layer 45's routed experts using 8-bit floating-point weights in 128×128 blocks and dynamic 8-bit activations. The remaining modules are excluded from these quantization groups. This narrows the card's statement that MTP is kept in FP8 to the scope directly visible in the config. [glm-5.3-flash-NV-CFG](https://huggingface.co/RedHatAI/GLM-5.3-Flash-NVFP4/raw/18d55bfd5a2194887738da73753975c9d3842f46/config.json)

An exclusion records where the exporter did not apply those groups; it does not establish one dtype for every remaining tensor. In particular, retain separate evidence for vision, KDA, router, sparse attention, mHC and MTP. The Hub's parameter total for a packed derivative is not a replacement for the official checkpoint count, and the mixed NVFP4 target must not be treated as a uniformly four-bit recurrent model.

RedHat publishes selected reasoning benchmark scores but no paired FP8 table in this pinned card. Those scores do not establish lossless conversion, multimodal quality or B300 performance. NVIDIA and RadixArk exports named by the SGLang cookbook require their own config and calibration checks. [glm-5.3-flash-NV](https://huggingface.co/RedHatAI/GLM-5.3-Flash-NVFP4/raw/18d55bfd5a2194887738da73753975c9d3842f46/README.md)

## KV and deployment contract

SGLang's CUDA recipe pairs Blackwell FP8 KV with TRT-LLM DSA, or BF16 KV with TileLang DSA. Change the dtype and both DSA backends together; the cookbook says CUDA TileLang DSA plus FP8 KV is not a valid pairing for this model. Verify the exact image because this is a documented path, not a local execution result. [glm-5.3-flash-GR](https://docs.sglang.io/cookbook/autoregressive/GLM/GLM-5.3-Flash)

Pin the model, tokenizer/processor, config and engine/container revisions together. Establish target-only quality before comparing quantized KV or speculation. A root BF16 `dtype` does not mean every stored tensor is BF16, and casting quantized weights does not recover the original reference. See the [precision primer](../../../reports/precision-and-kernels.md).

## License provenance

The official FP8 and BF16 artifacts contain the MIT license; the RedHat card also declares MIT. These observations apply to the inspected revisions. Check any additional exporter or bundled-code terms before redistribution. No model tensor payloads are bundled here. [glm-5.3-flash-LICENSE](https://huggingface.co/zai-org/GLM-5.3-Flash/raw/46a050bec13002ad29ee795c16e61cf4fa3c4a9c/LICENSE)
