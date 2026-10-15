# Engine research and experiment expansion · October 16, 2026

The date in this title is Europe/Paris. Source receipts use UTC and were collected on October 15. This follow-up starts from atlas commit `5dfbab0`, after the [repository audit](AUDIT-2026-10-15.md). The user requested more explanation and experiments informed by stable, recent main and nightly vLLM/SGLang/KServe changes.

## Delivered scope

Three Astra max researchers expanded the framework source reviews and wrote **30 engine/platform experiment cards**: [vLLM V01–V10](../frameworks/vllm/EXPERIMENTS.md), [SGLang G01–G12](../frameworks/sglang/EXPERIMENTS.md) and [KServe K01–K08](../frameworks/kserve/EXPERIMENTS.md). The coordinator added the [shared X01–X09 roadmap](../reports/EXPERIMENTS.md), [manual run-record template](../benchmarks/experiment.template.json), refreshed [nightly synthesis](../reports/nightly-readiness.md), navigation and integrated evidence.

The cards state hypotheses, prerequisites, controlled changes, measurements, quality checks and rejection criteria. The roadmap covers all eight atlas families and preserves their exact artifact identities, context limits and existing blocked/probe statuses. Existing launch profiles and their historical source-inspection commits were not upgraded or promoted to tested status.

## Findings that change experiment design

| Finding | Practical consequence |
| --- | --- |
| Release, inspected main and published nightly identify different objects; the vLLM channel moved during this research | Keep each dated observation. Confirm source inclusion and actual artifact/dependency identity before using a feature. |
| Release branching can exclude a change merged before publication | Inspect the exact release tree or ancestry. SGLang Qwen graph helpers and KServe's SGLang template provide concrete examples. |
| The merged vLLM cuBLAS initialization differs from the PR description | Interpret the memory baseline from the merged code, then measure load/restart behavior. |
| vLLM's new MegaMoE NVFP4 row has no model caller in the inspected patch; draft-head and GLM metadata changes have explicit exclusions | Treat these as scoped research candidates. Do not invent support flags or transfer gains to unrelated methods/models. |
| SGLang int8 cached recurrent state is already in stable source; active state and cached state are different treatments | Isolate capacity, restoration cost and quality after repeated cache hits. Do not advertise an existing capability as a new nightly improvement. |
| KServe stable includes a newer routing preset file but its default router version selects the older path | Inspect rendered scheduler configuration, not file presence alone. |
| KServe master adds a scoped SGLang template and changes scaling/rollout behavior | Separate the unreleased single-node template from advanced P/D integration, and qualify migration and rollback independently. |

The framework reviews provide the primary URLs and pinned functions for these findings. No publisher microbenchmark ratio was promoted to a local B300 performance claim.

## Research and independent review records

| Scope | Primary research | Independent review |
| --- | --- | --- |
| vLLM source and experiments | [Research](updates/2026-10-16-engine-experiments/vllm-research.json) | [Cross-review](updates/2026-10-16-engine-experiments/vllm-cross-review.json) |
| SGLang source and experiments | [Research](updates/2026-10-16-engine-experiments/sglang-research.json) | [Cross-review](updates/2026-10-16-engine-experiments/sglang-cross-review.json) |
| KServe source and experiments | [Research](updates/2026-10-16-engine-experiments/kserve-research.json) | [Cross-review](updates/2026-10-16-engine-experiments/kserve-cross-review.json) |
| Shared methodology and template | Coordinator | [Plan review](updates/2026-10-16-engine-experiments/shared-plan-review.json) |
| Nightly synthesis and integrated evidence | Coordinator | [Integration review](updates/2026-10-16-engine-experiments/integration-review.json) |

Shared-plan review corrected a TP4 label that actually linked to the local DeepSeek SGLang TP8 probe, constrained all context sweeps by serialized input plus output, and refined the statistical decision rule to use uncertainty in the measured improvement. The original benchmark protocol received the same context-budget clarification. vLLM cross-review also made the GLM Flash P/D recipe's hybrid-cache-manager setting explicit on both roles.

SGLang cross-review clarified the exact dummy-weight TP2+TP2 P/D recipe before the proposed 4+4 adaptation, and separated simulated-acceptance speed runs from natural-acceptance accuracy evidence. Integration review kept an older open-PR head commit in its historical observation rather than presenting it as freshly resolved with a new status timestamp.

All three framework cross-reviews, the shared-plan review and the final integration review are complete, with no unresolved findings in their stated scopes. They establish the documented evidence boundaries and consistency; they do not substitute for running the planned experiments.

## Evidence handling

[sources.json](sources.json) and [SOURCES.md](SOURCES.md) contain **126 fresh source records**, bringing the register to **261 entries**. Each new captured response retains its retrieval time, actual endpoint and hash. These are records, not a claim of 261 distinct URLs or independent reproductions. [upstreams.lock.json](upstreams.lock.json) preserves historical branch/index observations and separately records expanded inspection refs, later observed heads, PR states and development-image metadata. The coordinator's [retrieval record](updates/2026-10-16-engine-experiments/coordinator-retrievals.json) includes unsuccessful API calls as well as successful benchmark-document retrievals.

GitHub REST rate limits were handled through official HTML/raw endpoints and Git references; failures were not converted into source claims. Selected filtered/shallow Git metadata was used for immutable release/master comparisons where recorded. Full upstream trees, raw source response bodies, model weights and binary artifacts are not bundled.

## Validation and remaining work

Current local checks and their exact output are in [VALIDATION](../VALIDATION.md), [local-validation.json](local-validation.json) and [tests/last-run.txt](../tests/last-run.txt). The offline HTML is generated from the final Markdown, and `SHA256SUMS` covers repository artifacts except itself. Local checks do not validate the experiment template's semantic completeness or prove runtime compatibility.

No inference engine was installed or run, no model weights or wheel/container bodies were downloaded, no GPU performance or quality was measured, and no Kubernetes deployment or admission check was performed. The experiment cards and null result fields describe work to do on the actual node. An executed run needs its own immutable manifest, raw measurements, quality evidence and decision.
