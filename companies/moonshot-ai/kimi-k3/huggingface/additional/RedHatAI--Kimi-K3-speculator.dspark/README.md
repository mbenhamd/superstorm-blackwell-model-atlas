---
library_name: speculators
base_model:
- moonshotai/Kimi-K3
license: apache-2.0
tags:
- speculative-decoding
- dspark
- speculators
---
# RedHatAI/Kimi-K3-speculator.dspark
This is a DSpark speculator model for [moonshotai/Kimi-K3](https://huggingface.co/moonshotai/Kimi-K3).
## Training Details
This model was trained using the [Speculators](https://github.com/vllm-project/speculators) library. Training compute for this model was generously provided by [Verda](https://verda.com/), a leading cloud platform for AI training and inference. Verda runs its own data centers and offers on-demand NVIDIA GPU clusters with NVLink and InfiniBand interconnect, backed by an in-house AI Lab that works directly with open-source projects on large-scale training and inference optimization.

Kimi-K3 does not fit on a single GB300 node, so training used a multi-node setup with hidden-state extraction and draft training on disjoint node groups, streaming hidden states between them through a [Mooncake](https://github.com/kvcache-ai/Mooncake) store. Two separate virtual environments are required:

  - **Extraction:** vllm, [`hs_connectors`](https://github.com/vllm-project/speculators/tree/main/hs_connectors), and [`mooncake-transfer-engine`](https://github.com/kvcache-ai/Mooncake)
  - **Training:** speculators, [`hs_connectors`](https://github.com/vllm-project/speculators/tree/main/hs_connectors), and [`mooncake-transfer-engine`](https://github.com/kvcache-ai/Mooncake)

<details>
  <summary>Commands</summary>

  ### Prepare data
```bash
  # In virtual environment with speculators installed
  python scripts/prepare_data.py \
    --model moonshotai/Kimi-K3 \
    --trust-remote-code \
    --data ./data.jsonl \
    --output ./runs/kimi_k3_dspark/data \
    --seq-length 8192 \
    --num-preprocessing-workers 48 \
    --minimum-valid-tokens 16
```
  ### Launch the Mooncake master
  One per run, anywhere both node groups can reach.
```bash
  mooncake_master --rpc_port 50051 --metrics_port 9003 \
    --rpc_thread_num 8 --enable_disk_eviction=false --logtostderr=true
```
  ### Launch extraction (both nodes of the TP8 pair)
  `NODE_RANK=0` on the head node, `1` on the other; rank 1 runs `--headless`.
```bash
  # In (separate) virtual environment with vllm installed
  vllm_venv/bin/python scripts/launch_vllm.py moonshotai/Kimi-K3 \
    --hidden-states-backend mooncake \
    --mooncake-master <host>:50051 \
    --mooncake-metadata-server P2PHANDSHAKE \
    --mooncake-protocol tcp \
    --mooncake-global-segment-gib 32 \
    --mooncake-local-buffer-gib 4 \
    --mooncake-writer-threads 4 \
    --target-layer-ids 24 48 72 88 92 \
    --trust-remote-code \
    -- \
    --served-model-name moonshotai/Kimi-K3 \
    --trust-remote-code \
    --load-format fastsafetensors \
    --moe-backend auto \
    --all2all-backend flashinfer_nvlink_one_sided \
    --enable-expert-parallel \
    --gpu-memory-utilization 0.95 \
    --compilation-config '{"pass_config":{"fuse_allreduce_rms":false}}' \
    --tensor-parallel-size 8 \
    --nnodes 2 \
    --node-rank <0|1> \
    --master-addr <head-fabric-ip> \
    --port 8000 \
    --max-model-len 8193 \
    --max-num-seqs 64 \
    --max-num-batched-tokens 32768 \
    --kv-cache-dtype auto \
    --attention-config '{"mla_prefill_backend":"TRTLLM_RAGGED","use_prefill_query_quantization":false}' \
    --no-enable-prefix-caching \
    --language-model-only
```
  ### Launch training
  Must be run once the extractor reports healthy on `/health`.
```bash
  # In virtual environment with speculators installed
  torchrun --standalone --nproc-per-node 4 \
    scripts/train.py \
    --verifier-name-or-path moonshotai/Kimi-K3 \
    --trust-remote-code \
    --draft-config k3_draft_layer_config.json \
    --data-path ./runs/kimi_k3_dspark/data \
    --save-path ./runs/kimi_k3_dspark/checkpoints \
    --draft-vocab-size 163840 \
    --mask-token-id 163837 \
    --epochs 1 \
    --checkpoint-freq 0.1 \
    --total-seq-len 8192 \
    --train-data-ratio 0.999 \
    --speculator-type dspark \
    --target-layer-ids 24 48 72 88 92 \
    --block-size 8 \
    --max-anchors 1024 \
    --dflash-decay-gamma 4.0 \
    --markov-rank 256 \
    --markov-head-type vanilla \
    --enable-confidence-head \
    --confidence-head-with-markov \
    --confidence-head-alpha 1.0 \
    --loss-fn '{"ce":0.1,"tv":0.9}' \
    --optimizer muon \
    --lr 1e-4 \
    --scheduler-type cosine \
    --scheduler-warmup-ratio 0.03 \
    --hidden-states-backend mooncake \
    --mooncake-master <host>:50051 \
    --mooncake-metadata-server P2PHANDSHAKE \
    --mooncake-protocol tcp \
    --mooncake-global-segment-gib 0 \
    --mooncake-local-buffer-gib 4 \
    --mooncake-writer-threads 4 \
    --vllm-endpoint http://<head-fabric-ip>:8000/v1 \
    --on-missing generate \
    --on-generate delete \
    --request-timeout 900 \
    --max-retries 5 \
    --generation-validation-retries 2 \
    --max-consecutive-generation-failures 20 \
    --num-workers 2 \
    --prefetch-factor 2 \
    --log-freq 20
```
  All four components can be run together on a 3-node Slurm allocation with `run.sbatch` from the example directory.
</details>

## Model Specifications
| | |
|---|---|
| **Base Model** | moonshotai/Kimi-K3 |
| **Chat Template** | moonshotai/Kimi-K3 (use `/chat/completions` endpoint) |
| **Format** | Safetensors |
| **License** | Apache 2.0 |
| **Draft Layers** | 5 |
| **Target Layer IDs** | 24, 48, 72, 88, 92 |
| **Draft Vocab Size** | 163840 |
| **Training Sequence Length** | 8192 |
| **Validation Hardware** | NVIDIA B300 NVL72 (4 GPUs per node) |
## Deployment
```bash
  docker run --gpus all \
  --privileged --ipc=host -p 8000:8000 \
  -v ~/.cache/huggingface:/root/.cache/huggingface \
  -e GLOO_SOCKET_IFNAME=$IFACE_NAME \
  -e NCCL_SOCKET_IFNAME=$IFACE_NAME \
  -e VLLM_ALLREDUCE_USE_FLASHINFER=1 \
  -e VLLM_ENGINE_READY_TIMEOUT_S=3600 \
  -e VLLM_USE_V2_MODEL_RUNNER=1 \
  -e VLLM_USE_RUST_FRONTEND=1 \
  vllm/vllm-openai:latest moonshotai/Kimi-K3 \
  --trust-remote-code \
  --gpu-memory-utilization 0.95 \
  --tensor-parallel-size 16 \
  --nnodes 2 \
  --node-rank 0 \
  --master-addr $HEAD_IP \
  --load-format fastsafetensors \
  --no-enable-flashinfer-autotune \
  --max-model-len 1048576 \
  --kv-cache-dtype fp8 \
  --attention-config '{"use_prefill_query_quantization":true,"mla_prefill_backend":"TOKENSPEED_MLA"}' \
  --enable-prefix-caching \
  --attention-backend TOKENSPEED_MLA \
  --prefix-match-unit 128 \
  --reasoning-parser kimi_k3 \
  --language-model-only \
  --speculative-config '{"model":"RedHatAI/Kimi-K3-speculator.dspark", "num_speculative_tokens":8, "method": "dspark", "draft_sample_method": "probabilistic", "rejection_sample_method": "block"}'  
```
## Acceptance Rates
Per-position token acceptance rates across datasets, at 8 draft tokens per step:
| Dataset | Pos 0 | Pos 1 | Pos 2 | Pos 3 | Pos 4 | Pos 5 | Pos 6 | Pos 7 | Acceptance Length |
|---------|-------|-------|-------|-------|-------|-------|-------|-------|-------------------|
| HumanEval | 81.3% | 67.3% | 56.9% | 48.6% | 42.2% | 37.3% | 33.0% | 29.4% | 4.96 |
| math_reasoning | 92.3% | 84.3% | 76.7% | 69.8% | 63.4% | 57.2% | 51.6% | 47.0% | 6.42 |
| qa | 72.9% | 51.2% | 35.2% | 24.3% | 17.0% | 12.0% | 8.6% | 6.2% | 3.28 |
| question | 70.6% | 48.4% | 33.1% | 23.2% | 16.6% | 12.3% | 9.3% | 7.2% | 3.21 |
| rag | 77.9% | 58.9% | 44.1% | 33.4% | 25.4% | 19.6% | 15.2% | 11.8% | 3.86 |
| summarization | 82.5% | 64.8% | 49.9% | 38.4% | 28.5% | 20.3% | 14.9% | 10.7% | 4.10 |
| tool_call | 71.5% | 50.2% | 35.6% | 25.4% | 18.6% | 13.8% | 10.4% | 7.9% | 3.33 |
| translation | 82.7% | 67.2% | 54.6% | 45.7% | 38.2% | 31.3% | 25.3% | 20.0% | 4.65 |
| writing | 69.4% | 46.8% | 32.1% | 22.3% | 16.0% | 11.8% | 8.9% | 7.0% | 3.14 |

### Long-context acceptance
Acceptance rates on [LongBench](https://longbench2.github.io/) dataset by sub-domain and input context length, from 2K to 20K tokens.
<details>
  <summary>Full breakdown</summary>

| Sub-domain | Context | Pos 0 | Pos 1 | Pos 2 | Pos 3 | Pos 4 | Pos 5 | Pos 6 | Pos 7 | Acceptance Length |
|---|---|---|---|---|---|---|---|---|---|---|
| Academic | 2,000 | 73.9% | 47.5% | 33.8% | 22.9% | 13.4% | 7.7% | 5.5% | 4.0% | 3.09 |
| Academic | 4,000 | 70.8% | 49.7% | 29.9% | 17.8% | 9.7% | 5.6% | 3.6% | 1.6% | 2.89 |
| Academic | 6,000 | 73.6% | 48.6% | 28.8% | 17.1% | 9.7% | 5.6% | 3.6% | 2.5% | 2.90 |
| Academic | 8,000 | 77.6% | 54.8% | 33.6% | 16.5% | 10.6% | 4.9% | 2.6% | 1.4% | 3.02 |
| Academic | 10,000 | 77.3% | 52.3% | 31.0% | 17.6% | 11.3% | 5.1% | 3.0% | 1.9% | 3.00 |
| Academic | 12,000 | 79.2% | 59.6% | 35.2% | 22.1% | 11.4% | 6.5% | 4.5% | 1.7% | 3.20 |
| Academic | 14,000 | 71.6% | 47.6% | 25.2% | 13.8% | 8.6% | 3.9% | 1.9% | 0.6% | 2.73 |
| Academic | 16,000 | 72.3% | 51.7% | 30.2% | 16.0% | 8.0% | 4.0% | 2.0% | 1.1% | 2.85 |
| Academic | 18,000 | 74.4% | 47.9% | 28.6% | 16.6% | 8.8% | 3.5% | 2.8% | 1.8% | 2.84 |
| Academic | 20,000 | 78.1% | 52.4% | 29.4% | 15.9% | 8.9% | 3.9% | 2.5% | 1.4% | 2.92 |
| Agent history QA | 2,000 | 76.4% | 59.2% | 46.0% | 31.9% | 21.0% | 14.1% | 11.2% | 7.2% | 3.67 |
| Agent history QA | 4,000 | 80.7% | 68.8% | 55.3% | 35.4% | 26.0% | 16.1% | 11.3% | 6.1% | 4.00 |
| Agent history QA | 6,000 | 80.0% | 69.3% | 54.8% | 38.3% | 32.4% | 24.5% | 19.3% | 11.7% | 4.30 |
| Agent history QA | 8,000 | 82.3% | 67.1% | 50.6% | 31.7% | 19.5% | 14.4% | 8.4% | 5.7% | 3.80 |
| Agent history QA | 10,000 | 79.7% | 64.9% | 48.7% | 33.5% | 24.1% | 15.8% | 13.0% | 8.2% | 3.88 |
| Agent history QA | 12,000 | 81.4% | 62.8% | 46.0% | 31.7% | 20.4% | 12.5% | 8.5% | 4.0% | 3.67 |
| Agent history QA | 12,000 | 77.1% | 60.0% | 42.7% | 26.7% | 17.3% | 9.9% | 7.2% | 4.5% | 3.45 |
| Agent history QA | 14,000 | 76.9% | 53.2% | 38.2% | 26.5% | 16.9% | 10.4% | 6.5% | 4.2% | 3.33 |
| Agent history QA | 16,000 | 74.5% | 54.0% | 34.3% | 20.2% | 12.9% | 7.5% | 4.6% | 2.7% | 3.11 |
| Agent history QA | 18,000 | 78.6% | 55.5% | 34.9% | 22.6% | 14.3% | 7.8% | 5.0% | 2.5% | 3.21 |
| Agent history QA | 20,000 | 75.9% | 57.4% | 36.0% | 23.6% | 14.7% | 9.6% | 6.3% | 3.8% | 3.27 |
| Code repo QA | 2,000 | 71.3% | 43.3% | 25.8% | 16.9% | 10.4% | 5.6% | 3.6% | 1.8% | 2.79 |
| Code repo QA | 4,000 | 74.8% | 43.4% | 25.4% | 15.8% | 9.1% | 3.0% | 1.5% | 0.9% | 2.74 |
| Code repo QA | 6,000 | 77.8% | 47.1% | 26.2% | 13.0% | 7.5% | 1.5% | 0.9% | 0.7% | 2.75 |
| Code repo QA | 8,000 | 74.5% | 45.6% | 26.9% | 15.3% | 7.9% | 3.6% | 2.0% | 1.1% | 2.77 |
| Code repo QA | 10,000 | 73.5% | 48.2% | 26.0% | 13.5% | 6.5% | 1.9% | 1.5% | 0.4% | 2.72 |
| Code repo QA | 12,000 | 79.5% | 51.0% | 31.0% | 16.9% | 9.0% | 4.6% | 1.3% | 0.3% | 2.94 |
| Code repo QA | 14,000 | 73.0% | 45.7% | 26.1% | 15.6% | 7.2% | 3.3% | 0.9% | 0.2% | 2.72 |
| Code repo QA | 16,000 | 73.5% | 45.6% | 26.1% | 17.1% | 8.6% | 4.6% | 2.0% | 0.4% | 2.78 |
| Code repo QA | 18,000 | 76.9% | 50.6% | 29.9% | 16.4% | 8.9% | 3.6% | 1.9% | 0.7% | 2.89 |
| Code repo QA | 20,000 | 76.1% | 45.2% | 24.4% | 12.7% | 6.5% | 2.9% | 0.7% | 0.2% | 2.69 |
| Detective | 2,000 | 74.5% | 51.4% | 31.5% | 21.4% | 13.2% | 6.7% | 3.6% | 1.4% | 3.04 |
| Detective | 4,000 | 79.7% | 57.7% | 38.0% | 23.0% | 14.4% | 7.8% | 3.0% | 1.0% | 3.25 |
| Detective | 6,000 | 80.1% | 57.0% | 37.6% | 21.6% | 12.4% | 5.7% | 2.2% | 1.2% | 3.18 |
| Detective | 8,000 | 80.5% | 56.0% | 35.6% | 19.0% | 9.1% | 5.0% | 1.7% | 1.0% | 3.08 |
| Detective | 10,000 | 74.7% | 51.0% | 31.8% | 18.3% | 11.1% | 5.8% | 3.5% | 2.6% | 2.99 |
| Detective | 12,000 | 77.8% | 52.9% | 30.7% | 16.0% | 8.0% | 3.4% | 1.6% | 1.1% | 2.92 |
| Detective | 14,000 | 76.3% | 53.2% | 32.8% | 17.3% | 9.6% | 4.4% | 3.0% | 1.2% | 2.98 |
| Detective | 16,000 | 73.9% | 52.2% | 30.8% | 14.7% | 6.2% | 4.5% | 2.7% | 1.1% | 2.86 |
| Detective | 18,000 | 76.2% | 48.2% | 28.1% | 18.1% | 11.1% | 4.5% | 3.2% | 0.5% | 2.90 |
| Detective | 20,000 | 77.4% | 54.8% | 30.8% | 15.6% | 9.3% | 6.1% | 3.0% | 2.6% | 3.00 |
| Event ordering | 2,000 | 75.6% | 48.8% | 32.8% | 20.9% | 13.3% | 7.4% | 3.4% | 1.5% | 3.04 |
| Event ordering | 4,000 | 76.2% | 53.1% | 34.8% | 21.4% | 10.0% | 5.0% | 2.9% | 1.4% | 3.05 |
| Event ordering | 6,000 | 77.4% | 48.6% | 28.6% | 14.3% | 7.0% | 3.7% | 0.7% | 0.2% | 2.80 |
| Event ordering | 8,000 | 78.9% | 54.6% | 33.3% | 20.4% | 10.0% | 5.6% | 2.7% | 1.5% | 3.07 |
| Event ordering | 10,000 | 76.5% | 51.4% | 30.4% | 18.0% | 9.0% | 4.6% | 3.0% | 0.9% | 2.94 |
| Event ordering | 12,000 | 77.9% | 56.5% | 36.3% | 20.6% | 12.4% | 6.0% | 3.0% | 1.2% | 3.14 |
| Event ordering | 14,000 | 73.6% | 52.1% | 31.9% | 18.5% | 9.0% | 4.4% | 2.1% | 0.9% | 2.93 |
| Event ordering | 16,000 | 72.3% | 51.8% | 31.8% | 17.3% | 7.9% | 4.1% | 2.0% | 1.4% | 2.89 |
| Event ordering | 18,000 | 75.8% | 55.7% | 34.4% | 16.8% | 10.7% | 5.7% | 2.1% | 1.2% | 3.02 |
| Event ordering | 20,000 | 74.9% | 50.2% | 32.9% | 16.7% | 8.4% | 4.1% | 2.5% | 1.4% | 2.91 |
| Financial | 2,000 | 82.1% | 62.4% | 39.6% | 27.7% | 18.4% | 11.3% | 6.9% | 4.1% | 3.52 |
| Financial | 4,000 | 80.3% | 59.1% | 40.9% | 26.0% | 14.4% | 8.4% | 5.2% | 3.1% | 3.38 |
| Financial | 6,000 | 81.1% | 60.0% | 36.0% | 22.1% | 12.9% | 6.7% | 2.2% | 2.0% | 3.23 |
| Financial | 8,000 | 80.5% | 59.7% | 40.5% | 26.3% | 15.3% | 9.3% | 6.0% | 3.0% | 3.41 |
| Financial | 10,000 | 82.7% | 58.8% | 36.7% | 22.9% | 13.3% | 7.2% | 3.7% | 1.6% | 3.27 |
| Financial | 12,000 | 78.1% | 51.4% | 30.7% | 20.1% | 11.8% | 6.4% | 2.7% | 2.2% | 3.03 |
| Financial | 14,000 | 82.0% | 60.8% | 40.3% | 26.7% | 17.7% | 12.0% | 7.4% | 3.5% | 3.50 |
| Financial | 16,000 | 79.3% | 56.6% | 40.1% | 24.0% | 14.2% | 9.0% | 5.4% | 3.1% | 3.32 |
| Financial | 18,000 | 84.7% | 60.4% | 37.7% | 23.5% | 14.5% | 8.4% | 5.8% | 2.6% | 3.38 |
| Financial | 20,000 | 79.6% | 55.4% | 36.0% | 22.4% | 12.6% | 6.3% | 3.8% | 1.5% | 3.18 |
| Governmental | 2,000 | 78.2% | 59.1% | 45.0% | 28.2% | 21.2% | 14.1% | 8.8% | 6.8% | 3.61 |
| Governmental | 4,000 | 79.4% | 57.2% | 38.6% | 23.0% | 15.1% | 10.7% | 6.8% | 4.2% | 3.35 |
| Governmental | 6,000 | 80.5% | 62.1% | 39.5% | 24.5% | 16.3% | 9.6% | 5.1% | 3.2% | 3.41 |
| Governmental | 8,000 | 82.4% | 59.9% | 36.3% | 21.9% | 10.6% | 6.5% | 3.3% | 2.0% | 3.23 |
| Governmental | 10,000 | 81.5% | 57.9% | 39.9% | 26.2% | 15.9% | 10.1% | 5.8% | 2.1% | 3.39 |
| Governmental | 12,000 | 82.0% | 57.6% | 32.4% | 21.4% | 11.5% | 7.5% | 5.2% | 2.7% | 3.20 |
| Governmental | 14,000 | 81.6% | 53.7% | 30.5% | 18.9% | 11.2% | 6.4% | 2.6% | 1.4% | 3.06 |
| Governmental | 16,000 | 83.2% | 57.1% | 37.0% | 22.4% | 11.7% | 6.9% | 4.8% | 3.3% | 3.27 |
| Governmental | 18,000 | 83.0% | 59.7% | 35.9% | 22.8% | 12.4% | 7.3% | 3.0% | 1.3% | 3.26 |
| Governmental | 20,000 | 80.6% | 55.1% | 34.3% | 21.6% | 10.3% | 6.1% | 3.2% | 1.5% | 3.13 |
| Legal | 2,000 | 81.8% | 59.9% | 44.3% | 31.9% | 21.3% | 12.9% | 8.1% | 4.5% | 3.65 |
| Legal | 4,000 | 77.1% | 55.0% | 36.8% | 23.7% | 15.5% | 10.0% | 6.3% | 4.2% | 3.29 |
| Legal | 6,000 | 79.7% | 57.1% | 38.2% | 23.4% | 13.2% | 9.5% | 3.9% | 2.1% | 3.27 |
| Legal | 8,000 | 83.9% | 56.8% | 36.2% | 23.2% | 16.1% | 8.9% | 4.4% | 2.9% | 3.32 |
| Legal | 10,000 | 80.1% | 54.1% | 35.1% | 19.7% | 11.5% | 6.6% | 3.7% | 2.0% | 3.13 |
| Legal | 12,000 | 79.1% | 55.5% | 37.4% | 22.6% | 11.8% | 6.0% | 3.5% | 2.0% | 3.18 |
| Legal | 14,000 | 79.2% | 56.2% | 34.7% | 19.3% | 11.1% | 6.7% | 2.5% | 1.2% | 3.11 |
| Legal | 16,000 | 81.3% | 55.1% | 33.9% | 21.7% | 12.2% | 7.7% | 3.7% | 2.5% | 3.18 |
| Legal | 18,000 | 81.3% | 57.7% | 37.4% | 22.3% | 12.6% | 7.4% | 4.9% | 3.6% | 3.27 |
| Legal | 20,000 | 84.2% | 56.3% | 35.4% | 21.9% | 13.1% | 6.3% | 3.3% | 1.8% | 3.22 |
| Literary | 2,000 | 81.1% | 54.0% | 37.0% | 24.4% | 16.7% | 11.2% | 6.6% | 4.4% | 3.35 |
| Literary | 4,000 | 78.8% | 49.1% | 31.9% | 18.3% | 9.6% | 5.2% | 2.0% | 1.2% | 2.96 |
| Literary | 6,000 | 77.4% | 53.8% | 32.4% | 19.7% | 11.1% | 5.7% | 2.7% | 0.7% | 3.03 |
| Literary | 8,000 | 78.9% | 53.6% | 32.5% | 17.5% | 9.9% | 6.9% | 3.6% | 1.5% | 3.04 |
| Literary | 10,000 | 79.7% | 52.4% | 30.4% | 17.9% | 9.2% | 5.7% | 3.5% | 1.2% | 3.00 |
| Literary | 12,000 | 78.3% | 51.8% | 29.7% | 17.3% | 9.7% | 4.6% | 2.8% | 0.9% | 2.95 |
| Literary | 14,000 | 78.2% | 51.2% | 31.8% | 17.2% | 10.2% | 5.0% | 2.0% | 1.0% | 2.97 |
| Literary | 16,000 | 80.2% | 53.5% | 35.7% | 17.8% | 9.0% | 5.6% | 2.9% | 1.2% | 3.06 |
| Literary | 18,000 | 81.4% | 56.4% | 35.9% | 20.0% | 11.6% | 5.4% | 2.2% | 1.2% | 3.14 |
| Literary | 20,000 | 75.8% | 54.8% | 34.4% | 17.3% | 9.2% | 4.3% | 2.3% | 1.0% | 2.99 |
| Multi-news | 2,000 | 85.1% | 64.4% | 45.8% | 34.4% | 25.1% | 15.5% | 11.8% | 9.3% | 3.91 |
| Multi-news | 4,000 | 80.3% | 58.1% | 40.0% | 25.3% | 16.8% | 10.1% | 6.1% | 2.9% | 3.40 |
| Multi-news | 6,000 | 80.7% | 62.2% | 42.9% | 25.2% | 15.0% | 7.2% | 5.6% | 3.8% | 3.43 |
| Multi-news | 8,000 | 79.3% | 58.2% | 40.4% | 27.7% | 16.2% | 9.6% | 6.6% | 4.5% | 3.43 |
| Multi-news | 10,000 | 83.7% | 56.1% | 39.8% | 24.3% | 15.0% | 10.1% | 4.4% | 2.6% | 3.36 |
| Multi-news | 12,000 | 78.0% | 56.1% | 34.6% | 21.2% | 12.0% | 7.1% | 3.4% | 2.0% | 3.14 |
| Multi-news | 14,000 | 80.2% | 60.6% | 41.3% | 26.3% | 14.7% | 9.7% | 5.6% | 2.9% | 3.41 |
| Multi-news | 16,000 | 80.4% | 60.7% | 40.3% | 25.9% | 13.1% | 8.6% | 5.2% | 2.6% | 3.37 |
| Multi-news | 18,000 | 78.8% | 56.3% | 37.1% | 21.5% | 12.5% | 6.6% | 3.6% | 2.0% | 3.18 |
| Multi-news | 20,000 | 82.4% | 55.6% | 35.7% | 24.8% | 12.4% | 5.9% | 3.6% | 2.3% | 3.23 |

</details>

## Performance Eval

![speedup_math_reasoning_itl](https://cdn-uploads.huggingface.co/production/uploads/67f401f4bb5b52cdad90f9a7/FDDscE_EQwMvKVwVcj-wE.png)

