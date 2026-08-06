# OpenTelemetry Node Provider Router

## Purpose

- Realize the telemetry resource for Node while keeping vendor construction,
  native bindings, signal providers, export, and release out of the neutral
  contract.

## Scope

- Applies to `resources/telemetry/providers/opentelemetry-node/**`.
- The current implementation owns only the disabled branch.

## Boundaries

- Disabled construction returns before creating SDKs, signal providers,
  exporters, processors, readers, drains, timers, hooks, or network clients.
- Application process ownership, shutdown ordering, and provider selection do
  not move into this package.

## Routing

- [Resource router](../../AGENTS.md)
- [Provider implementation](index.ts)
- [Provider-neutral contract](../../contract.ts)

## Validation

- Run `bunx nx run provider-telemetry-opentelemetry-node:typecheck` and
  `bunx nx run provider-telemetry-opentelemetry-node:test`.
