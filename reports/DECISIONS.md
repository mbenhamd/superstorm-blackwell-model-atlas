# Decision record

## ADR 001: Separate model architecture from export producer

The same family can have native, NVIDIA, RedHat and Inferact artifacts with different quantization contracts. Keep each under the originating company and record producer-specific repository IDs. Rejected alternative: one flat “FP4 models” list that hides lineage and loader differences.

## ADR 002: Use evidence stages instead of a binary supported flag

A model can be registered yet fail to import, load mixed scales, preserve state or parse tool calls. Record source evidence, compatibility probes, blocked paths and local benchmark status separately. Rejected alternative: a model-card widget means full production support.

## ADR 003: Do not select eight-way tensor parallelism by habit

Large MoE targets and small dense targets stress different resources. Compare exact TP/DP/EP layouts and per-GPU replicas under the same node-wide workload. Rejected alternative: every model must use all eight GPUs in one tensor-parallel group.

## ADR 004: Keep the control plane separate from the inference runtime

KServe/Kubernetes govern placement, health and rollout; vLLM/SGLang execute numerical inference. First validate a one-node target-only runtime, then add orchestration and only measured-benefit disaggregation. Rejected alternative: use a control-plane product as evidence of a faster kernel.

## ADR 005: Metadata and image pins precede production

Resolve mutable model IDs and nightly tags to immutable identities, preserve raw metadata and compare outputs. Keep current source/release observations without claiming tested nightly binaries. Rejected alternative: a moving `latest` command is reproducible.

These are engineering decisions derived from [the framework comparison](../frameworks/DECISION.md), [source review](../evidence/README.md) and [memory analysis](memory-math.md). They are not empirical performance results.
