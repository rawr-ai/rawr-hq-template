# Runtime Harness Contracts

## Purpose

Own import-safe native harness contracts and bounded owner-local readiness,
health evidence and idempotent stop mechanics.

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
- The SDK projects contract types only. No live handle, helper, native host
  package, Oclif loader or generic drain/controller is exported there.
- `createOwnerStop` shares one native owner's operation; it does not coordinate
  other owners. A no-op owner still supplies explicit stop; any no-op health
  evidence is not-applicable, never fabricated passing readiness.

## Validation

Run owner TypeScript, behavior and isolated cache proofs. Native host integration
requires its separately admitted owner; these contracts do not qualify a host.
