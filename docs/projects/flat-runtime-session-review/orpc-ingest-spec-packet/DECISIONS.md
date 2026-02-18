# ORPC + Inngest Spec Packet Decisions

## Scope
Packet-local decision tracking for documentation-architecture changes only.

## Current Status
Packet remains locked on split posture and TypeBox-only contract/procedure schema authoring policy (no Zod-authored contract/procedure schemas). Procedure I/O schema ownership, inline-I/O docs/examples posture, context metadata placement, and caller/transport publication boundaries are explicitly locked. This file is canonical for packet decisions; synthesis docs are context, not a policy prerequisite.

## Decision Register

### D-005 — Workflow trigger route convergence
- `status`: `closed`
- `resolution`: The packet locks on a manifest-driven host spine: capability-first `/api/workflows/<capability>/*` mounts come from generated `rawr.hq.ts`; workflow routers live under `rawrHqManifest.workflows.triggerRouter`; the same manifest supplies `rawrHqManifest.inngest`; workflow boundary context helpers keep `/api/workflows/<capability>/*` caller-facing while `/api/inngest` remains runtime-only. `/rpc` remains first-party/internal transport, and no dedicated `/rpc/workflows` mount is added by default.
- `historical_question`: Should workflow trigger APIs remain first-class caller-facing routes (`/api/workflows/<capability>/*`) with explicit mount ownership distinct from runtime ingress?
- `closure_scope`: spec-policy lock only.
- `why_closed`: Packet docs now encode manifest-driven route composition, caller/runtime split semantics, and host mounting rules directly.
- `impacted_docs`:
  - `ORPC_INGEST_SPEC_PACKET.md`
  - `AXIS_07_HOST_HOOKING_COMPOSITION.md`
  - `AXIS_08_WORKFLOWS_VS_APIS_BOUNDARIES.md`
  - `examples/E2E_03_MICROFRONTEND_API_WORKFLOW_INTEGRATION.md`

### D-006 — Canonical ownership of workflow contract artifacts
- `status`: `closed`
- `resolution`: Workflow and API boundary contracts are plugin-owned (`plugins/workflows/<capability>/src/contract.ts` and `plugins/api/<capability>/src/contract.ts`). Packages own shared domain logic/domain schemas only; workflow trigger/status I/O schemas are owned at workflow plugin boundary contracts. Manifest composition consumes plugin boundary contracts/routers as canonical boundary inputs.
- `closure_scope`: spec-policy lock
- `why_closed`: This preserves boundary ownership integrity, keeps package logic transport-neutral, and prevents package-owned workflow boundary contract drift.
- `impacted_docs`:
  - `ORPC_INGEST_SPEC_PACKET.md`
  - `AXIS_01_EXTERNAL_CLIENT_GENERATION.md`
  - `AXIS_02_INTERNAL_CLIENTS_INTERNAL_CALLING.md`
  - `AXIS_03_SPLIT_VS_COLLAPSE.md`
  - `AXIS_07_HOST_HOOKING_COMPOSITION.md`
  - `AXIS_08_WORKFLOWS_VS_APIS_BOUNDARIES.md`
  - `examples/E2E_03_MICROFRONTEND_API_WORKFLOW_INTEGRATION.md`

### D-007 — Caller transport and publication boundary strategy
- `status`: `closed`
- `resolution`: `RPCLink` on `/rpc` is first-party/internal transport. First-party callers (including MFEs by default) use RPC unless an explicit exception is documented. RPC client artifacts are never externally published. External/third-party callers use published OpenAPI clients on `/api/orpc/*` and `/api/workflows/<capability>/*`. `/api/inngest` remains signed runtime-only ingress and is never a browser caller surface.
- `closure_scope`: spec-policy lock
- `why_closed`: Caller-mode semantics are explicit by route, transport, publication boundary, and runtime ownership; this resolves client ambiguity without collapsing split architecture.
- `impacted_docs`:
  - `ORPC_INGEST_SPEC_PACKET.md`
  - `AXIS_01_EXTERNAL_CLIENT_GENERATION.md`
  - `AXIS_07_HOST_HOOKING_COMPOSITION.md`
  - `AXIS_02_INTERNAL_CLIENTS_INTERNAL_CALLING.md`
  - `AXIS_03_SPLIT_VS_COLLAPSE.md`
  - `AXIS_08_WORKFLOWS_VS_APIS_BOUNDARIES.md`
  - `examples/E2E_04_CONTEXT_AND_MIDDLEWARE_REAL_WORLD.md`
  - `examples/E2E_03_MICROFRONTEND_API_WORKFLOW_INTEGRATION.md`

### D-011 — Procedure I/O schema ownership and context metadata placement
- `status`: `locked`
- `locked_decision`:
  - Procedure input/output schemas live with owning procedures or boundary contracts (`contract.ts`), not in `domain/*`.
  - `domain/*` owns transport-independent domain concepts only (entities/value objects/invariants/state shapes).
  - Request/correlation/principal/network metadata contracts belong in `context.ts` (or equivalent context modules), not `domain/*`.
- `source_anchors`:
  - `https://orpc.dev/docs/procedure`
  - `https://orpc.dev/docs/contract-first/define-contract`
  - `https://orpc.dev/docs/context`
- `impacted_docs`:
  - `ORPC_INGEST_SPEC_PACKET.md`
  - `AXIS_04_CONTEXT_CREATION_AND_PROPAGATION.md`
  - `AXIS_08_WORKFLOWS_VS_APIS_BOUNDARIES.md`
  - `AXIS_02_INTERNAL_CLIENTS_INTERNAL_CALLING.md`

### D-012 — Inline-I/O docs posture and extracted shape normalization
- `status`: `locked`
- `locked_decision`:
  - Procedure/contract I/O schemas in packet docs/examples default to inline declarations at `.input(...)` and `.output(...)`.
  - Extraction is exception-only, allowed for shared schemas or large readability cases.
  - Extracted schema form uses one paired object with `.input` and `.output` properties (for example `<ProcedureName>Schema.input` / `.output`).
- `source_anchors`:
  - `https://orpc.dev/docs/procedure`
  - `https://orpc.dev/docs/contract-first/define-contract`
- `impacted_docs`:
  - `../SESSION_019c587a_ORPC_INNGEST_WORKFLOWS_POSTURE_SPEC.md`
  - `ORPC_INGEST_SPEC_PACKET.md`
  - `AXIS_04_CONTEXT_CREATION_AND_PROPAGATION.md`
  - `AXIS_06_MIDDLEWARE_CROSS_CUTTING_CONCERNS.md`
  - `AXIS_08_WORKFLOWS_VS_APIS_BOUNDARIES.md`

### D-008 — Extended traces middleware initialization order standard
- `status`: `open`
- `question`: Should this packet lock a canonical import-order/bootstrap pattern for `extendedTracesMiddleware()` so auto instrumentation behavior is consistent across hosts?
- `why_open`: Upstream docs require early initialization for full auto instrumentation, but packet-level bootstrap ordering is not yet standardized.
- `source_anchors`:
  - `https://www.inngest.com/docs/reference/typescript/extended-traces`
- `impacted_docs`:
  - `AXIS_05_ERRORS_LOGGING_OBSERVABILITY.md`
  - `AXIS_06_MIDDLEWARE_CROSS_CUTTING_CONCERNS.md`
  - `AXIS_07_HOST_HOOKING_COMPOSITION.md`
  - `examples/E2E_04_CONTEXT_AND_MIDDLEWARE_REAL_WORLD.md`

### D-009 — Required dedupe marker policy for heavy oRPC middleware
- `status`: `open`
- `question`: Should packet policy require explicit context-cached dedupe markers for heavy oRPC middleware instead of relying on built-in dedupe constraints?
- `why_open`: Built-in dedupe applies only under leading-subset/same-order conditions; policy warning is documented but lock level (`MUST` vs `SHOULD`) is unresolved.
- `source_anchors`:
  - `https://orpc.dev/docs/best-practices/dedupe-middleware`
- `impacted_docs`:
  - `AXIS_04_CONTEXT_CREATION_AND_PROPAGATION.md`
  - `AXIS_06_MIDDLEWARE_CROSS_CUTTING_CONCERNS.md`
  - `examples/E2E_04_CONTEXT_AND_MIDDLEWARE_REAL_WORLD.md`

### D-010 — Inngest finished-hook side-effect guardrail
- `status`: `open`
- `question`: Should this packet explicitly restrict `finished` hook usage to idempotent/non-critical side effects?
- `why_open`: Lifecycle docs note `finished` is not guaranteed exactly once; packet-level enforcement language is not yet locked.
- `source_anchors`:
  - `https://www.inngest.com/docs/reference/middleware/lifecycle`
- `impacted_docs`:
  - `AXIS_05_ERRORS_LOGGING_OBSERVABILITY.md`
  - `AXIS_06_MIDDLEWARE_CROSS_CUTTING_CONCERNS.md`
  - `examples/E2E_04_CONTEXT_AND_MIDDLEWARE_REAL_WORLD.md`

### D-004 — Workflow helper abstraction threshold
- `status`: `locked`
- `question`: Introduce generalized helper abstraction for workflow trigger/router boilerplate only after repeated evidence threshold is met.
- `locked_decision`: Deferred by policy for now; revisit only after repeated boilerplate evidence threshold is met.
- `impacted_docs`:
  - `AXIS_07_HOST_HOOKING_COMPOSITION.md`
  - `examples/E2E_03_MICROFRONTEND_API_WORKFLOW_INTEGRATION.md`

## Inherited Canonical Decision Source
- `../SESSION_019c587a_ORPC_INNGEST_WORKFLOWS_POSTURE_SPEC.md`

## Rule
If future packet edits reveal a new architecture-impacting ambiguity, add it here before continuing edits.
