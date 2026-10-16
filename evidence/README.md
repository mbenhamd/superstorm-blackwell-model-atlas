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

A successful HTTP retrieval establishes accessibility, not correctness. Hashes identify retrieved metadata; complete source bodies are not bundled. The [report review](../reports/report-review.md) records material corrections. Research citations and immutable identities stay here; test output, execution receipts and historical audit bundles belong outside this knowledge repository.

See [LIMITATIONS](../LIMITATIONS.md). No local B300 results are claimed.
