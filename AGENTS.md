# Repository Guidelines

## Project Structure & Evidence

This is a research atlas, not a serving implementation. Start with `README.md`, `START_HERE.md`, and `LIMITATIONS.md`. Model-family reports live under `companies/`; `catalog/` holds consolidated model records and source-derived configuration references. `frameworks/` compares vLLM and SGLang as execution engines and KServe as the deployment layer. `evidence/` is primary-source identities and retrieval dates. Keep claims traceable across these files.

## Scope and maintenance

Keep this repository focused on hardware, models, architectures, precision, frameworks and optimization knowledge. Execution tools, tests, benchmark results and detailed run campaigns belong in the separate execution repository. Do not recreate those folders or generated audit/report bundles here. Keep configuration references consolidated in `catalog/configurations.json`; explain mechanisms and tradeoffs in the model/framework pages.

KServe is mandatory in the user's existing infrastructure. All deployment recommendations must use KServe, with vLLM or SGLang as the execution engine. Treat the installed KServe version, resource kind and runtime integration as unknown until provided; the atlas's upstream reference versions do not identify the user's cluster. Frame optimization and configuration guidance within that required platform.

## Research, Comparison, and Maintenance

Explore the related report, catalog record, configuration reference, source IDs, and limitations before editing. When changing a fact, update every affected view and keep prose and consolidated catalogs consistent. If evidence supports fixing a gap, fix it; otherwise record the unknown and the evidence needed to resolve it. Never fill missing values from a neighboring model or derivative.

For every task that depends on current information, browse again on that task. Verify the latest stable vLLM, SGLang, and KServe releases from their official release pages; check main/nightly separately. Verify model releases and configuration against the publisher's current model card and an immutable revision. Verify papers against the publisher or arXiv record, including version and date. Maintain `evidence/sources.json` as the single source registry: `sources` is an object keyed by stable source ID, with URLs and retrieval metadata in each value. Record model/build identities in `evidence/upstreams.lock.json` as applicable. Do not recreate a duplicate Markdown source index. Distinguish release notes, source inspection, publisher claims, reproduced results, calculations, and unverified hypotheses.

Recheck material claims against the primary source and, where available, independent corroboration. Challenge superlatives and vendor claims; explain what the evidence supports and where it stops. Cross-check citations, dates, units, calculations, and Markdown/JSON/catalog consistency. Compare exact model revision, engine release or image digest, hardware, workload, quality, latency, throughput, and memory assumptions. Explain tradeoffs in plain language and use side-by-side comparisons when recommending options. KServe is a control plane, not a competing inference engine. Never present a candidate, source claim, or local static check as a measured serving result.

## Technical writing and agent reasoning

Write for technical retrieval and analysis. Use explicit definitions, mechanisms, constraints and applicability; omit introductory reassurance, anthropomorphic explanations and everyday analogies. Preserve useful definitions and uncertainty. Describe the target deployment directly rather than addressing an assumed beginner or referring to "your hardware."

For a recommendation, connect **mechanism → implementation → constraints → optimization rationale → evidence**. Establish the relevant model/artifact, hardware, precision, engine and KServe context. Explain the expected benefit, costs, alternatives, failure conditions and missing measurements. Reading a summary does not establish support for a configuration; follow its source IDs and inspect the supporting primary artifacts.

Apply the [two-pass claim review](evidence/README.md#two-pass-claim-review) to material additions and changes: first establish source support, then challenge scope, arithmetic, applicability and contradictions. Use independent corroboration where available; otherwise state the remaining evidence limit. Do not mark a whole report "verified" when only selected claims or source ranges were checked. Keep prose, catalogs and source identities consistent, without creating duplicate evidence registers or execution artifacts.
