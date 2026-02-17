# ORPC + Inngest Spec Packet Decisions

## Scope
Packet-local decision tracking for documentation-architecture changes only.

## Current Status
Packet remains locked on split posture and TypeBox-first policy. New walkthrough work surfaced open and proposed items that require a future lock.

## Decision Register

### D-005 — Workflow trigger route convergence
- `status`: `open`
- `question`: Should canonical workflow trigger paths (`/api/workflows/<capability>/*`) become first-class mounted routes in current server runtime, instead of relying primarily on coordination procedures under `/rpc` and `/api/orpc`?
- `why_open`: Tutorial examples and packet policy expect explicit split paths; runtime convergence is not complete yet.
- `impacted_docs`:
  - `examples/E2E_03_MICROFRONTEND_API_WORKFLOW_INTEGRATION.md`
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
