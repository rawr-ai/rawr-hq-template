# SESSION_019c587a Agent Route Design Review Scratchpad

## Working Goal
Route/API-surface assessment against canonical packet baseline, with runtime reality check.

## Compacted Baseline Before Follow-up
- Canonical packet baseline:
  - Caller-facing APIs: `/api/orpc/*` and target `/api/workflows/<capability>/*`.
  - Runtime ingress only: `/api/inngest`.
  - Internal server default: in-process package client, not local self-HTTP.
- Current runtime reality in this worktree:
  - Mounted: `/rpc*`, `/api/orpc*`, `/api/orpc/openapi.json`, `/api/inngest`.
  - Not yet mounted: `/api/workflows/*` and manifest-driven workflow context wiring.
  - First-party clients (CLI + web app in repo) currently use `RPCLink` on `/rpc`.
- Prior review baseline:
  - Strong split posture, but transport/caller documentation had ambiguity.
  - Main drift risk: packet target-state vs current runtime convergence status.
  - Primary correction path: tighten caller/link policy docs and converge workflow mounts.

## Canonical Baseline Notes

### Locked route semantics (packet)
- Caller-facing boundary routes:
  - `/api/orpc/*`
  - `/api/workflows/<capability>/*`
- Runtime-only ingress:
  - `/api/inngest`
- Internal server calling default:
  - in-process package clients (`packages/<capability>/src/client.ts`)
  - no local self-HTTP as default

### Decision anchors
- D-005 closed:
  - Manifest-driven, capability-first workflow trigger routes (`/api/workflows/<capability>/*`).
- D-007 closed:
  - Browser/network callers use composed boundary clients on `/api/orpc/*` + `/api/workflows/<capability>/*`.
  - `/api/inngest` is runtime-only, not browser-facing.

## Runtime Reality Check (Current Worktree)

### Mounted routes in server code
- Present:
  - `/rpc`, `/rpc/*` via `RPCHandler` in `apps/server/src/orpc.ts`
  - `/api/orpc`, `/api/orpc/*` via `OpenAPIHandler` in `apps/server/src/orpc.ts`
  - `/api/orpc/openapi.json` in `apps/server/src/orpc.ts`
  - `/api/inngest` in `apps/server/src/rawr.ts`
- Not present:
  - `/api/workflows/*` mount in runtime code
  - `apps/server/src/workflows/context.ts`
  - generated `rawr.hq.ts` in repo root
  - plugin surfaces `plugins/api/<capability>` and `plugins/workflows/<capability>`

### Client usage observed
- Browser app currently uses `RPCLink` to `/rpc`:
  - `apps/web/src/ui/lib/orpc-client.ts`
- CLI currently uses `RPCLink` to `/rpc`:
  - `apps/cli/src/lib/coordination-api.ts`
- OpenAPI route is present and documented for artifacts:
  - `apps/server/openapi/README.md` (`/api/orpc/openapi.json`)

### Contract path shape today
- Coordination contract paths are under `/coordination/*` and mounted at both transports:
  - effective OpenAPI path example: `/api/orpc/coordination/workflows/{workflowId}/run`
  - effective RPC path example: `/rpc/coordination/queueRun`

## Tensions / Potential Contradictions

### C-1: External-caller transport ambiguity
- Most packet rules emphasize browser/network callers on `/api/orpc/*`.
- But AXIS_08 consumer model explicitly includes `/rpc*` for external callers.
- Current browser app uses `/rpc`.
- Result: unclear canonical client expectation for first-party browser callers.

### C-2: Policy vs implementation phase mismatch
- Packet baseline expects first-class `/api/workflows/<capability>/*`.
- Current runtime still routes workflow-related operations through coordination contract on `/rpc`/`/api/orpc`.
- D-005 closure text says policy lock only, not rollout complete.
- Result: architecture target is clear, but runtime posture remains transitional.

### C-3: Internal vs external route boundary not operationally explicit
- Policy documents caller modes clearly.
- Runtime code shown in this worktree has minimal explicit route-level caller enforcement.
- `/api/inngest` is mounted directly via `inngestServe` handler; enforcement behavior depends on Inngest signature configuration rather than visible host policy wrappers.
- Result: conceptual split is strong; operational split signaling is weaker than policy language.

### C-4: Route namespace clarity risk at scale
- Route family intent is currently distributed across multiple docs.
- No single quick matrix in packet that maps:
  - caller type -> link type -> allowed route families -> auth posture.
- Result: drift risk as more capabilities/teams onboard.

## Question-Specific Working Notes

### Why `api/workflows` vs `/workflows`?
- `api` namespace keeps workflow trigger/status routes in the same API policy plane as `/api/orpc` and `/api/inngest`.
- Avoids mixing API routes with potential UI/router paths.
- Enables shared API gateway/proxy controls on `/api/*`.

### Why not `api/<capability>/workflows`?
- Current packet posture prefers grouping by surface class first:
  - `/api/workflows/<capability>/*`
- Benefits:
  - single host mount and prefix for all workflow trigger/status APIs
  - uniform middleware/auth routing
  - easier manifest-driven composition and SDK/documentation generation
- `api/<capability>/workflows` would push capability split up a level, increasing mount/middleware fragmentation across capabilities.

### `/rpc` vs `/api/orpc`
- `/rpc`:
  - oRPC RPC transport (RPCHandler)
  - native oRPC client transport (`RPCLink`)
  - currently used by CLI and browser UI in this repo
- `/api/orpc`:
  - oRPC OpenAPI transport (OpenAPIHandler)
  - compatible with OpenAPI tooling and `OpenAPILink`
  - source for `openapi.json`

### Is internal vs external split explicit enough?
- In policy docs: mostly yes.
- In implementation and docs consistency: not yet (transport expectations and caller matrix need tighter normalization).

### Should ingress stay `/api/inngest`?
- Keep route family.
- Treat as runtime-only externally reachable ingress with strict signature/auth checks.
- Internal-only network path is optional infra deployment choice, not required route redesign.

## Recommendation Drafting Notes

### Keep as-is candidates
- Split route families:
  - boundary (`/api/orpc`, future `/api/workflows`)
  - runtime ingress (`/api/inngest`)
- Preserve dual transport capability (`RPCHandler` + `OpenAPIHandler`) as an implementation option.

### Tighten docs candidates
- Single canonical caller/transport matrix.
- Resolve `/rpc` ambiguity for browser/network callers.
- Explicitly mark "current-state transitional runtime" vs "target packet posture".

### Structural correction candidates
- Adopt manifest-driven `/api/workflows/*` mount in runtime when executing packet convergence.
- If strict packet alignment is required, migrate browser callers from `/rpc` to `/api/orpc`/`/api/workflows` and classify `/rpc` scope explicitly.

## Finalization usage trace
- `C-1` (external-caller transport ambiguity) -> final review sections:
  - `5) Risks/confusions at scale` item 1
  - `6) Recommended posture` (`tighten docs`, `structural correction`)
  - `7) /rpc vs /api/orpc` answer
- `C-2` (policy vs implementation mismatch) -> final review sections:
  - `3) Current routing model summary`
  - `5) Risks/confusions at scale` item 2
  - `6) Recommended posture` (runtime convergence correction)
- `C-3` (operational split explicitness gap) -> final review sections:
  - `5) Risks/confusions at scale` item 3
  - `7) internal vs external separation` answer
- `C-4` (route namespace clarity at scale) -> final review sections:
  - `5) Risks/confusions at scale` item 4
  - `8) Actionable doc updates` high-priority caller/transport matrix

## Follow-up lock assimilation notes
- Applied new lock in final review:
  - RPC link/client is first-party/internal only.
  - RPC client is not externally published.
  - OpenAPI client is externally published.
  - In-repo services + MFEs default to RPC unless explicit exception.
- Naming conclusions carried into final review:
  - Keep `/api/orpc` while dual transport exists (do not flatten to broad `/api/*`).
  - Keep `/api/inngest` (do not rename to `/api/events`).
- Mount implication captured:
  - No separate `/rpc/workflows` mount required; workflow RPC should compose under existing `/rpc/*` contract namespace when enabled.
