# SESSION_019c587a — ORPC Contract-First vs Router-First (Integrated Recommendation)

## Inputs
- `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_AGENT_L_CONTRACT_FIRST_RECOMMENDATION.md`
- `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_AGENT_M_ROUTER_FIRST_RECOMMENDATION.md`
- `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_ORPC_INNGEST_WORKFLOWS_POSTURE_SPEC.md`

## Converged Result
Both investigations converge on the same posture:

1. Do **not** switch to pure contract-first everywhere.
2. Do **not** switch to pure router-first everywhere.
3. Adopt a **deliberate/narrowed hybrid**:
- Contract-first default at boundary-owned and externally relevant surfaces.
- Router-first (or service-first) default for internal leaf modules.

This is the highest-confidence model that reduces low-value duplication while preserving all locked posture rules.

## Canonical Model (By Layer)

### 1) Domain/internal package layer
- Default: router-first/service-first acceptable for internal leaf logic.
- Promote to dedicated contract-first when threshold is reached (e.g. multi-caller reuse, compatibility pressure, explicit contract governance need).
- Keep package transport-neutral and aligned with internal client rule.

### 2) API plugin boundary layer
- Default: contract-first.
- Rationale: boundary ownership, OpenAPI/client generation stability, metadata/governance clarity.
- Router-first may be used for local implementation internals, but boundary exposure remains contract-first.

### 3) Workflow plugin trigger layer
- Default: contract-first for caller-facing workflow trigger APIs.
- Durable execution remains Inngest-native (`createFunction`, `step.*`).
- No second first-party trigger authoring path.

### 4) Composition layer
- May use explicit helpers/composers to reduce boilerplate.
- Must preserve one external contract source and split harness boundaries.

## Why This Matches Current Posture Spec
This recommendation is fully compatible with the accepted ORPC+Inngest posture:

- oRPC remains primary boundary/client harness.
- Inngest remains primary durability harness.
- `/api/inngest` remains runtime ingress only.
- External SDK generation remains single-source from composed oRPC/OpenAPI contract.
- Anti-dual-path policy remains intact.

## Direct Answer To “Are we in a weird hybrid now?”
You are not wrong about the confusion risk.

The current shape is defensible **if** we explicitly define where each style is allowed.
Without that rule, it feels like accidental hybrid.
With that rule, it becomes an intentional hybrid with clear benefits.

## Recommended Policy Addition (short)
Add this to canonical policy docs:

1. **Boundary surfaces are contract-first by default** (`plugins/api/*`, workflow trigger APIs).
2. **Internal leaf modules are router/service-first by default** unless promotion criteria are met.
3. **Promotion criteria** for internal modules:
- 2+ independent caller groups,
- compatibility/versioning pressure,
- contract-drift risk requiring explicit artifact governance,
- expected near-term externalization.

## Not Yet Integrated Elsewhere
Still pending back-port/integration into canonical E2E docs:

1. `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_AGENT_H_DX_SIMPLIFICATION_REVIEW.md`
2. `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_ORPC_INNGEST_WORKFLOWS_POSTURE_SPEC.md`
3. `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_AGENT_L_CONTRACT_FIRST_RECOMMENDATION.md`
4. `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_AGENT_M_ROUTER_FIRST_RECOMMENDATION.md`
