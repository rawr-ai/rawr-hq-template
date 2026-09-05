# Runtime Harness Contracts

## Purpose

Own import-safe native harness contracts, selected native Elysia and Inngest hosts,
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
- Native Inngest resolves the already provisioned native client and consumes
  private process-lowered function bundles. Serve and Connect own transport,
  not a second Effect runtime, provider, dispatcher, or replay interpreter.
  Functions use exact native IDs and explicit event/cron triggers. Native
  request settlement differs from authored orchestration Promise settlement:
  replay discovery may leave that Promise suspended. Qualification must cover
  finite native middleware/request lifetime and actually executing step bodies.
- `createOwnerStop` shares one native owner's operation; it does not coordinate
  other owners. A no-op owner still supplies explicit stop; any no-op health
  evidence is not-applicable, never fabricated passing readiness.

## Validation

Run owner TypeScript, behavior and isolated cache proofs. The separately named
server and async acceptance targets execute the terminal SDK's composed Bun fixtures;
that assembly test creates no native-owner source dependency back into SDK.
The async fixture uses the pinned local native Dev Server, not simulated Inngest
protocol requests. Neither local receipt qualifies Cloud, collector persistence,
or ClickHouse queryability. Generic contract tests alone do not qualify these paths.

`acceptance:process-isolation` executes the SDK-owned driver after the SDK build
and is a prerequisite of the ordinary harness test target. It qualifies separately
built server and async children of one temporary complete app@2 using the packed
SDK and real native hosts. Child IPC and explicit restart/failure controls are
test-only; they add no production supervisor, public lifecycle controller, or
native-owner dependency on SDK source.

`acceptance:workflow-admission` qualifies server-only publication through actual
acquired native clients to the local Dev Server and independent native receivers.
It proves event acknowledgements and fan-out without selecting the target async
execution closure, plus native send settlement before client/resource release.
It does not qualify Cloud delivery, a product outbox, or exactly-once execution.
