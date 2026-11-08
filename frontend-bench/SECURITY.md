# Security boundary

This repository is an unauthenticated proof of concept with two deployables that have different boundaries.

## Static build (may be published)

`public/` (`index.html`, `assets/`, `_headers`) and the single-file `preview.html` run in offline mode: no API, no database, no credentials, no server-side writes. They contain only the committed catalog snapshot (`src/data/atlas.json`: model/export identities, engine arguments, published Hugging Face card tables and Artificial Analysis scores) and the external published-results dataset (`data/external-benchmarks.json`: public third-party figures with source URLs). Planning cards and the theme stay in the viewer's own browser storage. This build may be hosted publicly on a static host. `public/_headers` sets the same CSP, `X-Frame-Options: DENY`, `nosniff` and `Referrer-Policy` as the API server; a host that ignores `_headers` serves the page without them.

## Bun API server (loopback only)

`src/server/index.ts` binds to loopback and has no authentication. Do not expose it on a shared network or the public internet until every item under "Required before shared deployment" is in place. `POC_ALLOW_REMOTE=true` only disables the loopback guard; it adds no authentication or authorization.

## Included safeguards

Parameterized pg queries; single-client transactions; version-checked state transitions; foreign keys and document consistency checks; request-body size limits; origin checks for browser writes; an asset allowlist; a same-origin CSP on the API server; escaped form text; and spreadsheet-formula protection for CSV strings.

These are individual defenses, not an audit or production assurance. A missing Origin header is accepted for local API clients. A database snapshot is trusted application data rather than an untrusted ingestion format. Do not add arbitrary imports without schema validation and context-aware escaping. Audit rows are mutable database records, not a tamper-evident compliance log.

## Required before shared deployment

Authenticated OIDC/SSO, server-side RBAC and resource ownership, tenant isolation, approved session and CSRF design, rate limiting, TLS and proxy configuration, secrets management, least-privilege database roles, backup/restore tests, data classification, migration governance, immutable evidence storage, retention policy, reviewed logs, dependency/lockfile scanning, signed runner integrations, and security review.

Require authorization before launching workloads or retrieving logs. Never expose cluster credentials in the browser. Keep model-download credentials and dataset secrets in approved server-side stores. Do not execute exported commands from submitted benchmark metadata.

Review third-party package licenses and the organization's policies before use. The bundled atlas snapshot, external published-results dataset and test fixtures contain no credentials or customer records.
