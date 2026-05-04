# Telemetry And Observation Map

This map groups telemetry, diagnostics, catalog, OTLP/HyperDX, and
migration/control-plane evidence. It is a system evidence map, not product
observability authority.

## How To Read This

| Need | Read |
| --- | --- |
| Current state | `../current-lab-state.md` |
| Proof ledger entries | `../proof-manifest.json` entries with `telemetry`, `hyperdx`, `control-plane`, or `observation` |
| Vendor-specific OTLP/HyperDX notes | `../vendors/hyperdx-otlp.md` |
| Runtime-spine placement | `runtime-spine-evidence-map.md` |

## Observation Chain

| Layer | What the lab records | What it impacts |
| --- | --- | --- |
| Runtime and provider records | Redacted process, provider, boundary, startup, rollback, finalization, and catalog records | Runtime diagnostics, boundary policy, catalog shape |
| Telemetry projection | Stable OTLP-shaped trace payloads built from already-redacted records | OpenTelemetry/HyperDX integration design |
| Export boundary | Injected-fetch export to explicit `/v1/traces` path; local HyperDX/OTLP ingest smoke as supporting evidence | Export serialization and endpoint selection |
| Migration/control-plane packet | Non-persistent summaries of safe handoff/catalog/telemetry/export facts; candidate-only placement hints | Migration review and future control-plane design |

## Current Claims

- Contained telemetry projection/export rejects live handles, raw secrets,
  descriptor bodies, provider values, runtime access objects, and OTLP/export
  response-body leakage.
- Phase Two composes provider, oRPC server, Inngest async, process runtime,
  in-memory catalog, injected OTLP export, and migration/control-plane packet
  records in one contained rehearsal.
- Phase Three adds layer-disagreement and integrated live-passage evidence:
  runtime/adapter/harness/boundary failure attributes survive projection, OTLP
  export failure stays observation-plane only, and the packet remains
  run/source/name/export summary correlation.
- Local HyperDX/OTLP ingest smoke is supporting lab evidence only.

## Proof Ceiling

The lab does not prove live HyperDX product visibility, dashboard/query
semantics, retention, alerting, production OpenTelemetry bootstrap, persisted
RuntimeCatalog storage, production control-plane topology, native host
telemetry/error mapping, durable async run history, platform secret-store
precedence, production config source order, or arbitrary free-form diagnostic
string DLP.

## Evidence Pointers

| Topic | Manifest entries | Primary phase/source pointers |
| --- | --- | --- |
| Runtime telemetry and HyperDX observation | `audit.telemetry.hyperdx-observation`, `audit.telemetry.hyperdx-observation.residual` | `../../phases/phase-one/workstreams/workstream-2026-04-30-phase-one-runtime-telemetry-hyperdx-observation.md`; `../vendors/hyperdx-otlp.md` |
| Phase Two integrated observation spine | `audit.p2.telemetry-integrated-observation-spine`, `audit.p2.integrated-runtime-spine-rehearsal` | `../../phases/phase-two/workstreams/workstream-2026-04-30-phase-two-telemetry-hyperdx-catalog-observation.md`; `../../phases/phase-two/workstreams/workstream-2026-04-30-phase-two-integrated-runtime-spine-rehearsal.md` |
| Layer disagreement and export failure | `audit.p3.layer-disagreement-failure-observation-proof` | `../../phases/phase-three/workstreams/workstream-2026-05-01-phase-three-layer-disagreement-failure-observation-proof.md` |
| Integrated live-passage observation | `audit.p3.integrated-live-passage-rehearsal-closeout` | `../../phases/phase-three/workstreams/workstream-2026-05-01-phase-three-integrated-live-passage-rehearsal-and-closeout.md` |
| Migration/control-plane packet | `audit.migration.control-plane-observation`, `audit.migration.control-plane-observation.residual` | `../../phases/phase-one/workstreams/workstream-2026-04-30-phase-one-migration-control-plane-observation.md`; `../../src/oracle/migration-control-plane-observation.ts` |
