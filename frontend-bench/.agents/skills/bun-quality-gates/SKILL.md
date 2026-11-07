---
name: bun-quality-gates
description: Run honest Bun-native validation and preserve the requested Bun, TypeScript 7, React/Tailwind/shadcn client, Effect 4, and pg stack.
---

# Bun Quality Gates

Read AGENTS.md and docs/VERIFICATION.md. Record bun --version. Install with `bun install --frozen-lockfile`. Run `bun scripts/import-atlas.ts --check` (parent repository only), bun run typecheck (tsc for tsconfig.json and tsconfig.client.json), bun run test:unit, bun run build, bun run test:browser, and bun run design:lint. Bun 1.4.0 has no native lint/fmt/check commands; do not claim them. Run PostgreSQL integration tests only against an explicitly isolated migrated/seeded test database. Fix failures without disabling checks or changing to another runtime. Do not report unexecuted commands as passing. Regenerate preview.html and record versions, commands, results, and limitations in the verification document.
