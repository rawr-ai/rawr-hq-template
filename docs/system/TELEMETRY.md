# TELEMETRY

This document defines the current telemetry subsystem contract for `RAWR HQ-Template`.

## Ownership Model

- The host runtime owns telemetry bootstrap, OTLP exporter wiring, resource attributes, propagators, and request-boundary instrumentation.
- Service packages may consume the active span and add semantic span attributes, events, and log fields.
- Service packages do not install OpenTelemetry SDKs, metric readers, or exporters.

## Current Host Bootstrap

- `packages/core/src/orpc/telemetry.ts` installs a single `NodeSDK` instance for the process and rejects incompatible re-install attempts.
- The current host bootstrap installs `HttpInstrumentation` and `ORPCInstrumentation`.
- `apps/server/src/bootstrap.ts` installs telemetry before routes and plugins are mounted.
- The current server service name is `@rawr/server`.

## Current Signals

- Traces and metrics are exported with the OTLP HTTP exporter family.
- `OTEL_EXPORTER_OTLP_ENDPOINT` is treated as a base endpoint and expands to `/v1/traces` and `/v1/metrics` when no explicit signal path is present.
- `OTEL_EXPORTER_OTLP_TRACES_ENDPOINT` and `OTEL_EXPORTER_OTLP_METRICS_ENDPOINT` override the derived signal URLs when set.
- OpenTelemetry logs export is not part of the current bootstrap contract.

## Request-Boundary Contract

- `apps/server/src/orpc.ts` owns the routed host spans for `/rpc` and `/api/orpc`.
- The current route span names are `rawr.orpc.rpc.request` and `rawr.orpc.openapi.request`.
- The current host metrics are `rawr.orpc.requests` and `rawr.orpc.request.duration`.
- Route metrics stay low-cardinality and currently use `rawr.orpc.surface`, `rawr.orpc.router`, `http.response.status_code`, and `rawr.orpc.authorized` where applicable.
- Host logging correlation is request-boundary-owned and writes correlated runtime logs to `.rawr/hq/runtime.log`.

## Supporting Docs

- [oRPC Integration](./telemetry/orpc.md)
- [HQ Runtime Integration](./telemetry/hq-runtime.md)
