# OpenTelemetry Node Provider Router

## Purpose

- Realize the telemetry resource with one native OpenTelemetry Node topology
  and explicit OTLP HTTP signal exporters.

## Scope

- Applies to `resources/telemetry/providers/opentelemetry-node/**`.

## Boundaries

- Own tracer, meter, and logger providers; AsyncLocalStorage context; W3C Trace
  Context and Baggage propagation; OTLP HTTP exporters; exporter-callback
  accounting; and bounded cleanup.
- Accept explicit provider configuration only. Do not read telemetry
  environment variables or invent localhost endpoints.
- Do not own process signals, app/profile choice, host instrumentation, product
  events, backend receipt, Oclif, oRPC, Inngest, EVLog, or Effect context.

## Behavior

- The disabled branch constructs no OpenTelemetry object. The enabled branch
  refuses duplicate global ownership, contains partial construction and export
  failures, and returns a degraded neutral value instead of changing product
  behavior.
- Release uses the caller's one monotonic deadline, attempts owned stages in
  reverse order, and shares one completion across repeated calls.

## Routing

- [Telemetry resource](../../AGENTS.md)
- [Public provider face](index.ts)
- [Provider-neutral contract](../../contract.ts)

## Validation

- Run `bunx nx run provider-telemetry-opentelemetry-node:typecheck` and
  `bunx nx run provider-telemetry-opentelemetry-node:test`.
