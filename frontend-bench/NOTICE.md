# Notices

The original code and prose in this prototype are supplied under the accompanying MIT license. Third-party packages retain their own licenses and notices; review the installed dependency tree and `bun.lock` before redistribution.

shadcn/ui and dashboardcn components were installed through the shadcn CLI or copied from the dashboardcn registry JSON (imports remapped) into `src/client/components/ui/` and `src/client/components/blocks/`, and edited in place; they remain under their upstream MIT licenses. Linear, NVIDIA, vLLM, SGLang, Bun, React, Tailwind CSS, TypeScript, PostgreSQL and Effect are referenced for context, compatibility or design reference. The visual system adapts a public analysis of Linear's design language; this project is not affiliated with or endorsed by Linear or any other referenced organization. No third-party logo, proprietary font or brand asset is bundled; the app mark is original.

`.agents/skills/frontend-design/` is Anthropic's frontend-design skill copied unmodified from github.com/anthropics/skills (commit 2c5958ecac7cee2b583967a2c4981d0f4a75c579, `skills/frontend-design`) under the Apache License 2.0 in its `LICENSE.txt`; `.claude/skills/frontend-design` is a symlink to it so Claude Code loads it as a project skill.

Model, export and configuration data come from the research atlas; benchmark tables come from the pinned Hugging Face model cards (publisher or exporter claims); intelligence scores are published by Artificial Analysis; external published results come from the third-party sources listed in `docs/SOURCES.md` (publisher claims, not measurements). None of these are measurements made by this console. `tests/fixtures/sample-runs.json` is invented TEST data used only by automated tests.
