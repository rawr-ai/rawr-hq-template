# Axis 03: Split vs Collapse

## In Scope
- Canonical split posture between boundary API harness and durable execution harness.
- Anti-dual-path guardrails.
- Adoption exception and scale rule governance.

## Out of Scope
- Detailed host implementation internals (see [AXIS_07_HOST_HOOKING_COMPOSITION.md](./AXIS_07_HOST_HOOKING_COMPOSITION.md)).
- Workflow trigger and durable endpoint specifics (see [AXIS_08_WORKFLOWS_VS_APIS_BOUNDARIES.md](./AXIS_08_WORKFLOWS_VS_APIS_BOUNDARIES.md), [AXIS_09_DURABLE_ENDPOINTS_VS_DURABLE_FUNCTIONS.md](./AXIS_09_DURABLE_ENDPOINTS_VS_DURABLE_FUNCTIONS.md)).

## Canonical Policy
1. Split is retained as canonical: API boundary and durability harness are distinct.
2. Full collapse into one surface is rejected.

## Why
- External API contract semantics and durable execution semantics are non-equivalent.
- Inngest ingress/runtime behavior must not define first-party API contract behavior.

## Trade-Offs
- Two harnesses remain.
- This is intentional because responsibilities are non-overlapping.

## Explicit Anti-Dual-Path Policy
Dual path is disallowed unless capabilities are truly non-overlapping by contract and runtime behavior.

Allowed non-overlapping pair:
1. `packages/<capability>/src/client.ts` internal client path for synchronous in-process calls.
2. Inngest event/function path for durable asynchronous orchestration.

This pair is allowed because intent differs; it is not two authoring paths for the same caller-facing trigger surface.

## Adoption Exception (Explicit)
Default posture remains boundary-owned contracts plus boundary operations.

Direct adoption exception is allowed only when all are documented:
1. Boundary and internal surface overlap is truly 1:1.
2. Why overlap is 1:1 is explicit.
3. What triggers return to boundary-owned contracts is explicit.

## Scale Rule (Default Progression)
1. Split implementation handlers/operations first.
2. Split contracts only when behavior, policy, or external audience diverges.

## Practical Red Flags (Reject)
1. Proposal creates duplicate first-party trigger authoring paths for same capability behavior.
2. Proposal blurs caller-trigger API routes and `/api/inngest` ingress.
3. Proposal uses local HTTP self-calls as internal default.

## References
- Agent J: `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_AGENT_J_COLLAPSE_UNIFY_RECOMMENDATION.md:3`
- Integrated synthesis: `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_INNGEST_ORPC_DEBATE_INTEGRATED_RECOMMENDATION.md:51`
- Inngest: [Serve](https://www.inngest.com/docs/reference/serve)
- Inngest: [Durable endpoints](https://www.inngest.com/docs/learn/durable-endpoints)

## Cross-Axis Links
- Internal calling defaults: [AXIS_02_INTERNAL_CLIENTS_INTERNAL_CALLING.md](./AXIS_02_INTERNAL_CLIENTS_INTERNAL_CALLING.md)
- Workflow/API trigger boundary: [AXIS_08_WORKFLOWS_VS_APIS_BOUNDARIES.md](./AXIS_08_WORKFLOWS_VS_APIS_BOUNDARIES.md)
- Durable endpoint additive posture: [AXIS_09_DURABLE_ENDPOINTS_VS_DURABLE_FUNCTIONS.md](./AXIS_09_DURABLE_ENDPOINTS_VS_DURABLE_FUNCTIONS.md)
