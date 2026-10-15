# Repository Guidelines

## Project Structure & Evidence

This is a research atlas, not a serving implementation. Start with `README.md`, `START_HERE.md`, and `LIMITATIONS.md`. Model-family reports live under `companies/`; `catalog/` and `profiles/` hold matching machine-readable records and launch hypotheses. `frameworks/` compares vLLM and SGLang as execution engines and KServe as the deployment layer. `evidence/` is the source register and retrieval trail. Keep claims traceable across these files.

## Build, Test, and Development Commands

The repository uses Python 3.10+ standard-library tools; no package/build or lint configuration is present. Run `python3 scripts/validate_repo.py` for local JSON, link, catalog, and syntax checks, and `python3 -m unittest discover -s tests -v` for the documented unit suite. `python3 scripts/launch.py --profile <profile.json>` prints a guarded command by default. Read `scripts/README.md` before using options that fetch metadata, start engines, send benchmark requests, or write files.

## Research, Comparison, and Maintenance

Explore the related report, JSON record, profile, source IDs, and limitations before editing. When changing a fact, update every affected view and keep catalog/profile copies consistent. If evidence supports fixing a gap, fix it; otherwise record the unknown and the evidence needed to resolve it. Never fill missing values from a neighboring model or derivative.

For every task that depends on current information, browse again on that task. Verify the latest stable vLLM, SGLang, and KServe releases from their official release pages; check main/nightly separately. Verify model releases and configuration against the publisher's current model card and an immutable revision. Verify papers against the publisher or arXiv record, including version and date. Record retrieval dates and source IDs in `evidence/sources.json`, `evidence/SOURCES.md`, and `evidence/upstreams.lock.json` as applicable. Distinguish release notes, source inspection, publisher claims, reproduced results, calculations, and unverified hypotheses.

Recheck material claims against the primary source and, where available, independent corroboration. Challenge superlatives and vendor claims; explain what the evidence supports and where it stops. Cross-check citations, dates, units, calculations, and Markdown/JSON/catalog consistency. Compare exact model revision, engine release or image digest, hardware, workload, quality, latency, throughput, and memory assumptions. Explain tradeoffs in plain language and use side-by-side comparisons when recommending options. KServe is a control plane, not a competing inference engine. Never present a candidate, source claim, or local static check as a measured serving result.
