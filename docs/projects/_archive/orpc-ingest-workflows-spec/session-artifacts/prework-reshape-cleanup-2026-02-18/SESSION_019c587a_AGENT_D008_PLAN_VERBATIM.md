# D-008 Plan (Informal)

## Objective
- Lock the extended traces middleware initialization contract so every host instantiates the Inngest client with instrumentation before any other modules execute and keep the middleware control planes (oRPC/Elysia vs Inngest) split.
- Maintain the packet-wide caller/transport/mount policy while clarifying what host-level boot order and middleware placement authors inherit by default, versus extension points where plugins can add figure-specific middleware.
- Surface D-009 and D-010 as background, non-blocking guidance until additional evidence demands locking.

## Approach
1. Record the packet constraints that influence D-008, especially the split posture (AXIS 03/07/08) and middleware planes (AXIS 06), plus the route-host invariants from `SESSION_019c587a_ROUTE_DESIGN_API_SURFACE_REVIEW.md`.
2. Layer on the official Inngest guidance that `extendedTracesMiddleware()` must be imported/executed before other code so instrumentation spans the entire host, and note that the host bootstrap currently wires `registerOrpcRoutes` with the coordination runtime adapter (`apps/server/src/rawr.ts`).
3. Draft language that defines the non-negotiable baseline (host-level import/initialization order, single Inngest bundle, parse-safe mounts) while identifying the plugin extension points (plugin middleware, repeated dedupe markers, finished hook caution).
4. Document the recommended D-008 lock text, note the remaining D-009/D-010 disposition (SHOULD-level guidance), and use these notes to populate the required scratchpad and recommendation artifacts.
