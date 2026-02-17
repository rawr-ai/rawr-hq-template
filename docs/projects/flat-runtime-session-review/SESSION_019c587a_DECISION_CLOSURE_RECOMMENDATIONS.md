**Executive Framing**
Locking the remaining ORPC/Inngest packet decisions now guarantees that the documented split posture hands off to real code without ambiguity, protects caller-facing workflow APIs, and keeps the instrumentation/guardrail surface durable even as we deliver first-party clients. The work remains coherent with the axis-level policy map, the onboarding walkthroughs, and the concrete server/router/adapter code already in place.

**D-005 — Workflow trigger route convergence**
1. **Outcome we want:** Developers and SDK consumers should be able to hit a clearly documented `/api/workflows/*` endpoint for workflow triggers and status polling, with the host ensuring workflow-specific auth/context handling before an event reaches Inngest.
2. **Current gap:** The server today only mounts `/rpc` and `/api/orpc`, so the workflows documented in `E2E_03` and `AXIS_08` live only inside coordination procedures. Consumers have no deterministic route that mirrors the walkthrough, and browser clients have no safe place to send workflow requests.
3. **Why now:** This decision is load-bearing because the entire packet, examples, and first-party client guidance assume `/api/workflows` exists. Without locking it in, docs mislead engineers and the split between workflows and runtime ingress remains hypothetical.
4. **Alternative:** Leave workflow handlers under the existing `/rpc`/`/api/orpc` mounts, keeping the codebase simpler but forcing every caller through coordination procedures and bypassing the policy split.
5. **Recommendation:** Mount a distinct workflow surface via an `OpenAPIHandler` at `/api/workflows/*`, create a boundary context (principal, runtime deps, correlation metadata) just for those requests, and keep `/api/inngest` purely runtime. This matches the narrative in `examples/E2E_03` and `E2E_04`.
6. **Downstream implications:**
   - Developer workflow: Host teams now create or reuse a workflow-specific context module and register the dedicated handler alongside the existing ORPC mounts, keeping eventual host wiring explicit rather than implicit inside `/rpc`.
   - Docs/runbooks/guardrails: Update `AXIS_07` and related docs to describe the workflow mount and boundary context, making policy enforcement tangible.
   - Tests/lints: Add route coverage ensuring `/api/workflows` handler exists and rejects unauthorized calls, and lint rules ensuring browser clients never call `/api/inngest`.
   - Failure mode if wrong: Without the mount, clients will continue hitting `/rpc`, APIs stay undocumented, and micro-frontends have no clear surface, preventing safe SDK generation and violating the split.
7. **Confidence/validation:** High confidence once `rawr.hq.ts` exports `workflows` and the host registers `/api/workflows`; validate by running OpenAPI generation and ensuring `/api/workflows` appears in the spec.

**Technical appendix**
*File-structure changes:* Export `rawrHqManifest.workflows` (new workflow surface) and add a boundary context helper in `apps/server/src/workflows/context.ts`.
*Code snippet (recommended):*
   ```ts
   const workflowHandler = new OpenAPIHandler(rawrHqManifest.workflows.router);
   app.all("/api/workflows/*", async ({ request }) => {
     const context = createWorkflowBoundaryContext(request, workflowDeps);
     const result = await workflowHandler.handle(request, { prefix: "/api/workflows", context });
     return result.matched ? result.response : new Response("not found", { status: 404 });
   }, { parse: "none" });
   ```
*Alternative snippet:* Keep only `/rpc` mounts in `registerOrpcRoutes`, so the workflow trigger routed through `os.coordination.queueRun` never leaves the `/rpc` namespace.
**What Changes**
We keep the existing `/rpc` and `/api/orpc` mounts in place but add a parallel `/api/workflows/*` handler. The host wiring now includes a dedicated workflow context module and handler that mounts alongside the existing RPC/OpenAPI routes, without removing or replacing them.

**What Stays the Same / Out of Scope**
`apps/server/src/orpc.ts` continues to expose `registerOrpcRoutes` for the RPC and `/api/orpc` surfaces. No change occurs to how `/rpc` or `/api/orpc` respond; they remain the coordination entry for existing admin APIs. The new workflow handler complements, rather than replaces, those routes.

**Relevant system shape**
```text
apps/server/src/
  orpc.ts             # existing /rpc and /api/orpc mounts remain untouched
  workflows/context.ts # new boundary context for workflow route
  rawr.ts             # now registers OpenAPIHandler for /api/workflows plus existing mounts
packages/core/src/
  orpc/hq-router.ts   # still composes the RPC/OpenAPI contract
rawr.hq.ts            # exports workflow surface used above
```

**Why This Is Non-Obvious (or Obvious)**
Bumping the existing route surface to include `/api/workflows` still looks like a composition detail, but the decision remains open because the docs and E2E examples already assume a dedicated host entry. The ambiguity is whether to keep workflows tucked inside `/rpc` (simpler) or to expose them explicitly for SDK generation/guardrails. That conflicts with the goal of preventing callers from accidentally hitting runtime ingress, so it needs this explicit lock rather than being treated as a routine refactor.

**D-006 — Canonical ownership of workflow contract artifacts**
1. **Goal:** Producers and consumers of workflow metadata need one agreed-upon file that defines the workflow contract so SDKs, host wiring, and docs all converge on the same TypeBox schemas.
2. **Current situation:** Both the package (e.g., `packages/invoicing/src/workflows/contract.ts` in some docs) and the workflow plugin contain contract definitions, so different readers import from different places and the workflow router is not guaranteed to align with the package-level API.
3. **Why lock now:** This is load-bearing because subsequent decisions—host wiring (D-005), client generation (D-007), and docs—need a canonical contract location; without it, we risk drift and duplicated schema definitions.
4. **Alternative:** Keep the contract inside each `plugins/workflows/<domain>/src/contract.ts`, with packages importing directly from that plugin or duplicating definitions, preserving plugin control but violating the intention that packages be transport-neutral.
5. **Recommendation:** Make the package the authoritative source: define `packages/<domain>/src/workflows/contract.ts`, export it through `@rawr/<domain>/workflows/contract`, and have workflow plugins simply re-export that contract for their routers.
6. **Downstream implications:**
   - Developer workflow: Authors can open the package contract file when they need to understand inputs/outputs; workflow routers just re-export instead of retyping schema metadata.
   - Docs/runbooks: Update `AXIS_01`/`AXIS_02` to point to the package path and explain that schema snapshots, OpenAPI generation, and client tooling all use this file.
   - Tests/lints: Ensure that SDK generation scripts read the package contract rather than plugin-specific files; avoid duplicate exports by linting for `workflow` contract definitions outside the package.
   - Failure mode if wrong: Diverging contracts, confusion over which `TypeBox` schema is authoritative, and fragmented SDK client generation.
7. **Confidence/validation:** High once the package exports the contract and plugins simply re-export; verify by running generation tools and ensuring OpenAPI paths match the package schema definitions.

**Technical appendix**
*File-structure changes:* Add `packages/<domain>/src/workflows/contract.ts` as the canonical contract, export it in `packages/<domain>/src/index.ts`, and re-export from `plugins/workflows/<domain>/src/contract.ts`.
*Code snippet (recommended):*
   ```ts
   // packages/invoicing/src/workflows/contract.ts
   export const invoicingWorkflowContract = oc.router({ ... });

   // plugins/workflows/invoicing/src/contract.ts
   export { invoicingWorkflowContract } from "@rawr/invoicing/workflows/contract";
   ```
*Alternative snippet:* Keep the document-only contract in `plugins/workflows/<domain>/src/contract.ts` and have packages re-export by reaching into the plugin directory, which blurs package boundaries.
**What Changes**
The package now owns the contract file, and workflow plugins re-export it. CI/docs generation tools point at the package path.

**What Stays the Same / Out of Scope**
Workflow plugins still manage their routers, context wiring, and operations; this change does not move operation logic or runtime glue into the package layer.

**Why This Is Non-Obvious (or Obvious)**
On the surface it would be easy to say “just move the contract wherever it lives,” but the conflict comes from balancing plugin-friendly isolation versus transport-neutral package semantics. Both the docs and earlier E2E samples still show plugin-local contracts, so without this decision we risk ongoing duplicated ownership. That makes the choice a real policy fork, not a trivial cleanup.
**D-007 — First-party micro-frontend workflow client strategy**
1. **What we want:** Browsers should trigger workflows and read status through a documented workflow surface (`/api/workflows`), using one shared, contract-typed client so they never have to call `/api/inngest`.
2. **Problem today:** There is no canonical client; teams rebuild fetchers or guess router details, which often leads to calling the runtime ingress directly and breaking the policy in `AXIS_08`.
3. **Why now:** This decision is load-bearing because `E2E_03` already presents a micro-frontend path, so we must lock in how browsers enter the system before the docs can be trusted.
4. **Alternative:** Keep throwing the choice to every micro-frontend, making it easy to slip into `/api/inngest` or to build custom, untyped clients.
5. **Recommendation:** Publish a dedicated browser client (e.g., `plugins/web/<capability>/src/client.ts`) that reuses the package-contained workflow contract and wires `createORPCClient` + `OpenAPILink` to `/api/workflows`, correctly handling credentials once at the shared layer.
6. **Downstream implications:**
   - Developer workflow: UI teams import this shared client; they no longer need to re-encode TypeBox schemas or decide whether to send credentials.
   - Docs/runbooks: Explicitly call out the shared client as the only browser-safe integration and keep `/api/inngest` off-limits, including guidance in `AXIS_08`.
   - Tests/lints: Ensure web bundles do not import server-only clients and verify the shared client’s generated spec matches the workflow contract.
   - Failure mode if wrong: Developers might attack `/api/inngest`, bypass auth, and create inconsistent telemetry/auth contexts.
7. **Validation:** High confidence once the shared client compiles and its bundle hits `/api/workflows`; verify during the web plugin build and by inspecting bundle requests.

**Technical appendix**
*File-structure changes:* Add the web client module (`plugins/web/<capability>/src/client.ts`) and have it import the package workflow contract.
*Code snippet (recommended):*
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
*Alternative snapshot:* Browser code issuing raw `fetch("/api/inngest", …)` or constructing its own handlers, which exposes runtime ingress to unsafe consumers.
**What Changes**
We add the shared web client module and make it the sanctioned way for browsers to talk to `/api/workflows`.

**What Stays the Same / Out of Scope**
Server-only internal clients remain server-side; browsers still cannot call `/api/inngest`. The new client simply centralizes what they should already be doing.

**Why This Is Non-Obvious (or Obvious)**
Providing a browser client might seem like a usability tweak, but it stays a decision because we're simultaneously enforcing that browsers never hit `/api/inngest`. The ambiguity is how to balance making workflow calls easy without exposing runtime ingress—without this policy we risk inconsistent ad-hoc clients. That tradeoff keeps it from being a mere implementation detail.

**D-008 — Extended traces middleware initialization order**
1. **Objective:** Ensure telemetry captures every workflow run by registering `extendedTracesMiddleware` before any durable functions or steps exist.
2. **Current shortfall:** The entry composition code currently instantiates Inngest without any mention of the middleware, meaning instrumentation may silently fail if a host adds it later or not at all.
3. **Why now:** Observability is load-bearing for durable workflows; this middleware must initialize before functions to record trace links, so we cannot leave the init order unspecified.
4. **Alternative:** Do nothing; hosts continue to instantiate Inngest without middleware or add it after functions register, leaving traces inconsistent.
5. **Recommendation:** Update the composition manifest (`rawr.hq.ts`) to import `extendedTracesMiddleware` and pass it into `new Inngest({ middleware: [extendedTracesMiddleware()] })` before calling `createCoordinationInngestFunction`. This ensures the middleware is in place for every function.
6. **Downstream implications:**
   - Developer workflow: Composition authors must remember to include the middleware in the bundle initialization and keep it near other runtime wiring.
   - Docs/runbooks: `AXIS_05`/`AXIS_06` should describe the required bootstrap order for `extendedTracesMiddleware`.
   - Tests/lints: Add checks that the Inngest client is created with the middleware array; automated tests should confirm pipeline metadata in run traces.
   - Failure mode if wrong: Missing telemetry leads to gaps in dashboard traces and harder debugging of failed runs.
7. **Validation:** Moderate confidence once the middleware is registered; validate by checking that generated run traces include the expected correlation data in dev environments.

**Technical appendix**
*File-structure changes:* `rawr.hq.ts` now imports `extendedTracesMiddleware` and supplies it via the `middleware` option before durable functions are created.
*Code snippet (recommended):*
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
*Alternative snapshot:* Ingest client created without middleware (no `middleware` array), leaving trace pipelines detached.
**What Changes**
`rawr.hq.ts` now includes `extendedTracesMiddleware` in the Inngest client creation path so every function starts with instrumentation attached.

**What Stays the Same / Out of Scope**
Existing durable functions, runtime adapters, and `createCoordinationInngestFunction` logic stay untouched; only the client instantiation gains the middleware reference.

**Why This Is Non-Obvious (or Obvious)**
Adding middleware to Inngest might read as a straightforward instrumentation tweak, but the decision remains because the docs already expect every host to produce complete traces. The conflict is whether to keep the current minimal bootstrap (simpler) or to demand the middleware early (needed for spec compliance). That tradeoff—observability vs. adding another required dependency—keeps it on the decision list.
**D-009 — Required dedupe marker policy for heavy oRPC middleware**
1. **What we seek:** Expensive or stateful middleware should only run once per logical request, even when internal clients trigger the same procedures again.
2. **Existing issue:** ORPC built-in dedupe works only for middleware chains that share ordering and exist in the leading subset; once internal clients or other packages re-use middleware, it executes again, duplicating checks (see `packages/invoicing/src/middleware.ts` in `E2E_04`).
3. **Why now:** This is load-bearing for middleware correctness; without a firm rule we risk inconsistent authorization or expensive validations repeating under nested calls.
4. **Alternative:** Treat dedupe as optional and rely solely on router ordering, which is fragile when middleware is reused by internal clients.
5. **Recommendation:** Require middleware authors to mutate a `context.middlewareState` flag (e.g., `roleChecked`) so they can bail out on re-entry, matching the pattern seen in `examples/E2E_04`.
6. **Downstream implications:**
   - Developer workflow: Middleware modules add light state (e.g., `middlewareState.roleChecked`) and short-circuit themselves when they detect prior runs.
   - Docs/runbooks: `AXIS_06` should document the pattern, showing how to set/respect dedupe markers to avoid duplicates.
   - Tests/lints: Validate that middleware modules write to `middlewareState` before running heavy logic; include scenario tests where the same middleware is invoked twice via internal clients.
   - Failure mode if wrong: Repeated middleware runs slow down requests and can produce inconsistent state or authorization results, breaking the guardrails.
7. **Validation:** Medium confidence; ensure there are lint rules catching naïve re-use and verify the behavior through integration tests.

**Technical appendix**
*File-structure changes:* Middleware modules like `packages/<domain>/src/middleware.ts` now manage `context.middlewareState` entries.
*Code snippet (recommended):*
   ```ts
   if (context.middlewareState?.roleChecked) return next();
   // expensive role/authorization check
   return next({
     context: {
       middlewareState: {
         ...context.middlewareState,
         roleChecked: true,
       },
     },
   });
   ```
*Alternative snapshot:* Middleware without any state, so nested or internal calls run the check every time, defeating dedupe intentions.
**What Changes**
Middleware state tracking for dedupe now lives in each package middleware module, and doc guidance spells out how to set/read `middlewareState`.

**What Stays the Same / Out of Scope**
ORPC router definitions, contexts, and operations do not change; we only add context caching for middleware performance. The rule doesn’t force router-level dedupe rewrites.

**Why This Is Non-Obvious (or Obvious)**
Requiring middleware state markers seems like an internal optimization, but it remains a decision because the existing policy only warns about dedupe limits without a binding rule. The ambiguity is whether to trust router ordering (simpler) or to obligate authors to set context flags for every heavy check. That tradeoff between trusting the framework and ensuring consistent behavior makes it a policy-level decision.

**D-010 — Inngest finished-hook side-effect guardrail**
1. **What we aim for:** Engineers understand that Inngest’s `finished` hook re-runs on retries, so only idempotent logging/metrics belong there while critical state changes live inside `step.run` or the handler.
2. **The gap:** Today the packet does not crisply spell out this limitation, so developers may treat `finished` like a once-per-run finally block and accidentally duplicate writes when retries happen.
3. **Why it matters:** As workflow middleware scales (`AXIS_05`/`AXIS_06`), non-idempotent work in `finished` becomes a serious reliability risk, so this guardrail is load-bearing for durable execution correctness.
4. **Alternative:** Leave the docs silent and let teams treat `finished` however they please, accepting duplicate side effects on retries.
5. **Recommendation:** Update `AXIS_05`/`AXIS_06` to reference `packages/coordination-inngest/src/adapter.ts`, explain that `finished` can rerun, and keep stateful logic inside `step.run` while using `finished` solely for safe telemetry.
6. **Downstream implications:**
   - Developer workflow: Durable function authors migrate any state mutations out of `finished` and into `step.run`, while `finished` tracks logs/metrics only.
   - Docs/runbooks: Document the new guardrail with code snippets showing safe vs risky patterns.
   - Tests/lints: Add retries tests to ensure `finished` does not cause duplicate state changes and lint rules discouraging writes there.
   - Failure mode if wrong: Duplicate timeline events, incorrect run statuses, and confusion when retries trigger `finished` multiple times.
7. **Validation:** Medium confidence; verify with retrying workflows and ensure `finished` hooks only log/observe without modifying shared state.

**Technical appendix**
*File-structure note:* Extend `AXIS_05`/`AXIS_06` docs with guardrail language referencing `packages/coordination-inngest/src/adapter.ts`.
*Code memo:*
   ```ts
   inngest.createFunction(..., async ({ step }) => {
     await step.run("coordination/run-start", ...);
     // critical updates go here
   }).finished?.(() => {
     // safe logging only
   });
   ```
*Alternative snapshot:* `finished` hooks that update runtime stores, replaying duplicates when retries occur.
**What Changes**
`AXIS_05`/`AXIS_06` explicitly block state mutations in `finished`, directing teams to `step.run` for side effects and to use `finished` for logging only.

**What Stays the Same / Out of Scope**
The Inngest lifecycle (step semantics, retries, timeline updates) remains unchanged; the policy addition simply documents existing runtime behavior and safe usage.

**Why This Is Non-Obvious (or Obvious)**
The limitation on `finished` is subtle because Inngest’s docs already mention retries, yet the packet still lists it as an open decision because teams currently treat `finished` as a finalizer and there hasn’t been a clear policy correlating retries with side-effect safety. The real conflict is between the convenience of putting finish logic there versus the need to keep state changes idempotent; that tradeoff keeps it as a policy choice.

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
