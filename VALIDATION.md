# Local validation results

Validation date: **October 15, 2026**. Interpreter: **Python 3.13.5**.

## Actual executions

**39 unit tests passed.** The suite verifies dimensional arithmetic, invalid/nonfinite inputs, candidate/probe/blocked launch gates, immutable checkpoint identity and config hashes, authorization stripping across redirects, rejection of insecure redirects, pinned clone command construction, KServe digest/resource/path guards, streaming-metric semantics and repository integrity. Tests use local temporary directories and mocks where network behavior is involved.

`python scripts/validate_repo.py` passed: **8 model families**, **6 companies**, **34 populated profiles**, **62 primary-source records**, **204 relative Markdown links**. Every catalog profile matches its individual JSON file; the GPU counts and source IDs are consistent. Python source compilation and JSON parsing also passed. Final file/link counts may be higher after packaging; see `evidence/local-validation.json`.

The CLI smoke checks also completed: weight and GQA-KV arithmetic, dry-run launch, dry-run pinned clone commands, metadata listing without network, local preflight inventory, KServe JSON rendering and benchmark help. Example arithmetic produced 2.8e12 bytes for ideal all-FP8 Kimi weights and 88 GiB for the stated Mistral full-attention KV payload example.

KServe rendering used a deliberately synthetic but syntactically valid digest to exercise the renderer; no registry lookup or deploy was attempted. The generated sample was not packaged as a production manifest. No engine was started by the launch smoke check.

## Explicitly not tested

No NVIDIA GPU is available in this environment; `nvidia-smi` is unavailable. No B300 inference, weight loading, CUDA graph replay, kernel selection, speculative acceptance, model quality, latency, throughput, power or GPU memory tests were executed. No serving image was installed, pulled or compared. No KServe cluster admission check was performed. Full Git cloning failed due to local network name resolution. Actual Hub retrieval and remote-code execution were not exercised; local metadata and redirect tests do not certify remote behavior.

## Reproduce

```bash
python scripts/validate_repo.py
python -m unittest discover -s tests -v
```

The full unittest output is in `tests/last-run.txt`. The benchmark protocol defines the remaining hardware/quality gates. A passing documentation/tooling suite must never be advertised as passing model-serving benchmarks.
