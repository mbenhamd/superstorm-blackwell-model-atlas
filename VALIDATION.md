# Local validation results

Audit date: **October 15, 2026 UTC** (continuing into October 16 in Europe/Paris). Final supported interpreter: **Python 3.12.14**.

## Actual executions

**68 unit tests passed on Python 3.12.14.** The documented supported minimum remains Python 3.10. The suite covers memory arithmetic, immutable metadata identity, launch/probe gates, profile topology and context consistency, synthetic-acceptance rejection, redirect handling, exclusive checkout destinations, KServe rendering guards, streaming completion semantics, catalog integrity and offline HTML generation. Network behavior and engine invocations in the tests use mocks.

The repository validator passes for **8 model families**, **6 companies**, **34 profiles** and **135 source records**. Model JSON records and individual profile JSON files match their catalog copies. JSON parsing, Python compilation, source IDs and local Markdown links pass. Exact final file/link counts are in [local-validation.json](evidence/local-validation.json).

Seven [CLI smoke checks](evidence/audits/2026-10-15/cli-smoke.json) passed: weight arithmetic, ordinary GQA KV arithmetic, guarded dry-run launch, dry-run clone commands, metadata listing without network, benchmark help and KServe renderer help. The illustrative calculations returned 2.8e12 bytes for uniform FP8 at 2.8T parameters and 88 GiB for the stated Mistral KV example. These are calculations, not GPU allocation measurements.

The offline edition is rebuilt from the corrected Markdown. `build_atlas.py --check` checks freshness; the HTML tests check escaping, internal links, duplicate IDs, formatting and embedded source hashes. `SHA256SUMS` covers the committed artifacts except the checksum manifest itself.

## Primary-source retrieval and review

All eight base model APIs and immutable configurations were independently retrieved by the coordinator, confirming revision, layer count and hidden size. Model reviewers checked the full curated projections and exact derivative metadata. The initial 62 source URLs and all 135 URLs in the integrated register returned HTTP 200 in separate access checks. See the [audit report](evidence/AUDIT-2026-10-15.md) for the independent reviews and correction records. Accessibility alone does not establish claim accuracy.

Actual Hub and GitHub HTTPS retrieval succeeded in this audit. The original full-clone failures remain historical evidence; full upstream clones were not repeated. The metadata downloader's mocked tests are distinct from an end-to-end integration test of that command against the Hub.

## Explicitly not tested

No weight tensors were downloaded, no inference engine or serving container was installed or run, and no B300 model-quality, throughput, latency, power or GPU-memory measurement was performed. Only metadata, including limited GLM safetensors headers, was retrieved. No natural speculative acceptance was measured. No container image or nightly wheel was downloaded or tested. No Kubernetes admission check or deployment was performed. KServe unit tests use synthetic image digests to exercise syntax and structure without a registry lookup.

## Reproduce

Use Python 3.10 or newer. The recorded audit used:

```bash
python3.12 scripts/validate_repo.py
python3.12 -m unittest discover -s tests -v
python3.12 scripts/build_atlas.py --check
```

Full unit output is in [tests/last-run.txt](tests/last-run.txt). Passing local checks does not certify a serving configuration.
