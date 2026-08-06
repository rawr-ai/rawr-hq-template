# Native Telemetry Admission Router

## Purpose

- Prove one exact interoperable native telemetry dependency tuple before any
  production provider consumes it.

## Scope

- Applies to `tools/native-platform-telemetry-admission/**`.

## Boundaries

- This tool owns executable compatibility evidence only. It is not a runtime
  provider, package patch, transport, exporter, or second telemetry lifecycle.
- A failed tuple stops production wiring rather than authorizing a shim.

## Behavior

- The fixture exercises the exact oRPC, Effect, Inngest, OpenTelemetry, and
  EVLog packages together and verifies their observable native correlation.

## Concepts

- An **admitted tuple** is the exact package set whose imports, native owners,
  OTLP request, correlation, and cleanup have passed the executable fixture.

## Flow

- Nx typechecks the fixture, runs it serially, and exposes their conjunction as
  the `admit` target consumed by the telemetry workstream.

## Interfaces

- `project.json` owns the Nx target surface; `test/exact-tuple.test.ts` owns the
  executable compatibility contract.

## Routing

- [Repository router](../../AGENTS.md)
- [[../../openspec/changes/prove-native-platform-telemetry/design|Telemetry design]]

## Validation

- `bunx nx run native-platform-telemetry-admission:admit`
