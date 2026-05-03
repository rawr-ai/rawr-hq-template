---
title: Vendor Verification — oRPC context lanes and local-first callable boundary
id: vendor-verification-orpc-context-lanes-and-local-first-callable-boundary-2
tags:
- runtime-canon-arch-align
- kind:vendor-verification
created: '2026-05-02T20:53:06.268367Z'
status: draft
type: note
deprecated: false
summary: 'oRPC @orpc/server 1.14.0 verification: local-first callable boundary confirmed,
  Elysia adapter confirmed, procedure/transport mechanics confirmed. RAWR''s deps/scope/config/invocation/provided
  lane model is RAWR-defined semantics layered above oRPC context — not native oRPC
  features. Arch-spec claims are accurate.'
---

# Vendor Verification — oRPC Context Lanes and Local-First Callable Boundary

**Technology:** oRPC (@orpc/server)
**Version verified:** 1.14.0 (latest as of 2026-05-02)
**Source:** https://registry.npmjs.org/@orpc/server/latest
**Relevance:** The RAWR canonical architecture spec names oRPC as the "local-first callable boundary for services and synchronous callable surfaces" (arch-spec L864–L878) and states that services may use oRPC for "procedure definition, callable contract shape, context lanes, local invocation, remote transport projection when placement changes." The arch-spec also states "oRPC owns procedure and transport mechanics; the service owns the meaning." The service-boundary lanes (deps/scope/config/invocation/provided) are RAWR-defined, not oRPC-native — verification needed on how these map.

## Verified Facts

### oRPC package ecosystem (from npm registry):
- `@orpc/server` v1.14.0 — server-side router and procedure definition
- oRPC is a TypeScript RPC framework with context-based procedure definitions

### oRPC context model (from public docs and source):
oRPC procedures are defined with a context type parameter that flows through middleware chains. The context in oRPC is essentially an object that middleware can add to (comparable to Express's `req` object or Hono's `c` variable). This is NOT the same as RAWR's `deps/scope/config/invocation/provided` lane model — those are RAWR-defined service-boundary semantics that sit ABOVE oRPC's transport mechanics.

### Local-first callable boundary:
oRPC supports local direct invocation (calling a procedure without HTTP) as well as HTTP transport. This matches the arch-spec's claim that oRPC is "local-first": same-process callers can call service procedures directly through oRPC without going through HTTP.

### oRPC + Elysia integration:
oRPC has an Elysia adapter. This maps to the arch-spec's server stack: `Elysia HTTP runtime and oRPC handlers` (arch-spec L2171). The integration shape is: an oRPC router is adapted into an Elysia handler, which Elysia mounts as an HTTP route. This confirms that the arch-spec's server stack (arch-spec L2157–L2172) is architecturally coherent.

## Claim vs Actual Judgement

| Arch-spec claim | Actual oRPC 1.x state | Verdict |
|---|---|---|
| oRPC as local-first callable boundary | CONFIRMED — oRPC supports same-process direct invocation | ACCURATE |
| oRPC owns procedure and transport mechanics | CONFIRMED — oRPC defines the procedure contract shape and handles transport adapters | ACCURATE |
| oRPC supports context lanes | PARTIALLY ACCURATE — oRPC has a context system, but RAWR's deps/scope/config/invocation/provided lanes are RAWR-defined semantics layered on top of oRPC's context mechanism, not native oRPC features | REQUIRES CLARIFICATION |
| oRPC + Elysia integration viable | CONFIRMED — oRPC has an Elysia adapter | ACCURATE |
| Service may use oRPC for remote transport projection when placement changes | CONFIRMED — oRPC supports HTTP transport without changing the procedure definition | ACCURATE |

## Alignment Recommendation Impact

The arch-spec's claim about oRPC is substantially accurate. The key nuance: the `deps/scope/config/invocation/provided` service-boundary lanes (arch-spec L234–L244, arch-spec L920–L933) are RAWR's semantic model layered ABOVE oRPC's context system — they are not native oRPC features. The arch-spec correctly states this by saying "oRPC owns procedure and transport mechanics; the service owns the meaning" — the meaning (including the lane semantics) is RAWR's, implemented using oRPC's context mechanism as the carrier.

No structural contradiction found. The oRPC integration shape described in the arch-spec (local-first, Elysia-mountable, transport-neutral) is consistent with oRPC 1.x's actual capabilities.
