# What is known and what remains open

The [October 26 optimization follow-up](reports/optimization.md#october-26-priorities) adds source-supported benchmark hypotheses for all eight families and selected KServe changes. Subagent research and cross-review establish only the inspected source/claim scope. Open PR heads, merged development commits and stable releases remain separate; no benchmark dataset, engine binary, installed cluster or B300 workload was executed or qualified. Quality margins and application latency SLOs must be supplied before selecting a measured winner.

This atlas explains architectures and serving tradeoffs using publisher cards, immutable configurations, selected engine source and release metadata. It contains **no reproduced B300 inference or quality results**.

The **October 26 refresh** covers latest stable identities, all 23 concrete catalog variants and 11 recorded additional artifacts, immutable README/configuration retrieval, and 19 selected engine source files plus two issue/PR records and one ancestry comparison. The stable versions and retained Hub revisions are unchanged. This is not a new review of every historical claim, paper, model weight or engine implementation. The 40 argument arrays retain their original source identity and have current applicability notes; they were not parsed or executed against a newly installed engine.

The October 18 [vLLM v0.32 review](reports/vllm-v032-upgrade.md) compares selected source paths with v0.31 and proposes experiments. The v0.32 registry index/platform digests are recorded; image contents, runtime behavior and installed KServe integration remain unqualified. Older configuration arrays retain their reviewed releases; none was automatically promoted by the new release.

## Evidence boundaries

The [October 19 SGLang v0.5.22 review](reports/sglang-v0522-upgrade.md) compares selected release paths with v0.5.21. Its registry index bytes and platform identities were checked; image contents and runtime remain unqualified. GLM FP8 DCP8 has a reported sparse-kernel corruption risk; Qwen Flash Next's complete prefill-CP port is absent from the release; Gemma's new FA4 result is SM90 evidence. These are explicit exclusions from promotion, not measured failures on this node.

- A publisher benchmark describes its own model revision, hardware and workload. It does not establish an engine winner on this node.
- A supported architecture or existing kernel does not establish support for every exporter, precision, draft or cache mode.
- A main commit, release tag, wheel index and container digest identify different objects. Source inspection does not certify an unexamined binary.
- Parameter counts, serialized file bytes and resident per-GPU memory are different quantities. Target-only loaders can legitimately omit stored MTP tensors.
- Configured context limits do not establish useful accuracy, concurrency or capacity at that length.
- Current source observations are dated. Retained configuration records preserve their own earlier inspected commits and remain untested.

## Hardware and artifacts

KServe is a confirmed infrastructure requirement. Its installed version, resource kind, runtime templates, gateway and routing configuration have not been provided. The upstream versions inspected in this atlas are research references, not an inventory of the user's cluster.

The user supplied **B300 SXM6-AC**, eight GPUs. The atlas uses NVIDIA B300 reference specifications conditionally. Actual usable HBM, CPU/NUMA, NVLink/NVSwitch, NICs, storage, power and cooling are unknown; a DGX reference does not identify this server.

No model weight payloads, serving containers or nightly wheels were downloaded or executed here. Limited metadata and safetensors headers support selected accounting claims. No Kubernetes cluster was deployed or validated. Full upstream trees and engine source bodies are not bundled. The explicit exception is **34 requested Hugging Face README snapshots** under the model directories: byte-identical publisher/exporter documents, with their original claims, examples, relative asset links and terms. Copying them does not endorse their benchmarks, development images or deployment commands. The atlas recommendations still require KServe.

The exact DeepSeek July-31 target-plus-draft tensor census remains unresolved. A fully FP8 Kimi K3 artifact is not established. New exports and drafters are identified separately until their exact engine pairing is understood. Template, tokenizer and processor revisions matter even when model configurations or weight listings match.

## How to read recommendations

“Candidate” means a justified configuration to investigate. “Compatibility probe” means an integration question remains. “Blocked” identifies a known unresolved prerequisite. None means production-ready.

Optimization questions are explained in [the workload guide](reports/optimization.md). Execution, measurements and benchmark results live in the separate execution repository. This atlas retains the reasoning, known constraints and primary evidence needed to choose those experiments.
