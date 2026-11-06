# What is known and what remains open

The [October 26 optimization follow-up](reports/optimization.md#october-26-priorities) adds source-supported benchmark hypotheses for all eight families and selected KServe changes. Subagent research and cross-review establish only the inspected source/claim scope. Open PR heads, merged development commits and stable releases remain separate; no benchmark dataset, engine binary, installed cluster or B300 workload was executed or qualified. Quality margins and application latency SLOs must be supplied before selecting a measured winner.

This atlas explains architectures and serving tradeoffs using publisher cards, immutable configurations, selected engine source and release metadata. It contains **no reproduced B300 inference or quality results**.

The [GuideLLM/vLLM benchmark-insights reference](reports/benchmark-insights.md) adds selected-source metric definitions and proposed dashboard components. It does not establish an installed telemetry contract, application SLO, quality tolerance, sustainable capacity or implemented dashboard. GuideLLM's native SLO exclusions and concurrency-search scope remain distinct from a derived service-level capacity decision.

The [Bash-only agentic coding workload reference](workloads/agentic-bash-coding/README.md) (October 29 source check, November 6 corrections) is reference knowledge, not an execution artifact: it names no task IDs, schedules or results, and no Docker/GPU pilot, end-to-end replay or grading run was executed. Its SWE-bench, swe-bench-tasks, Terminal-Bench 2.1, python-domino, Harbor adapter, LiteLLM, `datasets`, GuideLLM and SGLang code-level sources are pinned to commits with content hashes; mini-SWE-agent documentation (`latest`) and the Harbor and SWE-bench documentation pages are unpinned. The Domino no-internet condition is user-supplied. The Exgentic workload percentiles are user-supplied, unsourced and unreproduced, and are not workload parameters; resolving them needs the originating analysis, dataset ID and revision, filters, request-boundary definitions, tokenizer and date. Local `dev`-split loading, LiteLLM SDK network behavior for the (unpinned) LiteLLM version mini installs, the `preds.json`/`preds.jsonl` naming difference and endpoint reachability from Domino compute remain unverified.

The **November 6 refresh** records vLLM v0.33.0 and SGLang v0.5.23 from release notes, dependency pins and selected model-specific source and recipes at the release commits ([vLLM v0.33.0](reports/vllm-v033-upgrade.md), [SGLang v0.5.23](reports/sglang-v0523-upgrade.md)); image contents, the B300 driver/CUDA 13.0 compatibility and runtime behavior remain unqualified. Kimi K3.1 Pro and Mistral Large 4 are served only by development images or unmerged PRs; the image digests were observed but their engine commits are unknown. DeepSeek V4.1 Flash 1017 publisher B300 measurements were taken on the earlier 0909 weights, and the SGLang 1017 cookbook cells are unverified upstream. Of the 23 pinned concrete October variants, 20 Hub heads equal their pins and three moved by README-only or LICENSE-only commits; the retained pins remain the serving identities. The NVIDIA Mistral Medium 3.5 NVFP4 export is catalog variant `nvfp4` with a licence-metadata conflict; vLLM v0.33.0 support rests on source reading only, SGLang v0.5.23 is expected to fail at weight load (fused projections unresolved), and nothing was executed ([dossier](companies/mistral-ai/mistral-medium-3.5/nvfp4.md)).

The **October 26 refresh** covers latest stable identities, all 23 concrete catalog variants and 11 recorded additional artifacts, immutable README/configuration retrieval, and 19 selected engine source files plus two issue/PR records and one ancestry comparison. The stable versions and retained Hub revisions are unchanged. This is not a new review of every historical claim, paper, model weight or engine implementation. The 40 argument arrays of that date retain their original source identity and received applicability notes, now kept in `prior_release_rechecks` after the November 6 recheck; they were not parsed or executed against a newly installed engine.

The October 18 [vLLM v0.32 review](reports/vllm-v032-upgrade.md) compares selected source paths with v0.31 and proposes experiments. The v0.32 registry index/platform digests are recorded; image contents, runtime behavior and installed KServe integration remain unqualified. Older configuration arrays retain their reviewed releases; none was automatically promoted by the new release.

## Evidence boundaries

The [October 19 SGLang v0.5.22 review](reports/sglang-v0522-upgrade.md) compares selected release paths with v0.5.21. Its registry index bytes and platform identities were checked; image contents and runtime remain unqualified. GLM FP8 DCP8 has a reported sparse-kernel corruption risk; Qwen Flash Next's complete prefill-CP port is absent from the release; Gemma's new FA4 result is SM90 evidence. These are explicit exclusions from promotion, not measured failures on this node.

- A publisher benchmark describes its own model revision, hardware and workload. It does not establish an engine winner on this node.
- [Artificial Analysis Intelligence Index](reports/intelligence-index.md) values are third-party composites for AA's evaluated endpoints at a named effort setting. AA records no model revision, served precision or endpoint, so the values are not attributed to the pinned revisions or quantized exports. A null composite means incomplete AA coverage. v5.0 values come from Internet Archive captures because AA now serves only v5.0.1.
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
