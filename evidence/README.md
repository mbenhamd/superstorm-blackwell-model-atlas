# Primary evidence

[sources.json](sources.json) is the source registry, keyed by source ID under `sources`. Each entry contains its URL, title, retrieval dates and evidence metadata. Catalogs and reports refer to these stable IDs. [upstreams.lock.json](upstreams.lock.json) records releases, selected source commits, main/nightly observations, model revisions and additional candidate artifacts.

Look up a source URL from the repository root:

```bash
jq -r '.sources["HW"].url' evidence/sources.json
```

Add or update the entry under its existing ID. Preserve original retrieval metadata and record later checks separately; keep the registry in this single JSON file.

| Label | Meaning |
| --- | --- |
| Publisher/configuration | Stated in the named primary artifact |
| Source inspected | Selected implementation read at a specific revision |
| Publisher benchmark | Result reported by its author under that author's conditions |
| Derived | Calculation or engineering inference with explicit assumptions |
| Candidate/probe | Proposed configuration with unresolved runtime evidence |
| Blocked/unknown | A prerequisite or factual question remains unresolved |

These labels describe the type and scope of evidence. A publisher statement is not independently established merely because it is cited; configuration extraction establishes the serialized value, and source inspection establishes only the examined implementation at that revision.

## Two-pass claim review

**Pass 1 — establish source support.** Resolve the source ID and read the primary artifact. Identify the exact passage, field, equation, table or code path supporting the claim. Record the revision/date, model or exporter, hardware, workload and implementation scope where relevant. Separate quoted or extracted facts from derived conclusions. For current-support questions, refresh upstream metadata and distinguish release inclusion, main-branch changes and published development artifacts.

**Pass 2 — challenge the conclusion.** Recheck the claim against that evidence, then seek independent corroboration where available. Recalculate quantities and inspect exceptions or contradictory evidence. A second document repeating the same publisher result does not provide an independent measurement. A second reviewer should examine the cited artifact and derivation, rather than approving a previous summary.

| Claim type | Required challenge |
| --- | --- |
| Architecture or model capability | Exact variant, configuration scope, tokenizer/processor and target-versus-draft distinction |
| Engine or kernel support | Loader, dispatch, dtype, shape and feature restrictions at the inspected revision; source inclusion versus actual image contents |
| Capacity or topology | Bytes versus GB/GiB, serialized versus resident storage, replicated/sharded components, per-rank peaks and temporary allocations |
| Quality or performance | Exact artifact, hardware, workload, sampling, measurement definition and baseline; publisher results versus local reproduction |
| Optimization recommendation | Causal mechanism, expected benefit, added costs, alternatives, rejection conditions and remaining measurements |

If evidence is missing or conflicting, retain the narrower supported statement and identify the unresolved question. Update the affected report, catalog and existing source entry when a fact changes. A review is complete only for its stated scope; it does not certify unexamined files, binaries or workloads.

A successful HTTP retrieval establishes accessibility, not correctness. Hashes identify retrieved metadata; complete source bodies are not bundled. The [report review](../reports/report-review.md) records material corrections. Research citations and immutable identities stay here; test output, execution receipts and historical audit bundles belong outside this knowledge repository.

See [LIMITATIONS](../LIMITATIONS.md). No local B300 results are claimed.
