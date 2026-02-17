# ORPC + Inngest Spec Packet Decisions

## Scope
Packet-local decision tracking for documentation-architecture changes only.

## Current Status
Packet remains locked on split posture and TypeBox-first policy. Procedure I/O schema ownership and context metadata placement are now explicitly locked. New walkthrough work and post-research context/middleware findings also surfaced open and proposed items that require a future lock.

## Decision Register

### D-005 — Workflow trigger route convergence
- `status`: `open`
- `question`: Should canonical workflow trigger paths (`/api/workflows/<capability>/*`) become first-class mounted routes in current server runtime, instead of relying primarily on coordination procedures under `/rpc` and `/api/orpc`?
- `why_open`: Tutorial examples and packet policy expect explicit split paths; runtime convergence is not complete yet.
- `impacted_docs`:
  - `examples/E2E_03_MICROFRONTEND_API_WORKFLOW_INTEGRATION.md`
  - `examples/E2E_04_CONTEXT_AND_MIDDLEWARE_REAL_WORLD.md`
  - `AXIS_08_WORKFLOWS_VS_APIS_BOUNDARIES.md`
  - `AXIS_07_HOST_HOOKING_COMPOSITION.md`

### D-006 — Canonical ownership of workflow contract artifacts
- `status`: `open`
- `question`: Should shared workflow contract artifacts live canonically in domain packages (for no-duplication and import direction), with plugins re-exporting/implementing, or remain plugin-owned by default?
- `why_open`: Both patterns exist across docs/examples; one final canonical default is not yet centrally locked.
- `impacted_docs`:
  - `examples/E2E_03_MICROFRONTEND_API_WORKFLOW_INTEGRATION.md`
  - `AXIS_08_WORKFLOWS_VS_APIS_BOUNDARIES.md`
  - `AXIS_01_EXTERNAL_CLIENT_GENERATION.md`

### D-007 — First-party micro-frontend workflow client strategy
- `status`: `proposed`
- `proposal`: Standardize a browser-safe workflow client pattern that calls caller-facing workflow trigger/status APIs only; explicitly prohibit browser access to `/api/inngest`.
- `why_proposed`: Advanced E2E can be implemented this way today, but canonical packaging/distribution of generated client artifacts is not yet locked.
- `impacted_docs`:
  - `examples/E2E_03_MICROFRONTEND_API_WORKFLOW_INTEGRATION.md`
  - `AXIS_01_EXTERNAL_CLIENT_GENERATION.md`
  - `AXIS_08_WORKFLOWS_VS_APIS_BOUNDARIES.md`

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
- `why_open`: Built-in dedupe applies only under leading-subset/same-order conditions; policy warning is now documented but lock level (`MUST` vs `SHOULD`) is unresolved.
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

## Inherited Canonical Decision Sources
- `../SESSION_019c587a_ORPC_INNGEST_WORKFLOWS_POSTURE_SPEC.md`
- `../SESSION_019c587a_ORPC_INNGEST_WORKFLOWS_POSTURE_SPEC.md` locked decisions and global invariants

## Rule
If future packet edits reveal a new architecture-impacting ambiguity, add it here before continuing edits.
