# ADR 0005 — React, Tailwind v4, shadcn/ui and dashboardcn

Status: Accepted, 7 November 2026. Supersedes ADR 0001.

## Decision

Rebuild `src/client` in React 19 + TypeScript with Tailwind CSS 4.3.5, shadcn/ui (Radix) primitives and dashboardcn registry components installed through the shadcn CLI and edited in place (not wrapped); later blocks whose CLI install would overwrite locally edited primitives (card, tabs, tooltip, delta-badge) are copied from the registry JSON with imports remapped. Keep the Bun build (`Bun.build` + `bun-plugin-tailwind`), hash routing with alias canonicalisation, URL-synced filters, local storage and API modes, and exports. Visual tokens follow DESIGN.md (Linear-derived).

## Reasons

- Accessible, tested interaction primitives (Select, Combobox, Popover, Dialog, Sheet, Tooltip, DropdownMenu, Command, Slider, ToggleGroup, Tabs) instead of hand-written focus management.
- dashboardcn's data-table (TanStack Table), scatter and composed charts (Recharts) provide sorting, pinning, crosshair tooltips and series handling; edits add log scales, explicit nice ticks, hollow failing levels, capacity markers, collision-avoided labels and keyboard-focusable points.
- A shared token layer (CSS variables mapped through `@theme inline`) drives light and dark themes for every component.

## Costs

- **Bundle size:** at decision time `public/assets/app.js` was ≈ 1.13 MiB, `styles.css` ≈ 117 KiB and `preview.html` ≈ 1.25 MiB with everything inlined; the previous vanilla bundle was a fraction of that. The bundle has since grown with the catalog snapshot; current sizes are recorded in docs/VERIFICATION.md. Production builds are minified (`Bun.build` `minify`); code-splitting is not configured.
- **Dependency surface:** react, react-dom, radix-ui, recharts, @tanstack/react-table, cmdk, sonner, lucide-react, class-variance-authority, clsx, tailwind-merge at runtime; tailwindcss, @tailwindcss/cli, bun-plugin-tailwind, tw-animate-css, @types/react(-dom) at build time. Each must be reviewed for licence and updates.
- **Edited vendor files:** registry components under `components/ui/` diverge from upstream; re-running `shadcn add --overwrite` would discard local changes.
- **Chart export:** PNG export serialises the Recharts SVG with inlined computed styles; HTML legends outside the SVG are not included in the image.

## Alternatives considered

Keeping the vanilla client (smaller, but every interaction pattern hand-built and the requested component set unavailable); Next.js (adds a server framework and conflicts with the Bun-only toolchain and the offline preview).
