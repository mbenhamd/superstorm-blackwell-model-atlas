---
name: bun-quality-gates
description: Run honest Bun-native validation and preserve the requested Bun, TypeScript 7, React/Tailwind/shadcn client, Effect 4, and pg stack.
---

# Bun Quality Gates

Read AGENTS.md and docs/VERIFICATION.md. Record `bun --version` and the `bun test vX` version that `bun run` reports (`node_modules/.bin/bun` from a dependency may differ from the shell's Bun).

Run, in order:

1. `bun install --frozen-lockfile`
2. `bun scripts/import-atlas.ts --check` (parent repository only)
3. `bun scripts/import-external.ts --check`
4. `bun run typecheck` (tsc for tsconfig.json and tsconfig.client.json)
5. `bun run test:unit` (all eleven unit files)
6. `bun run build` (writes public/ and regenerates preview.html)
7. `bun run browser:install` (once per machine)
8. `bun run test:browser` (after a fresh build)
9. `bun run design:lint`

`bun run quality` runs steps 4–6. `.github/workflows/quality.yml` runs it first, then Playwright install, `test:browser`, `db:migrate`, `db:seed`, `test:postgres` and `design:lint`; the workflow does not run while this folder is inside the parent repository. Bun 1.4.0 (the pinned `packageManager`) has no native lint/fmt/check; the Bun 1.4.4 that `bun run` resolves from `node_modules/.bin` ships `bun fmt` and `bun check`, but no gate runs them (bunfig `[fmt]` is read only by `bun fmt`), so do not report either as a gate. Run `bun run test:postgres` only with `TEST_DATABASE_URL` pointing at an explicitly isolated migrated/seeded test database. Fix failures without disabling checks or changing to another runtime. Do not report unexecuted commands as passing. Record versions, commands, results and limitations in docs/VERIFICATION.md.
