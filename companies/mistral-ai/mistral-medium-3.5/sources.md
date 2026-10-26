# Mistral Medium 3.5: sources

**October 26 scoped refresh:** current Hub identities, immutable README/configuration files and selected latest-stable engine restrictions were rechecked. [Local README snapshots](README.md#hugging-face-readme-snapshots) link every concrete catalog variant and recorded additional artifact. Retrieval metadata remains in the single [source registry](../../../evidence/sources.json); the historical source descriptions below retain their original scope.

Rechecked on **2026-10-15**. Model cards, configurations and repository metadata below were fetched at the stated immutable revisions. Live documentation is identified separately. The audit did not download model-weight tensors or run an inference engine.

## mistral-medium-3.5-CARD

[Mistral Medium 3.5 pinned publisher card](https://huggingface.co/mistralai/Mistral-Medium-3.5-128B/raw/22b2b868a15677cfa6061277ed2f653d1349a9ab/README.md)

Revision: `22b2b868a15677cfa6061277ed2f653d1349a9ab`. Retrieval: HTTP 200 on 2026-10-15. Confirms dense128B/text-image, reasoning none/high, vLLM recommendation and explicit SGLang TP8 recipe, plus correction commit link.

## mistral-medium-3.5-CFG

[Mistral Medium 3.5 pinned configuration](https://huggingface.co/mistralai/Mistral-Medium-3.5-128B/raw/22b2b868a15677cfa6061277ed2f653d1349a9ab/config.json)

Revision: `22b2b868a15677cfa6061277ed2f653d1349a9ab`. Retrieval: HTTP 200 on 2026-10-15. All prior projection fields matched; corrected mscale_all_dim=0.0, mscale=1.0, beta_fast=4.0 and beta_slow=1.0 added to projection.

## mistral-medium-3.5-TREE

[Mistral pinned dual-layout file metadata](https://huggingface.co/api/models/mistralai/Mistral-Medium-3.5-128B/tree/22b2b868a15677cfa6061277ed2f653d1349a9ab?recursive=false&expand=false)

Revision: `22b2b868a15677cfa6061277ed2f653d1349a9ab`. Retrieval: HTTP 200 on 2026-10-15. Lists three consolidated and three Transformers safetensors files as alternative layouts; file metadata alone is not a tensor-content equality proof.

## mistral-medium-3.5-FIXCFG

[Mistral Transformers YaRN correction commit](https://huggingface.co/mistralai/Mistral-Medium-3.5-128B/commit/c4be198050fb5789774a55b92ed697becfbf20ae)

Revision: `c4be198050fb5789774a55b92ed697becfbf20ae`. Retrieval: HTTP 200 on 2026-10-15. Actual correction commit c4be198050fb5789774a55b92ed697becfbf20ae changes mscale_all_dim from1.0 to0.0; replaces duplicate mutable config citation.

## mistral-medium-3.5-HF-INDEX

[Mistral pinned Transformers weight index](https://huggingface.co/mistralai/Mistral-Medium-3.5-128B/raw/22b2b868a15677cfa6061277ed2f653d1349a9ab/model.safetensors.index.json)

Revision: `22b2b868a15677cfa6061277ed2f653d1349a9ab`. Retrieval: HTTP 200 on 2026-10-15. metadata.total_size=133605834656 bytes; this is tensor payload excluding safetensors headers.

## mistral-medium-3.5-NATIVE-INDEX

[Mistral pinned consolidated weight index](https://huggingface.co/mistralai/Mistral-Medium-3.5-128B/raw/22b2b868a15677cfa6061277ed2f653d1349a9ab/consolidated.safetensors.index.json)

Revision: `22b2b868a15677cfa6061277ed2f653d1349a9ab`. Retrieval: HTTP 200 on 2026-10-15. metadata.total_size=133605834656 bytes; alternative layout has same reported payload.

## mistral-medium-3.5-LICENSE

[Mistral pinned Modified MIT License](https://huggingface.co/mistralai/Mistral-Medium-3.5-128B/raw/22b2b868a15677cfa6061277ed2f653d1349a9ab/LICENSE)

Revision: `22b2b868a15677cfa6061277ed2f653d1349a9ab`. Retrieval: HTTP 200 on 2026-10-15. Exact title and revenue restriction checked; the license condition concerns preceding-month global consolidated company/employer revenue exceeding US$20million.

## mistral-medium-3.5-GR

[SGLang Mistral Medium3.5 deployment cookbook](https://docs.sglang.io/cookbook/autoregressive/Mistral/Mistral-Medium-3.5)

Live publisher/engine documentation; no immutable revision resolved. Retrieval: HTTP 200 on 2026-10-15. Documents exact static-FP8 artifact and both layouts; benchmark claims use4xH200. Its B300 TP2 recommendation is a recipe, not a universal TP minimum or local measurement.

See the global [source register](../../../evidence/sources.json) and [limits](../../../LIMITATIONS.md).
