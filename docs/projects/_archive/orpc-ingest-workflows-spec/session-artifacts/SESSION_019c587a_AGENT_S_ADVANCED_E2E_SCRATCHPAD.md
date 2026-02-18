# SESSION_019c587a — Agent S Advanced E2E Scratchpad

## 0) Scope Lock
1. Own only Agent S plan/scratchpad/final advanced walkthrough files.
2. Docs-only; no runtime code edits.
3. Solve the underlying architecture problem (micro-frontend logic consumption without duplicated semantics), not a preselected path.

## 1) Canonical Evidence Intake

### Packet + posture anchors
1. Split semantics locked:
- trigger APIs on workflow surfaces (`/api/workflows/...`),
- runtime ingress only at `/api/inngest`.
2. Internal default: server-side in-process calls use package internal `client.ts`, not local HTTP self-calls.
3. Boundary policy placement:
- auth/visibility/rate in boundary layer,
- durable retries/step semantics in Inngest functions.
4. Plugin-to-plugin runtime imports are disallowed; sharing must happen through packages/composed surfaces.

### Live repo anchors (current implementation)
1. Current server mounts:
- `/api/inngest` in `apps/server/src/rawr.ts`.
- `/rpc` + `/api/orpc` + `/api/orpc/openapi.json` in `apps/server/src/orpc.ts`.
2. Current workflow-like run flow uses coordination procedures (`queueRun`, `getRunStatus`, `getRunTimeline`) in `packages/coordination/src/orpc/contract.ts` and `apps/server/src/orpc.ts`.
3. Current web host micro-frontend mount path is `/rawr/plugins/web/:dirName` and `MountContext` is navigation-focused (`packages/ui-sdk/src/index.ts`, `apps/web/src/ui/pages/MountsPage.tsx`).
4. OpenAPI artifact generation exists (`apps/server/scripts/write-orpc-openapi.ts`, `apps/server/openapi/orpc-openapi.types.ts`), but no canonical generated browser workflow client package is present.

### Decision register anchor
1. D-004 (`docs/system/spec-packet/DECISIONS.md`) defers a workflow-backed ORPC helper abstraction until repeated boilerplate is proven.

## 2) Problem To Solve (Advanced Variant)
We need one end-to-end pattern where a micro-frontend can:
1. invoke workflow-related behavior,
2. observe status/results,
3. reuse capability semantics from a single source,
without re-defining payload shapes/visibility rules/domain behavior separately in MFE/API/workflow layers.

## 3) Viable Paths Compared

| Path | Summary | Strengths | Risks | Verdict |
| --- | --- | --- | --- | --- |
| A. API-plugin-centric | MFE calls boundary/API plugin operations; workflow calls exposed through API layer | Familiar API-first model | Tends to duplicate workflow intent mapping if workflow and API contracts drift; API plugin becomes mandatory choke point | Viable but not default for this problem |
| B. Shared-package-first + workflow trigger surface | Shared capability logic in package (browser-safe subset + server logic); MFE calls workflow trigger/status APIs directly on workflow surface | Best alignment with no-duplication goal + dependency rules; keeps workflow semantics near workflow authoring; API plugin remains optional | Requires clear browser-safe export boundary and trigger/status contract discipline | **Recommended default** |
| C. Host-injected gateway facade | Host provides pre-wired capability methods to MFE via mount context | Reduces per-MFE client wiring and centralizes auth/session handling | Current `MountContext` does not yet define this contract; coupling risk if gateway shape is ad hoc | Good extension of B, defer as phase-2 optimization |
| D. Direct `/api/inngest` from MFE | Browser triggers ingress directly | None in this policy model | Violates split semantics and security posture | Rejected |

## 4) Chosen Default (For Final Walkthrough)
**Path B (Shared-package-first + workflow trigger/status surface)** with an optional future move toward Path C.

Why this is best for the stated problem:
1. Shared logic lives in packages (single semantic source) and is reused by both workflow functions and browser-facing adapters.
2. API plugin consumption is optional, not structurally required.
3. Workflow semantics stay in workflow plugin surfaces; ingress remains runtime-only.
4. It aligns with current packet constraints without requiring plugin-to-plugin imports.

## 5) Implementation Pattern To Document

### Shared semantics ownership
1. Put canonical payload/domain/state semantics in `packages/<capability>/src/domain/*` (+ optional browser-safe exports).
2. Keep server-only operational logic in `service/*`, `procedures/*`, and internal `client.ts`.
3. Keep TypeBox-first schemas as canonical artifacts.

### Workflow invocation and status model
1. Workflow plugin owns trigger contract/router (`/api/workflows/<capability>/*`).
2. Trigger operation emits Inngest events (`inngest.send`) and returns `accepted + runId`.
3. Inngest functions own durable execution (`step.run`, retries, timeline/state transitions).
4. MFE status/result path reads from workflow/status procedures, never `/api/inngest`.

### Auth boundary model
1. Browser carries user/session credentials only.
2. Trigger router enforces visibility (`internal`/`external`) and caller authorization in request context.
3. `/api/inngest` remains signed runtime ingress, not user-auth API.

### Browser-safe vs server-only split
1. Browser-safe: pure TypeScript/domain helpers, DTO mappers, typed client wrappers, mount code.
2. Server-only: runtime adapter, Inngest client/functions, storage deps, host route registration, internal package clients.

## 6) Known Tensions / Unresolved Items To Surface Explicitly
1. Current runtime does not yet expose canonical `/api/workflows/<capability>/*`; it currently exposes workflow run actions via coordination procedures under `/rpc` and `/api/orpc`.
2. `rawr.hq.ts` central composition contract is policy-canonical but not yet present in this worktree snapshot.
3. `MountContext` currently lacks a standardized auth/gateway capability shape for host-injected workflow clients.
4. TypeBox Standard Schema adapter centralization is partially policy-level; current code still keeps adapter logic inside coordination schemas module.
5. Workflow helper abstraction remains deferred by decision D-004.

## 7) Final Doc Construction Notes
1. Keep required 10-section walkthrough shape.
2. Include one full, concrete Path B implementation.
3. Include alternatives section (A/C/D) with clear disposition.
4. Include an explicit policy checklist and mandatory unresolved-gaps section.
