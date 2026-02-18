# D-008 Scratchpad (Constraint Summary)

## Packet Constraints
- Split harness is locked: `/rpc` first-party/internal; `/api/orpc/*` + `/api/workflows/<capability>/*` are caller-facing OpenAPI surfaces; `/api/inngest` is runtime-only (AXIS 03/07/08 & route review matrix).
- Middleware control planes stay separate: oRPC/Elysia handles policy/auth, Inngest handles durable lifecycle (`AXIS_06`). Heavy middleware dedupe must use explicit context markers when order/leading-subset constraints are not satisfied.
- Host composition must be explicit; manifest-driven routing ensures capability-first workflow mounts and a single runtime-owned Inngest bundle (AXIS 07 & session route design roadmap).
- TypeBox-only contract/procedure schema ownership plus context metadata separation from `domain/*` remain canonical (decisions D-011/D-012) while we define middleware sequencing.

## Repository Touchpoints
- `apps/server/src/rawr.ts` bootstraps the runtime adapter, Inngest bundle, `/api/inngest` mount, and `registerOrpcRoutes` for `/rpc` + `/api/orpc`.
- `apps/server/src/orpc.ts` composes the HQ contract, RPC/OpenAPI handlers, typed error surfaces, and `queueCoordinationRunWithInngest` bridging to workflows.
- `rawr.hq.ts` (generated) should expose separate `orpc` + `workflows` namespaces plus the shared Inngest bundle so hosts can mount with the required order.

## Official References
- D-008 target: Inngest `extendedTracesMiddleware()` must be invoked before other imports/handlers to populate auto instrumented traces for every function (`https://www.inngest.com/docs/reference/typescript/extended-traces`).
- D-009 context: oRPC built-in middleware dedupe only works when middleware stacks are the same order/leading subset; heavy middleware should guard via context-cached markers or second guard (https://orpc.dev/docs/best-practices/dedupe-middleware).
- D-010 caution: Inngest `finished` hook is not guaranteed to run once per start; side effects there must be idempotent/non-critical (`https://www.inngest.com/docs/reference/middleware/lifecycle`).

## Next Focus
- Align the host bootstrap to call `extendedTracesMiddleware()` before anything else, keep the Inngest bundle singular, and explicitly tie middleware placement lists to their control planes.
- Keep D-009/D-010 as advisory `SHOULD` guidance until more evidence surfaces, while the primary D-008 lock defines the middleware initialization contract.
