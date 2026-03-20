# HyperDX Integration

This document defines the current HyperDX contract for the telemetry subsystem.

## Role

HyperDX is the local observability backend for HQ.

It provides:

- trace storage and query
- metric ingest and visualization
- local operator UI

HQ remains responsible for telemetry bootstrap, route instrumentation, and runtime log correlation.

## Current Contract

The current local HyperDX support contract is:

- expected container name: `rawr-hq-hyperdx`
- UI URL: `http://localhost:8080/`
- OTLP HTTP ingest URL: `http://127.0.0.1:4318`

The HQ lifecycle surface manages against that support container through:

- `rawr hq up --observability auto|required|off`
- `rawr hq restart --observability auto|required|off`
- `rawr hq status`

## Mode Semantics

- `required`
  - `rawr hq up` exits non-zero instead of starting without managed observability when Docker, the required ports, or `rawr-hq-hyperdx` are unavailable
  - `rawr hq status` reports degraded observability states such as `degraded-missing-docker`, `degraded-port-conflict`, `degraded-start-failed`, `degraded-not-ready`, or `degraded-unavailable` until HyperDX is available
- `auto`
  - HQ uses the local HyperDX support container when available
  - otherwise `rawr hq up` continues without blocking startup and `rawr hq status` reports the degraded observability state with remediation
- `off`
  - HQ runs without managed HyperDX-backed observability

## Integration Boundary

HyperDX is the backend, not the owner of the telemetry model.

HQ owns:

- OTLP trace and metric exporter wiring
- request-boundary trace and metric emission
- runtime log correlation
- status and remediation reporting

HyperDX owns:

- OTLP ingest
- local observability UI
- storage and query for traces and metrics

## Operational Posture

The current HQ runtime does not fully own end-to-end HyperDX container provisioning.

The supported operating model is:

- provision the local HyperDX support container
- run HQ with the required observability posture for the session
- verify through `rawr hq status` and the coordination canvas runbook

## Related Docs

- `docs/system/TELEMETRY.md`
- `docs/system/telemetry/hq-runtime.md`
- `docs/process/runbooks/COORDINATION_CANVAS_OPERATIONS.md`
