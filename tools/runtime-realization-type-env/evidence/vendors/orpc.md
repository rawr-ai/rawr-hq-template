# oRPC Vendor Evidence

## Map

| Need | Answer |
| --- | --- |
| What RAWR relies on | oRPC contract/server shape and Fetch request handling |
| Current lab evidence | Native shape smoke plus contained `@orpc/server/fetch` boundary passage |
| System impact | Server boundary, route identity, adapter lowering, layer disagreement |
| Proof ceiling | Not OpenAPI policy, product API policy, production HTTP serving, or Elysia proof by itself |

## Current Vendor Facts

- Installed packages: `@orpc/contract` and `@orpc/server` `1.13.5`.
- The vendor boundary probe compiles native `oc.router(...)`,
  `implement(contract).$context<...>()`, and native `.handler(...)` shapes.
- `.effect(...)` in this lab means the RAWR runtime-realization authoring
  terminal, not native oRPC API surface.
- The lab does not assert a fake oRPC `.effect(...)` negative because oRPC does
  not claim that API.

## Current Lab Evidence

- Phase Two exercises a real `@orpc/server/fetch` `RPCHandler` with a Fetch
  `Request`, `/rpc` matching, request-shaped invocation context assembly,
  server harness delegation, route/ref identity preservation, and unmatched
  path rejection before harness invocation.
- Phase Three preserves layer disagreement when oRPC HTTP `200` carries a RAWR
  failure body.
- Phase Three composes oRPC Fetch behind Elysia app/request and local listener
  passage in the contained integrated rehearsal.

## Evidence Pointers

- `vendor.boundary.orpc-native-shape`
- `audit.p2.server-orpc-fetch-boundary`
- `audit.p3.layer-disagreement-failure-observation-proof`
- `audit.p3.contained-elysia-host-passage`
- `audit.p3.integrated-live-passage-rehearsal-closeout`

## Golden Integration Pattern

Reference:
`docs/projects/rawr-final-architecture-migration/resources/research/service-package-effect-orpc-integration-snapshot.md`.

Use it as a golden example of native-fit integration: oRPC-facing code may use
vendor-native concepts where that improves boundary clarity, but RAWR owns the
runtime execution terminal, lifecycle, diagnostics, telemetry correlation,
policy, and context projection.

It is not runtime authority. Its older `.handler(...)` / `.effect(...)`
terminal split must not reintroduce public `.handler(...)` or Promise execution
branches into runtime-realization service/plugin authoring.

## Not Proven

The lab does not prove production oRPC adapter lifecycle, OpenAPI publication,
product API policy, production HTTP serving, auth/logging semantics, native
host telemetry/error mapping, or Parent-Repo Migration authorization.

## Future Official-Docs Requirement

Any future oRPC integration work that models native routing, OpenAPI behavior,
context propagation, error envelopes, middleware, or Elysia interop must run a
dedicated official-doc pass before becoming normative runtime guidance.
