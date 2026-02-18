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
  - `ARCHITECTURE.md`
  - `axes/07-host-composition.md`
  - `axes/08-workflow-api-boundaries.md`
  - `examples/e2e-03-microfrontend-integration.md`

### D-006 — Canonical ownership of workflow contract artifacts
- `status`: `closed`
- `resolution`: Workflow and API boundary contracts are plugin-owned (`plugins/workflows/<capability>/src/contract.ts` and `plugins/api/<capability>/src/contract.ts`). Packages own shared domain logic/domain schemas only; workflow trigger/status I/O schemas are owned at workflow plugin boundary contracts. Manifest composition consumes plugin boundary contracts/routers as canonical boundary inputs.
- `closure_scope`: spec-policy lock
- `why_closed`: This preserves boundary ownership integrity, keeps package logic transport-neutral, and prevents package-owned workflow boundary contract drift.
- `impacted_docs`:
  - `ARCHITECTURE.md`
  - `axes/01-external-client-generation.md`
  - `axes/02-internal-clients.md`
  - `axes/03-split-vs-collapse.md`
  - `axes/07-host-composition.md`
  - `axes/08-workflow-api-boundaries.md`
  - `examples/e2e-03-microfrontend-integration.md`

### D-007 — Caller transport and publication boundary strategy
- `status`: `closed`
- `resolution`: `RPCLink` on `/rpc` is first-party/internal transport. First-party callers (including MFEs by default) use RPC unless an explicit exception is documented. RPC client artifacts are never externally published. External/third-party callers use published OpenAPI clients on `/api/orpc/*` and `/api/workflows/<capability>/*`. `/api/inngest` remains signed runtime-only ingress and is never a browser caller surface.
- `closure_scope`: spec-policy lock
- `why_closed`: Caller-mode semantics are explicit by route, transport, publication boundary, and runtime ownership; this resolves client ambiguity without collapsing split architecture.
- `impacted_docs`:
  - `ARCHITECTURE.md`
  - `axes/01-external-client-generation.md`
  - `axes/07-host-composition.md`
  - `axes/02-internal-clients.md`
  - `axes/03-split-vs-collapse.md`
  - `axes/08-workflow-api-boundaries.md`
  - `examples/e2e-04-context-middleware.md`
  - `examples/e2e-03-microfrontend-integration.md`

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
  - `ARCHITECTURE.md`
  - `axes/04-context-propagation.md`
  - `axes/08-workflow-api-boundaries.md`
  - `axes/02-internal-clients.md`

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
  - `ARCHITECTURE.md`
  - `ARCHITECTURE.md`
  - `axes/04-context-propagation.md`
  - `axes/06-middleware.md`
  - `axes/08-workflow-api-boundaries.md`

### D-008 — Extended traces middleware initialization order standard
- `status`: `closed`
- `resolution`:
  - Host bootstrap initializes `extendedTracesMiddleware()` first, before Inngest client construction, workflow function composition, or route registration.
  - Host composition uses a single runtime-owned Inngest bundle (`client + functions`) per process.
  - Host mount/control-plane ordering is explicit: mount `/api/inngest`, then `/api/workflows/*`, then register `/rpc` and `/api/orpc/*`.
  - Plugin authors inherit baseline instrumentation; they may extend middleware context, but may not replace or reorder the baseline traces middleware.
- `closure_scope`: spec-policy lock only.
- `why_closed`: Packet docs now encode baseline tracing bootstrap, runtime bundle ownership, and mount/control-plane ordering semantics without changing existing route/ownership/caller locks.
- `source_anchors`:
  - `https://www.inngest.com/docs/reference/typescript/extended-traces`
- `impacted_docs`:
  - `ARCHITECTURE.md`
  - `ARCHITECTURE.md`
  - `axes/05-errors-observability.md`
  - `axes/06-middleware.md`
  - `axes/07-host-composition.md`
  - `examples/e2e-04-context-middleware.md`

### D-009 — Required dedupe marker policy for heavy oRPC middleware
- `status`: `open`
- `question`: Should packet policy require explicit context-cached dedupe markers for heavy oRPC middleware instead of relying on built-in dedupe constraints?
- `why_open`: This remains non-blocking. Packet docs already carry minimal guidance (`SHOULD` + caveats) and avoid escalating to a stricter architecture-level lock until repeated implementation evidence justifies it.
- `non_blocking_guidance`: Keep context-cached markers for heavy checks and treat built-in dedupe as constrained to leading-subset/same-order chains.
- `source_anchors`:
  - `https://orpc.dev/docs/best-practices/dedupe-middleware`
- `impacted_docs`:
  - `axes/04-context-propagation.md`
  - `axes/06-middleware.md`
  - `examples/e2e-04-context-middleware.md`

### D-010 — Inngest finished-hook side-effect guardrail
- `status`: `open`
- `question`: Should this packet explicitly restrict `finished` hook usage to idempotent/non-critical side effects?
- `why_open`: This remains non-blocking. Packet docs already provide minimal operational guidance, and no additional architecture-level enforcement language is required for this packet iteration.
- `non_blocking_guidance`: Treat `finished` as non-exactly-once; keep hook side effects idempotent and non-critical.
- `source_anchors`:
  - `https://www.inngest.com/docs/reference/middleware/lifecycle`
- `impacted_docs`:
  - `axes/05-errors-observability.md`
  - `axes/06-middleware.md`
  - `examples/e2e-04-context-middleware.md`

### D-004 — Workflow helper abstraction threshold
- `status`: `locked`
- `question`: Introduce generalized helper abstraction for workflow trigger/router boilerplate only after repeated evidence threshold is met.
- `locked_decision`: Deferred by policy for now; revisit only after repeated boilerplate evidence threshold is met.
- `impacted_docs`:
  - `axes/07-host-composition.md`
  - `examples/e2e-03-microfrontend-integration.md`

## Inherited Canonical Decision Source
- `ARCHITECTURE.md`

## Rule
If future packet edits reveal a new architecture-impacting ambiguity, add it here before continuing edits.
