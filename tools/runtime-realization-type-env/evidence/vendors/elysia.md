# Elysia Vendor Evidence

## Map

| Need | Answer |
| --- | --- |
| What RAWR relies on | Contained Elysia app/request handling and local Bun/Elysia listener lifecycle |
| Current lab evidence | Phase Three contained app/request and local listener `simulation-proof` |
| System impact | Server host passage before oRPC Fetch and oracle delegation |
| Proof ceiling | Not production HTTP serving, deployment supervision, or production host lifecycle |

## Current Vendor Facts

- Installed package: `elysia@1.4.24`.
- Phase Two did not promote Elysia proof because the package was present only
  through `apps/server` and was not root/lab-resolvable.
- Phase Three adds `elysia` as an explicit root/lab dependency and exercises a
  real Elysia path inside the contained lab. The earned claim is contained
  app/request host passage only.

## Current Lab Evidence

- The contained adapter uses `new Elysia().all('/rpc*', ({ request }) => ..., {
  parse: 'none' })` to forward the raw Web `Request` into the existing
  contained `@orpc/server/fetch` boundary.
- Child 5 uses `Elysia.handle(new Request(fullUrl, ...))`, an app/request path
  documented by Elysia as a unit-test/simulated HTTP request path.
- Child 6 starts the app with `app.listen({ hostname: "127.0.0.1", port: 0 })`,
  derives the request base from `app.server.url`, sends a direct real network
  `globalThis.fetch(...)`, records request entry through Elysia `onRequest`,
  and stops with `app.stop(true)`.
- Installed-source evidence shows `app.listen(...)` returns the app while
  assigning `app.server`, runs `onStart`, and `app.stop(...)` clears
  `app.server` before `onStop`/stop completion records finish.
- Child 7 reuses the child 5 and 6 findings inside the integrated rehearsal.
  It adds composition evidence, not new Elysia vendor semantics.

## Evidence Pointers

- `audit.p3.contained-elysia-host-passage`
- `audit.p3.contained-elysia-listen-lifecycle-passage`
- `audit.p3.integrated-live-passage-rehearsal-closeout`
- `../../phases/phase-three/workstreams/workstream-2026-05-01-phase-three-contained-elysia-host-passage.md`
- `../../phases/phase-three/workstreams/workstream-2026-05-01-phase-three-contained-elysia-listen-lifecycle-passage.md`

## Not Proven

The lab does not prove production HTTP serving, deployment/process-supervision
lifecycle, TLS/proxy/load-balancer behavior, Node adapter parity,
OpenAPI/Eden behavior, auth/logging, native host telemetry/error mapping,
product API policy, deployment topology, or Parent-Repo Migration authorization.

## Future Official-Docs Requirement

Any future Elysia work that models production serving, plugin/middleware
grammar, listen lifecycle, request parsing/body behavior, error propagation, or
OpenAPI/Eden behavior must run a dedicated official-doc/source pass before
becoming normative integration guidance.
