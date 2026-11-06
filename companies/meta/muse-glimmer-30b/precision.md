# Muse Glimmer 30B: precision and provenance

All revisions below were resolved from the Hub API on 2026-11-06 and pinned. Weight payloads were not downloaded. Formats come from each artifact's `config.json` (and `hf_quant_config.json` where present). Selected safetensors headers were range-read.

| Variant key | Exact artifact @ revision | Precision contract (from config / headers) | Listed weight-file bytes | Vision weights | Engine reference |
| --- | --- | --- | ---: | --- | --- |
| bf16 | `meta-models/Muse-Glimmer-30B` @ `cec94fcf` | BF16, all 1,436 tensors | 59,553,435,272 | yes | vLLM recipe default; SGLang cookbook BF16 |
| nvidia-nvfp4 | `nvidia/Muse-Glimmer-30B-NVFP4` @ `47818374` | ModelOpt `MIXED_PRECISION`: per-module **W4A16** NVFP4 (group 16), FP8 W8A8 (static scales) or BF16 fallback; 5.5 effective-bit search constraint | 24,669,619,724 | yes (BF16) | NVIDIA card (vLLM 0.28.0, SGLang B200) |
| fp8 | `RedHatAI/Muse-Glimmer-30B-FP8-block` @ `1deb4641` | compressed-tensors FP8 W8A8, 128×128 weight blocks, dynamic activation groups of 128; vision, `lm_head`, embeddings ignored | 34,392,835,160 | yes (BF16) | vLLM recipe `fp8_block` |
| nvfp4-inferact | `Inferact/Muse-Glimmer-30B-NVFP4-W4A4` @ `d35cb790` | ModelOpt NVFP4 **W4A4**, group 16, per-tensor static input scales; q/k/v/o and MLP quantized; attention gate, norms, vision, embeddings and `lm_head` in BF16 | 25,418,619,976 | yes (BF16) | vLLM recipe `nvfp4` |
| radixark-nvfp4 | `RadixArk/Muse-Glimmer-NVFP4` @ `14166299` | ModelOpt `MIXED_PRECISION`: NVFP4 W4A4 on q/k/o/attention-gate/gate/up and embedding; MXFP8 on `down_proj` and `lm_head`; `v_proj` BF16 per header | 19,667,887,348 | **no** (text only) | SGLang cookbook NVFP4 |

Byte totals are sums of the `.safetensors` file sizes in each pinned tree listing, including headers. They are serialized storage, not GPU residency. In GiB: 55.46 / 22.98 / 32.03 / 23.67 / 18.32. [muse-glimmer-30b-TREE](https://huggingface.co/api/models/meta-models/Muse-Glimmer-30B/tree/cec94fcfd6512f2cfe708138c32533b346ea4f69?recursive=true&expand=false) [muse-glimmer-30b-NV-TREE](https://huggingface.co/api/models/nvidia/Muse-Glimmer-30B-NVFP4/tree/47818374517751c48c55cde2621594926b1888b6?recursive=true&expand=false) [muse-glimmer-30b-RH-TREE](https://huggingface.co/api/models/RedHatAI/Muse-Glimmer-30B-FP8-block/tree/1deb4641ff84f9a728dd11b27cac1f6a02a9ed14?recursive=true&expand=false) [muse-glimmer-30b-INF-TREE](https://huggingface.co/api/models/Inferact/Muse-Glimmer-30B-NVFP4-W4A4/tree/d35cb79050f419c457611b1cee5c5d15b176f285?recursive=true&expand=false) [muse-glimmer-30b-RX-TREE](https://huggingface.co/api/models/RadixArk/Muse-Glimmer-NVFP4/tree/1416629950afdfb276618fd4810103681dd10f4a?recursive=true&expand=false)

Meta's own 4-bit releases are GGUF (`meta-models/Muse-Glimmer-30B-GGUF` @ `b44f1072`: K-Quant Q4_K_M "17GB", K-Quant dynamic Q4_K_XL, a GGUF DFlash drafter and an `mmproj`) and ExecuTorch `.pte` bundles (`meta-models/Muse-Glimmer-30B-ExecuTorch-PTE` @ `fc6fa93c`; Metal and `sm80+ptx` builds). Both target llama.cpp, ExecuTorch and consumer devices. SGLang can load the GGUF text-only on an "not optimized" path. **Neither is recorded as a B300 variant, and their cards were not snapshotted.** The card's "0.2% / 1.0% degradation" figures describe those K-Quant formats, not any NVFP4/FP8 export. [muse-glimmer-30b-GGUF-API](https://huggingface.co/api/models/meta-models/Muse-Glimmer-30B-GGUF) [muse-glimmer-30b-PTE-API](https://huggingface.co/api/models/meta-models/Muse-Glimmer-30B-ExecuTorch-PTE) [muse-glimmer-30b-CARD](https://huggingface.co/meta-models/Muse-Glimmer-30B/blob/cec94fcfd6512f2cfe708138c32533b346ea4f69/README.md)

## NVIDIA export: what the configuration actually assigns

The card describes AutoQuantize choosing among W4A16 NVFP4, FP8 and BF16 per module under a 5.5 effective-bit constraint. It reports an overall 6.6 effective bits and "approximately 2.4×" smaller (60 GB → 24.7 GB). The listed files give 59,553,435,272 / 24,669,619,724 = **2.41×** (derived). [muse-glimmer-30b-NV-CARD](https://huggingface.co/nvidia/Muse-Glimmer-30B-NVFP4/blob/47818374517751c48c55cde2621594926b1888b6/README.md)

`quantization_config.quantized_layers` holds 393 entries. **Tally from the pinned config:**

| Module family (52 layers) | W4A16 NVFP4 | FP8 | BF16 (not listed) |
| --- | ---: | ---: | ---: |
| q / k / v / attention gate (each) | 18 | 28 | 6 (layers 7–12) |
| o_proj | 10 | 42 | 0 |
| mlp.gate_proj / up_proj (each) | 45 | 7 | 0 |
| mlp.down_proj | 40 | 12 | 0 |
| lm_head | 1 | — | — |

FP8 `down_proj` covers layers 1–12 and FP8 gate/up covers layers 5–11; NVFP4 `o_proj` appears only in layers 39–51. The q/k/v/gate assignment is uniform within each layer, and gate and up match within each layer. Engines that fuse QKV or gate/up projections therefore never see mixed formats inside one fused group. Embeddings, norms and the vision tower remain BF16; the header census shows 2.69 GB of BF16 embedding and 3.84 GB of vision tensors. [muse-glimmer-30b-NV-CFG](https://huggingface.co/nvidia/Muse-Glimmer-30B-NVFP4/raw/47818374517751c48c55cde2621594926b1888b6/config.json) [muse-glimmer-30b-NV-HDR](https://huggingface.co/nvidia/Muse-Glimmer-30B-NVFP4/resolve/47818374517751c48c55cde2621594926b1888b6/model-00001-of-00003.safetensors)

**Weight-only FP4 differs from W4A4.** W4A16 NVFP4 stores 4-bit weights but runs BF16 activations. vLLM v0.33.0 maps `W4A16_NVFP4` to an FP4 **Marlin** GEMM with BF16 activations. It does not use the Blackwell FP4 tensor-core path that W4A4 checkpoints use. The expected benefit is fewer weight bytes per decode step, which matters for bandwidth-bound small-batch decode. Compute-bound prefill gains less, and it can lose throughput if Marlin's dequantization is slower than BF16 cuBLAS at large M. **Source inspection plus hypothesis; not measured.** [muse-glimmer-30b-V-MODELOPT](https://raw.githubusercontent.com/vllm-project/vllm/4ba787ec9959e566d3b587a796dff07673324da5/vllm/model_executor/layers/quantization/modelopt.py)

**NVIDIA-specific provenance discrepancies to retain:**

- The card names `nvidia-modelopt v0.46.0`; `config.json` and `hf_quant_config.json` record producer `modelopt` with `version: null`.
- The card's vLLM command (tested on vLLM 0.28.0) includes `--mamba-cache-mode align`. The model has no Mamba layers, and vLLM v0.33.0 release notes deprecate that flag (#60043). [muse-glimmer-30b-V-LATEST](https://api.github.com/repos/vllm-project/vllm/releases/latest)

The chat-template and generation-config drift is not NVIDIA-specific; it is recorded for every export under [protocol assets](#protocol-assets-bundled-by-each-export).

### NVIDIA quality table (publisher benchmark, not reproduced)

NVIDIA evaluated BF16 and the export on B200 under one policy (high reasoning; temperature 1.0, top_p 0.95, top_k 64), with repeat counts stated per benchmark. Deltas range from −0.79 to +2.16 pp. NVIDIA explicitly warns that positive deltas reflect sampling noise and not improved capability. Only Terminal-Bench, GPQA and IFBench report standard errors. Terminal-Bench (+1.83 pp; combined SE ≈1.69) and GPQA (−0.79 pp; ≈0.52) lie within about 1–1.5 combined standard errors. IFBench (+2.16 pp; ≈0.74) is about 2.9 SE: a resolvable difference under NVIDIA's harness, with an unexplained direction. The table supports "no large regression on these seven tasks under NVIDIA's harness". It does not establish equivalence on vision, tool-calling or long agent traces.

NVIDIA's BF16 baselines also differ from Meta's card. Terminal-Bench 2.1 is 45.22 in NVIDIA's table versus Meta's 51.7 "with terminus2"; SciCode is 47.63 versus 43.6; AA-LCR 76.25 versus 80.0. Harness differences presumably explain this, but neither card pins the evaluator. Do not mix the two tables. [muse-glimmer-30b-NV-CARD](https://huggingface.co/nvidia/Muse-Glimmer-30B-NVFP4/blob/47818374517751c48c55cde2621594926b1888b6/README.md)

## Protocol assets bundled by each export

The pinned base revision carries the current chat template (9,992 bytes, SHA-256 `cfc67e5f…`, introduced by "Fixing duplicate reasoning effort" on 2026-08-11) and a `generation_config.json` with the publisher's recommended `temperature 1.0 / top_p 0.95 / top_k 64`. The template at the original weights commit `46ac57a4` is 7,167 bytes, SHA-256 `114f55eb…`. Each export's files were retrieved at its pinned revision and hashed on 2026-11-06:

| Export @ revision | `chat_template.jinja` | `generation_config.json` |
| --- | --- | --- |
| NVIDIA @ `47818374` | 7,167 bytes, `114f55eb…`: superseded (`46ac57a4`) template | `do_sample: false`; no temperature/top_p/top_k |
| Red Hat FP8-block @ `1deb4641` | 7,167 bytes, `114f55eb…`: superseded (`46ac57a4`) template | `do_sample: false`; no temperature/top_p/top_k |
| Inferact NVFP4 W4A4 @ `d35cb790` | 7,167 bytes, `114f55eb…`: superseded (`46ac57a4`) template | `do_sample: false`; no temperature/top_p/top_k |
| RadixArk NVFP4/MXFP8 @ `14166299` | 9,992 bytes, `cfc67e5f…`: current base template | `do_sample: false`; no temperature/top_p/top_k |

The Red Hat, Inferact and RadixArk generation configs are byte-identical to one another (148 bytes, SHA-256 `b0e427c9…`): BOS 200000, EOS [200001, 200008], pad 200018, `max_length` 131072, `do_sample: false`. Two consequences follow from file contents alone; neither was executed:

- Serving the NVIDIA, Red Hat or Inferact export with its bundled template uses the superseded protocol renderer that the 2026-08-11 base commit replaced. A BF16-versus-export comparison then changes the prompt renderer as well as the weights.
- With `--generation-config auto`, every export's defaults differ from the base: no sampling parameters and `do_sample: false`. Requests that omit sampling fields therefore do not get the publisher's recommended 1.0/0.95/64.

Supply the base `cfc67e5f…` template and explicit sampling (1.0/0.95/64) for every export when comparing it against BF16. [muse-glimmer-30b-NV-CHAT](https://huggingface.co/nvidia/Muse-Glimmer-30B-NVFP4/raw/47818374517751c48c55cde2621594926b1888b6/chat_template.jinja) [muse-glimmer-30b-RH-CHAT](https://huggingface.co/RedHatAI/Muse-Glimmer-30B-FP8-block/raw/1deb4641ff84f9a728dd11b27cac1f6a02a9ed14/chat_template.jinja) [muse-glimmer-30b-INF-CHAT](https://huggingface.co/Inferact/Muse-Glimmer-30B-NVFP4-W4A4/raw/d35cb79050f419c457611b1cee5c5d15b176f285/chat_template.jinja) [muse-glimmer-30b-RX-CHAT](https://huggingface.co/RadixArk/Muse-Glimmer-NVFP4/raw/1416629950afdfb276618fd4810103681dd10f4a/chat_template.jinja) [muse-glimmer-30b-CHAT-46AC](https://huggingface.co/meta-models/Muse-Glimmer-30B/raw/46ac57a4502be771dc743ac85866351c5629ca71/chat_template.jinja) [muse-glimmer-30b-CHAT](https://huggingface.co/meta-models/Muse-Glimmer-30B/raw/cec94fcfd6512f2cfe708138c32533b346ea4f69/chat_template.jinja) [muse-glimmer-30b-NV-GENCFG](https://huggingface.co/nvidia/Muse-Glimmer-30B-NVFP4/raw/47818374517751c48c55cde2621594926b1888b6/generation_config.json) [muse-glimmer-30b-RH-GENCFG](https://huggingface.co/RedHatAI/Muse-Glimmer-30B-FP8-block/raw/1deb4641ff84f9a728dd11b27cac1f6a02a9ed14/generation_config.json) [muse-glimmer-30b-INF-GENCFG](https://huggingface.co/Inferact/Muse-Glimmer-30B-NVFP4-W4A4/raw/d35cb79050f419c457611b1cee5c5d15b176f285/generation_config.json) [muse-glimmer-30b-RX-GENCFG](https://huggingface.co/RadixArk/Muse-Glimmer-NVFP4/raw/1416629950afdfb276618fd4810103681dd10f4a/generation_config.json) [muse-glimmer-30b-GENCFG](https://huggingface.co/meta-models/Muse-Glimmer-30B/raw/cec94fcfd6512f2cfe708138c32533b346ea4f69/generation_config.json)

## Recipe-named community exports

**Red Hat FP8-block.** This is a model-free (no calibration) LLM Compressor FP8_BLOCK export. The card's command uses image `vllm/vllm-openai:muse-glimmer`, a model-specific tag and not a release. API parameter metadata: 25,163,726,848 F8_E4M3 + 4,612,899,840 BF16 = 29,776,626,688 total, equal to the base. The card makes no quality claim. [muse-glimmer-30b-RH-CARD](https://huggingface.co/RedHatAI/Muse-Glimmer-30B-FP8-block/blob/1deb4641ff84f9a728dd11b27cac1f6a02a9ed14/README.md) [muse-glimmer-30b-RH-CFG](https://huggingface.co/RedHatAI/Muse-Glimmer-30B-FP8-block/raw/1deb4641ff84f9a728dd11b27cac1f6a02a9ed14/config.json)

**Inferact NVFP4 W4A4.** The card is one sentence and the repository has no LICENSE file; the front matter says `apache-2.0`. Weights are split into `model.safetensors` (BF16 non-quantized tensors, including 809 vision tensors) and `nvfp4_dense.safetensors` (1,456 quantized tensors = 364 projections × 4). The config records calibration (512 samples × 4,096 tokens), `quant_algo: NVFP4`, group 16 and per-tensor input scales. The attention output gate is in the ignore list. vLLM's recipe sizes it at 25.42 GB and reports single-RTX-5090 serving. No quality evaluation is published. [muse-glimmer-30b-INF-CARD](https://huggingface.co/Inferact/Muse-Glimmer-30B-NVFP4-W4A4/blob/d35cb79050f419c457611b1cee5c5d15b176f285/README.md) [muse-glimmer-30b-INF-CFG](https://huggingface.co/Inferact/Muse-Glimmer-30B-NVFP4-W4A4/raw/d35cb79050f419c457611b1cee5c5d15b176f285/config.json) [muse-glimmer-30b-INF-MANIFEST](https://huggingface.co/Inferact/Muse-Glimmer-30B-NVFP4-W4A4/raw/d35cb79050f419c457611b1cee5c5d15b176f285/dense_nvfp4_manifest.json)

**RadixArk NVFP4/MXFP8.** The card calls this "the model vendor's own `fp_awq` mixed-precision recipe" packed for SGLang, text only. The repository was created at 2026-08-09T06:29Z, before the Meta base repository (17:51Z). Its commit history renames a codename ("Onyx"), and a later commit synced the chat template with the base fix. Two conflicts:

1. The card says `v_proj` is MXFP8, but `quantized_layers` omits `v_proj`, and the layer-0 header stores `v_proj.weight` as BF16 [256, 6656].
2. The card's "52 GiB for the bf16 export" matches the text-only BF16 decoder (27.85B × 2 bytes ≈ 51.9 GiB), not the full 55.46 GiB repository.

The card's DGX Spark throughput figures are publisher measurements on GB10. It states that full accuracy evaluation was pending. [muse-glimmer-30b-RX-CARD](https://huggingface.co/RadixArk/Muse-Glimmer-NVFP4/blob/1416629950afdfb276618fd4810103681dd10f4a/README.md) [muse-glimmer-30b-RX-CFG](https://huggingface.co/RadixArk/Muse-Glimmer-NVFP4/raw/1416629950afdfb276618fd4810103681dd10f4a/config.json) [muse-glimmer-30b-RX-HDR](https://huggingface.co/RadixArk/Muse-Glimmer-NVFP4/resolve/1416629950afdfb276618fd4810103681dd10f4a/model-00001-of-00005.safetensors) [muse-glimmer-30b-RX-COMMITS](https://huggingface.co/api/models/RadixArk/Muse-Glimmer-NVFP4/commits/main)

## KV-cache precision

No export defines a KV-cache quantization scheme. NVIDIA states "KV cache unquantized (`auto` at serving time)". Its own SGLang command and the SGLang cookbook nonetheless use `--kv-cache-dtype fp8_e4m3`. The cookbook justifies this with a 200-question GSM8K run on an RTX 5090 (0.905 FP8 versus 0.885 BF16): a single small, short-context sample. NoPE global layers attend across the full 131K history, so long-context retrieval is where FP8 KV error could appear. Gate FP8 KV on a long-context task, not on GSM8K. [muse-glimmer-30b-S-COOKBOOK-CFG](https://raw.githubusercontent.com/sgl-project/sglang/297e54fd105e974cdf401e5b4d20253a22c16f90/docs/src/snippets/configs/meta-models/muse-glimmer.jsx)

## Deployment rule

Pin together:

- the model revision;
- the chat template hash; the base `cfc67e5f…` template is the reference, so supply it explicitly for derivatives that bundle older templates;
- the generation config;
- the quantization config;
- the engine image digest;
- the drafter revision.

Use BF16 at the pinned base revision as the quality control for text, image and tool-calling tests.

## License provenance

The base and assistant `LICENSE` files are byte-identical (SHA-256 `cfc7749b…`, 11,358 bytes) to the Apache License 2.0 text at apache.org. The base repository also ships a `USAGE_POLICY.md`, which the card links under "Responsible Use".

| Export | Card licence statement | `LICENSE` file at pinned revision |
| --- | --- | --- |
| NVIDIA | Apache-2.0 | present; SHA-256 `cfc7749b…` (apache.org text) |
| Red Hat | Apache-2.0 | present; SHA-256 `cfc7749b…` (apache.org text), retrieved 2026-11-06 |
| Inferact | Apache-2.0 (front matter) | absent (HTTP 404 at `d35cb790`) |
| RadixArk | none: card front matter and Hub `cardData` have no license field | present; SHA-256 `cfc7749b…` (apache.org text), retrieved 2026-11-06; its commit message says it was carried over from the base |

The RadixArk export therefore ships the unmodified Apache-2.0 text but makes no licence statement on its card. Derivative terms are each exporter's statement or file; this review compared file bytes only and did not audit the terms further. [muse-glimmer-30b-LICENSE](https://huggingface.co/meta-models/Muse-Glimmer-30B/blob/cec94fcfd6512f2cfe708138c32533b346ea4f69/LICENSE) [muse-glimmer-30b-APACHE-TXT](https://www.apache.org/licenses/LICENSE-2.0.txt) [muse-glimmer-30b-RH-LICENSE](https://huggingface.co/RedHatAI/Muse-Glimmer-30B-FP8-block/resolve/1deb4641ff84f9a728dd11b27cac1f6a02a9ed14/LICENSE) [muse-glimmer-30b-RX-LICENSE](https://huggingface.co/RadixArk/Muse-Glimmer-NVFP4/resolve/1416629950afdfb276618fd4810103681dd10f4a/LICENSE) [muse-glimmer-30b-RX-API](https://huggingface.co/api/models/RadixArk/Muse-Glimmer-NVFP4) [muse-glimmer-30b-INF-API](https://huggingface.co/api/models/Inferact/Muse-Glimmer-30B-NVFP4-W4A4)
