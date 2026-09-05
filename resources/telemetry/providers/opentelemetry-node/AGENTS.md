# OpenTelemetry Node Provider Router

## Purpose

- Realize the telemetry resource with one native OpenTelemetry Node topology
  and explicit OTLP HTTP signal exporters.

## Scope

- Applies to `resources/telemetry/providers/opentelemetry-node/**`.
- `runtime.ts` is the private source-assembly provider adapter. It shares the
  canonical definition owner with its consuming runtime, not a separately
  bundled plan-witness realm. `@habitat-ai/sdk/telemetry` exposes this exact cold
  declaration factory, not native acquisition or lease access; the native
  package entry remains unchanged.

## Boundaries

- Own tracer, meter, and logger providers; AsyncLocalStorage context; W3C Trace
  Context and Baggage propagation; OTLP HTTP exporters; exporter-callback
  accounting; and bounded cleanup.
- Accept explicit provider configuration only. Do not read telemetry
  environment variables or invent localhost endpoints.
- The enabled global topology also owns the one native oRPC instrumentation
  configuration under its existing ownership claim. Preserve foreign native
  configuration and disable only the exact owned binding on release/rollback.
  This creates no router, host or application selection; cohosted native
  harnesses never install or disable this global binding independently.
- Do not own process signals, app/profile choice, host request routing, product
  events, backend receipt, Oclif, Inngest, EVLog or Effect context. Process-owned
  Effect decoration uses the existing tracer, never a second provider.

## Behavior

- The disabled branch constructs no OpenTelemetry object. The enabled branch
  refuses duplicate global ownership, contains partial construction and export
  failures, and returns a degraded neutral value instead of changing product
  behavior.
- Release uses the caller's one monotonic deadline, attempts owned stages in
  reverse order, and shares one completion across repeated calls.
- The runtime adapter receives an explicit deadline callback from composition
  and samples it once at finalization, never at acquisition. The capability
  stays provider-neutral; the original native lease remains provider-owned.

## Routing

- [Telemetry resource](../../AGENTS.md)
- [Public provider face](index.ts)
- [Provider-neutral contract](../../contract.ts)

## Validation

- Run `bunx nx run provider-telemetry-opentelemetry-node:typecheck` and
  `bunx nx run provider-telemetry-opentelemetry-node:test`.
