# OpenTelemetry Node Provider Router

## Purpose

- Realize the telemetry resource for Node while keeping vendor construction,
  native bindings, signal providers, export, and release out of the neutral
  contract.

## Scope

- Applies to `resources/telemetry/providers/opentelemetry-node/**`.
- The provider owns the admitted OpenTelemetry Node topology and the disabled
  branch selected before vendor loading.

## Boundaries

- Disabled construction returns before creating signal providers,
  exporters, processors, readers, drains, timers, hooks, or network clients.
- Enabled construction registers one provider for each signal, one global
  W3C Trace Context plus Baggage propagator, the global Effect tracer binding,
  and at most one processor for the process-owned Inngest client.
- The application owns process intake and native-owner drain. This provider
  owns signal flush and release but never process hooks or exit semantics.

## Routing

- [Resource router](../../AGENTS.md)
- [Provider implementation](index.ts)
- [Provider-neutral contract](../../contract.ts)

## Validation

- Run `bunx nx run provider-telemetry-opentelemetry-node:typecheck` and
  `bunx nx run provider-telemetry-opentelemetry-node:test`.
