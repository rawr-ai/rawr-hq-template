# Telemetry Resource Router

## Purpose

- Give one OS process a provider-neutral, inert observation capability without
  restating the native signal systems beneath it.

## Scope

- Applies to `resources/telemetry/**` until a provider-local router narrows the
  scope.
- This resource owns process identity, bounded flat correlation attributes,
  fallback native-operation observation, technical logs, availability,
  never-failing flush, and bounded contained diagnostics.

## Boundaries

- Native signal APIs, active context, propagation, instrumentation, export,
  provider construction and release, and application lifecycle stay outside
  the neutral contract.
- The fallback native-operation scope is admitted only when a host has no
  native product-event binding. Native bindings remain their own event owners.
- Telemetry never decides product outcomes, durable state, retry behavior, or
  process exit classification.

## Routing

- [Repository router](../../AGENTS.md)
- [Provider-neutral contract](contract.ts)
- [OpenTelemetry Node provider](providers/opentelemetry-node/AGENTS.md)

## Validation

- Run `bunx nx run habitat:lint`,
  `bunx nx run @habitat-ai/resource-telemetry:typecheck`,
  `bunx nx run @habitat-ai/resource-telemetry:test`, and
  `bunx nx run @habitat-ai/resource-telemetry:build`, plus
  `bunx nx run provider-telemetry-opentelemetry-node:test`.
