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

`sources.json` is the machine-readable primary-source register. [SOURCES.md](SOURCES.md) is the readable index. `upstreams.lock.json` records releases, inspected source commits, separately observed main references, PR states and exact model revisions. A model JSON contains a curated config projection and source IDs, not the complete original configuration. Later provenance must retain its actual timestamp and immutable revision.

The [October 15 audit](AUDIT-2026-10-15.md) records findings and coverage. Its [source-access receipts](audits/2026-10-15/source-access.json) cover all 62 URLs in the initial register. A successful HTTP response establishes accessibility only; the accompanying reviewer ledgers document which content claims were checked. Response hashes identify retrieved bytes, whose complete bodies are not bundled. The historical clone-failure log does not describe the current audit environment.

The [October 16 engine expansion](ENGINE-UPDATE-2026-10-16.md), dated in Europe/Paris with UTC retrieval timestamps, adds stable/main/nightly research and planned experiments. Its receipts and independent reviews are kept separately from the original audit. Existing profile inspection commits remain historical identities; the lock separately records the new branch inspections and development artifact metadata.

For each production claim retain the checkpoint SHA, image digest, effective engine class and kernels, command, hardware inventory, workload hash, quality output and raw measurements. A correct loader registry entry is one condition of support, not the entire evidence chain.

No third-party weights, private repository content, tokens, proprietary PDFs or upstream font assets are bundled. Source documents remain available at their publishers. Authored prose paraphrases and explains the evidence; it is not a wholesale reproduction of model cards.

The [model benchmark planning update](MODEL-BENCHMARK-UPDATE-2026-10-16.md) adds model-specific quality campaigns, evaluator provenance and fresh model/upstream rechecks. It records plans and review evidence, not executed quality or serving results.
