# oRPC Integration

This document defines the current telemetry contract at the routed oRPC and published OpenAPI boundary.

## Host-Owned Route Instrumentation

- `apps/server/src/orpc.ts` creates the routed host metrics once per process with meter name `@rawr/server`.
- `/rpc` requests are wrapped in the `rawr.orpc.rpc.request` span.
- `/api/orpc` requests are wrapped in the `rawr.orpc.openapi.request` span.
- Both routed surfaces emit `rawr.orpc.requests` and `rawr.orpc.request.duration`.

## Metric Attribute Contract

- Both routed surfaces emit `rawr.orpc.surface`, `rawr.orpc.router`, and `http.response.status_code`.
- `/rpc` also emits `rawr.orpc.authorized` because authorization is evaluated at that host boundary.
- Route metrics intentionally do not include request URLs or procedure paths.
- Trace spans include `url.full` at the host boundary even though the corresponding metrics stay low-cardinality.

## Logging Correlation

- `apps/server/src/logging.ts` owns request-scoped correlation for routed host logs.
- The host logger records `requestId`, `correlationId`, `requestMethod`, `requestPath`, `surface`, and active trace identifiers when available.
- Routed host logs are written to `.rawr/hq/runtime.log`.

## Service-Level Enrichment

- `services/example-todo/src/service/middleware/observability.ts` is the current service-level semantic enrichment reference.
- `services/example-todo/src/orpc/middleware/observability/otel.ts` reads and updates the active span instead of bootstrapping a separate SDK.
- `plugins/api/example-todo/src/router.ts` forwards the host correlation id into service invocation context rather than creating a second telemetry runtime.
