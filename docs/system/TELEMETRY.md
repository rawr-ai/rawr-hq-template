# TELEMETRY

This document defines the current telemetry subsystem for `RAWR HQ-Template`.

Supporting integration docs:

- `docs/system/telemetry/orpc.md`
- `docs/system/telemetry/hyperdx.md`
- `docs/system/telemetry/hq-runtime.md`

## Scope

The telemetry subsystem covers:

- host-owned OpenTelemetry bootstrap
- host-boundary oRPC trace and metric instrumentation
- host-correlated runtime logging
- service-package semantic observability layered on top of the active span

The current canonical proof capability is `exampleTodo`.

## Ownership Model

Telemetry is host-owned at runtime.

The host owns:

- OpenTelemetry SDK installation
- OTLP exporter wiring
- resource attributes and propagators
- routed request spans and request metrics
- correlation of runtime logs written to `.rawr/hq/runtime.log`

Service packages own:

- semantic span enrichment
- service-level events and attributes
- ordinary structured logs emitted through host-provided logger adapters

Service packages must not bootstrap their own OpenTelemetry SDK, exporters, or metric readers.

## Current Wiring

Canonical seams:

- `packages/core/src/telemetry.ts`
  - installs `NodeSDK`
  - registers `HttpInstrumentation` and `ORPCInstrumentation`
  - derives OTLP HTTP trace and metric endpoints from `OTEL_EXPORTER_OTLP_ENDPOINT` unless signal-specific endpoints are provided
- `apps/server/src/orpc.ts`
  - creates host-boundary spans `rawr.orpc.rpc.request` and `rawr.orpc.openapi.request`
  - records `rawr.orpc.requests`
  - records `rawr.orpc.request.duration`
- `apps/server/src/logging.ts`
  - writes correlated runtime logs into `.rawr/hq/runtime.log`
  - preserves request, correlation, trace, and span identifiers across routed execution
- `apps/hq/rawr.hq.ts`
  - composes the host-visible runtime surface
  - injects the `exampleTodo` client and host logger adapter
- `plugins/api/example-todo/*`
  - projects the `exampleTodo` capability onto the host API surface
- `services/example-todo/src/**/observability*`
  - adds service-local observability semantics on top of the active span

## Proof Surfaces

The canonical proof lane uses one capability through three paths:

1. In-process:
   - `rawrHqManifest.fixtures.exampleTodo.resolveClient(repoRoot)`
2. First-party RPC:
   - `/rpc/exampleTodo/*`
   - requires first-party headers such as `x-rawr-caller-surface: first-party` and `x-rawr-session-auth: verified`
3. Published OpenAPI:
   - `/api/orpc/exampleTodo/*`
   - uses the published API-plugin surface

The proof harness lives in:

- `apps/server/test/support/example-todo-proof-clients.ts`
- `apps/server/test/example-todo-proof-clients.test.ts`

## Route-Family Implications

The route-family publication policy is defined in `docs/SYSTEM.md`.

For telemetry, that policy means:

- first-party proof requests compare `/rpc/exampleTodo/*` against `/api/orpc/exampleTodo/*`
- `coordination.*` and `state.*` stay off the published OpenAPI proof lane
- workflow publication remains a separate route family under `/api/workflows/<capability>/*`

## Signals

The current routed proof lane emits host-boundary traces, host-boundary request metrics, and correlated runtime logs.

The exact routed span names, metric instruments, and log-field contract live in `docs/system/telemetry/orpc.md`.

Current logging is host-correlated runtime logging, not a full OpenTelemetry log-export pipeline.

## Configuration

Primary environment contract:

- `OTEL_EXPORTER_OTLP_ENDPOINT`
  - base OTLP HTTP endpoint
  - signal paths are derived as `/v1/traces` and `/v1/metrics` when only the base endpoint is supplied
- `OTEL_EXPORTER_OTLP_TRACES_ENDPOINT`
  - optional explicit traces endpoint override
- `OTEL_EXPORTER_OTLP_METRICS_ENDPOINT`
  - optional explicit metrics endpoint override

When HQ runs with managed observability available, `scripts/dev/hq.sh` injects the local OTLP HTTP endpoint (`http://127.0.0.1:4318`) into the server runtime. Set explicit OTLP env vars only when running outside the managed HQ flow or intentionally overriding the backend.

The server exports as `service.name = @rawr/server`.

## Related Process Docs

- `docs/process/runbooks/HQ_RUNTIME_OPERATIONS.md`
- `docs/process/runbooks/TELEMETRY_VERIFICATION.md`
- `docs/process/runbooks/COORDINATION_CANVAS_OPERATIONS.md`
- `docs/process/runbooks/ORPC_OPENAPI_COMPATIBILITY.md`
