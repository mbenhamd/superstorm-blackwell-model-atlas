# ADR 0001 — Portable, original UI

Status: Superseded by [ADR 0005](0005-react-shadcn-dashboardcn.md) on 7 November 2026.

Original decision: native TypeScript DOM components, CSS tokens, native controls and hand-written SVG charts, bundled by Bun, with no UI framework. It optimised for a dependency-free offline preview.

What remains in force: the offline `preview.html` (now an inlined React bundle), hash routing, URL-synced view state, local-storage and API modes, provenance labelling on every export (synthetic fixtures were replaced by the atlas catalog in ADR 0006), and the pure `src/domain` boundary.
