# ADR 0004 — Bun-native project toolchain

Status: Accepted. Amended 7 November 2026: Bun 1.4.0 is the baseline; it has no native lint/format/check commands, so type checking uses `bunx tsc` for both TypeScript projects (see scripts/quality.ts).

The project uses Bun for package management, bundling, application runtime, script execution and tests. Bun 1.4.0 is the configured baseline. Type checking runs the pinned TypeScript 7.0.2 compiler through `bunx tsc` on both projects; there is no separate lint or format gate.

Effect 4.1.0 and pg 8.23.1 are exact direct dependencies. `bun.lock` was produced by a real install and is committed; CI installs with `bun install --frozen-lockfile`.

History: the first delivery (before 7 November 2026) was validated with a sandbox TypeScript 5.8.3 fallback; that pass is superseded. Current gate results, run with TypeScript 7.0.2, are in docs/VERIFICATION.md.
