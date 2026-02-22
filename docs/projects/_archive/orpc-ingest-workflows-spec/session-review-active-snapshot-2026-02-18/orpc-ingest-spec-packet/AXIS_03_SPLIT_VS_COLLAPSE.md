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
3. Workflow surfaces are manifest-driven and capability-first (`/api/workflows/<capability>/*`) while `/api/inngest` remains runtime ingress only.
4. Workflow/API boundary contracts are plugin-owned; workflow trigger/status I/O schemas remain at workflow plugin boundary contracts.
5. Caller mode determines client + auth semantics (first-party callers including MFEs by default use `RPCLink` on `/rpc`; external callers use published OpenAPI clients on `/api/orpc/*` and `/api/workflows/<capability>/*`; runtime ingress uses signed `/api/inngest`).
6. Composition and mounting language MUST stay explicit (no black-box route or ownership narratives).
7. No dedicated `/rpc/workflows` mount is required by default.

## Caller-Mode Boundary Enforcement
| Caller mode | Primary route family | Link/client | Publication boundary | Auth | Forbidden routes |
| --- | --- | --- | --- | --- | --- |
| First-party caller (MFE default/internal services) | `/rpc` | `RPCLink` / internal clients | internal only | first-party session/auth or trusted service context | `/api/inngest` |
| External/third-party caller | `/api/orpc/*`, `/api/workflows/<capability>/*` | `OpenAPILink` | externally published OpenAPI clients | boundary auth/session/token | `/rpc`, `/api/inngest` |
| Runtime ingress | `/api/inngest` | Inngest callback transport | runtime only | signed runtime ingress | `/rpc`, `/api/orpc/*`, `/api/workflows/<capability>/*` |

## Why
- External API contract semantics and durable execution semantics are non-equivalent.
- Inngest ingress/runtime behavior must not define first-party API contract behavior.
- Explicit caller-mode boundaries prevent accidental collapse from convenience integrations.

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
4. Proposal routes browser/network callers to `/api/inngest` instead of caller-facing workflow/API boundaries.
5. Proposal moves workflow trigger/status boundary contracts or I/O schemas into packages.
6. Proposal hides route mounting/composition ownership behind black-box helpers without explicit wiring contracts.
7. Proposal treats `/rpc` as an externally published transport.

## References
- Packet decisions: `docs/projects/flat-runtime-session-review/orpc-ingest-spec-packet/DECISIONS.md:11`
- Packet example: `docs/projects/flat-runtime-session-review/orpc-ingest-spec-packet/examples/E2E_03_MICROFRONTEND_API_WORKFLOW_INTEGRATION.md:22`
- Inngest: [Serve](https://www.inngest.com/docs/reference/serve)
- Inngest: [Durable endpoints](https://www.inngest.com/docs/learn/durable-endpoints)

## Cross-Axis Links
- Internal calling defaults: [AXIS_02_INTERNAL_CLIENTS_INTERNAL_CALLING.md](./AXIS_02_INTERNAL_CLIENTS_INTERNAL_CALLING.md)
- Workflow/API trigger boundary: [AXIS_08_WORKFLOWS_VS_APIS_BOUNDARIES.md](./AXIS_08_WORKFLOWS_VS_APIS_BOUNDARIES.md)
- Durable endpoint additive posture: [AXIS_09_DURABLE_ENDPOINTS_VS_DURABLE_FUNCTIONS.md](./AXIS_09_DURABLE_ENDPOINTS_VS_DURABLE_FUNCTIONS.md)
- Micro-frontend integration example: [E2E_03_MICROFRONTEND_API_WORKFLOW_INTEGRATION.md](./examples/E2E_03_MICROFRONTEND_API_WORKFLOW_INTEGRATION.md)
