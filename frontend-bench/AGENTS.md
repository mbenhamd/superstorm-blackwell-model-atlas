# Agent operating contract — Bench Console

## Read first

Read `README.md`, `DESIGN.md`, `docs/VERIFICATION.md`, and the relevant architecture decision (ADR 0005 for the client) before editing. Keep the nine routes (tldr, intelligence, throughput, compare, engine, models, deployments, new-benchmark, methodology) and every legacy alias in `src/client/state.ts` functional.

Bench Console is an original prototype with a Linear-derived visual system. Do not add third-party logos, proprietary fonts, real customer data, or approval claims. Show only traceable data: the pinned atlas snapshot, pinned Hugging Face cards and published Artificial Analysis scores until bench results are imported. Never add mock or estimated measurements; keep provenance (catalog date, evidence class) on every view and export; do not show the source repository name or commit in the UI. Show the configured engine release, never the latest recheck release, as the build. Image captures are written outside the repository.

## Toolchain is Bun only

Use Bun for dependency installation, script execution, bundling, and tests. Do not introduce npm, pnpm, yarn, Vite, Next.js, ESLint, Prettier, Biome, or a Node runtime entry point as an alternative toolchain.

Target Bun 1.4.0+, TypeScript 7, React 19, Tailwind CSS 4.3.5, Effect 4, and PostgreSQL through `pg`. Bun 1.4.0 has no native lint/fmt/check commands; type checking uses `bunx tsc` on both projects.

```sh
bun install --frozen-lockfile
bun scripts/import-atlas.ts --check   # committed snapshot matches ../catalog (parent repository only)
bun run typecheck      # bunx tsc -p tsconfig.json --noEmit && bunx tsc -p tsconfig.client.json --noEmit
bun run test:unit      # domain, repository, runs, scale
bun run build          # public/ + preview.html
bun run browser:install  # Playwright Chromium, once per machine
bun run test:browser   # after a fresh build
bun run design:lint
bun run quality        # typecheck + unit + build
```

Add shadcn or dashboardcn components with `bunx shadcn@latest add <name>` / `@dashboardcn/<name>` and edit the installed files rather than wrapping them. `bun.lock` is committed; install with `bun install --frozen-lockfile` (the workflow does).

## Data flow

- `bun run import:atlas` reads `../catalog/*.json` and `../evidence/sources.json`, so it works only inside the parent atlas repository; it writes the committed `src/data/atlas.json`. Builds, tests and static deploys use the committed snapshot and never run it.
- `bun run import:runs <file.json> [--dry-run] [--replace-older] [--dataset-map=<map.json>]` validates bench run exports and writes them to PostgreSQL; it refuses files with `"_test"` entries (`--dry-run` still validates them).
- `RUNS_FILE=<file.json>` loads a validated runs file into the memory store of the API server only; the static build never carries runs.

## Not done

Migrations 003 and 004 have not been applied to any database; no real bench run has been imported; `bun run test:postgres` and the GitHub workflow have not been run; the workflow sits in this folder's `.github/` and runs only when this folder is the repository root. The static deploy (see README) carries no API.

## Architecture boundaries

`src/domain` is pure, framework-independent TypeScript. It owns the catalog mapping plus run-identity parsing and matching (`catalog.ts`: `parseIdentity`, `parseMetricRow`, `matchConfiguration`, `applyRuns`), metrics (`metrics.ts`), knob chips (`config-chips.ts`), comparison eligibility, validation and experiment transitions (`validation.ts`). Run-file parsing, canonical identity and upsert live at the boundary in `src/server/runs.ts`, which calls the domain parsers. No DOM, SQL, network calls, clocks, or UI state belong in metric calculations.

`src/client` owns rendering and interaction: React + Tailwind v4 + shadcn/ui + dashboardcn (ADR 0005). State lives in `state.ts` (external store + `useSyncExternalStore`, hash routing, URL sync, local storage). Tokens live in `styles.css` and mirror DESIGN.md. Shared app components are in `components/app/`; vendor components in `components/ui/` are edited in place. Chart scale helpers in `scale.ts` are covered by `tests/scale.test.ts`.

`src/server` owns the HTTP boundary and Effect services. Use Effect 4 `Context.Service` and `Layer`; keep typed failures through the service boundary and convert them to HTTP responses before running the effect. Do not log secrets. Parameterize every user-controlled SQL value. Acquire one pg client for each transaction and always release it.

`db` is append-only after a migration has been applied. Never rewrite a migration checksum to force it through. Foreign keys, row-version checks, and audit writes must remain transactional.

## Scientific invariants

1. No missing metric becomes zero. Zero is a valid observed value; missing means unavailable.
2. A family-level or original-precision quality score must not be copied into another artifact. A mismatched evaluation is unranked.
3. A composite needs full coverage and explicit weights, suite, revision, and artifact identity. The Artificial Analysis Intelligence Index is model level: label it "AA (model)" and never transfer it to a third-party quantized export.
4. Only matched workloads and evaluation revisions share a frontier. Runtime isolation additionally requires the same artifact, hardware/topology, and decoding policy. Quantization comparisons require the same model, runtime/version, topology, and workload.
5. Show the selected SLO and headroom. Separate raw peak throughput, measured passing capacity, and highest passing concurrency.
6. p95 values are taken verbatim from the imported GuideLLM report; the percentile method and request population are the tool's and are not re-derived (`percentile()` in metrics.ts is a nearest-rank helper used only by tests). Failures still count against request success and joint-SLO compliance. Do not derive token goodput from percentiles.
7. Do not interpolate a passing capacity between tested concurrency levels, promise SLA compliance, or imply benchmark error bars when no repeated runs exist.
8. An experiment card is a plan. A status transition never implies a real cluster job ran. Any future runner requires a separate authenticated adapter and explicit evidence ingestion.
9. Every exported result retains its evidence class and catalog date, the model artifact, runtime, hardware, workload, units, and policy where relevant.
10. Preserve CSV formula-injection defenses and escaped user strings.

## Design and interaction contract

Follow `DESIGN.md`; it is the token and design source of truth. Every screen must answer a specific decision before presenting detail. Do not add decorative KPI trends, fabricated insight summaries, stock photography, giant empty charts, unexplained gradients, or arbitrary combined scores.

Use readable labels, compact but not cramped controls, tabular numbers, explicit units, and meaningful empty states. Secondary metadata may be muted; important values must not be low contrast. Keep light and dark themes complete. On phones, large tables and charts scroll inside their own containers; the document itself must not scroll horizontally.

All buttons must work or clearly say why unavailable. Form errors must be actionable. Dialogs need an accessible name, Escape handling, focus containment, and return focus. Drag-and-drop needs a keyboard alternative. Chart points need a textual equivalent and keyboard inspection. Respect reduced motion.

## Review by workflow

When changing a metric: run the `benchmark-integrity` skill and domain tests.
When changing visuals: run the `interface-review` skill, inspect all affected routes at 1440 and 390 pixels, and capture screenshots in both themes with `bun run screenshots`.
Before handoff: run the `bun-quality-gates` skill, update verification evidence, and regenerate the portable preview.

Do not erase an unsuccessful check or call an unrun test passed. If the current environment lacks Bun, PostgreSQL, browsers, or registry access, document that precisely.

## Autonomous completion checklist

Inspect existing behavior first. Implement one cohesive change. Add or adjust tests. Run available gates. Review browser screenshots and interaction errors. Fix regressions. Update DESIGN/ADRs when a contract changes. End with a factual summary of files, checks actually executed, and remaining blockers. Do not stop at a wireframe when the requested change includes interactions.
