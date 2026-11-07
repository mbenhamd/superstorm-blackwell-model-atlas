# ADR 0003 — Optional PostgreSQL behind Effect services

Status: Accepted for POC; native integration validation pending in the delivery environment.

One Effect 4 service exposes snapshot, create experiment, and move experiment. A memory implementation allows an API demo without a database. A pg implementation persists records in PostgreSQL with parameterized statements, explicit single-client transactions, version checks, and audit rows.

Catalog identities and relations are relational. Detailed configuration, evaluation, and request-sweep documents are JSONB. This balances a compact POC migration against the need to keep evidence fields explicit in TypeScript. It is not the final schema for millions of requests; partitioned observation tables or object storage, indexed run metadata, and versioned ingestion are separate production work.

Snapshot reads use a repeatable-read transaction. Experiment transitions lock a row, validate the state machine and expected version, update the record, and append an audit event in the same transaction. An audit event is not tamper-proof compliance evidence.

Migrations are checksummed and run under an advisory transaction lock. Seeding is non-destructive. Tests only create and delete their own temporary experiment records. The app defaults to loopback and has no enterprise identity integration.
