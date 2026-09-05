# Runtime Harness Contracts

## Purpose

Own import-safe native harness contracts, the selected native Elysia host,
bounded owner-local health evidence and idempotent stop mechanics.

## Scope

Applies to this private package-less `runtime-harnesses` Nx owner.

## Boundaries

- Direct private edges are definition, compiler and process-runtime only.
- Mount consumes adapter-lowered, process-runtime mount-ready payloads, never
  raw authoring graphs or compiler plans. Compiler references in contract tests
  prove that distinction; they do not authorize compiler-driven native mounting.
- Re-export the exact definition-owned launch identity. Do not reconstruct it.
- Required resources are read-only evidence. Health reports retain the exact
  mount identity and distinguish optional readiness from optional liveness.
- Runtime mounting owns StartedHarness and reverse cross-owner stop order;
  process-runtime owns process-resource release, and observation owns read models.
- The generic SDK harness face projects contract types only. The separate
  `runtime/harnesses/elysia` face delegates the cold descriptor factory and
  exact configuration/payload types; it loads no optional Elysia peer until
  mount. No live handle, Oclif loader or generic drain/controller is exported.
- Native Elysia serves process-lowered callbacks and one public-only native
  OpenAPI document. It does not reconstruct plugins, run Effect programs or
  own providers/instrumentation globals. The original Request and signal reach
  native oRPC unchanged. Native stop(false) settles before process release;
  unawaited vendor onStop hooks own no asynchronous cleanup here.
- `createOwnerStop` shares one native owner's operation; it does not coordinate
  other owners. A no-op owner still supplies explicit stop; any no-op health
  evidence is not-applicable, never fabricated passing readiness.

## Validation

Run owner TypeScript, behavior and isolated cache proofs. The separately named
server acceptance target executes the terminal SDK's composed Bun fixture;
that assembly test creates no native-owner source dependency back into SDK.
Generic contract tests alone do not qualify the real host or telemetry path.
