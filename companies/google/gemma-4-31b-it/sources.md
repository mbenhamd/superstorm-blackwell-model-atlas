# Gemma 4 31B IT: sources

Rechecked on **2026-10-15**. Model cards, configurations and repository metadata below were fetched at the stated immutable revisions. Live documentation is identified separately. The audit did not download model-weight tensors or run an inference engine.

## gemma-4-31b-it-CARD

[Gemma 4 31B IT publisher card at pinned revision](https://huggingface.co/google/gemma-4-31B-it/raw/842da3794eaa0b77d5f08bae87a17459d91ff475/README.md)

Revision: `842da3794eaa0b77d5f08bae87a17459d91ff475`. Retrieval: HTTP 200 on 2026-10-15. Publisher identifies dense 31B family, text/image modalities without audio for this variant, 256K context and Apache-2.0.

## gemma-4-31b-it-CFG

[Gemma 4 31B IT pinned configuration](https://huggingface.co/google/gemma-4-31B-it/raw/842da3794eaa0b77d5f08bae87a17459d91ff475/config.json)

Revision: `842da3794eaa0b77d5f08bae87a17459d91ff475`. Retrieval: HTTP 200 on 2026-10-15. All existing normalized config fields matched; 60 layer types count as 50 sliding and 10 full attention; audio_config is explicitly null.

## gemma-4-31b-it-FP8

[Red Hat Gemma block FP8 pinned card](https://huggingface.co/RedHatAI/gemma-4-31B-it-FP8-block/raw/d7242548c457ab4b45bd3adb8937f2659af4739d/README.md)

Revision: `d7242548c457ab4b45bd3adb8937f2659af4739d`. Retrieval: HTTP 200 on 2026-10-15. Names exact base; documents W8A8 block/group recipe and exclusions; advertised 50% memory saving is not a runtime measurement here.

## gemma-4-31b-it-NV

[Red Hat Gemma NVFP4 pinned card](https://huggingface.co/RedHatAI/gemma-4-31B-it-NVFP4/raw/5df75ccad9b74546f5be758a2a68acc2e16bbc9b/README.md)

Revision: `5df75ccad9b74546f5be758a2a68acc2e16bbc9b`. Retrieval: HTTP 200 on 2026-10-15. Names exact base; documents group-16 W4A4 with local activation scaling. Generic audio example conflicts with variant-specific publisher modality/config and is not accepted as audio support.

## gemma-4-31b-it-FP8-CFG

[Red Hat Gemma block FP8 pinned configuration](https://huggingface.co/RedHatAI/gemma-4-31B-it-FP8-block/raw/d7242548c457ab4b45bd3adb8937f2659af4739d/config.json)

Revision: `d7242548c457ab4b45bd3adb8937f2659af4739d`. Retrieval: HTTP 200 on 2026-10-15. compressed-tensors; weight block_structure [128,128]; input group_size 128 and dynamic true; vision/lm_head/embeddings ignored.

## gemma-4-31b-it-NV-CFG

[Red Hat Gemma NVFP4 pinned configuration](https://huggingface.co/RedHatAI/gemma-4-31B-it-NVFP4/raw/5df75ccad9b74546f5be758a2a68acc2e16bbc9b/config.json)

Revision: `5df75ccad9b74546f5be758a2a68acc2e16bbc9b`. Retrieval: HTTP 200 on 2026-10-15. nvfp4-pack-quantized; W4A4 group size16, tensor_group scales, input dynamic local; vision linears/lm_head ignored. Targets are Linear, not embedding modules.

## gemma-4-31b-it-BASE-TREE

[Gemma BF16 pinned file metadata](https://huggingface.co/api/models/google/gemma-4-31B-it/tree/842da3794eaa0b77d5f08bae87a17459d91ff475?recursive=false&expand=false)

Revision: `842da3794eaa0b77d5f08bae87a17459d91ff475`. Retrieval: HTTP 200 on 2026-10-15. Two safetensors files sum to 62546338248 bytes, including headers; metadata only, no weights downloaded.

## gemma-4-31b-it-FP8-TREE

[Gemma FP8 pinned file metadata](https://huggingface.co/api/models/RedHatAI/gemma-4-31B-it-FP8-block/tree/d7242548c457ab4b45bd3adb8937f2659af4739d?recursive=false&expand=false)

Revision: `d7242548c457ab4b45bd3adb8937f2659af4739d`. Retrieval: HTTP 200 on 2026-10-15. Two safetensors files sum to 33263238928 bytes, including headers; metadata only, no weights downloaded.

## gemma-4-31b-it-NV-TREE

[Gemma NVFP4 pinned file metadata](https://huggingface.co/api/models/RedHatAI/gemma-4-31B-it-NVFP4/tree/5df75ccad9b74546f5be758a2a68acc2e16bbc9b?recursive=false&expand=false)

Revision: `5df75ccad9b74546f5be758a2a68acc2e16bbc9b`. Retrieval: HTTP 200 on 2026-10-15. One safetensors file is listed as 23265401144 bytes, including header; metadata only, no weights downloaded.

## gemma-4-31b-it-LICENSE

[Google Gemma Apache 2.0 license page](https://ai.google.dev/gemma/apache_2)

Live publisher/engine documentation; no immutable revision resolved. Retrieval: HTTP 200 on 2026-10-15. Google base and derivative cards link to this publisher Apache 2.0 license page; no derivative-only inference is needed.

See the global [source register](../../../evidence/sources.json) and [limits](../../../LIMITATIONS.md).
