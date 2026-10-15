# Evidence register and audit trail

Read [LIMITATIONS](../LIMITATIONS.md) before using this atlas for a purchasing or production decision.

| Label | What it means | What it does not mean |
| --- | --- | --- |
| Publisher/configuration | A fact read in the named primary artifact | Independently reproduced training or benchmark |
| Source inspected | Named lines or API metadata were read at a specific reference | Whole-repository audit or executed code |
| Publisher benchmark | The author reports that setup/result | Our B300 measurement or a fair cross-engine comparison |
| Derived | Arithmetic or engineering inference with explicit assumptions | Measured resident memory or optimal settings |
| Candidate/probe | A proposed local experiment with known prerequisites | Production-ready deployment |
| Blocked/unknown | Evidence is insufficient or compatibility is unresolved | Proof the task is impossible |

`sources.json` is the machine-readable primary-source register. [SOURCES.md](SOURCES.md) is the readable index. `upstreams.lock.json` records release/main information and PR state at retrieval. A model JSON contains a curated config projection and source IDs, not the complete original configuration. Local provenance fetched later belongs in the metadata directory with a timestamp and immutable revision; it must not be backdated to this audit.

For each production claim retain the checkpoint SHA, image digest, effective engine class and kernels, command, hardware inventory, workload hash, quality output and raw measurements. A correct loader registry entry is one condition of support, not the entire evidence chain.

No third-party weights, private repository content, tokens, proprietary PDFs or upstream font assets are bundled. Source documents remain available at their publishers. Authored prose paraphrases and explains the evidence; it is not a wholesale reproduction of model cards.
