# Utilities and trust boundaries

All tools use the Python standard library. `launch.py` requires a separately installed engine only when execution is explicitly requested. No script installs dependencies or model weights automatically. Use Python 3.10 or newer; local tests were run on the version reported in VALIDATION.md.

| Tool | Default behavior | Explicit side effect |
| --- | --- | --- |
| `memory.py` | Calculate illustrative payload bytes | None |
| `preflight.py` | Read available node/tool metadata | `--output` writes a new inventory file |
| `launch.py` | Print guarded command | `--execute` starts a local, offline engine after acknowledgements |
| `clone_upstreams.py` | Print exact revision retrieval commands | `--execute` creates new shallow checkouts; no existing repository modified |
| `fetch_metadata.py` | List catalog checkpoint IDs | `--fetch` resolves and archives metadata only |
| `validate_repo.py` | Read and check local repository integrity | None |
| `../benchmarks/run_streaming.py` | Requires an explicit endpoint/model/workload | Sends those requests and writes a new measurement file |
| `../deploy/kserve/render.py` | Requires profile, digest, PVC and resources | Prints JSON only; never applies |

Treat profile JSON and model code as trusted executable inputs: these tools do not sandbox arbitrary profiles or remote model implementations. CLI guardrails prevent common accidental actions, not malicious operator input. The launcher validates checkpoint identity and config metadata hash, **not the weight shards**. Obtain and independently verify all weights from the same immutable commit. A metadata-only directory cannot successfully serve until the matching authorized weights and any required processor/tokenizer files have been added.

Metadata retrieval intentionally excludes full tokenizer vocabularies, weight files and executable Python implementations. Optional missing files are recorded. API auth uses `HF_TOKEN` from the environment and strips it across cross-host redirects. The benchmark uses `BENCH_API_KEY`, rejects credential-bearing URLs and never follows redirects with credentials. Neither tool prints tokens or dumps the environment. Network retrieval was not exercised successfully in this environment; mocks and offline checks are not an integration test against the Hub.

The streaming probe implements the usual one-JSON-object-per-SSE-data-line interface exposed by these chat endpoints. General multi-line SSE event assembly is outside its scope. It is a closed-loop integration probe, not an open-loop saturation benchmark or exact per-token profiler. Requests may generate server-side costs; the tool only sends the explicit JSONL workload. Returned tools/code are not executed.
