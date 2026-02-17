# Agent Scratch: oRPC Network + Server Integration

## Mission

Map the manual coordination surface so we can replace it with oRPC + Elysia composition without breaking the CLI/UI or Inngest runtime.

Skills introspected: orpc, elysia, architecture, bun

## Findings

1. The server currently wires `/rawr/coordination/*` by hand. `apps/server/src/coordination.ts` registers six routes (`GET /workflows`, `POST /workflows`, `GET /workflows/:id`, `POST /workflows/:id/validate`, `POST /workflows/:id/run`, `GET /runs/:runId`, `GET /runs/:runId/timeline`) and expresses every response with `coordinationSuccess`/failure helpers built on `@rawr/coordination/node`. Each route re-implements parsing, validation, workflow lookup and persistence, and the Inngest queue integration (`queueCoordinationRunWithInngest`). The same file also constructs `CoordinationRuntimeAdapter` methods such as `readMemory`/`writeMemory` and `saveRunStatus`, so it is the only place that drives the coordination storage API surface.
2. `apps/server/src/rawr.ts` wraps `registerCoordinationRoutes` and adds plugin plumbing (`/rawr/state`, `/rawr/plugins/web/:dirName`), plus the `POST /api/inngest` handler produced by `createInngestServeHandler`. These routes share the same Elysia instance and rely on the `baseUrl`, repo root resolution, and the enabled-plugin guard that reads `@rawr/state`. All of that manual routing would still need to coexist with ORPC if we only replace the coordination slice.
3. Clients (web/CLI) mirror the manual paths. `apps/web/src/ui/coordination/adapters/api-client.ts` uses `fetch` directly against `/rawr/coordination/*` and rehydrates `CoordinationEnvelope` shapes, while `apps/web/vite.config.ts` keeps a dev proxy so `/rawr` still lands on the Bun server. On the CLI side, `apps/cli/src/lib/coordination-api.ts` and the `rawr workflow coord /*` commands use `coordinationFetch`, which concatenates the resolved base URL and paths, sends JSON bodies, and interprets the success/failure envelopes before printing human output. The CLI commands also mention the same paths in their dry-run feedback (e.g., `POST /rawr/coordination/workflows/:id/run`).
4. The docs capture this surface: `docs/projects/agent-coordination-canvas-v1/IMPLEMENTATION_PLAN.md` lists the full `/rawr/coordination/*` API, and `DESIGN_DATA_INTEGRATION_PLAN.md` calls out each endpoint plus the timeline + trace requirements that the routes satisfy. Those are the artifacts we need to keep in sync with any ORPC contract we introduce.

## Target oRPC + Elysia Composition

- Define an `@orpc/contract` router that exposes procedures for each manual route: `listWorkflows`, `saveWorkflow`, `getWorkflow`, `validateWorkflow`, `runWorkflow`, `getRunStatus`, and `getRunTimeline`. Inputs/outputs should reuse the existing `CoordinationWorkflowV1`, `RunStatusV1`, `DeskRunEventV1`, and `ValidationResultV1` schemas so clients keep their type invariants.
- Implement the contract by reusing `ensureCoordinationStorage`, `getWorkflow`, `queueCoordinationRunWithInngest`, and the runtime adapter created in `coordination.ts`. Keep the helper functions (e.g., `parseRunId`) so the logic stays identical to production; the only difference will be that they now live inside `implement(contract)` instead of `app.get/...` handlers.
- Mount the resulting router via `RPCHandler` plus `OpenAPIHandler` against the same `/rawr/coordination` prefix. With Elysia’s Fetch-layer hooks we can do `app.all('/rawr/coordination/:path*', { parse: 'none' }, ({ request }) => handler.handle(request, { prefix: '/rawr/coordination', context: { baseUrl, repoRoot, runtime } }))`. The same router would also feed a `/rawr/coordination/openapi.json` (or `/rawr/coordination/api`) endpoint handled by `OpenAPIHandler`, which preserves documentation for operators.
- Clients would migrate from manual `fetch`/`coordinationFetch` to `createORPCClient(new RPCLink({ url: `${baseUrl}/rawr/coordination` }))`. That keeps the same HTTP path while replacing JSON plumbing with typed RPC calls. CLI dry-run helpers can also retain their messages by reading the contract metadata or constructing the path manually.
*(Optional)* Keep `/api/inngest` and `/rawr/plugins/*` wired as-is; they live outside the coordination contract and do not block the ORPC migration.

## Migration slices

### Prepare

- Create a coordination contract package (e.g., `packages/coordination-contract` or `apps/server/src/coordination-contract.ts`) that exports the ORPC `oc.router` plus shared types. Implement server-side helpers that wrap `CoordinationRuntimeAdapter` so both the router and clients can import the same runtime interfaces.
- Draft ORPC clients for the web and CLI surfaces so the commands can start composing `createORPCClient`/`RPCLink` without yet replacing the old callers. Add handoff notes in `docs/projects/agent-coordination-canvas-v1/IMPLEMENTATION_PLAN.md` to show the contract’s canonical endpoints.
- Begin wiring `apps/server/src/index.ts` to hold the new `runtime` context so the ORPC handler will later reuse it; keep the CLI/webpack dev proxy expectations unaffected.
- Deletion targets: none yet, but plan to delete `apps/server/src/coordination.ts` once the router mounts through ORPC.

### Cutover

- Replace `registerCoordinationRoutes` with ORPC handler mounting. The handler should live in a new module that pulls in the contract implementation and uses the `runtime`/`baseUrl` objects already wired in `apps/server/src/index.ts`. Drop the old `app.get(...)/app.post(...)` definitions from `coordination.ts` after verifying tests still cover the flow.
- Update `apps/web/src/ui/coordination/adapters/api-client.ts` to wrap the ORPC client; keep the existing envelope helpers only if ORPC still returns them, otherwise let ORPC handle success/failure typing. Update CLI commands to call the ORPC client instead of `coordinationFetch` (which can be deleted). Ensure `apps/web/vite.config.ts` still proxies `/rawr` and that tests continue to stub `/rawr/coordination` as before.
- Run `bun test apps/server/test/rawr.test.ts` and the CLI UI tests while pointing at the new ORPC entry to prove parity. Verify `apps/server/test/rawr.test.ts` now constructs requests through ORPC to keep coverage.
- Deletion targets: `apps/server/src/coordination.ts`, `apps/web/src/ui/coordination/adapters/api-client.ts`, `apps/cli/src/lib/coordination-api.ts`, and any dedicated CLI dry-run metadata that will be replaced by contract metadata.

### Cleanup

- Remove now-unused helpers (prost: `coordinationFailure` wrappers, envelope parsing utilities) that ORPC handles natively. Delete the buddy tests that were hard-coding the old manual routes and switch them to ORPC router tests. Update docs (`IMPLEMENTATION_PLAN`, `DESIGN_DATA_INTEGRATION_PLAN`, any runbooks) to reference the contract export instead of the handwritten route list.
- Audit `apps/server/test/rawr.test.ts` and `docs/projects/agent-coordination-canvas-v1/ORCHESTRATOR_NOTEBOOK.md` for references to the old files and delete them once the contract is the single source of truth.
- Deletion targets: CLI/web coordination adapter directories, the old test fixtures, and `apps/cli/src/commands/workflow/coord/*` files that now can call `createORPCClient` directly without duplicating helpers.

## Risks

1. The coordination routes carry non-trivial validation + telemetry (`ensureCoordinationStorage`, `createDeskEvent`, Inngest trace links). If the ORPC implementation accidentally omits a branch (e.g., missing `parseRunId` rejection), we will replay invalid runs. Tests must side-by-side compare the new ORPC routers against the existing `coordination.ts` helpers before removing the originals.
2. Mounting RPC handlers inside Elysia requires `parse: 'none'` to avoid double-reading JSON bodies. Forgetting that would cause fetches (especially CLI runs with JSON payloads) to fail with “body already consumed”. The cutover plan should exercise `/rawr/coordination/:id/run` with the new handler and confirm we still forward raw request bodies to `RPCHandler.handle`.
3. Updating the CLI/web clients to use `createORPCClient` also means we need to keep `coordinationFailure`/envelope decoding in sync with the contract’s error shape. Any divergence will show up as confusing CLI errors or UI toasts, so we should keep the old adapter around as a shim until the contract exposes equivalent error metadata.

## File Pointers

1. `apps/server/src/coordination.ts` – the current manual route definitions, payload parsing helpers, runtime adapter, and Inngest queuing behavior that ORPC will subsume.
2. `apps/server/src/rawr.ts` – plugin gating (`/rawr/state`, `/rawr/plugins/web/:dirName`) plus the `/api/inngest` bridge; the ORPC handler needs to coexist with this index of responsibilities.
3. `apps/web/src/ui/coordination/adapters/api-client.ts` + `apps/cli/src/lib/coordination-api.ts` – manual fetch clients that will eventually be replaced by `createORPCClient` wrappers so the UI/CLI keep the same HTTP surface during migration.
4. `docs/projects/agent-coordination-canvas-v1/IMPLEMENTATION_PLAN.md` & `DESIGN_DATA_INTEGRATION_PLAN.md` – canonical endpoint lists and success criteria that the new contract must keep in sync with to preserve operator expectations.
