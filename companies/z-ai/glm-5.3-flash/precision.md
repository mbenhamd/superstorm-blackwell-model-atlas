# GLM 5.3 Flash: precision and provenance

## November 20 export contracts

**nvidia/GLM-5.3-Flash-NVFP4** (`1d00738646cb`). ModelOpt NVFP4 declares a Linear target with explicit exceptions. The card prose mentions shared experts, but the config excludes all 42 shared-expert groups and the index has scale entries for main routed/dense projections and none for those shared linears. Layer 45 retains 889 MTP tensor entries. This export carries an FP8 KV scheme. Its index totals 204,419,115,456 bytes. The exporter lists GB200 test hardware. [configuration](https://huggingface.co/nvidia/GLM-5.3-Flash-NVFP4/raw/1d00738646cbb0c6d0a9eb403dac5f366f1473a7/config.json) [tensor index](https://huggingface.co/nvidia/GLM-5.3-Flash-NVFP4/resolve/1d00738646cbb0c6d0a9eb403dac5f366f1473a7/model.safetensors.index.json) [exporter card](https://huggingface.co/nvidia/GLM-5.3-Flash-NVFP4/raw/1d00738646cbb0c6d0a9eb403dac5f366f1473a7/README.md)

**RadixArk/GLM-5.3-Flash-NVFP4** (`f46cf340d35a`). ModelOpt group-16 W4A4 covers routed and shared experts plus the three dense MLPs. The exporter specifies abs-max scaling, a 256 normalization and 1,024 calibration samples of length 512. The index totals 202,893,045,168 bytes, including 889 MTP tensor entries. Its precision contract differs from NVIDIA, which excludes the main shared experts, and from RedHat’s compressed-tensors export. [configuration](https://huggingface.co/RadixArk/GLM-5.3-Flash-NVFP4/raw/f46cf340d35a22d0d83d0c1dac8957cf2b1bcd35/config.json) [tensor index](https://huggingface.co/RadixArk/GLM-5.3-Flash-NVFP4/resolve/f46cf340d35a22d0d83d0c1dac8957cf2b1bcd35/model.safetensors.index.json) [exporter card](https://huggingface.co/RadixArk/GLM-5.3-Flash-NVFP4/raw/f46cf340d35a22d0d83d0c1dac8957cf2b1bcd35/README.md)

The November 20 range reads covered every `model.language_model.layers.45` tensor in the three NVFP4 exports. NVIDIA and RadixArk each store **888 BF16 tensors and one FP32 router correction bias** of 288 elements, totaling **14,865,185,408 bytes**. Red Hat stores the 864 routed weights in FP8 E4M3, their 864 block-scale tensors in BF16, 24 other BF16 tensors and the FP32 bias, totaling **7,618,312,832 bytes**. These bytes describe the checkpoint draft. Peak HBM and accepted tokens per draft step depend on the engine and workload. [NVIDIA index](https://huggingface.co/nvidia/GLM-5.3-Flash-NVFP4/resolve/1d00738646cbb0c6d0a9eb403dac5f366f1473a7/model.safetensors.index.json) [RadixArk index](https://huggingface.co/RadixArk/GLM-5.3-Flash-NVFP4/resolve/f46cf340d35a22d0d83d0c1dac8957cf2b1bcd35/model.safetensors.index.json) [Red Hat index](https://huggingface.co/RedHatAI/GLM-5.3-Flash-NVFP4/resolve/18d55bfd5a2194887738da73753975c9d3842f46/model.safetensors.index.json)

The October 16 table records the then-current revisions of the official FP8 and BF16 variants and the Red Hat derivative. The November 20 Red Hat Hub head differs from that pin in its README and license.

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

RedHat publishes selected reasoning benchmark scores but no paired FP8 table in this pinned card. Those scores do not establish lossless conversion, multimodal quality or B300 performance. The November 20 export contracts above give the NVIDIA and RadixArk configurations used for separate quality comparisons. [glm-5.3-flash-NV](https://huggingface.co/RedHatAI/GLM-5.3-Flash-NVFP4/raw/18d55bfd5a2194887738da73753975c9d3842f46/README.md)

## KV and deployment contract

SGLang's CUDA recipe pairs Blackwell FP8 KV with TRT-LLM DSA, or BF16 KV with TileLang DSA. Change the dtype and both DSA backends together; the cookbook says CUDA TileLang DSA plus FP8 KV is not a valid pairing for this model. Verify the exact image because this is a documented path, not a local execution result. [glm-5.3-flash-GR](https://docs.sglang.io/cookbook/autoregressive/GLM/GLM-5.3-Flash)

Pin the model, tokenizer/processor, config and engine/container revisions together. Establish target-only quality before comparing quantized KV or speculation. A root BF16 `dtype` does not mean every stored tensor is BF16, and casting quantized weights does not recover the original reference. See the [precision analysis](../../../reports/precision-and-kernels.md).

## License provenance

The official FP8 and BF16 artifacts contain the MIT license; the RedHat card also declares MIT. These observations apply to the inspected revisions. Check any additional exporter or bundled-code terms before redistribution. No model tensor payloads are bundled here. [glm-5.3-flash-LICENSE](https://huggingface.co/zai-org/GLM-5.3-Flash/raw/46a050bec13002ad29ee795c16e61cf4fa3c4a9c/LICENSE)

## External DFlash2 artifact terms

At head `6cc6c481eee930a5139619ed919f78726371adbc` the README changes its license declaration to Apache-2.0 and removes the earlier commercial-use wording. The Hub file tree shows identical configuration and weight objects across these two revisions. Retain the applicable card and revision with any draft evaluation. [Current immutable card](https://huggingface.co/incoai/GLM-5.3-Flash-DFlash2/blob/6cc6c481eee930a5139619ed919f78726371adbc/README.md)

The pinned `incoai/GLM-5.3-Flash-DFlash2` card declares **CC-BY-NC-ND-4.0**, describes research/evaluation use and points to separate commercial licensing. The target's MIT license does not apply automatically to this draft. This provenance was missing from the initial upgrade review and is now recorded in the catalog and lock. [S0522-S-DFLASH-CARD](https://huggingface.co/incoai/GLM-5.3-Flash-DFlash2/raw/bf582e4eacc1810f76656d1811693ff6c6737d2a/README.md)
