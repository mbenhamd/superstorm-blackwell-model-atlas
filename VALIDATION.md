# Local validation results

Audit, engine-expansion and model-benchmark retrieval date: **October 15, 2026 UTC** (October 16 in Europe/Paris for the expansion). Supported interpreter used for the recorded local checks: **Python 3.12.14**.

## Actual executions

**68 unit tests passed on Python 3.12.14.** The documented supported minimum remains Python 3.10. The suite covers memory arithmetic, immutable metadata identity, launch/probe gates, profile topology and context consistency, synthetic-acceptance rejection, redirect handling, exclusive checkout destinations, KServe rendering guards, streaming completion semantics, catalog integrity and offline HTML generation. Network behavior and engine invocations in the tests use mocks.

The repository validator passes for **8 model families**, **6 companies** and **34 profiles**. Model JSON records and individual profile JSON files match their catalog copies. JSON parsing, Python compilation, source IDs and local Markdown links pass. Exact current file/link/source counts are in [local-validation.json](evidence/local-validation.json). The engine expansion and model-benchmark follow-up add documentation and a manual JSON run-record template; they add no execution code or measured serving results. The 68-test suite was rerun for the model-benchmark changes on the interpreter above; no new tests were added.

Seven [CLI smoke checks](evidence/audits/2026-10-15/cli-smoke.json) passed: weight arithmetic, ordinary GQA KV arithmetic, guarded dry-run launch, dry-run clone commands, metadata listing without network, benchmark help and KServe renderer help. The illustrative calculations returned 2.8e12 bytes for uniform FP8 at 2.8T parameters and 88 GiB for the stated Mistral KV example. These are calculations, not GPU allocation measurements.

The offline edition is rebuilt from the corrected Markdown. `build_atlas.py --check` checks freshness; the HTML tests check escaping, internal links, duplicate IDs, formatting and embedded source hashes. `SHA256SUMS` covers the committed artifacts except the checksum manifest itself.

## Primary-source retrieval and review

During the original audit, all eight base model APIs and immutable configurations were independently retrieved by the coordinator, confirming revision, layer count and hidden size. Model reviewers checked the full curated projections and exact derivative metadata. The initial 62 source URLs and all 135 URLs in that audit's integrated register returned HTTP 200 in separate access checks. See the [audit report](evidence/AUDIT-2026-10-15.md) for those independent reviews and corrections. The subsequent [engine update](evidence/ENGINE-UPDATE-2026-10-16.md) records its additional primary-source research and reviews separately. The [model benchmark update](evidence/MODEL-BENCHMARK-UPDATE-2026-10-16.md) records fresh model/engine checks, benchmark documentation and selected evaluator-source inspections, plus independent reviews. Accessibility alone does not establish claim accuracy.

Actual Hub and GitHub HTTPS retrieval succeeded. During the engine expansion, GitHub REST requests hit an unauthenticated rate limit; official HTML, raw files and Git references supplied the cited alternatives. Temporary filtered/shallow upstream Git metadata was used where documented for release-versus-main source comparison. The original full-clone failures remain historical evidence; complete upstream clones were not repeated. The metadata downloader's mocked tests are distinct from an end-to-end integration test of that command against the Hub.

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
