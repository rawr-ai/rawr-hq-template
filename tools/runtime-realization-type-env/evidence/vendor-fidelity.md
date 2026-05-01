# Vendor Fidelity Notes

This lab uses canonical-looking imports to test the RAWR authoring spine. Those imports are local aliases, not vendor packages.

## TypeScript

- Local compiler: TypeScript `5.9.3`.
- Discriminated descriptor refs rely on TypeScript's normal discriminated-union narrowing.
- Manifest and artifact fixtures use `satisfies` to validate object shape while preserving literal inference.
- Generator checks rely on the installed `Generator<TYield, TReturn, TNext>` definition, where `TYield` is the yielded value type.

## Effect

- The lab installs `effect@3.21.2` as a root `devDependency` only. It is not a production dependency and the tool is not a workspace package.
- `@rawr/sdk/effect` remains a RAWR facade, but in Lab V2 `RawrEffect<A, E, R>` is backed by real `Effect.Effect<A, E, R>`.
- The facade intentionally exposes curated authoring helpers, root `pipe`, value `.pipe(...)`, `TaggedError`, and policy types. It does not expose raw `ManagedRuntime`, `Layer`, `Queue`, `PubSub`, `Stream`, `Schedule`, or runtime constructors.
- `TaggedError("Tag")<{ ... }>` is backed by Effect's `Data.TaggedError` spelling.
- Vendor tests run real Effect programs for `Effect.gen`, `yield*`, root `pipe`, value `.pipe(...)`, `Exit`, `Cause`, typed failure, defects, interruption through `AbortSignal`, scoped acquire/release, finalizer ordering, and `ManagedRuntime`. Process-local `Queue`, `PubSub`, `Ref`, `Deferred`, `Schedule`, and `Stream` behavior is exercised only through the lab's RAWR-owned process-local resource probe, not as standalone vendor demonstrations.
- `Effect.repeat(effect, Schedule.recurs(n))` returns schedule output. The vendor lane records this explicitly; examples must not assume the repeated action output is returned.
- `Stream.runCollect(...)` returns a `Chunk`, so lab code converts with `Chunk.toArray(...)` at boundaries.
- Root/subpath exports inspected and now used where relevant include `Effect`, `Layer`, `Scope`, `ManagedRuntime`, `Queue`, `PubSub`, `Ref`, `Deferred`, `Schedule`, `Stream`, `Fiber`, `FiberRef`, `Config`, `Logger`, `Tracer`, `Metric`, and `Data`.
- Current vendor spelling supports root `pipe` or value `.pipe(...)`; `Effect.pipe` is not the verified namespace spelling.
- Real Effect runtime semantics are proven only for the narrow lab lanes listed in `proof-manifest.json`; unresolved RAWR public runtime substrate decisions remain `xfail` entries.

## oRPC

- Installed packages: `@orpc/contract` and `@orpc/server` `1.13.5`.
- The vendor boundary probe compiles native `oc.router(...)`, `implement(contract).$context<...>()`, and native `.handler(...)` shapes.
- The Phase Two server-boundary lane also exercises a real `@orpc/server/fetch`
  `RPCHandler` with a Fetch `Request`. That proof is contained lab request
  handling plus RAWR mini-runtime delegation; it is not OpenAPI publication,
  product API policy, production HTTP serving, or an Elysia mount.
- `.effect(...)` in this lab means the RAWR runtime-realization authoring terminal, not native oRPC API surface. The lab does not assert a fake oRPC `.effect(...)` negative because oRPC never claimed that API.

## Elysia

- Installed package: `elysia@1.4.24`.
- Phase Two child workstream 4 did not promote Elysia proof because the package
  was present only through `apps/server` and was not root/lab-resolvable.
- Phase Three child 5 adds `elysia` as an explicit root/lab dependency and
  exercises a real Elysia app/request path inside the mini-runtime lab. The
  contained adapter uses `new Elysia().all('/rpc*', ({ request }) => ..., {
  parse: 'none' })` to forward the raw Web `Request` into the existing
  contained `@orpc/server/fetch` boundary without letting Elysia pre-parse the
  oRPC body.
- The child 5 proof uses `Elysia.handle(new Request(fullUrl, ...))`, which official
  Elysia docs describe as a unit-test/simulated HTTP request path. It proves
  contained app/request host passage only.
- Phase Three child 6 adds contained local listener lifecycle evidence using
  the installed Bun/Elysia path. The proof starts the existing child-5 host app
  with `app.listen({ hostname: "127.0.0.1", port: 0 })`, derives the request
  base from `app.server.url`, sends a direct real network
  `globalThis.fetch(...)`, records request entry through Elysia `onRequest`,
  and stops with `app.stop(true)`. Installed-source evidence shows
  `app.listen(...)` returns the app while assigning `app.server`, runs
  `onStart`, and `app.stop(...)` clears `app.server` before `onStop`/stop
  completion records finish.
- The child 6 proof is still a contained Bun/Elysia local-listener proof. It
  does not prove production HTTP serving, deployment/process-supervision
  lifecycle, TLS/proxy/load-balancer behavior, Node adapter parity,
  OpenAPI/Eden behavior, auth/logging, native host telemetry/error mapping,
  product API policy, deployment topology, or production migration readiness.
- The official `.mount('/prefix', fetchFn)` pattern remains supporting Fetch
  interop evidence, not the primary oRPC body-preservation oracle. The accepted
  oracle for this lab is the official oRPC/Elysia route-forwarding shape with
  `{ parse: 'none' }`.

## TypeBox

- Installed package: `typebox` `1.0.81`.
- The boundary probe uses `Type.Object(...)`, `Static`, `Value.Check`, `Value.Errors`, and `Compile(...).Check(...)`.
- Raw TypeBox schemas are vendor schema values. They become RAWR `RuntimeSchema<T>` only through an explicit RAWR adapter.

## Inngest

- Installed package: `inngest` `3.51.0`.
- The boundary probe constructs an `Inngest` client, a `createFunction(...)` step callback, and the `inngest/bun` `serve({ client, functions })` handoff shape.
- Phase Two additionally exercises a contained Inngest-facing boundary through
  a real `inngest/bun` Fetch handler, absolute function-id routing, and
  `step.run(...)` before delegating to the RAWR mini async harness.
- Phase Three started-passage proof records that a stopped async harness
  rejection surfaces through Inngest as a protocol-native `StepError` operation
  inside a `206` step response. The contained boundary now classifies that
  response as failure in its own observation record after inspecting the
  protocol body. Future Inngest failure oracles must inspect the step response
  body and runtime-delegation evidence; HTTP status alone is not enough.
- Phase Three layer-disagreement proof records that a `StepRun` operation can
  carry a RAWR async-step payload whose `status` is `failure`. The lab records
  this as `protocolPayloadRuntimeStatus`, not as Inngest protocol status or
  durable Inngest run status.
- The lab does not claim durable scheduling, retries, idempotency, or production Inngest host semantics.

## HyperDX / OTLP

- The lab observation lane uses OTLP trace payload shape and the explicit
  `/v1/traces` HTTP path as the vendor boundary.
- Phase Two child workstream 6 composes provider, oRPC server, Inngest async,
  runtime, and catalog records into one injected-fetch OTLP export gate. That
  gate proves deterministic serialization, endpoint selection, and redaction
  before export; it does not prove product dashboards, queries, alerting,
  retention, production OpenTelemetry bootstrap, or durable catalog storage.
- Local `rawr-hq-hyperdx` Docker ingest smoke is supporting lab evidence only.
  It can show that a reachable local OTLP endpoint accepts the payload, but it
  is not a production deployment, query semantics proof, dashboard proof, or
  product observability policy decision.

## Semantica

- The `codex/semantica-first-pipeline-implementation` branch is inspected read-only as evidence discovery only.
- That branch diverges from the runtime lab stack and must not be merged into this implementation branch.
- Semantica output may point reviewers to source spans, but it is not architecture authority and cannot promote a manifest entry to proof without a concrete gate.

## Service Package Effect/oRPC Integration Snapshot

- Reference resource:
  `docs/projects/rawr-final-architecture-migration/resources/research/service-package-effect-orpc-integration-snapshot.md`.
- This snapshot is a golden integration exemplar for native-fit vendor design:
  keep the author-facing surface vendor-native where that improves DX, while
  RAWR owns lifecycle, runtime construction, import law, diagnostics, telemetry
  correlation, policy, context projection, and finalization seams.
- It is not authority over runtime boundaries, runtime lifecycle, public runtime
  SDK names, adapter lowering, provider acquisition/finalization, proof
  categories, or production migration readiness. The manifest-pinned runtime
  realization spec wins those conflicts.
- Known stale detail: the snapshot's older `.handler(...)` / `.effect(...)`
  terminal split is superseded by current runtime-realization authority. RAWR
  `.effect(...)` remains the canonical execution terminal for
  runtime-realization service/plugin authoring; public `.handler(...)` /
  Promise branches must not be reintroduced from the snapshot.
