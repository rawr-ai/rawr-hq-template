# HyperDX / OTLP Vendor Evidence

## Map

| Need | Answer |
| --- | --- |
| What RAWR relies on | OTLP trace payload shape and explicit `/v1/traces` export boundary |
| Current lab evidence | Contained telemetry projection/export plus local OTLP ingest smoke |
| System impact | Runtime telemetry, diagnostics, catalog/control-plane observation |
| Related system map | `../systems/telemetry-observation-map.md` |

## Current Vendor Facts

- The lab observation lane uses OTLP trace payload shape and the explicit
  `/v1/traces` HTTP path as the vendor boundary.
- Local `rawr-hq-hyperdx` Docker ingest smoke is supporting lab evidence only.
  It can show that a reachable local OTLP endpoint accepts the payload. It is
  not production deployment proof, query semantics proof, dashboard proof, or
  product observability policy.

## Current Lab Evidence

- Phase Two composes provider, oRPC server, Inngest async, runtime, and catalog
  records into one injected-fetch OTLP export gate.
- The gate proves deterministic serialization, endpoint selection, and
  redaction before export.
- Phase Three projects the integrated rehearsal into the same OTLP-shaped and
  migration/control-plane observation model.
- Phase Three adds no product HyperDX visibility, query, dashboard, alerting,
  retention, or production OpenTelemetry bootstrap proof.

## Evidence Pointers

| Topic | Manifest entries | Primary phase/source pointers |
| --- | --- | --- |
| Runtime telemetry and HyperDX observation | `audit.telemetry.hyperdx-observation`, `audit.telemetry.hyperdx-observation.residual` | `../systems/telemetry-observation-map.md`, `../../phases/phase-one/workstreams/workstream-2026-04-30-phase-one-runtime-telemetry-hyperdx-observation.md` |
| Phase Two integrated observation spine | `audit.p2.telemetry-integrated-observation-spine` | `../../phases/phase-two/workstreams/workstream-2026-04-30-phase-two-telemetry-hyperdx-catalog-observation.md` |
| Layer disagreement and export failure | `audit.p3.layer-disagreement-failure-observation-proof` | `../../phases/phase-three/workstreams/workstream-2026-05-01-phase-three-layer-disagreement-failure-observation-proof.md` |
| Integrated live-passage observation | `audit.p3.integrated-live-passage-rehearsal-closeout` | `../../phases/phase-three/workstreams/workstream-2026-05-01-phase-three-integrated-live-passage-rehearsal-and-closeout.md` |

## Not Proven

The lab does not prove product dashboards, queries, alerting, retention,
production OpenTelemetry bootstrap, production deployment placement, native
host telemetry, dashboard/query policy, or durable async semantics.

## Future Official-Docs Requirement

Any future HyperDX/OTLP work that models product dashboards, query semantics,
retention, alerting, ingestion behavior, OpenTelemetry bootstrap, or production
collector/exporter topology must run a dedicated official-doc pass before
becoming normative integration guidance.
