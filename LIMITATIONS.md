# What is known and what remains open

This atlas explains architectures and serving tradeoffs using publisher cards, immutable configurations, selected engine source and release metadata. It contains **no reproduced B300 inference or quality results**.

## Evidence boundaries

- A publisher benchmark describes its own model revision, hardware and workload. It does not establish an engine winner on this node.
- A supported architecture or existing kernel does not establish support for every exporter, precision, draft or cache mode.
- A main commit, release tag, wheel index and container digest identify different objects. Source inspection does not certify an unexamined binary.
- Parameter counts, serialized file bytes and resident per-GPU memory are different quantities. Target-only loaders can legitimately omit stored MTP tensors.
- Configured context limits do not establish useful accuracy, concurrency or capacity at that length.
- Current source observations are dated. Retained configuration records preserve their own earlier inspected commits and remain untested.

## Hardware and artifacts

The user supplied **B300 SXM6-AC**, eight GPUs. The atlas uses NVIDIA B300 reference specifications conditionally. Actual usable HBM, CPU/NUMA, NVLink/NVSwitch, NICs, storage, power and cooling are unknown; a DGX reference does not identify this server.

No model weight payloads, serving containers or nightly wheels were downloaded or executed here. Limited metadata and safetensors headers support selected accounting claims. No Kubernetes cluster was deployed or validated. Full upstream trees and original source bodies are not bundled.

The exact DeepSeek July-31 target-plus-draft tensor census remains unresolved. A fully FP8 Kimi K3 artifact is not established. New exports and drafters are identified separately until their exact engine pairing is understood. Template, tokenizer and processor revisions matter even when model configurations or weight listings match.

## How to read recommendations

“Candidate” means a justified configuration to investigate. “Compatibility probe” means an integration question remains. “Blocked” identifies a known unresolved prerequisite. None means production-ready.

Optimization questions are explained in [the workload guide](reports/optimization.md). Execution, measurements and benchmark results live in the separate execution repository. This atlas retains the reasoning, known constraints and primary evidence needed to choose those experiments.
