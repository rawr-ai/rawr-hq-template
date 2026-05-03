# Axis 03: Split vs Collapse

## Canonical Core Reference
- Canonical subsystem policy and global invariants: [ARCHITECTURE.md](../ARCHITECTURE.md).
- Architecture-level decision authority: [DECISIONS.md](../DECISIONS.md).
- This axis is a focused slice and does not override canonical core policy.

## Axis Opening
- **What this axis is:** the canonical policy slice that decides split-vs-collapse posture for API boundaries and durable execution.
- **What it covers:** split invariants, anti-dual-path guardrails, adoption exceptions, and rejection signals for collapse drift.
- **What this communicates:** API boundary behavior and durable runtime behavior remain intentionally split and must not collapse into one surface.
- **Who should read this:** architecture owners, plugin authors proposing simplifications, and reviewers evaluating workflow/API boundary changes.
- **Jump conditions:** for host wiring details, jump to [07-host-composition.md](./07-host-composition.md); for workflow trigger/runtime boundary details, jump to [08-workflow-api-boundaries.md](./08-workflow-api-boundaries.md); for durable endpoint constraints, jump to [09-durable-endpoints.md](./09-durable-endpoints.md).


## In Scope
- Canonical split posture between boundary API harness and durable execution harness.
- Anti-dual-path guardrails.
- Adoption exception and scale rule governance.

## Out of Scope
- Detailed host implementation internals (see [07-host-composition.md](./07-host-composition.md)).
- Workflow trigger and durable endpoint specifics (see [08-workflow-api-boundaries.md](./08-workflow-api-boundaries.md), [09-durable-endpoints.md](./09-durable-endpoints.md)).

## Canonical Policy
1. Split is retained as canonical: API boundary and durability harness are distinct.
2. Full collapse into one surface is rejected.
3. Workflow surfaces are manifest-driven and capability-first (`/api/workflows/<capability>/*`) while `/api/inngest` remains runtime ingress only.
4. Workflow/API boundary contracts are plugin-owned; workflow trigger/status I/O schemas remain at workflow plugin boundary contracts.
5. Caller mode determines client + auth semantics (first-party callers including MFEs by default use `RPCLink` on `/rpc`; external callers use published OpenAPI clients on `/api/orpc/*` and `/api/workflows/<capability>/*`; runtime ingress uses signed `/api/inngest`).
6. Composition and mounting language MUST stay explicit (no black-box route or ownership narratives).
7. No dedicated `/rpc/workflows` mount is required by default.

## Caller-Mode Boundary Enforcement
This table is an axis-local projection of the canonical caller/auth matrix in [ARCHITECTURE.md](../ARCHITECTURE.md).

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
- Packet decisions: `../DECISIONS.md:11`
- Packet example: `../examples/e2e-03-microfrontend-integration.md:22`
- Inngest: [Serve](https://www.inngest.com/docs/reference/serve)
- Inngest: [Durable endpoints](https://www.inngest.com/docs/learn/durable-endpoints)

## Cross-Axis Links
- Internal calling defaults: [02-internal-clients.md](./02-internal-clients.md)
- Workflow/API trigger boundary: [08-workflow-api-boundaries.md](./08-workflow-api-boundaries.md)
- Durable endpoint additive posture: [09-durable-endpoints.md](./09-durable-endpoints.md)
- Micro-frontend integration example: [e2e-03-microfrontend-integration.md](../examples/e2e-03-microfrontend-integration.md)
