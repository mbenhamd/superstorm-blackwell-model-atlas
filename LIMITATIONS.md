# Verification boundaries and unresolved work

**This is a research and engineering atlas. Exact checkpoint/image compatibility still requires runtime validation.** It was assembled and audited on October 15, 2026 using publisher cards and configurations, engine recipes, selected source files and pull-request/release metadata. The audit record documents corrections and file coverage.

## Completed

Eight model-family directories contain architecture dimensions, technical explanations, precision variants, serving hypotheses, validation plans and source links. The audit resolved exact publisher and derivative revisions, checked immutable metadata, revisited engine releases and main references, and rechecked selected implementation files and relevant PRs. Local code and document checks are reported in [VALIDATION](VALIDATION.md). HTTP success alone is not counted as verification of a claim; retrieval receipts and reviewer findings are recorded separately.

The subsequent [engine experiment roadmap](reports/EXPERIMENTS.md) expands the stable/main/nightly research into proposed investigations. It includes a manual experiment-record template, not a new execution system. Its applicability checks and promotion thresholds must be completed for the actual image, node and workload. Existing profile source references remain their original reviewed snapshots; new research does not silently certify those profiles against a newer nightly.

## Not completed or not available

No model weight tensors were downloaded and no inference engine was installed or run. Limited safetensors header metadata was read to check GLM parameter accounting. No B300 node was exercised, and no GPU correctness, throughput, latency, memory or power measurement was performed. No deployed KServe cluster was changed or validated. No nightly container was pulled or tested; source inspection does not certify a nightly binary.

The original assembly failed to clone vLLM and SGLang because that environment could not resolve GitHub; [clone-attempt.log](evidence/clone-attempt.log) preserves that historical result. HTTPS retrieval and the atlas repository's Git fetch succeeded during this audit. Full upstream clones were not repeated. Selected immutable source files were retrieved directly, and [clone_upstreams.py](scripts/clone_upstreams.py) remains available for pinned checkouts. Complete upstream repositories are not bundled.

The exact OEM string “B300 SXM6-AC” was supplied by the user and was not independently identified. The hardware discussion uses NVIDIA’s B300 documentation conditionally; CPU, networking, physical topology, cooling, firmware, power limits and usable memory need actual node inventory. A DGX B300 reference specification does not identify the user's server.

Configuration fields are curated projections, not complete original configs. Exact model and variant revisions resolved in the audit are recorded in the model records, profiles and evidence lock. Hypothetical or unidentified variants retain null identities. Immutable links and response hashes improve traceability, but complete raw cards/configs and source trees are not bundled. Mutable recipes and branch heads remain dated observations. Local checksums establish consistency of local files, not historical authenticity or model quality.

Several precision requests have no independently audited exact release: in particular a fully FP8 Kimi K3 is not established. Some derivative repositories are supported by an engine recipe rather than a separately inspected complete export. These distinctions remain visible in the catalog and profiles; missing facts are not filled with neighboring model values.

DeepSeek's family parameter headlines are not an exact July-31 tensor census. GLM's approximately 743B target and 753B full checkpoint are distinguished using the extra MTP layer's header metadata; the accounting is not a GPU memory measurement. Advertised context limits do not establish accuracy or practical concurrency at that length. Licenses in the catalog are identification notes; the applicable base and derivative terms require separate inspection.

## Meaning of “best” in this repository

Recommendations are starting hypotheses justified by memory architecture, available implementation paths and source evidence. A winner requires the same workload, input/output distribution, quality threshold, latency target, hardware, effective precision and natural speculative acceptance. Published author benchmarks are not reproduced results. In particular, simulated-acceptance Kimi DSpark results cannot certify application speedup.
