**A) Problem reframing**
D-005 asks whether the runtime should expose dedicated workflow trigger routes (`/api/workflows/<capability>/*`) instead of leaving those operations behind generic `/rpc` or `/api/orpc` coordination procedures. Solving it requires a cohesive hosting/mounting/composition architecture that loyally implements the Axis 07/08/09 invariants, keeps `/api/inngest` purely runtime-facing, and honors the non-negotiable constraint that routine plugin capability changes live entirely within `packages/*` and `plugins/*` (no manual edits to `apps/*`). The goal is to turn the current split policy into a repeatable, manifest-driven host topology that also scopes the coordination admin surface, the external API surface, and the durable runtime surface cleanly.

**B) Consumer model decision (2 vs 3)**
We see three distinct consumer groups today:
1. **External callers (third-party APIs + micro-frontends)** — hit `/rpc*`, `/api/orpc*`, and the future `/api/workflows/*` surfaces for immediate operations, workflow triggers, and status queries. `apps/server/src/orpc.ts` currently wires the RPC/OpenAPI surface and hosts the workflow trigger procedures, so it is clearly aimed at external callers.
2. **Internal packages (domain/service logic)** — the package clients in `packages/*/src/client.ts` represent a reusable API for other server-side code to share capability logic without going through HTTP.
3. **Coordination canvas / discovery surfaces** — the `hqContract` in `packages/core/src/orpc/hq-router.ts` plus the coordination operations in `apps/server/src/orpc.ts` (`listWorkflows`, `queueRun`, `getRunStatus`, etc.) serve tooling/operations/host dashboards that manage workflow bundles.
Because each group has different semantics (policy-facing HTTP, in-process logic, orchestration tooling) the clean choice is a **three-consumer model**; collapsing them would blur ownership and defeat D-005’s emphasis on explicit split paths.

**C) Hosting/mounting/composition recommended architecture**
1. **Manifest-driven composition (`rawr.hq.ts`).** For each capability we publish an API surface (`api.contract`, `api.router`) plus a workflow surface (`workflows.triggerContract`, `workflows.triggerRouter`, `workflows.functions`). A helper such as the Axis 07 `composeCapabilities()` aggregator builds a manifest:
   ```ts
   export const rawrHqManifest = composeCapabilities(capabilities, createInngestClient("rawr-hq"));
   ```
   This manifest is generated (or re-generated) whenever `packages/*` or `plugins/*` change so plugin authors never edit `apps/*` directly—only their capability folders.
2. **Host wiring (`apps/server/src/rawr.ts` + new `workflows` helper).** The host keeps the existing `registerOrpcRoutes(...)` path for `/rpc*` and `/api/orpc*` (see `apps/server/src/orpc.ts`) and adds two new routes:
   - `/api/workflows/*` mounted with `OpenAPIHandler(rawrHqManifest.workflows.router)` and a workflow-specific context produced by `apps/server/src/workflows/context.ts` (`createWorkflowBoundaryContext`, `requirePrincipal`).
   - `/api/inngest` mounted via `createInngestServeHandler(rawrHqManifest.inngest)`; this handler stays runtime-only and can keep signature/trace guardrails.
   The host still creates the `CoordinationRuntimeAdapter` (`apps/server/src/coordination.ts`), builds the Inngest bundle with `createCoordinationInngestFunction`, and caches those references for all handlers.
3. **Context separation.** Workflow routes get a distinct context (principal identity, correlation metadata, runtime helpers, Inngest client) so middleware/policy remains split from Rawr’s `RawrOrpcContext`. This mirrors the Axis 08 snippet and ensures browser clients never bypass `/api/workflows` or call `/api/inngest` directly.
4. **Helper SDK/factory needs.** The manifest/handler wiring is best expressed through explicit abstractions such as `composeCapabilities`, `withInternalClient`, `registerWorkflowRoutes`, and a generator that produces `rawrHqManifest` from plugin metadata. Each helper is non-black-box (see section I) and can live in `packages/core` so documentation (runbooks, lint, AI scripting) can reference it without touching `apps/*`.

Second-order impacts:
- **Runbooks:** Update `docs/process/RUNBOOKS.md` (GAN command surfaces) to document the new manifest generation step plus the `/api/workflows` route and guardrails for plugin authors.
- **Lint/tests:** Ensure `bun test`, Vitest, and any bundler scripts verify the generated `rawr.hq.ts` matches the capability index; add smoke tests hitting `/api/workflows` to catch mis-routed manifests.
- **AI guardrails:** Document the manifest generator and manifest schema in `docs/process/HQ_USAGE.md` and `AGENTS.md` so automated agents know that new capabilities live under `packages/*`/`plugins/*` and should regenerate the manifest rather than editing `apps/*`.

**D) Capability example (Search) end-to-end**
1. **Domain package (`packages/search`).** Exposes `context.ts` (deps such as `searchProvider`, `timelineStore`, etc.), `domain/` invariants, procedures (`routes/query.ts`, `routes/enrich.ts`, `router.ts`), and an internal `client.ts` that the API/workflow plugins share:
   - `queryProcedure` returns immediate results via the search provider.
   - `enqueueEnrichmentProcedure` validates state, writes timeline events, and returns a `runId`.
2. **API plugin (`plugins/api/search`).** Owns `contract.ts` with routes such as `oc.route({ method: "POST", path: "/search/query" })` and corresponding `operations/query.ts` that call `searchClient.query(...)`. The plugin’s router is registered under the manifest’s API surface.
3. **Workflow plugin (`plugins/workflows/search`).** Provides `contract.ts` with `POST /search/enrich` (inputs: `runId`, `scope`) and `operations/trigger-enrichment.ts` that does `context.inngest.send({ name: "search.enrich.requested", data: {...} })`. Its router checks `context.canCallInternal` before invoking the package client. Its `functions/enrich.ts` registers an Inngest function (e.g., `search.enrich`) that uses `step.run` to call the search provider, persists timeline state, and updates run status.
4. **Host paths.** Search lives under `/api/orpc/search/api/*` for immediate queries and `/api/workflows/search/enrich` for durable runs. `/api/inngest` receives the actual Inngest events defined in `plugins/workflows/search/src/functions/enrich.ts` via the aggregated manifest.

**E) Path strategy decision**
- **Surface-first (rejected):** One generic `/api/workflows/*` path that infers capability from payload requires extra routing logic and makes plugin discovery harder; host must still route to capability-specific logic, so splitting by payload adds complexity with no added clarity for plugin owners.
- **Capability-first (chosen):** Each capability owns a namespace (e.g., `/api/workflows/search/enrich`) so the manifest, OpenAPI docs, and generated SDKs align with plugin directories and `packages/search` exports. Autoscan/regeneration can enumerate capabilities and build paths without host edits.
Recommendation: adopt the capability-first strategy, keeping the new router prefixes aligned with capability identifiers (mirroring `plugins/api/<capability>` and `plugins/workflows/<capability>`).

**F) Internal calling + workflow triggering model**
- **Internal clients:** Plugins call `withInternalClient(context, args, run)` (see Axis 07 helper) to grab the capability’s internal client from `context.deps`, ensuring parameter validation stays in the package and avoids HTTP.
- **Workflow trigger operations:** The API workflow router operation uses `queueCoordinationRunWithInngest(...)` (hosted in `apps/server/src/orpc.ts`) to enqueue durable runs, ensure run/timeline storage (`coordination` package), and populate trace links via `createDeskEvent`. Input validation resides in the workflow contract (TypeBox) adjacent to the operation.
- **Inngest registration/discovery:** Every capability contributes `workflows.functions` to `rawrHqManifest`. The host passes `rawrHqManifest.inngest.functions` to `createInngestServeHandler` to register all Inngest durable functions, while the same manifest’s router is wired into `/api/workflows`. The runtime adapter (`createCoordinationRuntimeAdapter`) is reused both by `registerOrpcRoutes` and the workflow context so the same storage/trace helpers stay consistent.

**G) What changes vs what stays the same**
- **Changes:** add `rawr.hq.ts` manifest (generated), new workflow context helper (`apps/server/src/workflows/context.ts`), new workflow route registration in `apps/server/src/rawr.ts`, generator script/runbook updates, manifest-driven Inngest function list, and capability-first URLs.
- **Stays the same:** `/rpc*`+`/api/orpc*` mount via `registerOrpcRoutes()`, `createCoordinationRuntimeAdapter()` and `createCoordinationInngestFunction()` wiring, the `packages/core` contract shape, and the coordination admin surfaces inside `apps/server/src/orpc.ts`.

**H) File structure illustration**
```text
apps/server/src/
  rawr.ts               # runtime composition (existing + new workflow mounts)
  orpc.ts               # RPC/OpenAPI + coordination surfaces
  coordination.ts       # runtime adapter used by every surface
  workflows/
    context.ts          # workflow-specific context + principal helpers
rawr.hq.ts              # generated manifest (or commit in repo) with api/workflow surfaces
packages/core/src/orpc/
  hq-router.ts          # unchanged coordination/state contract
packages/coordination-inngest/src/
  adapter.ts            # Inngest bundle + queue logic
packages/search/src/
  context.ts            # shared deps and procedure context
  domain/               # search invariants (score, filters)
  procedures/
    query.ts
    enqueue-enrichment.ts
  client.ts             # in-process client used by API/workflow plugins
  router.ts
  index.ts              # shared exports
plugins/api/search/src/
  contract.ts           # TypeBox contract for `/search/query`
  operations/
    query.ts
  router.ts
  index.ts
plugins/workflows/search/src/
  contract.ts           # TypeBox contract for `/search/enrich`
  operations/
    trigger-enrichment.ts
  router.ts
  functions/
    enrich.ts           # Inngest function registered via manifest
  index.ts
```

**I) Suggested helper abstractions (non-black-box examples)**
1. **`composeCapabilities()`** (Axis 07) produces `{ api: { contract, router }, workflows: { triggerContract, triggerRouter, functions } }` so the host consumes a single manifest. Example:
   ```ts
   export function composeCapabilities<const T extends readonly Capability[]>(capabilities: T) {
     return {
       api: oc.router(Object.fromEntries(capabilities.map((c) => [c.capabilityId, c.api.contract]))),
       workflows: oc.router(Object.fromEntries(capabilities.map((c) => [c.capabilityId, c.workflows.triggerContract]))),
       inngest: capabilities.flatMap((c) => c.workflows.functions),
     } as const;
   }
   ```
2. **`registerWorkflowRoutes(app, manifest, workflowDeps)`** handles the `OpenAPIHandler` mount, creates per-request workflow context (`createWorkflowBoundaryContext`), and feels like an extension of `registerOrpcRoutes`. It keeps `apps/server/src/rawr.ts` minimal because only the manifest generation script needs updating for new capabilities.
3. **`workflow manifest generator (scripts/make-rawr-hq.ts`)** scans `plugins/api/*` and `plugins/workflows/*`, validates exports (`registerWorkflowSurface`), and emits `rawr.hq.ts`. Plugin authors can recompute the manifest automatically (e.g., `npm run build:rawr-hq`).
4. **`withInternalClient()`** (existing helper) and **workflow context helpers** (`requirePrincipal`, `createWorkflowBoundaryContext`) keep policy explicit. They should live near the workflow router (maybe `apps/server/src/workflows/context.ts`) and be reused by all capability workflow routers.

**J) Open questions**
```yaml
decisions:
  - id: D-005
    status: closed
    resolution: "Host exposes capability-first /api/workflows/* via generated manifest, and plugin authors keep their capability surfaces under `packages/*`/`plugins/*`."
  - id: D-006
    status: open
    question: "Should workflow contracts live in packages (shared artifact) or remain plugin-owned?"
    impact: "Manifest generation + cross-surface SDKs need a canonical emitter source."
  - id: D-008
    status: open
    question: "Where and how to initialize `extendedTracesMiddleware()` for uniform auto instrumentation?"
  - id: D-009
    status: open
    question: "Do we require explicit context-cached dedupe markers for heavy middleware or keep the current SHOULD-level warning?"
  - id: D-010
    status: open
    question: "Should `finished` hook usage be restricted to idempotent tasks?"
```
Areas to lock next: D-006 before we finalize the manifest generator (package vs plugin ownership), and D-008/9/10 in the middleware doc so the host knows where to place observability guardrails.

**K) Concrete phased plan to close D-005 + adjacent decisions**
```yaml
phases:
  - phase: "Prep"
    steps:
      - "Document the manifest schema and helper contracts (packages/core) so new capabilities can be discovered without editing apps/server."
      - "Add a build utility (`scripts/make-rawr-hq.ts`) that reads capability descriptors from `plugins/api/*` and `plugins/workflows/*`, validates them, and writes `rawr.hq.ts`. Include this in the README/runbook.
      - "Draft `apps/server/src/workflows/context.ts` to centralize principal resolution, correlation metadata, and runtime helpers."
  - phase: "Implementation"
    steps:
      - "Update `apps/server/src/rawr.ts` to import the generated manifest, register the new workflow OpenAPI handler, and keep `/api/inngest` wired to `createInngestServeHandler`."
      - "Ensure `registerOrpcRoutes()` is still the sole owner of `/rpc*` and `/api/orpc*` and consumes the same `CoordinationRuntimeAdapter` used by workflows.
      - "Hook the manifest into tests smoke hitting `/api/workflows` to catch regressions, and advertise the new capability-first URLs in API docs.
  - phase: "Cleanup"
    steps:
      - "Update runbooks (`docs/process/RUNBOOKS.md`, `docs/process/GRAPHITE.md`, `docs/process/HQ_USAGE.md`) to reference the manifest generator and new `/api/workflows` route.
      - "Record the new guardrails (AI authors should regenerate `rawr.hq.ts` for capability changes) in `AGENTS.md` or equivalent.
      - "Add verification that `rawr.hq.ts` stays in sync (lint rule or test) and confirm `bundle`/`deploy` scripts run the generator before deployment.
```
Closing D-006 should happen in parallel with the manifest generator (decide where the canonical contract lives so the generator can source it reliably). D-008/9/10 can be addressed once the host wiring is stable by placing middleware/observable guardrails close to `apps/server/src/workflows/context.ts` and documenting them alongside the handler.
