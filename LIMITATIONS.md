# Verification boundaries and unresolved work

**This is a populated research and engineering atlas, not a certificate that every checkpoint will run on every B300 image.** It was assembled on October 15, 2026 from publisher configurations/cards, engine recipes, selected source files and pull-request/release metadata.

## Completed

Eight model-family directories contain architecture dimensions, original technical explanations, precision variants, serving reasoning, validation plans and source links. vLLM and SGLang main references and latest releases were retrieved, selected implementation files were inspected, and concrete relevant PR statuses were checked. Local repository code and document-integrity tests are reported in VALIDATION.md.

## Not completed or not available

No model weights were downloaded, no inference engine was installed or run, no B300 node was available, and no GPU correctness, throughput, latency, memory or power measurement was performed. No deployed KServe cluster was changed or validated. No nightly container was pulled or tested; the current main-source review is not nightly-binary certification.

Full vLLM and SGLang clones could not be materialized because the local environment could not resolve github.com. The separate connected terminal was unavailable. Selected files were read through the GitHub connector instead. `evidence/clone-attempt.log` records the local failure; `scripts/clone_upstreams.py` enables pinned retrieval on a networked host. The ZIP contains authored source-review notes, not complete upstream repositories.

The exact OEM string “B300 SXM6-AC” was supplied by the user and was not independently identified. The hardware discussion uses NVIDIA’s B300 documentation conditionally; CPU, networking, physical topology, cooling, firmware, power limits and usable memory need actual node inventory. A DGX B300 reference specification does not identify the user's server.

Selected configuration fields are curated projections, not byte-for-byte complete original configs. Original raw model cards/configs and full source trees are not archived in this ZIP. Most model citations use mutable main URLs; one Qwen Flash Next base revision was resolved. All other model revisions intentionally remain null until fetched. Local artifact checksums prove local integrity, not historical authenticity of remote pages.

Several precision requests have no independently audited exact release: in particular a fully FP8 Kimi K3 is not established. Some derivative repositories are supported by an engine recipe rather than a separately inspected complete export. These distinctions remain visible in the catalog and profiles; missing facts are not filled with neighboring model values.

DeepSeek's 284B/13B figures are family-level metadata, not an exact July-31 tensor census. GLM’s differently scoped parameter headlines are not reconciled into false precision. Advertised long-context limits do not establish accuracy or practical concurrency at that length. Licenses in the catalog are identification notes, not redistribution or commercial-use clearance; inspect all base and derivative terms.

## Meaning of “best” in this repository

Recommendations are starting hypotheses justified by memory architecture, available implementation paths and source evidence. A winner requires the same workload, input/output distribution, quality threshold, latency target, hardware, effective precision and natural speculative acceptance. Published author benchmarks are not reproduced results. In particular, simulated-acceptance Kimi DSpark results cannot certify application speedup.
