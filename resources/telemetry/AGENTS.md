# Telemetry Resource Router

## Purpose

- Give process and runtime owners one provider-neutral technical telemetry
  capability with bounded identity, attributes, diagnostics, exporter-callback
  accounting, and flush behavior.

## Scope

- Applies to `resources/telemetry/**` until a provider-local router narrows the
  scope.
- This resource owns only the provider-neutral contract and its provider
  family.
- `runtime.ts` is a private source-assembly identity, typechecked here and
  consumed directly by runtime integration. It is not a native package export
  or part of the existing distributable build.

## Boundaries

- Provider selection, lifetime, backend activation, profile configuration, and
  product-observation policy belong to composing runtime and application
  owners.
- OpenTelemetry SDKs, globals, propagation, exporters, and cleanup stay in the
  nested OpenTelemetry Node provider. Accounting covers only items presented to
  exporter callbacks, grouped by coarse callback result; it does not assert
  backend receipt or include processor queue overflow, OTLP partial success, or
  loss before an exporter callback.
- Oclif, oRPC, Inngest, EVLog, process hooks, and backend receipts do not enter
  this resource.

## Behavior

- A selected provider supplies an immutable availability snapshot, emits
  bounded technical logs, reports exporter-callback item counts, retains bounded
  diagnostics, and flushes without changing product outcomes. Repeated
  cumulative metric points count once on every callback presentation rather
  than as unique observations.

## Routing

- [Repository router](../../AGENTS.md)
- [Provider-neutral contract](contract.ts)
- [OpenTelemetry Node provider](providers/opentelemetry-node/AGENTS.md)

## Validation

- Run `bunx nx run @habitat-ai/resource-telemetry:typecheck`,
  `bunx nx run @habitat-ai/resource-telemetry:test`, and
  `bunx nx run provider-telemetry-opentelemetry-node:test`.
