# Benchmark and correctness protocol

## Define the decision before measuring

Choose a service-level objective and quality threshold. For example, compare request goodput while meeting a declared p95 first-token and generation-latency budget. Do not replace those budgets with convenient measured numbers after a run. Store the exact values in each experiment manifest; this atlas supplies no invented production SLA.

Compare engines on the same node, model revision, export, tokenizer, chat template, thinking mode, sampling, input/output lengths, concurrency, arrival process and cache state. A warm prefix hit against a cold-cache run is not a fair comparison. Weight precision, KV precision and recurrent-state precision must be recorded separately. Cap vision payloads and account for visual tokens rather than pretending an image is one text token.

## Correctness gates before speed

First test target-only loading and finite outputs against the publisher/reference implementation. Cover ordinary chat, arithmetic, coding, multilingual requests, EOS/stop handling, JSON schemas, tool-call boundaries and image inputs where supported. Quantized checkpoints require a representative held-out quality evaluation, not only one coherent answer. Compare aggregate metrics and failure categories, not exact sampled strings.

Then test long contexts, repeated prefixes, cache eviction, cancellation, graph replay, batch size changes and partial failures. Hybrid models must preserve recurrent and convolutional state as well as token KV. For speculative decoding, verify that accepted and rejected branches commit or restore the right state. Use native acceptance; reject simulated-acceptance environment settings. Evaluate the same workloads with speculation disabled.

For 0731 DeepSeek use its encoding and DSpark contract, not a preview model's MTP invocation. For Kimi match the drafter to the engine and target. For Qwen Flash Next include PLE/ngram and draft tensors in load accounting. For Gemma verify no unsupported audio feature was accidentally enabled from a generic example.

## Minimum experiment matrix

Run target-only first. Sweep input lengths 4K, 16K, 32K and 64K; extend to 128K and the native maximum only after capacity and accuracy gates pass. Sweep output lengths representative of the application, such as 128 and 1,024 tokens, plus the real trace. Include concurrency 1, 8, 32 and the point just before saturation. Repeat independent runs, randomize order and retain failures.

For dense Qwen/Gemma compare TP1 replicas with TP2/4 as total-node capacity, not only one process's throughput. For large MoE compare the documented TP/DP/EP topologies before introducing cross-node communication. For hybrid models sweep the state/KV pool split only with measured pool demand. For DSpark/MTP record acceptance, verification work and queueing at each load, not a single best batch-one speedup.

## Metric definitions

**TTFT** is time from request submission to first generated semantic content. State whether reasoning or tool deltas count. **First-answer latency** excludes hidden/reasoning content and may be much larger. **End-to-end latency** includes the complete response. **ITL** requires reliable per-token emission timing: an SSE chunk can contain zero or several tokens, so chunk gaps are not automatically token latency.

**TPOT** is generation time per output token under an explicitly stated formula. A network-based approximation from first content to final event divided by completion_tokens−1 is a proxy, not a GPU-only measurement. **Output throughput** uses the total reported output-token count divided by full measurement wall time. **Goodput** counts only successful requests/tokens meeting the declared latency and quality objective. Report error rate, p50/p95/p99 and offered load; never drop failures from the denominator silently.

**Natural acceptance** is observed accepted draft work under the deployed sampling procedure. Define whether the length includes the extra target token. **Memory** includes resident weights, caches, recurrent state, graph capture, activations, workspaces and communication buffers. Keep physical/advertised GB and binary GiB explicit.

## Included runner and its boundaries

`run_streaming.py` provides a lightweight, closed-loop, concurrent HTTP/SSE probe using the Python standard library. It records semantic deltas and usage when the endpoint supplies it. It does not infer tokens from chunk counts, execute returned tools/code, generate large synthetic prompts or supply an open-loop arrival process. Use the pinned engine's native benchmark harness for controlled token workloads and detailed kernel/service measurements, and compare against this client view.

```bash
python benchmarks/run_streaming.py --base-url http://127.0.0.1:8000 \
  --model Qwen/Qwen3.8-27B --requests-jsonl benchmarks/smoke.jsonl \
  --concurrency 1 --output benchmarks/results/local-smoke.json
```

The sample requests are integration smoke tests, not a model-quality benchmark. Before sharing results, attach node preflight JSON, engine/image manifests, model/drafter provenance, payload hashes and resolved launch arguments. No measured results are bundled with this atlas.
