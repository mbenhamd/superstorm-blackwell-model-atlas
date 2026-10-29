# Bash-only agentic coding workloads

**Scope: October 29, 2026 source check.** Bash-only sandbox agents — repository issue resolution first, broader terminal tasks later — as a joint intelligence-and-serving workload for comparing vLLM and SGLang behind KServe. This note records dataset definitions, harness mechanisms, the no-Hugging-Face route, workload-shape design, live-versus-replay measurement roles and the experiment-manifest checklist. It proposes no measured winner and claims no executed run: commands, images and replay files are documented, not run.

## What is being evaluated

One fixed system: model weights plus tokenizer plus chat template, agent scaffold plus tool schema plus parser, task environment plus evaluator, and serving configuration. Changing any component changes the measured object. Keep the agent, prompt, action format and execution budgets fixed when comparing serving configurations; report each model's actual tokenization when comparing models.

## Dataset options

| Option | Definition | Grading | Recommended use |
| --- | --- | --- | --- |
| SWE-bench Lite | 300 test tasks (+23 dev) sampled from the full 2,294-pair set across 11 of 12 repositories; single-file, ≤3-hunk, self-contained fixes [AGD-SWEBENCH-LITE](https://www.swebench.com/lite.html) | Official task tests grade the generated patch | 25-task pinned pilot for setup validation and large regressions; one task equals 4 percentage points |
| SWE-bench Verified | 500 human-validated tasks; clear statements, correct tests, solvable [O26-QUALITY-SWEBENCH](https://www.swebench.com/) | Same official-test mechanism on a different task set | Larger quality evaluation; label Harbor runs "SWE-bench Verified subset" and keep Lite and Verified results separate |
| Terminal-Bench 2.1 | Verified iteration of Terminal-Bench 2.0; 26 tasks modified for bugs, timeouts, resources or reward-hacking robustness [AGD-TBENCH-21](https://github.com/harbor-framework/terminal-bench-2-1) | Per-task packaged verification logic in container environments | Broader terminal-workflow coverage after the Lite pilot |

Lite selection removes instances with images, external links, SHA references, short problem statements, multi-file edits, file creation/removal and error-message-check tests [AGD-SWEBENCH-LITE](https://www.swebench.com/lite.html). The Lite pilot measures software issue resolution; it does not guarantee a long opening prompt.

Lite and Verified are produced from one task tree but are not the same benchmark to a leaderboard; the publishing source states this explicitly [AGD-SWEBENCH-PUBLISH-SRC](https://raw.githubusercontent.com/SWE-bench/SWE-bench/main/swebench/task/publish.py). Harbor's Verified package carries its own adapter and publisher-reported parity numbers (mini-swe-agent 2.1.0: official 0.563 vs Harbor 0.545 ± 0.007 over 499 comparable tasks), which corroborates keeping adapter results separate rather than establishing equivalence [AGD-HARBOR-SWEBENCH](https://hub.harborframework.com/datasets/swe-bench/swe-bench-verified/latest).

Terminal-Bench 2.1 runs through Harbor with at least 5 trials per task for leaderboard submission; community submissions were closed at retrieval time [AGD-TBENCH-21](https://github.com/harbor-framework/terminal-bench-2-1). Selection rule: start with text-only, CPU-only tasks whose assets and dependencies are available; GitHub-hosted task files alone do not establish that all runtime downloads are available. Harbor resolves pinned Git datasets (`@tag`/`@branch`/`@commit`), explicit task paths and versioned registry entries [AGD-HARBOR-GIT](https://docs.harborframework.com/datasets/git-repos); local datasets, sandboxes, network policy, retries and concurrency are configured per job [AGD-HARBOR-JOB](https://docs.harborframework.com/jobs/run-a-job).

## Harness mechanism: mini-SWE-agent

The batch runner accepts a subset name or a local dataset path (`--subset`, default `lite`), split (`--split`, default `dev`), regex instance filter (`--filter`), slice, environment class (`--environment-class`, recommended `docker` or `singularity`), worker count (`--workers`, default 1), config file (`-c`, default `swebench.yaml`) and output directory (`-o`) [AGD-MINI-SWEBENCH](https://mini-swe-agent.com/latest/usage/swebench/). Docker task images assume x86 Linux. Batch mode writes `preds.json`; trajectories are saved on completion, and completed instances are inferred from that file on rerun. A custom `--subset /path` must load via `datasets.load_dataset(path, split=split)`, which constrains the local directory layout.

Bash exposure has two modes, and the comparison must fix one: native tool calling is the v2 default (the model invokes a `bash` tool), while the legacy text-based mode extracts commands from markdown code blocks via `swebench_backticks.yaml` (`model_class: litellm` versus `litellm_textbased`) [AGD-MINI-V2MIGRATION](https://mini-swe-agent.com/latest/advanced/v2_migration/). Switching modes changes the agent setup being evaluated.

Endpoint wiring passes `model_kwargs` directly to `litellm.completion`, so `custom_llm_provider` and `api_base` point the agent at any OpenAI-compatible endpoint; the local-models guide demonstrates SWE-bench trajectory generation against a vLLM server [AGD-MINI-LOCAL](https://mini-swe-agent.com/latest/models/local_models/). In this atlas that endpoint sits behind the mandatory KServe route. Cost tracking needs a model-registry entry for the local model name, or its errors must be ignored.

The official harness documents Docker-based reproducible evaluation [AGD-SWEBENCH-HARNESS](https://github.com/SWE-bench/SWE-bench). Grading has two documented routes: cloud submission via `sb-cli`, or a local harness run (`python -m swebench.harness.run_evaluation --dataset_name ... --predictions_path preds.jsonl`) [AGD-MINI-SWEBENCH](https://mini-swe-agent.com/latest/usage/swebench/). The local example names `preds.jsonl` while batch output is documented as `preds.json`; confirm the expected predictions format against the pinned harness before execution. The CLI accepts a dataset alias, a Hugging Face id or a local path, which admits the fully local grading route [AGD-SWEBENCH-CLI](https://www.swebench.com/SWE-bench/reference/cli/).

## Sandbox backend: Domino without internet access

Domino Data Lab provides the sandbox layer through its Python SDK, with one deployment condition supplied for this setup: **Domino jobs have no internet access**. That makes the offline route mandatory and rules out any design that downloads data, images or tokenizers at run time.

### Recommended arrangement

| Component | Setup |
| --- | --- |
| Task dataset | Locally prepared SWE-bench Lite tasks |
| Sandbox lifecycle | Domino Python API, one job per agent episode |
| Agent execution | mini-SWE-agent running inside the Domino job |
| Agent action | Bash commands executed inside that job |
| Model inference | Internal vLLM or SGLang endpoint behind KServe |
| Intelligence score | Official evaluator grades the produced patch |
| Serving statistics | Captured requests and local GuideLLM replay |

Keep one job alive for the entire task: the agent inspects files, edits them, runs commands and observes results within the same filesystem. The SDK's `job_start` (v4 Jobs API, recommended for all new work over legacy `runs_start`) starts a **new** execution with a command string, selectable hardware tier and environment, and commit or branch pinning [AGD-DOMINO-SDK](https://github.com/dominodatalab/python-domino). It is job submission, not interactive execution inside an already-running sandbox: if the wrapper only submits jobs, the whole agent loop goes inside each job.

Mini's `LocalEnvironment` executes Bash commands directly on the machine where its Python process runs, so inside a Domino job "local" means inside that job's container. Its `execute` takes an action, working directory and timeout and returns output, return code and exception info; on timeout it kills the whole process group on POSIX, so no children are orphaned [AGD-MINI-LOCAL-ENV](https://mini-swe-agent.com/latest/reference/environments/local/). Available environment classes are `local`, `docker`, `singularity` and the specialized `swerex_docker`, `swerex_modal`, `bubblewrap` and `contree` backends; Domino is not pre-integrated [AGD-MINI-ENVIRONMENTS](https://mini-swe-agent.com/latest/advanced/environments/).

Episode flow: Domino starts a job with the prepared task environment; the job initializes the repository at the required commit; mini calls the model endpoint; generated Bash executes within the job until completion or budget; the job saves the patch, trajectory, request measurements and execution results; the evaluator grades the patch.

### Custom-adapter alternative

If an existing API already executes commands inside a running sandbox, connect it through a custom mini environment adapter with these capabilities: run Bash with a working directory; return output and exit status; persist file changes across turns; stop expired commands with their child processes; reset to a clean known state per task; retrieve the patch and logs. If Harbor later manages Domino, implement its `BaseEnvironment` lifecycle, command execution and file-transfer methods and pass the adapter as `-e module.path:ClassName` [AGD-HARBOR-SANDBOX](https://docs.harborframework.com/sandboxes/custom-sandboxes).

### Grading compatibility

Generating the patch in Domino does not make the stock evaluator run there: the official FAQ states evaluations cannot run without Docker ("No. Docker is required for consistent evaluation environments") and recommends `git diff` output format [AGD-SWEBENCH-FAQ](https://www.swebench.com/SWE-bench/faq/). The simplest arrangement is generate-in-Domino, grade on a Docker-capable evaluation worker with the official evaluator. Reproducing a task environment inside Domino for grading is an explicit integration step requiring reference-patch validation, and its result is not the official Docker-graded score until proven equivalent. Changing the runner's environment flag alone never performs per-task repository, language-version and dependency preparation.

### Offline consequences

- **Endpoint reachability is a prerequisite.** Mini inside the job must reach the internal model endpoint; verify the network route and firewall rules from Domino compute before the pilot and record them.
- **Bake everything into the Domino environment.** mini-SWE-agent, its dependencies, task data and toolchains must be in the Domino environment revision or on internal mirrors — no `pip install`, no Hub downloads, no image pulls at run time. Pin the SDK, environment and hardware-tier versions (SDK 2.2.0 with its per-Domino-version compatibility matrix was current at retrieval [AGD-DOMINO-SDK](https://github.com/dominodatalab/python-domino)).
- **Pin the prompt template.** With Hugging Face unreachable, LiteLLM's chat-template lookup fails and silently falls back to a generic prompt format; set an explicit template and take token counts from serving usage plus the exact model tokenizer [AGD-LITELLM-OFFLINE](https://docs.litellm.ai/docs/proxy/outbound_requests).
- **Local grading only.** Cloud submission (`sb-cli`) and external registries are unreachable; the Docker-capable grading worker needs pre-provisioned task images.
- **Replay runs outside Domino.** Export captured traces through Domino job artifacts and replay from the benchmark host against the KServe route.

### Timing and first-task validation

Record model-request time, Bash-execution time, Domino startup/scheduling time and total task time separately, so serving improvements stay distinguishable from sandbox overhead. Before the 25-task pilot, run one complete task: verify file persistence across commands, capture model requests, produce a patch and obtain a valid grading result.

## Dataset preparation without Hugging Face

The official task repository holds per-task directories (`tasks/<instance_id>/task.yaml`) and a `sweb.yaml` membership file naming the three published datasets (full, Lite, Verified) and the dev/test splits [AGD-SWEBENCH-TASKS](https://github.com/SWE-bench/swe-bench-tasks). Its README describes Dockerfile generation; dataset compilation is the CLI's role. Preparation is: clone the task repository, pin its commit, run `swebench dataset check` (with `--fix` only writing tree-derivable content), then `swebench dataset build -d <dataset> -o <out>` [AGD-SWEBENCH-CLI](https://www.swebench.com/SWE-bench/reference/cli/). The documented flags are confirmed in source: `-d/--dataset` is repeatable, `-o/--out` defaults to `data`, and only the tree is read [AGD-SWEBENCH-DATASET-SRC](https://raw.githubusercontent.com/SWE-bench/SWE-bench/main/swebench/cli/dataset.py). Output is one parquet per split per dataset at `<out>/<dataset-name>/<split>.parquet`, written as `load_dataset` expects, with the dataset's `eval.yaml` card alongside [AGD-SWEBENCH-PUBLISH-SRC](https://raw.githubusercontent.com/SWE-bench/SWE-bench/main/swebench/task/publish.py). Pass the resulting local dataset directory to mini instead of a remote alias.

Remaining local dependencies, through approved sources: task container images and their dependencies, runner/evaluator packages, model weights on the inference servers, and the exact tokenizer files plus chat template of the deployed model.

LiteLLM download behavior needs a narrower statement than "offline mode" alone. The documented `LITELLM_OFFLINE_MODE=true` switch covers the LiteLLM **proxy**; mini-SWE-agent calls the LiteLLM **SDK** (`litellm.completion`), so this page does not establish the SDK path's network behavior [AGD-LITELLM-OFFLINE](https://docs.litellm.ai/docs/proxy/outbound_requests). Two details transfer regardless: some Hugging Face lookups have no off switch — providers that build text prompts from chat messages, including vLLM, read the model's chat template and silently fall back to a generic prompt format when the host is unreachable — and blocked tokenizer downloads degrade to fallback counting (OpenAI tokenizer, or local-cache-or-estimate). Validate once with Hugging Face unavailable, pin a custom prompt template where supported, and take benchmark token counts from serving usage plus the exact model tokenizer rather than client-side estimates.

## Workload-shape design

Measure the opening request separately from all-request statistics: this distinguishes long initial inputs from histories that grow long through accumulated tool output. Count the full rendered input per request (history, tool schemas, chat-template overhead); measure generated model output separately from Bash output, which becomes subsequent input. Preserve natural stopping with a generation budget, record joint input/output lengths with turn order, and apply context limits per request: rendered input plus allowed generation must fit served context capacity.

Suggested analysis bins (not request shaping): input below 16k, 16–32k, 32–64k, 64–128k, above 128k; output below 128, 128–512, 512–2,048, above 2,048 tokens. Report the fraction excluded from replay by context limits separately from live task outcomes.

The following workload figures were reported from a separate Exgentic analysis and were **not** independently reproduced here; they motivate Bash-agent trajectories as a workload source but do not establish this pilot's percentiles:

| Reported measurement | p50 | p95 |
| --- | ---: | ---: |
| First-request input | 2.6k tokens | Not supplied |
| Input across requests | 21k tokens | 142k tokens |
| Output across requests | 95 tokens | 4.3k tokens |

62% of reported sessions mix outputs below 128 and above 512 tokens. The reported 142k input p95 exceeds a 128k context limit, so a 128k deployment cannot replay that reported distribution unchanged. Evidence still needed for any reuse: session and request-boundary definitions, tokenizer identity, measurement date and sampling frame.

## Live execution versus replay

Live execution establishes intelligence and operational performance for one exact model, agent and serving configuration: fresh task environments, identical pinned task IDs, recorded requests/responses/command results/timings, official grading, and retained failures, timeouts, incomplete tasks and infrastructure errors.

GuideLLM replay of locally captured requests provides the controlled serving comparison. At the atlas's GuideLLM v0.8.1 pin, the `otel` format keeps successful LLM spans and replays each `trace_id` as one conversation, sending recorded `gen_ai.input.messages` in full by default (`history=trace`); `history=runtime` instead sends only new messages over live history and requires strict input continuity [AGD-GUIDELLM-TRACE](https://raw.githubusercontent.com/vllm-project/guidellm/597bc014ef78daeb11312374022430939b611f11/docs/en/guides/trace_replay.md). Three replay-fidelity details matter for Bash agents: errored spans are dropped (keep them in the exclusion accounting); output length replays the span's completion count; and recorded tool loops are pre-split onto GuideLLM's client tool-call pipeline, rebinding recorded results to live `tool_call_id`s with definitions from `gen_ai.tool.definitions`. Replay targets `/v1/chat/completions`. Local `json_file` sources and a local tokenizer directory remove hosted downloads from this route [AGD-GUIDELLM-JSONL](https://raw.githubusercontent.com/vllm-project/guidellm/597bc014ef78daeb11312374022430939b611f11/docs/en/examples/custom-jsonl-dataset.md).

Scoring rule: a replay response does not inherit the recorded trajectory's task reward. Quality scores belong to live executions; replay adds performance measurements. This contrasts with SGLang's agentic-trace replay, which normalizes messages to role/content and drops tool-call fields — useful for traffic shape, not functional agent evaluation [S0522-F-TRACE](https://raw.githubusercontent.com/sgl-project/sglang/baa9befa381511cd4d56f83980951e5a45fffc6d/python/sglang/benchmark/datasets/agentic_trace.py). If Harbor is used, validate the conversion from its trajectory format; an ATIF file is not automatically a GuideLLM-ready GenAI trace.

## Metrics

| Area | Required measurements | Definition source |
| --- | --- | --- |
| Task quality | Solved/selected tasks; unresolved, incomplete and error counts | Live grading only; see scoring rule above |
| Input/output distributions | Mean, p50, p95; first-request and all-request splits; session short/long-output mix | Serving usage plus exact model tokenizer |
| Request latency | p50/p95 end-to-end; streaming TTFT and inter-token latency where captured | [BI-G-METRICS](https://raw.githubusercontent.com/vllm-project/guidellm/597bc014ef78daeb11312374022430939b611f11/docs/en/guides/metrics.md); capture token-stream timing live — non-streaming timestamps cannot reconstruct it |
| Throughput | Requests/s, generated tokens/s, latency-SLO goodput | Native GuideLLM SLO denominators and window conventions; goodput search covers concurrent streams, not offered rate |
| Task efficiency | Task duration p50/p95, calls per task, total tokens per task, successful tasks per measured hour | Whole-episode wall time including tools/tests; overlapping work must not be double-counted |
| Failures/exclusions | API errors, timeouts, context-limit failures, replay exclusions | Retained in denominators; exclusions reported separately from outcomes |

Use GuideLLM's metric definitions consistently across runs and keep native versus derived SLO policies distinct, per [benchmark-insights](../reports/benchmark-insights.md).

## Experiment-manifest checklist

1. Freeze: 25 task IDs; pin task-data commit, agent, evaluator, model and engine versions.
2. Prepare local assets: built dataset files, images, packages, model files, tokenizer.
3. Validate grading: run reference solutions on the selected tasks; investigate environment failures.
4. Validate the agent loop: complete a small trial through each endpoint (Bash execution, parsing, termination).
5. Run the live baseline with fixed prompts, budgets and generation settings.
6. Build replay data: convert and inspect several complete episodes end to end.
7. Compare configurations: replay the fixed request set; rerun live tasks for shortlisted configurations.
8. Expand task coverage and repetitions before close quality rankings.

Comparison order: same model and hardware with vLLM versus SGLang first; one serving parameter at a time second; models third with per-model tokenization reported; higher agent concurrency and broader coverage fourth. Record weights, tokenizer, prompt, reasoning settings, output budget, context-management policy and sandbox resources; any change can move both workload shape and task success.

## KServe framing

All serving runs go through the required KServe platform with vLLM or SGLang as the execution engine. The installed KServe version, resource kind and runtime integration are unknown; the atlas's upstream reference (v0.21.0) does not identify the cluster. Record engine image digests, routing, gateway behavior and rollout/scale events with each run, and separate routing/startup effects from model execution before changing GPU settings.

## Evidence limits and open questions

- Task IDs, dataset commit, harness/agent/engine pins and trial counts are unchosen; they belong in the execution repository's manifest.
- Task image, dependency and package availability through approved sources is unchecked.
- Mini-SWE-agent documentation is version-unpinned (`latest`); flag and behavior drift must be rechecked at pin time.
- The batch `preds.json` versus local-eval `preds.jsonl` naming difference is unresolved.
- Harbor parity figures are publisher claims, not reproductions.
- Exgentic workload percentiles are user-supplied and unreproduced.
- No Docker/GPU pilot and no end-to-end replay validation has been run; engine release identities retain October 26 scope.
- Domino backend: endpoint reachability from Domino compute, environment/hardware-tier pins and the grading-worker arrangement are unverified; the no-internet condition is user-supplied.

Two-pass review for this note: Pass 1 resolved each AGD source ID to its primary artifact and recorded the supporting passage or code path above. Pass 2 narrowed three claims — LiteLLM offline mode is proxy-scoped, not established for mini's SDK path; the tasks repository README describes Dockerfile generation while compilation is the CLI's documented role; Harbor adapter scores carry a publisher-reported gap to official scores. Unverified items remain listed above rather than folded into recommendations.
