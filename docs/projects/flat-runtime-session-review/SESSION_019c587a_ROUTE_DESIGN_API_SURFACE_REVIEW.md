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
- The runtime is currently sufficient for coordination-focused flows and dual transport support.
- It is not yet converged to the packet’s caller-facing workflow route model.

## 4) Evaluation (what is strong)
1. The split between boundary routes and runtime ingress is conceptually strong and consistently stated across packet core docs.
2. `/rpc` and `/api/orpc` are explicitly mounted with parse-safe forwarding and shared context in `apps/server/src/orpc.ts`, which is technically clean.
3. OpenAPI compatibility is first-class (`/api/orpc/openapi.json` and artifact workflow), supporting non-RPC consumers.
4. Inngest ingress is isolated to one route and one runtime-owned bundle, matching durability-harness separation intent.
5. Decision logs (especially D-005/D-006/D-007) provide a clear policy baseline for future convergence.

## 5) Risks/confusions at scale
1. **Transport ambiguity for external/browser callers**:
   - Some docs imply browser callers should use `/api/orpc`, while AXIS_08 includes `/rpc*` in external surfaces.
   - Current browser implementation uses `/rpc`.
   - This will create inconsistent client patterns as capabilities scale.
2. **Target-vs-current route drift visibility gap**:
   - Packet target expects `/api/workflows/<capability>/*`, current runtime does not yet mount it.
   - Without explicit "transitional state" language in one canonical place, teams may implement divergent stopgaps.
3. **Internal vs external separation is more policy than enforcement today**:
   - Caller mode boundaries are strong in docs but weaker in runtime-visible route gating conventions.
4. **Ingress semantics may be misread by new contributors**:
   - `/api/inngest` is runtime-only by policy, but route-level intent is not summarized in one concise caller/route matrix in packet index docs.
5. **Namespace scaling risk if capability routes are not normalized early**:
   - Deferring explicit `/api/workflows/<capability>/*` too long keeps workflow-trigger semantics mixed with coordination/admin APIs.

## 6) Recommended posture (clear keep/change list)

| Recommendation | Type | Rationale |
| --- | --- | --- |
| Keep split route families (`/api/orpc` + `/api/workflows/*` caller-facing, `/api/inngest` runtime-only) as canonical target | `keep as-is` | This is the strongest part of the packet and remains correct long-term. |
| Keep `/api` prefix for workflow triggers (`/api/workflows/*`) rather than `/workflows` | `keep as-is` | Maintains consistent API namespace, policy application, and gateway ergonomics. |
| Keep dual transport capability (`/rpc` and `/api/orpc`) but define explicit caller scope per transport | `tighten docs` | Prevents ambiguous client behavior while preserving useful transport flexibility. |
| Publish one canonical caller/transport matrix (caller type -> link type -> route family -> auth expectation) | `tighten docs` | Removes current cross-doc contradictions and onboarding confusion. |
| Explicitly mark current runtime as transitional relative to D-005 target route convergence | `tighten docs` | Avoids silent drift while rollout is incomplete. |
| Converge runtime host wiring to mount `/api/workflows/*` via manifest + workflow boundary context | `structural correction` | Required for full packet target-state alignment and long-term capability scaling. |
| If strict D-007 adherence is desired, migrate browser/network clients to OpenAPI boundary routes and classify `/rpc` as first-party/internal-only or explicitly supported public transport | `structural correction` | Resolves the largest long-term ambiguity in client expectations. |
| Keep ingress path `/api/inngest`, but harden and document runtime-only enforcement requirements (signature validation and caller exclusion expectations) | `tighten docs` | Correct route family stays; enforcement clarity should be explicit. |

## 7) Explicit answers to each route question above

### Why `api/workflows` vs `/workflows`?
`/api/workflows` keeps workflow trigger/status routes in the same API boundary namespace as `/api/orpc` and `/api/inngest`, avoids collisions with non-API app routes, and allows consistent gateway/policy treatment over `/api/*`. Under this packet’s constraints, this is the correct default.

### Why not `api/<capability>/workflows`?
`/api/workflows/<capability>/*` centralizes workflow boundary handling under one surface-class prefix, which is easier to mount, secure, document, and compose from one manifest router. `api/<capability>/workflows` fragments policy/mount ergonomics and weakens "workflow surface as a first-class API plane" clarity.

### What is `/rpc` for vs `/api/orpc` for? Who should hit which route?
- `/rpc`: oRPC RPC transport via `RPCHandler` (native oRPC transport, optimized for `RPCLink` clients). In this repo today, CLI and web currently use it.
- `/api/orpc`: OpenAPI transport via `OpenAPIHandler`, used for OpenAPI-style consumers and schema/tooling (`/api/orpc/openapi.json`).
- Packet target intent leans toward browser/network boundary clients on `/api/orpc` (plus `/api/workflows/*`), while server-internal callers should use in-process clients.
- Action needed: explicitly codify whether `/rpc` remains valid for browser/network callers or is limited to trusted first-party/internal clients.

### Is internal vs external separation explicit enough today?
Partially. It is explicit in policy language, but not explicit enough in operational docs and route-usage guidance. The key gap is transport/caller ambiguity (`/rpc` vs `/api/orpc`) and incomplete route convergence for `/api/workflows/*`.

### Do specs clearly document RPC link vs OpenAPI link usage and client expectations?
Not fully. AXIS_01 provides OpenAPI client examples, but packet docs do not present one definitive caller-to-link matrix, and AXIS_08 currently introduces conflicting external `/rpc*` language. This should be tightened.

### Should Inngest ingress remain `/api/inngest` or move to an internal-only pattern?
Remain `/api/inngest` as canonical runtime ingress. Do not repurpose it as a caller surface. "Internal-only" should be treated as an infrastructure deployment option (network control/proxying), not as a route-structure change. The route semantics are correct; enforcement/documentation should be tightened.

## 8) Actionable doc updates (if any), prioritized high/medium/low

### High
1. Add one canonical caller/transport matrix to packet root docs:
   - target file: `docs/projects/flat-runtime-session-review/orpc-ingest-spec-packet/ORPC_INGEST_SPEC_PACKET.md`
   - include: caller type, allowed routes, recommended link (`RPCLink` vs `OpenAPILink`), auth model, forbidden routes.
2. Resolve external `/rpc*` ambiguity:
   - target files:
     - `docs/projects/flat-runtime-session-review/orpc-ingest-spec-packet/AXIS_08_WORKFLOWS_VS_APIS_BOUNDARIES.md`
     - `docs/projects/flat-runtime-session-review/orpc-ingest-spec-packet/AXIS_01_EXTERNAL_CLIENT_GENERATION.md`
   - ensure both docs state the same caller expectations.
3. Add explicit "current runtime delta vs canonical target" note:
   - target file: `docs/projects/flat-runtime-session-review/orpc-ingest-spec-packet/DECISIONS.md` (D-005 companion note) or packet index.

### Medium
1. Add route-family purpose table to host composition axis:
   - target file: `docs/projects/flat-runtime-session-review/orpc-ingest-spec-packet/AXIS_07_HOST_HOOKING_COMPOSITION.md`
   - clarify `/rpc` purpose vs `/api/orpc` purpose vs `/api/workflows/*` purpose.
2. Add ingress enforcement expectations in docs:
   - target files:
     - `docs/projects/flat-runtime-session-review/orpc-ingest-spec-packet/AXIS_08_WORKFLOWS_VS_APIS_BOUNDARIES.md`
     - `docs/projects/flat-runtime-session-review/orpc-ingest-spec-packet/examples/E2E_04_CONTEXT_AND_MIDDLEWARE_REAL_WORLD.md`
   - make runtime-only guarantees explicit and testable.

### Low
1. Add quick cross-link in OpenAPI artifact docs:
   - target file: `apps/server/openapi/README.md`
   - clarify that `/api/orpc/openapi.json` is boundary API/OpenAPI transport surface, not Inngest ingress and not internal in-process call path.
