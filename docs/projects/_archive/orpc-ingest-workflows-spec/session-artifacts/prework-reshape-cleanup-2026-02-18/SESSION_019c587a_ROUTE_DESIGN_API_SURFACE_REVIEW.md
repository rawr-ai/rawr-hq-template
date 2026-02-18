# SESSION_019c587a Route Design + API Surface Review

## 1) Relevant skills selected and why
1. `orpc`: evaluate dual transport design (`RPCHandler`/`OpenAPIHandler`, `RPCLink`/`OpenAPILink`) and route-surface ownership.
2. `inngest`: evaluate ingress boundary semantics and runtime-only posture for `/api/inngest`.
3. `architecture`: keep analysis constrained to posture fit and correction level, not a full redesign.
4. `deep-search`: systematically reconcile canonical packet docs with current host/router code reality.
5. `rawr-hq-orientation`: keep recommendations aligned with template-level routing/process conventions.

Scratchpad traceability:
- Working findings and contradictions were developed in `SESSION_019c587a_AGENT_ROUTE_DESIGN_REVIEW_SCRATCHPAD.md` and carried into sections 3, 5, 6, 7, and 8 of this review.

## 2) Concrete constraints map

| Constraint | Canonical anchor | Design implication |
| --- | --- | --- |
| Split posture is locked | `ORPC_INGEST_SPEC_PACKET.md`, `AXIS_03_SPLIT_VS_COLLAPSE.md` | API boundary and durable execution must remain separate route/control planes. |
| Caller-facing workflow routes are canonical on `/api/workflows/<capability>/*` | `DECISIONS.md` D-005, `AXIS_08_WORKFLOWS_VS_APIS_BOUNDARIES.md` | Workflow triggers/status should not be flattened into generic coordination routes long-term. |
| Browser/network callers use boundary clients on `/api/orpc/*` + `/api/workflows/<capability>/*` | `DECISIONS.md` D-007, `AXIS_01_EXTERNAL_CLIENT_GENERATION.md` | Public/client docs should steer callers away from runtime ingress and internal call paths. |
| Runtime ingress is `/api/inngest` only | `ORPC_INGEST_SPEC_PACKET.md`, `AXIS_07_HOST_HOOKING_COMPOSITION.md` | Ingress stays runtime-facing and signed; never a browser target surface. |
| Internal server calls default to in-process package clients | `AXIS_02_INTERNAL_CLIENTS_INTERNAL_CALLING.md` | No default local self-HTTP for server-internal reuse. |
| Host mounts must remain explicit | `AXIS_07_HOST_HOOKING_COMPOSITION.md` | Route ownership and context boundary must stay auditable and non-black-box. |
| Workflow/API boundary contracts are plugin-owned | `DECISIONS.md` D-006 | Packages should not own caller-facing workflow trigger/status contracts. |
| Canonical packet is policy lock, rollout can lag | `DECISIONS.md` D-005 closure scope | A current-state transitional runtime can exist, but must be documented as transitional. |
| Follow-up lock: RPC link is first-party/internal only | User follow-up lock (this assignment) | `/rpc` is internal transport surface; do not position as external/public integration channel. |
| Follow-up lock: RPC client is never externally published | User follow-up lock (this assignment) | No external RPC SDK/package distribution. |
| Follow-up lock: OpenAPI client is externally published | User follow-up lock (this assignment) | Third-party/public integrations use OpenAPI-generated clients only. |
| Follow-up lock: in-repo default client is RPC | User follow-up lock (this assignment) | First-party code paths (including MFEs by default) use `RPCLink`, with explicit exception process. |
| Follow-up lock: MFE default is RPC | User follow-up lock (this assignment) | First-party browser MFEs are treated as internal callers by default policy unless explicitly overridden. |

## 3) Current routing model summary

### Canonical packet target-state summary
- Caller-facing:
  - `/api/orpc/*`
  - `/api/workflows/<capability>/*`
- Runtime-only:
  - `/api/inngest`
- Internal server defaults:
  - in-process package clients
- Host composition:
  - explicit mounts
  - manifest-driven workflow trigger router (`rawrHqManifest.workflows.triggerRouter`)

### Follow-up caller-class lock (applied in this review)
1. `first_party_internal_callers`:
   - Includes repo-internal services, CLI, and microfrontends by default.
   - Default transport: `RPCLink` on `/rpc`.
   - SDK publication: internal only (not published externally).
2. `third_party_external_callers`:
   - Transport: OpenAPI client on `/api/orpc/*` and workflow OpenAPI surfaces.
   - SDK publication: OpenAPI-generated clients only.
3. `runtime_ingress`:
   - Route: `/api/inngest` only.
   - Never a caller-facing API surface.

### Current runtime reality in this worktree
- Implemented host routes:
  - `/rpc`, `/rpc/*` via `RPCHandler` in `apps/server/src/orpc.ts`
  - `/api/orpc`, `/api/orpc/*`, `/api/orpc/openapi.json` via `OpenAPIHandler` in `apps/server/src/orpc.ts`
  - `/api/inngest` in `apps/server/src/rawr.ts`
- Not implemented yet:
  - `/api/workflows/*` host mount
  - workflow boundary context module at `apps/server/src/workflows/context.ts`
  - generated manifest `rawr.hq.ts`
  - plugin workflow/api capability surfaces (`plugins/workflows/*`, `plugins/api/*`)
- Client usage today:
  - Browser app and CLI currently use `RPCLink` against `/rpc`.

### Practical interpretation
- The runtime is currently sufficient for current first-party internal flows and dual transport support.
- It is not yet converged to the packet’s workflow route model (`/api/workflows/*` mount + manifest workflow context).
- With follow-up locks, prior `/rpc` external ambiguity is now resolved in this review: `/rpc` is first-party/internal transport only.

## 4) Evaluation (what is strong)
1. The split between boundary routes and runtime ingress is conceptually strong and consistently stated across packet core docs.
2. `/rpc` and `/api/orpc` are explicitly mounted with parse-safe forwarding and shared context in `apps/server/src/orpc.ts`, which is technically clean.
3. OpenAPI compatibility is first-class (`/api/orpc/openapi.json` and artifact workflow), supporting non-RPC consumers.
4. Inngest ingress is isolated to one route and one runtime-owned bundle, matching durability-harness separation intent.
5. Decision logs (especially D-005/D-006/D-007) provide a clear policy baseline for future convergence.
6. Naming split has coherent intent when interpreted by role:
   - `/rpc` = first-party internal transport
   - `/api/orpc` = external/published OpenAPI-facing boundary transport
   - `/api/workflows/*` = caller-facing workflow boundary surface
   - `/api/inngest` = runtime ingress

## 5) Risks/confusions at scale
1. **Packet text vs follow-up lock mismatch**:
   - Existing packet wording can be read as `/rpc*` usable by external callers.
   - Follow-up lock now sets `/rpc` to first-party/internal only.
   - Until packet docs are updated, teams can still drift.
2. **Target-vs-current route drift visibility gap**:
   - Packet target expects `/api/workflows/<capability>/*`, current runtime does not yet mount it.
   - Without explicit "transitional state" language in one canonical place, teams may implement divergent stopgaps.
3. **Internal vs external separation is now policy-locked but not yet fully encoded in packet docs**:
   - Caller boundaries are clearer after follow-up lock, but doc-level matrices still need normalization.
4. **Ingress naming could be reframed incorrectly**:
   - Renaming runtime ingress to `/api/events` would imply a public domain-event API and blur runtime callback semantics.
5. **Ingress semantics may be misread by new contributors**:
   - `/api/inngest` is runtime-only by policy, but route-level intent is not summarized in one concise caller/route matrix in packet index docs.
6. **Namespace scaling risk if capability routes are not normalized early**:
   - Deferring explicit `/api/workflows/<capability>/*` too long keeps workflow-trigger semantics mixed with coordination/admin APIs.

## 6) Recommended posture (clear keep/change list)

| Recommendation | Type | Rationale |
| --- | --- | --- |
| Keep split route families (`/api/orpc` + `/api/workflows/*` caller-facing, `/api/inngest` runtime-only) as canonical target | `keep as-is` | This is the strongest part of the packet and remains correct long-term. |
| Keep `/api` prefix for workflow triggers (`/api/workflows/*`) rather than `/workflows` | `keep as-is` | Maintains consistent API namespace, policy application, and gateway ergonomics. |
| Keep `/api/orpc` namespace (do not flatten to bare `/api/*` while dual transport exists) | `keep as-is` | Preserves transport-role clarity and avoids collisions/confusion between OpenAPI boundary routes and other `/api/*` families. |
| Keep `/api/inngest` naming (do not rename to `/api/events`) | `keep as-is` | Route is runtime callback ingress, not a generic caller event API; explicit harness naming reduces misuse risk. |
| Lock caller scope by transport: `/rpc` first-party/internal only; `/api/orpc` externally published | `locked-policy` | Resolves ambiguity and aligns client publication boundaries. |
| Lock client publication model: RPC client never external, OpenAPI client external | `locked-policy` | Clarifies distribution and integration boundaries. |
| Lock first-party default client model: in-repo services + MFEs default to RPC unless explicit exception | `locked-policy` | Creates a deterministic default for first-party development and reduces accidental drift. |
| Publish one canonical caller/transport matrix (caller type -> link type -> route family -> auth expectation) | `tighten docs` | Removes current cross-doc contradictions and onboarding confusion. |
| Explicitly mark current runtime as transitional relative to D-005 target route convergence | `tighten docs` | Avoids silent drift while rollout is incomplete. |
| Converge runtime host wiring to mount `/api/workflows/*` via manifest + workflow boundary context | `structural correction` | Required for full packet target-state alignment and long-term capability scaling. |
| Keep ingress path `/api/inngest`, but harden and document runtime-only enforcement requirements (signature validation and caller exclusion expectations) | `tighten docs` | Correct route family stays; enforcement clarity should be explicit. |
| Do **not** add a dedicated `/rpc/workflows` mount by default | `keep as-is` | Existing `/rpc/*` mount can carry workflow RPC procedures under namespaced contract keys; a second RPC mount adds complexity without required semantic gain. |
| Add workflow RPC namespace into the existing HQ RPC contract tree when first-party workflow RPC calling is needed | `structural correction` | Medium-sized composition change; mount-level change is small (none), contract/router composition work is the main effort. |

## 7) Explicit answers to route and follow-up questions

### Why `api/workflows` vs `/workflows`?
`/api/workflows` keeps workflow trigger/status routes in the same API boundary namespace as `/api/orpc` and `/api/inngest`, avoids collisions with non-API app routes, and allows consistent gateway/policy treatment over `/api/*`. Under this packet’s constraints, this is the correct default.

### Why not `api/<capability>/workflows`?
`/api/workflows/<capability>/*` centralizes workflow boundary handling under one surface-class prefix, which is easier to mount, secure, document, and compose from one manifest router. `api/<capability>/workflows` fragments policy/mount ergonomics and weakens "workflow surface as a first-class API plane" clarity.

### Why keep `api/orpc` at all? Could we drop it and use `api/*`?
With dual transport still present (`/rpc` + OpenAPI), keeping `/api/orpc` is the cleaner naming boundary because it explicitly signals "oRPC OpenAPI transport surface." Flattening to broad `/api/*` is possible in theory, but under current constraints it increases route-family ambiguity (`/api/workflows`, `/api/inngest`, and capability routes) and weakens transport-role clarity. Current recommendation: keep `/api/orpc`.

### Does `orpc` in the path force odd naming/base URL/proxying?
No material operational penalty is evident in this repo. Proxying `/api/orpc` is straightforward (already present in app/dev setup), and explicit namespaced routing improves intent clarity. The tradeoff is naming style preference, not architectural friction.

### Should `api/inngest` become `api/events`?
No. `/api/inngest` is runtime ingress for Inngest callbacks, not a general-purpose domain event ingestion API. `/api/events` would likely misframe ownership and invite caller misuse. Keep `/api/inngest` as explicit runtime-harness naming.

### What is `/rpc` for vs `/api/orpc` for? Who should hit which route?
- `/rpc`:
  - RPC transport for first-party/internal clients only.
  - Default for in-repo callers (including MFEs by default policy in this follow-up lock).
  - Not externally published as SDK/package.
- `/api/orpc`:
  - OpenAPI transport and external publication surface.
  - Source for externally published OpenAPI clients (`/api/orpc/openapi.json`).
- `/api/workflows/<capability>/*`:
  - Caller-facing workflow boundary APIs (OpenAPI-style boundary semantics).
- `/api/inngest`:
  - Runtime ingress only.

### Is internal vs external separation explicit enough today?
With follow-up locks, the intended split is explicit in this review, but packet docs still need alignment updates to remove older ambiguous wording.

### Do specs clearly document RPC link vs OpenAPI link usage and client expectations?
Not fully today. Packet docs describe both surfaces and provide examples, but they do not yet encode the newly locked publication/default model end-to-end:
1. RPC link/client = first-party/internal only, default in-repo.
2. OpenAPI link/client = externally published.
3. MFE default = RPC unless explicit exception.

### Capability client vs overall HQ client shape: do two client variants exist?
Yes, under this lock there are two client variants:
1. **Internal RPC variant**:
   - Overall HQ client shape mirrors `hqContract` and capability namespaces.
   - Capability clients are subtrees of the same contract tree.
   - Used by first-party/internal callers via `RPCLink`.
2. **External OpenAPI variant**:
   - Generated from published OpenAPI surfaces (`/api/orpc/openapi.json` and workflow boundary OpenAPI surfaces).
   - Exposed to third-party consumers.
   - RPC client package is not externally published.

### If first-party/internal services call Workflows via RPC link, do we need `/rpc/workflows` mount?
No separate mount is required by design. Existing `/rpc/*` can carry namespaced workflow procedures once those procedures are composed into the HQ RPC contract/router tree. This is a **medium** composition change (contract/router composition), but a **small/no** mount-layer change.

### Optional downstream consumer example (coordination canvas)
Coordination canvas should be treated as one optional internal consumer example, not a primary design driver:
1. Existing internal RPC usage can remain on the same `/rpc/*` transport.
2. Workflow RPC procedures can be added under the same HQ client namespace if needed.
3. No second RPC mount/proxy surface is required for this optional consumer.

### Should Inngest ingress remain `/api/inngest` or move to an internal-only pattern?
Remain `/api/inngest` as canonical runtime ingress. Do not repurpose it as a caller surface. "Internal-only" should be treated as an infrastructure deployment option (network control/proxying), not as a route-structure change. The route semantics are correct; enforcement/documentation should be tightened.

## 8) Actionable doc updates (if any), prioritized high/medium/low

### High
1. Add one canonical caller/transport matrix to packet root docs:
   - target file: `docs/projects/flat-runtime-session-review/orpc-ingest-spec-packet/ORPC_INGEST_SPEC_PACKET.md`
   - include: caller type, allowed routes, default link (`RPCLink` vs `OpenAPILink`), publication model, auth model, forbidden routes.
2. Encode new transport/publication lock explicitly:
   - target files:
     - `docs/projects/flat-runtime-session-review/orpc-ingest-spec-packet/DECISIONS.md`
     - `docs/projects/flat-runtime-session-review/orpc-ingest-spec-packet/AXIS_08_WORKFLOWS_VS_APIS_BOUNDARIES.md`
     - `docs/projects/flat-runtime-session-review/orpc-ingest-spec-packet/AXIS_01_EXTERNAL_CLIENT_GENERATION.md`
   - ensure all three state:
     - RPC first-party/internal only,
     - RPC not externally published,
     - OpenAPI externally published,
     - MFE default RPC unless explicit exception.
3. Add explicit "current runtime delta vs canonical target" note:
   - target file: `docs/projects/flat-runtime-session-review/orpc-ingest-spec-packet/DECISIONS.md` (D-005 companion note) or packet index.

### Medium
1. Add route-family purpose table to host composition axis:
   - target file: `docs/projects/flat-runtime-session-review/orpc-ingest-spec-packet/AXIS_07_HOST_HOOKING_COMPOSITION.md`
   - clarify `/rpc` (first-party/internal) vs `/api/orpc` (external OpenAPI publication) vs `/api/workflows/*` (workflow boundary) vs `/api/inngest` (runtime ingress).
2. Add ingress enforcement expectations in docs:
   - target files:
     - `docs/projects/flat-runtime-session-review/orpc-ingest-spec-packet/AXIS_08_WORKFLOWS_VS_APIS_BOUNDARIES.md`
     - `docs/projects/flat-runtime-session-review/orpc-ingest-spec-packet/examples/E2E_04_CONTEXT_AND_MIDDLEWARE_REAL_WORLD.md`
   - make runtime-only guarantees explicit and testable.
3. Add naming standards note for route prefixes:
   - target file: `docs/projects/flat-runtime-session-review/orpc-ingest-spec-packet/ORPC_INGEST_SPEC_PACKET.md`
   - encode:
     - `/api/orpc` retained while dual transport exists,
     - `/api/workflows/<capability>/*` retained as capability-first workflow boundary,
     - `/api/inngest` retained (do not replace with `/api/events`).

### Low
1. Add quick cross-link in OpenAPI artifact docs:
   - target file: `apps/server/openapi/README.md`
   - clarify that `/api/orpc/openapi.json` is external OpenAPI publication surface (not Inngest ingress and not in-process call path).

## 9) Remaining unknowns (explicit)
1. **Exception policy mechanics**:
   - The lock says MFEs default to RPC unless explicit exception, but exception criteria/approval path are not yet formalized in packet docs.
2. **Workflow RPC namespace composition details**:
   - We know no new `/rpc/workflows` mount is required, but exact HQ contract namespace shape for workflow RPC procedures is not yet codified in packet docs.
3. **External workflow client publication granularity**:
   - Publication is locked to OpenAPI, but per-capability packaging/versioning strategy for external workflow clients is not yet documented here.
4. **Ingress hardening expression level**:
   - Route semantics are clear (`/api/inngest` runtime-only), but packet docs still need a concrete minimum enforcement checklist language.
