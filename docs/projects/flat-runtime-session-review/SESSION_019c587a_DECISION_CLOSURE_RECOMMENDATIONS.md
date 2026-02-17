**Executive Framing**
Locking the remaining ORPC/Inngest packet decisions now guarantees that the documented split posture hands off to real code without ambiguity, protects caller-facing workflow APIs, and keeps the instrumentation/guardrail surface durable even as we deliver first-party clients. The work remains coherent with the axis-level policy map, the onboarding walkthroughs, and the concrete server/router/adapter code already in place.

**D-005 — Workflow trigger route convergence**
- Why it matters: `AXIS_08` and the walkthroughs describe `/api/workflows/*` as the canonical caller-facing surface; yet `apps/server/src/orpc.ts` still only mounts `/rpc` and `/api/orpc`, so caller integrations, status polling, and the policy docs are out of sync. Without locking this, future code will drift from the documented posture and prevent safe first-party workflow clients.
- Recommended direction: Add a dedicated workflow router (implemented exactly as shown in `examples/E2E_03`/`E2E_04`) and mount it through the host instead of hiding it under `/rpc`. The host should instantiate `OpenAPIHandler` over the workflow surface (just like the existing `/api/orpc` handler) and register `app.all("/api/workflows/*", …)` before or alongside the current `/api/orpc` and `/api/inngest` routes.
- Alternative considered: Continue enqueuing workflows via the coordination procedures under `/rpc`/`/api/orpc` (current reality in `apps/server/src/orpc.ts`). That keeps a single router but leaves the policy docs and micro-frontend examples unimplementable.
- Side-by-side illustration:
  - Recommended: host route (per `E2E_04` section 5.5) using `workflowHandler.handle(request, { prefix: "/api/workflows", context })` plus explicit boundary context creation.
  - Alternative: keep only the `/rpc`/`/api/orpc` mounts in `registerOrpcRoutes`, so callers must hit coordination procedures rather than the dedicated workflow surface.
- Blocker classification: must_lock_now (policy docs already assume the route exists; leaving it open threatens parity between docs and runtime).
- Rationale: The micro-frontend and API guides depend on a `/api/workflows` mount, and the host composition story (`AXIS_07`) needs to spell it out before any client or integration code ships.
- Risk if wrong: callers keep hitting `/rpc`, never benefit from workflow-specific auth/context wiring, and documentation/SDK generation remain unstable.
- Guardrail impact: requires runbook/docs updates (AXIS_07, `rawr.hq.ts` guidance), new tests/lints ensuring `/api/workflows` exists, and informs AI authoring that workflow routes are a published surface.

**Implementation illustration (Recommended)**
1. **File structure impact**: Extend `rawr.hq.ts` to export the workflow surface (`rawrHqManifest.workflows`), add `apps/server/src/workflows/context.ts` (per `examples/E2E_03`), and in `apps/server/src/rawr.ts` register a `workflowHandler` for `/api/workflows/*` before the existing `/api/orpc` and `/api/inngest` mounts.
2. **Code snippet**:
   ```ts
   // apps/server/src/rawr.ts
   const workflowHandler = new OpenAPIHandler(rawrHqManifest.workflows.router);
   app.all("/api/workflows/*", async ({ request }) => {
     const context = createWorkflowBoundaryContext(request, workflowDeps);
     const result = await workflowHandler.handle(request, { prefix: "/api/workflows", context });
     return result.matched ? result.response : new Response("not found", { status: 404 });
   }, { parse: "none" });
   ```
3. **Operational picture**: Workflow calls now hit a distinct host handler with explicit context creation (principal + runtime deps), preserving the split context envelopes described in `AXIS_04` and matching the `<workflow>` router shown in `examples/E2E_03`.
4. **Tradeoff**: Adds host wiring but delivers the public `/api/workflows` surface that SDKs/users rely on; the alternative keeps only `/rpc` mounts, forcing all consumers through coordination procedures and breaking the documented split.

**Alternative illustration**
1. **File structure**: No new workflow handler; `apps/server/src/orpc.ts` remains the only host integration point.
2. **Code-level diff**: Callers continue to reach workflow logic through `os.coordination.queueRun` routes on `/rpc`, with no `/api/workflows` mapping.
3. **Tradeoff**: Simpler host but misaligned with documentation and micro-frontend requirements, leaving the policy narrative aspirational rather than implementable.

**D-006 — Canonical ownership of workflow contract artifacts**
- Why it matters: Having two copies of the workflow contract (package-owned vs plugin-owned) makes `AXIS_01`, `AXIS_08`, and the micro-frontend walkthrough lose their single source of truth. A canonical location also determines how internal clients, host composites, and SDK generators import the shapes.
- Recommended direction: Treat packages as the canonical home: e.g., `packages/<domain>/src/workflows/contract.ts` (see `E2E_03` section 4.2), and let both API/workflow plugins re-export or re-use that contract. This keeps domain/package exports transport-neutral while letting the plugin layer own only context and router wiring.
- Alternative considered: Keep the contract inside `plugins/workflows/<domain>/src/contract.ts` and let packages re-export if needed. That duplicates schemas, complicates internal clients, and raises drift risk.
- Side-by-side illustration:
  - Recommended: shared package file `packages/invoicing/src/workflows/contract.ts` is the canonical contract and is re-exported by `plugins/workflows/invoicing/src/contract.ts` for `AXIS_08` routers.
  - Alternative: plugin-local contract file is the only source, forcing packages or other plugins to import that plugin directly.
- Blocker classification: must_lock_now (everything that follows—client generation, host composition, docs—needs a single authoritative contract before we can lock other decisions).
- Rationale: Without this lock, we cannot reliably promise where to find schemas for SDKs, internal clients, or context propagation.
- Risk if wrong: inconsistent payloads, duplicated docs, and talisman for cross-package imports.
- Guardrail impact: informs `AXIS_01/02` updates, ensures doc narratives point to the package asset, and keeps AI/SDK tooling targeting the same file.

**Implementation illustration (Recommended)**
1. **File structure impact**: Create `packages/<domain>/src/workflows/contract.ts`, export it via `@rawr/<domain>/workflows/contract`, and update `plugins/workflows/<domain>/src/contract.ts` to re-export that path so workflows, clients, and docs all reference the same source.
2. **Code snippet**:
   ```ts
   // packages/invoicing/src/workflows/contract.ts
   export const invoicingWorkflowContract = oc.router({ ... });

   // plugins/workflows/invoicing/src/contract.ts
   export { invoicingWorkflowContract } from "@rawr/invoicing/workflows/contract";
   ```
3. **Operational picture**: OpenAPI generation at the host now consumes the package-level router, ensuring tags, paths, and schemas stay in sync.
4. **Tradeoff**: Adds a package-level file but eliminates schema duplication; the plugin stays focused on context/router wiring.

**Alternative illustration**
1. **File structure**: Contract stays in `plugins/workflows/<domain>/src/contract.ts`; packages import it via the plugin, undermining package transport neutrality.
2. **Code diff**: `packages/<domain>` might `export * from "../../plugins/workflows/<domain>/src/contract.ts";`.
3. **Tradeoff**: Keeps plugin autonomy yet fragments schema ownership and complicates SDK generation.

**D-007 — First-party micro-frontend workflow client strategy**
- Why it matters: The packet already forbids browser calls to `/api/inngest` (`AXIS_08` point 8), yet there is no canonical pattern for shipping typed clients that hit `/api/workflows`. Without that lock, front-end teams will reinvent clients, may accidentally call the runtime ingress, and documentation will remain aspirational.
- Recommended direction: Standardize a browser-safe workflow client exported from a package/plugin that wraps the workflow contract (see `E2E_03` sections 4.4 and 4.6). Generate or hand-write a typed client via `createORPCClient` + `OpenAPILink` pointing at `/api/workflows`, publish it alongside the domain package (or in an explicitly shared UI client package), and document that browsers must never consume `/api/inngest` and must send credentials through the workflow surface.
- Alternative considered: Leave the choice to each micro-frontend, which risks exposing `/api/inngest`, inconsistent auth, and duplicate schema handling.
- Side-by-side illustration:
  - Recommended: `plugins/web/invoicing-console/src/client.ts` uses the workflow contract and `OpenAPILink` to call `/api/workflows`, reusing `packages/invoicing/src/browser.ts` helpers.
  - Alternative: Browser components directly fetch `/api/inngest` or build custom clients from the host router without the contract-based typing.
- Blocker classification: must_lock_now (this is security-critical and directly tied to the unresolved D-005 host integration; we cannot finalize docs without it).
- Rationale: Without this lock, we cannot safely publish SDK guidance or guarantee the micro-frontend architecture described in `E2E_03`.
- Risk if wrong: accidental runtime ingress exposure, broken auth context, and consumer confusion.
- Guardrail impact: need lint/runbook updates banning `/api/inngest` from browser code, tests verifying clients reuse the workflow contract, and docs describing the generated client delivery path.

**Implementation illustration (Recommended)**
1. **File structure impact**: Add `plugins/web/<capability>/src/client.ts` (e.g., `plugins/web/invoicing-console/src/client.ts`) and leverage `packages/<domain>/src/workflows/contract.ts`. Browser entry points import this client and `packages/<domain>/src/browser.ts` for UI helpers.
2. **Code snippet**:
   ```ts
   export function createWorkflowClient(baseUrl: string) {
     return createORPCClient(
       new OpenAPILink({
         url: `${baseUrl.replace(/\\/$/, "")}/api/workflows`,
         fetch: (request, init) => fetch(request, { ...init, credentials: "include" }),
       }),
     );
   }
   ```
3. **Operational picture**: Micro-frontends call the workflow surface via a typed client that reuses the contract and ensures credentials travel through `/api/workflows`, not `/api/inngest`.
4. **Tradeoff**: Adds one browser artifact but enforces security and typing; the alternative risks bypassing boundary policy.

**Alternative illustration**
1. **File structure**: Browser code contains ad-hoc `fetch("/api/inngest", ...)` calls or creates custom `OpenAPIHandler` wrappers without the canonical contract.
2. **Code diff**: UI modules directly invoke runtime ingress or build untyped route clients.
3. **Tradeoff**: Minimal packaging but exposes sensitive ingress, duplicates schema handling, and breaks the documented separation.

**D-008 — Extended traces middleware initialization order**
- Why it matters: `E2E_04` flagged that Inngest’s `extendedTracesMiddleware` must initialize early to capture instrumentation; without an explicit bootstrap rule, hosts may register the middleware after composition, so tracing/middle-tier dashboards lose data.
- Recommended direction: Require the host to initialize `extendedTracesMiddleware()` at the top level (e.g., `rawr.hq.ts` or the entry module) before creating the runtime bundle. The recommendation should point to the Inngest docs and instruct teams to pass the middleware into `new Inngest({ middleware: [extendedTracesMiddleware(), ...] })` before any functions are created.
- Alternative considered: Leave initialization order unspecified (current state), which means instrumentation works unpredictably and is difficult to debug.
- Side-by-side illustration:
  - Recommended: `rawr.hq.ts` imports `extendedTracesMiddleware` and runs it before `createCoordinationInngestFunction`, ensuring telemetry is attached to every function (as implied in `E2E_04` open question 1).
  - Alternative: No import/order guidance; host calls `new Inngest` without the middleware, or adds it later, so the trace hooks never register.
- Blocker classification: lock_soon_non_blocking (important for observability but not currently breaking functionality).
- Rationale: Locking now prevents future implementations from omitting the middleware and makes dev experience consistent.
- Risk if wrong: telemetry gaps, missing timeline data, and harder debugging of durable runs.
- Guardrail impact: runbooks (`AXIS_05`/`AXIS_06`) must mention the bootstrap order, tests verifying middleware array, and AI authoring can recommend the explicit snippet.

**Implementation illustration (Recommended)**
1. **File structure impact**: Modify `rawr.hq.ts` (composition manifest) to import `extendedTracesMiddleware`, include it in `new Inngest({ middleware: [extendedTracesMiddleware()] })`, and ensure `createCoordinationInngestFunction` uses this client before any functions register.
2. **Code snippet**:
   ```ts
   import { extendedTracesMiddleware } from "@rawr/coordination-observability";

   const inngest = new Inngest({
     id: "rawr-hq",
     middleware: [extendedTracesMiddleware()],
   });
   const inngestBundle = createCoordinationInngestFunction({
     runtime,
     client: inngest,
   });
   ```
3. **Operational picture**: Middleware registers before any durable function, so trace pipelines capture the run trace data shown in `examples/E2E_04` open question 1.
4. **Tradeoff**: Slightly more explicit bootstrap but consistent telemetry from day one.

**Alternative illustration**
1. **File structure**: No change; middleware is either omitted or added after creating functions.
2. **Code diff**: `new Inngest` call lacks `middleware: [extendedTracesMiddleware()]`, so instrumentation never attaches.
3. **Tradeoff**: Simpler bootstrap but results in missing trace links and harder observability.

**D-009 — Required dedupe marker policy for heavy oRPC middleware**
- Why it matters: `AXIS_06` already warns that built-in oRPC dedupe only works for leading-subset chains; repeated middleware (as shown in `E2E_04` `packages/invoicing/src/middleware.ts`) relies on manual context flags. A packet-level lock clarifies whether context-based markers are mandatory or optional.
- Recommended direction: Require heavy middleware to gate via a context flag (e.g., `middlewareState.roleChecked`) whenever it is expensive or must not re-run in nested internal calls. Document this requirement in `AXIS_06` so every package or plugin replicates the pattern seen in `examples/E2E_04`.
- Alternative considered: Treat dedupe as a hint (`SHOULD`) leaving implementations to trust the built-in pipeline; this invites repeated or conflicting policy checks.
- Side-by-side illustration:
  - Recommended: manual flag in `packages/invoicing/src/middleware.ts` before running the ORPC handler, matching the dedupe contract from `AXIS_06`.
  - Alternative: rely solely on router-level dedupe ordering within ORPC (no context flag), which fails once internal clients call the same middleware a second time.
- Blocker classification: lock_soon_non_blocking (not urgent but essential for consistent middleware behavior across packages).
- Rationale: Establishing a rule now prevents future developers from assuming built-in dedupe suffices.
- Risk if wrong: duplicate checks, inconsistent runtime state mutations, or unexpected authorization errors on nested calls.
- Guardrail impact: updates to `AXIS_06`, runbook notes for middleware authors, and tests/lints that ensure middleware sets markers before returning.

**Implementation illustration (Recommended)**
1. **File structure impact**: Ensure middleware modules (e.g., `packages/invoicing/src/middleware.ts`) use `context.middlewareState` to store dedupe markers and document the pattern in `AXIS_06`.
2. **Code snippet**:
   ```ts
   if (context.middlewareState?.roleChecked) return next();
   // expensive role check
   return next({
     context: {
       middlewareState: {
         ...context.middlewareState,
         roleChecked: true,
       },
     },
   });
   ```
3. **Operational picture**: Middleware runs once per request even when internal clients trigger the same procedure later, satisfying the dedupe contract and reducing redundant work.
4. **Tradeoff**: Minor bookkeeping but deterministic behavior; relying on router ordering alone breaks once middleware is reused internally.

**Alternative illustration**
1. **File structure**: Middleware lacks state, so each invocation (including nested internal calls) runs the role check again.
2. **Code diff**: Simple middleware without `middlewareState` updates.
3. **Tradeoff**: Minimal code but duplicate work and more frequent side effects; it also contradicts the caution in `AXIS_06`.

**D-010 — Inngest finished-hook side-effect guardrail**
- Why it matters: `E2E_04` notes `finished` is not guaranteed exactly once (`AXIS_06` + Inngest docs). Without a packet across the stack, teams might place non-idempotent work there, leading to double side effects.
- Recommended direction: Explicitly document that `finished` may run multiple times and should be reserved for idempotent observation (e.g., logging) or async cleanup that can safely re-run. Encourage teams to keep critical work inside `step.run` or `createFunction` handlers.
- Alternative considered: leave no guidance, letting teams assume `finished` mirrors `finally` semantics, increasing risk.
- Side-by-side illustration:
  - Recommended: `AXIS_06`/`AXIS_05` runbooks describing guardrail and instructing engineers to keep mutations out of `finished`.
  - Alternative: codebase uses `finished` to mutate external state, which may execute twice on retries.
- Blocker classification: lock_soon_non_blocking (important for reliability but not yet broken).
- Rationale: Documenting the limitation now prevents incorrect assumptions as more workflows adopt Inngest middleware hooks.
- Risk if wrong: double writes, duplicate notifications, and hard-to-debug workflow traces.
- Guardrail impact: runbooks and docs about Inngest middleware (`AXIS_05`/`AXIS_06`), tests covering idempotence, and AI/agent guidance cautioning about `finished` usage.

**Implementation illustration (Recommended)**
1. **File structure impact**: Update `AXIS_05`/`AXIS_06` docs to cite `packages/coordination-inngest/src/adapter.ts`, highlight `step.run` usage, and call out that `finished` (per Inngest docs) may rerun; reserve it for logging/metrics only.
2. **Code memo**:
   ```ts
   inngest.createFunction(..., async ({ step }) => {
     await step.run("coordination/run-start", ...);
     // avoid writing runtime state here; use step.run
   }).finished?.(() => {
     // idempotent logging only
   });
   ```
3. **Operational picture**: Teams keep critical writes (status updates, database mutations) inside `step.run` or handler body, while `finished` stays for safe telemetry, aligning with Inngest sentinel guidelines.
4. **Tradeoff**: Documentation effort but prevents duplicates; leaving no guard invites developers to mutate state in `finished`.

**Alternative illustration**
1. **File structure**: No doc update; `finished` is used for runtime state writes across functions.
2. **Code diff**: `finished` hooks mutate `runtime` or update drawers; on retries they run again due to Inngest guarantees.
3. **Tradeoff**: Cleaner-looking code yet makes observability/retries unreliable because side effects may happen multiple times.

**Proposed Lock Order**
```yaml
lock_order:
  - decision: D-006
    reason: establish where the canonical contract lives before anything else imports or extends it.
  - decision: D-005
    reason: host wiring depends on having a contract surface to mount.
  - decision: D-007
    reason: client generation relies on both the contract location and the workflow route surface.
  - decision: D-009
    reason: dedupe policy can be specified once the contract/context model is locked.
  - decision: D-008
    reason: tracing wiring can follow once the Inngest host structure is stable.
  - decision: D-010
    reason: middleware guardrails should be detailed after the runtime surface is defined.
```

**Minimal Policy/Doc Changes Post-Lock**
- Update `AXIS_07_HOST_HOOKING_COMPOSITION.md` to include the `/api/workflows/*` mount snippet and the new host context creation story (refer to `apps/server/src/rawr.ts` and `examples/E2E_03`/`E2E_04`).
- Revise `AXIS_08_WORKFLOWS_VS_APIS_BOUNDARIES.md` to point to the package-owned workflow contract location and to capture the new `/api/workflows` wiring plus client guidance.
- Extend `AXIS_01_EXTERNAL_CLIENT_GENERATION.md`/`AXIS_02_INTERNAL_CLIENTS_INTERNAL_CALLING.md` with the canonical browser client packaging guidance and the prohibition of `/api/inngest` from browsers/micro-frontends.
- Clarify `AXIS_06_MIDDLEWARE_CROSS_CUTTING_CONCERNS.md` and `AXIS_05_ERRORS_LOGGING_OBSERVABILITY.md` with dedupe expectations and the `finished`-hook caveat, tying them back to the `packages/invoicing` middleware/step examples.
- Add a short runbook note (under `AXIS_05` or `RUNBOOKS.md`) describing the required `extendedTracesMiddleware` initialization order so instrumentation remains reliable.

**User Decision Needed**
- Decide where and how the canonical workflow client artifacts should be published: (1) bundle them in each capability package (e.g., via `packages/<domain>/src/browser.ts` re-exporting generated clients), (2) surface them through dedicated web/plugin packages, or (3) rely on secondary SDK generators that point at `/api/workflows`. The right choice determines the docs, packaging scripts, and future client tooling.
