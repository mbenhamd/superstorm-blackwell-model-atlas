# Kimi K3: DSpark integration and B300 state budget

## What the draft model actually does

The inspected vLLM `K3DSparkModel` uses a dense MLA draft path rather than the target's full latent MoE. Its context projection consumes selected target-layer features, while the target embedding can be aliased after draft loading. The implementation imports separate confidence and Markov heads. Draft-layer attention enables non-causal multi-token verification behavior; selected row-parallel output reductions are fused with subsequent RMS normalization. These observations concern the inspected implementation, not an assertion that every DSpark checkpoint has the same dimensions.

Read the [pinned implementation, lines 1–190](https://github.com/vllm-project/vllm/blob/f8460ef23659afd69046a81529ec2295e4c3f686/vllm/models/kimi_k3/nvidia/dspark_mla.py) and the [engine recipe](https://recipes.vllm.ai/moonshotai/Kimi-K3). Target features, vocabulary mapping, checkpoint revisions, cache format and engine implementation must agree. A different drafter name is not a drop-in optimization.

*Analogy:* the main author supplies a sketch of the argument to a faster assistant. The assistant proposes several words, but the author checks them together. Speed depends on useful proposals and cheap checking, not merely on the assistant being small.

## Why DCP8 does not divide all memory by eight

The SGLang cookbook describes a split between target MLA cache, recurrent KDA state and drafter cache. In its published sizing rule, target MLA token cache is divided by DCP, while the DSpark draft token cache remains replicated. Thus a small replicated cache can become significant after the larger target cache is sharded.

```text
state_to_KV_pool_ratio =
    (ordinary_state_slots + intermediate_verify_slots) * state_slot_bytes
    / (average_input_plus_output_length
       * (target_MLA_bytes_per_token / DCP + draft_bytes_per_token))
```

The cookbook defines five ordinary slots for `extra_buffer`, four for `extra_buffer_lazy`, three for `no_buffer`, and one when radix caching is disabled, with additional scheduler-dependent adjustments. DSpark verification normally introduces block-size-plus-one intermediate states. ReplaySSM changes that allocation contract by using replay rings. These are version-specific engine semantics, not architecture constants. Read actual admission and cache-capacity logs after every change. [SGLang cookbook](https://docs.sglang.io/cookbook/autoregressive/Moonshotai/Kimi-K3)

## Current recipe versus a generic latest image

At retrieval, the SGLang cookbook specifically points the NVIDIA NVFP4 export at `lmsysorg/sglang:dev-dev-kimi-k3-nvfp4`. That is a mutable development tag, **not a verified immutable image in this atlas**. Its existence in documentation and the merged compatibility PR do not establish that an arbitrary stable/main image contains the complete tested stack. Resolve the intended image to a digest and validate its actual code/dependencies before using the included candidates.

Published B300 DSpark rows use `SGLANG_SIMULATE_ACC_LEN=4.5`, making them controlled acceptance experiments rather than measured application acceptance. The local launcher rejects simulated-acceptance environment variables. The source's B300 measurement setup and its older launch-era text also have different dates: retain the exact measurement version and do not relabel it as current-nightly performance. [SGLang cookbook](https://docs.sglang.io/cookbook/autoregressive/Moonshotai/Kimi-K3)

Begin with the target-only profile, then run the explicit DSpark profile with a pinned drafter and real prompts. Match thinking effort, preserve the model's expected multi-turn message fields, and test rejection rollback, cancellation, prefix hits and eviction. The producer requires the complete returned assistant message, including reasoning and tool fields, to be preserved for subsequent turns. [Kimi model card](https://huggingface.co/moonshotai/Kimi-K3)
