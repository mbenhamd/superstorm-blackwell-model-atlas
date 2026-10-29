# Serving workloads

Workload knowledge for engine comparisons on the 8×B300 node behind mandatory KServe: dataset definitions, harness mechanisms, traffic-shape design and experiment-manifest checklists.

This folder holds reference knowledge only. Task data, harness code, run schedules, trajectories, replay files, dashboards and measured results belong in the separate execution repository. No B300 performance or quality results are claimed here.

| Workload family | Read | Status |
| --- | --- | --- |
| Bash-only agentic coding | [Dataset and harness reference](agentic-bash-coding/README.md) | Source-checked October 29, 2026; Lite pilot recommended, Verified and Terminal-Bench documented as follow-ups |

Conventions: claims cite stable source IDs resolving through `sources[ID]` in [evidence/sources.json](../evidence/sources.json). Engine identities retain the October 26 scope (vLLM v0.32.0, SGLang v0.5.22, KServe v0.21.0, GuideLLM v0.8.1); this pass did not recheck release pages. Measurement definitions follow [benchmark-insights](../reports/benchmark-insights.md) and the [measurement contract](../reports/optimization.md#benchmark-decisions-and-measurement-contract).
