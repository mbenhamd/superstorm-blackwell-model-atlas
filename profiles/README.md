# Launch experiments, not performance promises

The [profile index](INDEX.md) lists all 34 experiments.

Every JSON file is populated with a model, variant, engine, GPU topology, arguments, evidence and limitations. None was run on a B300 in this environment. `candidate` means an evidence-informed experiment; `compatibility-probe` means an additional unresolved loader or API gate; `blocked` cannot be executed by the launcher.

The launcher prints a command by default. Execution requires a local model directory containing `config.json` and a `superstorm-revision.json` provenance file with an immutable Hugging Face commit. Produce the metadata with `scripts/fetch_metadata.py`, then separately obtain authorized weights for the same revision. This repository does not download weights. An external drafter needs its own directory and provenance.

```bash
python scripts/launch.py --profile profiles/qwen3.8-27b.bf16.vllm.baseline.json
python scripts/launch.py --help
```

For an actual launch, add `--execute --accept-unbenchmarked --model-dir /models/exact-revision`. Probe profiles additionally need `--allow-compatibility-probe`. Any remote-code enablement needs `--allow-reviewed-remote-code`; audit the code at that revision first. Do not expose the service publicly without an authenticated gateway.

`auto` cache precision can resolve differently across exports. The Qwen SGLang baseline explicitly chooses BF16 KV; record the vLLM effective dtype and change it deliberately for a matched comparison. Weight precision is independent of KV and recurrent-state precision. Effective engine help, loader logs and correctness tests remain authoritative; CLI flags were not exercised against installed engines here.

Do not run all profiles simultaneously. `gpu_count` is the GPU allocation for one instance, not a promise all requested models fit together. Independent one-GPU replicas need distinct GPU assignments and ports. Expert parallelism redistributes existing ranks: it is not another GPU-count multiplier.

Source recipes sometimes use more aggressive graph, symmetric-memory and pool settings. Those are intentionally not copied into every baseline. See the model's serving report and [benchmark protocol](../benchmarks/PROTOCOL.md).
