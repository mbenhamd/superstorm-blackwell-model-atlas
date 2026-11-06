# Serving workloads

Workload knowledge for engine comparisons on the 8×B300 node behind mandatory KServe: dataset definitions, harness mechanisms, traffic-shape design and experiment-manifest checklists.

This folder holds reference knowledge only. Task data, harness code, run schedules, trajectories, replay files, dashboards and measured results belong in the separate execution repository. No B300 performance or quality results are claimed here.

| Workload family | Read | Status |
| --- | --- | --- |
| Bash-only agentic coding | [Dataset and harness reference](agentic-bash-coding/README.md) | Source-checked October 29, 2026; code-level sources pinned to commits and corrected November 6, 2026; Lite pilot recommended, Verified and Terminal-Bench documented as follow-ups |

Conventions: claims cite stable source IDs resolving through `sources[ID]` in [evidence/sources.json](../evidence/sources.json). The October 29 workload pass kept the October 26 engine identities (vLLM v0.32.0, SGLang v0.5.22, KServe v0.21.0, GuideLLM v0.8.1) without rechecking release pages. The November 6 refresh records vLLM v0.33.0 (release object tag name `v0.33.0rc3`) [V033-RELEASE](https://api.github.com/repos/vllm-project/vllm/releases/tags/v0.33.0rc3) and SGLang v0.5.23 [S0523-RELEASE](https://api.github.com/repos/sgl-project/sglang/releases/tags/v0.5.23) as latest stable, with KServe v0.21.0 and GuideLLM v0.8.1 unchanged; release-level changes are in the [vLLM v0.33.0](../reports/vllm-v033-upgrade.md) and [SGLang v0.5.23](../reports/sglang-v0523-upgrade.md) reviews. The workload note's SGLang trace-replay behavior was rechecked at the v0.5.23 commit (unchanged); the vLLM metric-source carry-over to v0.33.0 is recorded in [benchmark-insights](../reports/benchmark-insights.md#source-and-version-boundary). Measurement definitions follow [benchmark-insights](../reports/benchmark-insights.md) and the [measurement contract](../reports/optimization.md#benchmark-decisions-and-measurement-contract).
