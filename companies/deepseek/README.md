# DeepSeek

## [DeepSeek V4 Flash 0731](deepseek-v4-flash-0731/README.md)

The exact July 31 release combines compressed/sparse attention, mHC and a bundled DSpark module. Preview-family parameter headlines are kept separate from unresolved exact checkpoint accounting.

Canonical repository: `deepseek-ai/DeepSeek-V4-Flash-0731`, reverified at `7872f01b1d1fe23eabc4c98b48bffcef5a386062` on 2026-10-15.

Both vLLM and SGLang have documented paths for this exact release. The [serving report](deepseek-v4-flash-0731/serving.md) distinguishes those upstream recipes from the local, unbenchmarked eight-GPU profiles.

## [DeepSeek V4.1 Flash 1017](deepseek-v4.1-flash-1017/README.md)

October 17 weight update of DeepSeek V4.1 Flash (`DeepseekV41ForCausalLM`): 40-layer causal encoder-decoder with shared compressed KV, Engram n-gram memory, a vision encoder and a bundled three-stage DSpark draft; MXFP4 experts with 32×32 block FP8 elsewhere. A different architecture class from 0731; neither record substitutes for the other.

Canonical repository: `deepseek-ai/DeepSeek-V4.1-Flash-1017`, pinned at `1bae0e1088993b9b82de08f59de5be5a34e42170` on 2026-11-06.

vLLM v0.34.0 and SGLang v0.5.23 contain native V4.1 paths. The vLLM B300 recipe reports 0909 measurements, and the SGLang 1017 B300 cells remain unverified upstream. The NVIDIA 1017 NVFP4 export requires packed Engram changes present on both main branches after their respective stable release commits. See the [serving review](deepseek-v4.1-flash-1017/serving.md#november-20-engine-and-benchmark-review).
