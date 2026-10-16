# Gemma 4 31B IT: serving on 8×B300

**Status: unbenchmarked local recommendations.** The upstream recipes are evidence of documented support, not a benchmark of your node.

## Engine and topology

Start with vLLM TP1, 32K context and restrained concurrency. Compare BF16, RedHat block FP8 and RedHat NVFP4. The exact tool template is a versioned deployment asset, not a path guaranteed to exist inside every image; the baseline reference therefore does not blindly reference a source-tree-relative example file.

Eight TP1 replicas are an eight-GPU capacity hypothesis after each replica passes its workload gate. They do not establish eightfold goodput: CPU image processing, routing, cache affinity and admission policy can limit the node. Compare aggregate useful requests under the same tail-latency and quality thresholds.

SGLang is an alternative to qualify for the exact export. The generic Hugging Face “use with SGLang” widget does not establish that a particular quantization format works in the selected image. A profile marked compatibility-probe must first load and pass protocol/accuracy tests.

Keep audio disabled for this variant unless a separately verified processor/runtime path proves the intended capability. Do not copy the generic example’s audio limit and advertise audio support.

[gemma-4-31b-it-CARD](https://huggingface.co/google/gemma-4-31B-it/blob/842da3794eaa0b77d5f08bae87a17459d91ff475/README.md) [HW](https://docs.nvidia.com/dgx/dgxb300-user-guide/introduction-to-dgxb300.html)

## Text-only tool experiment and asset gate

The report's `--max-model-len 32768`, `--gpu-memory-utilization 0.90`, `--language-model-only`, `--enable-auto-tool-choice`, `--reasoning-parser gemma4`, `--tool-call-parser gemma4`, template override and `--async-scheduling` correspond to Red Hat's reproduction recipe. The recipe also explicitly enables thinking through `--default-chat-template-kwargs '{"enable_thinking": true}'`. Omitting that setting changes the experiment. These flags do not describe the atlas's existing 0.85, parser-free references or a multimodal evaluation. [gemma-4-31b-it-FP8](https://huggingface.co/RedHatAI/gemma-4-31B-it-FP8-block/raw/d7242548c457ab4b45bd3adb8937f2659af4739d/README.md).

`examples/tool_chat_template_gemma4.jinja` is **not bundled in this atlas**. It exists in vLLM at inspected commit `f8460ef23659afd69046a81529ec2295e4c3f686`, but that does not establish its presence or location in an installed wheel/container. Before enabling tools, bundle a reviewed template from the selected engine revision, record its SHA-256 and absolute container path, and verify parser registration in that same image. Record whether the override supersedes the target's newer Hugging Face template. The newer target template and inspected vLLM override require deserialized tool-argument mappings (or `None`); unlike the older template, they reject raw argument strings. An API adapter may normalize strings before rendering, so inspect the rendered tool history rather than assuming every OpenAI-compatible request is affected. [RR-GM-VLLM-TEMPLATE](https://github.com/vllm-project/vllm/blob/f8460ef23659afd69046a81529ec2295e4c3f686/examples/tool_chat_template_gemma4.jinja).

Use a local immutable model snapshot and an absolute template path in the completed command. Pin an image digest, effective KV dtype, scheduler and concurrency limits before launching. First check no-tool chat, single/multiple calls, tool-result continuation with thinking preserved as required by the selected template, and streaming/cancellation. `--language-model-only` disables the image path; qualify image/document traffic in a separate configuration.

## Matching assistant is now an identified candidate

Google's official assistant is pinned in [architecture](architecture.md). The fresh [vLLM recipe](https://recipes.vllm.ai/Google/gemma-4-31B-it) names it for MTP and suggests four to eight speculative tokens, while carrying a nightly-only warning. This mutable warning and source presence do not settle stable-wheel or image compatibility. Gate the exact build, target/draft pair, target KV sharing and rollback first. Start with BF16 target-only versus the same BF16 target plus the assistant; each Red Hat export needs a separate pairing check. No retained Gemma configuration enables speculation, and no speedup is measured. [RR-GM-GEMMA-DRAFT-CARD](https://huggingface.co/google/gemma-4-31B-it-assistant/raw/627c5ec1458b9086b841a91e0512fd31fd2fbbf1/README.md).

## Optimization questions

Compare TP1 BF16/FP8/NVFP4 at matched context and batch; verify global/local cache accounting; test thinking on/off separately; include image grounding, tool-call JSON, long-distance retrieval and concurrent cancellations.

## Remaining uncertainty

Physical KV allocation under attention_k_eq_v in the selected engine; exact export-level SGLang compatibility; correct tool template at the final image revision; local B300 quality and latency.
