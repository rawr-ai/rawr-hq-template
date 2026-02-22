# D-005 Hosting & Composition Scratchpad

## Skill Introspection (up-front requirement)
- **orpc:** Contract-first routing, RPC/OpenAPI handler mounting, context injection, and dedupe-aware middleware behavior are the levers we can shape when describing host contracts and runtime mounting. oRPC exposes both the API surface and the workflow trigger perimeter that we must protect.
- **inngest:** Durable functions, step.run semantics, and serve handler wiring give us the expected runtime ingestion shape. Need to keep runtime ingress separate, highlight event security (sig keys) and extended tracing/hook guardrails when we map the host.
- **elysia:** Fetch-based server composition, parse-safe route mounts, plugin ordering, and prefix scoping shape how `/api/workflows` + `/api/inngest` are registered today. Lifecycle hook order matters for context/middleware interplay.
- **bun:** Provides runtime/scripting expectations for the host service (Bun runtime, PORT/BUNIF). Mention dev/prod differences when describing second-order impacts (runbooks, builds) while keeping bundler concerns minimal.
- **typescript:** Architecture-level invariants (contracts, module boundaries, port/api surfaces) strengthen our reasoning around capability-first vs surface-first path layouts and how to reference internal clients.
- **architecture:** Guides the dependency order (spine/boundary/domain) for decision closure. We'll keep D-005's hosting spine first, isolate transition concerns, and frame the final specification as the “target” while quoting current code for reality.
- **pm-methodology:** Emphasizes question-driven framing, priority/increment shaping, and identifying top risks/unknowns. Useful when listing open questions (K) and planning the phases (K) without fragmentation.
- **graphite:** Confirms repo uses `gt` stacks; no Git commands beyond inspection; maintain unambiguous worktree state.
- **git-worktrees:** Reminds me to avoid relative paths and to stay inside this worktree; already within the provided path.

## Key constraints lifted from skill references
- **oRPC:** TypeBox-first contracts, explicit context injection, and parse-safe handler mounts are required; dedupe-heavy middleware must cache markers because built-in dedupe is limited.
- **Inngest:** `/api/inngest` must stay runtime-only, and `extendedTracesMiddleware`/`step.*` semantics demand durable-step guardrails; glue (serve handler) must own client+functions bundle per process.
- **Elysia:** Mounts must use `{ parse: "none" }` when handing off to RPC/OpenAPI/Inngest to avoid body exhaustion; plugin life-cycle order controls middleware context scope.
- **Architecture:** Resolve spine-level decisions before downstream doc updates; host composition and manifest generation form the spine and should never mix with plugin-level semantics.

## D-005 Context Notes
- Packet currently defines `/api/workflows/*` + `/api/inngest` split; D-005 is about whether workflow trigger routes should be mounted as top-level runtime surfaces (host hooking) rather than just coordination procedures under `/rpc` (per question text). Need to resolve if host should expose dedicated `/api/workflows/<capability>` surfaces and register handlers there.
- Need to ensure personal plugin authors can add new capabilities without touching `apps/*`. Hosting design must provide host-level composition that discovers/instantiates surfaces from `plugins/*` and `packages/*` (maybe via manifest). Possibly new helper (capability composer) or using `rawr.hq.ts` manifest.
- Must align with spec invariants: no direct `/api/inngest` by browsers, separate context/middleware per runtime, TypeBox schema ownership, etc.

## Code Reality Anchors (to cite)
- `apps/server/src/rawr.ts`: runtime wiring of Inngest bundle and oRPC registration, existing `registerOrpcRoutes` mount at `/rpc`/`/api/orpc` plus Inngest at `/api/inngest`.
- `apps/server/src/orpc.ts`: implements `hqContract`, queue run operations, shows Inngest-enqueuing from API, context of coordination runtime/inngest client.
- `packages/core/src/orpc/hq-router.ts`: contract root for `coordination` + `state` surfaces.
- `packages/coordination-inngest/src/adapter.ts`: Inngest bundle creation (client + functions) plus serve handler; demonstrates expectation of one runtime-owned bundle per process.
- `rawr.hq.ts`: referenced spec artifact (not present yet); consider recommending creation as host composition manifest.

## Spec References to Keep On-Hand
- `AXIS_07_HOST_HOOKING_COMPOSITION.md`: canonical host policy for splitting oRPC vs Inngest mount plus naming defaults and helper suggestions.
- `AXIS_08_WORKFLOWS_VS_APIS_BOUNDARIES.md`: workflow trigger route policy, contexts, and path semantics; essential for D-005.
- `AXIS_09_DURABLE_ENDPOINTS_VS_DURABLE_FUNCTIONS.md`: ensures no dual path duplicates.
- Example E2E docs (02-04): highlight compositions, `rawrHqManifest`, and host wiring (APIs, workflows, runtime) for replicable structure.
- Decision log: D-005 question, D-006 (workflow contract ownership) may influence final plan.

## Immediate Deliverable Plan
1. Lay out D-005 decision question and current host behavior using code + docs.
2. Decide consumer model (2 vs 3) based on actual surfaces and spec reasoning.
3. Define composition architecture (manifest vs host wires) including helper needs and path strategy.
4. Use Search capability example (package + API plugin + workflow plugin) to ground host surfaces, context, and runtime hooking.
5. Lock down Inngest registration/discovery path and note internal workflow triggering model.
6. List open questions + phased plan for closing D-005 and verifying doc/runbook adjustments.

## Integration status
- `AXIS_07_HOST_HOOKING_COMPOSITION.md`: will articulate `rawr.hq.ts` manifest, `/api/workflows` mount, and workflow context helper.
- `AXIS_08_WORKFLOWS_VS_APIS_BOUNDARIES.md`: will surface the explicit capability-first `/api/workflows/*` path and its separation from `/api/inngest`.
- `DECISIONS.md`: will record D-005 as closed and cite the new doc anchors.
- `SESSION_019c587a_ORPC_INNGEST_WORKFLOWS_POSTURE_SPEC.md` & `ORPC_INGEST_SPEC_PACKET.md`: will mention D-005 so the packet overview aligns with the new host posture.
