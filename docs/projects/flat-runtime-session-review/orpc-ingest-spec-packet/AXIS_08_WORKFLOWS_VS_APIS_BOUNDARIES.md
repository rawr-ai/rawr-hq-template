# Axis 08: Workflows vs APIs Boundaries

## Role Metadata
- Role: Normative Annex
- Authority: Binding rules for workflow trigger boundary authoring versus durable runtime execution.
- Owns: trigger-router versus durable-function split, boundary contract ownership for workflow surfaces, and workflow route-family behavior.
- Depends on: `./ORPC_INGEST_SPEC_PACKET.md`, `./DECISIONS.md`, `./CANONICAL_ROLE_CONTRACT.md`.
- Last validated against: `../SESSION_019c587a_INFO_DESIGN_CONVERGED_DIRECTION.md`.

## Depends on Core (Normative)
1. Packet-global caller/auth matrix and route-family boundaries are owned in `./ORPC_INGEST_SPEC_PACKET.md`.
2. Decision-state ownership for workflow split and transport/publication posture is in `./DECISIONS.md` (D-005, D-006, D-007).

## Axis-Specific Normative Deltas
1. Workflow trigger APIs MUST remain caller-facing oRPC procedures that dispatch durable work into Inngest.
2. Durable execution MUST remain in Inngest function definitions.
3. Host split-path enforcement MUST remain explicit:
   - caller-facing workflow trigger/status routes on `/api/workflows/<capability>/*` (mounted via `/api/workflows/*`);
   - runtime ingress on `/api/inngest` only.
4. Workflow trigger/status boundary contracts and I/O schemas MUST remain workflow-plugin owned (`plugins/workflows/<capability>/src/contract.ts` or adjacent workflow boundary modules).
5. Packages MAY provide shared domain logic/schemas but MUST NOT own caller-facing workflow boundary contracts.
6. Domain modules (`domain/*`) MUST remain transport-independent and MUST NOT own procedure/boundary I/O semantics.
7. Shared workflow boundary context/request metadata SHOULD live in explicit context modules (`context.ts`), not in `domain/*`.
8. First-party callers (including MFEs by default) use `/rpc` via `RPCLink`; externally published workflow clients use `/api/workflows/<capability>/*` via OpenAPI.
9. Browser/API callers MUST NOT invoke `/api/inngest`; runtime ingress requires signed verification at host.
10. No dedicated `/rpc/workflows` mount is required by default.
11. Workflow trigger docs/examples SHOULD default to inline `.input(...)` and `.output(...)`; extraction is exception-only for shared/large readability and SHOULD use paired `{ input, output }` shape.
12. Workflow composition docs MUST keep mount/ownership wiring explicit and avoid black-box policy text.

## Consumer Model (Condensed)
- First-party/internal callers: `/rpc` (internal transport).
- External/third-party callers: `/api/orpc/*` and `/api/workflows/<capability>/*` (published OpenAPI transport).
- Runtime ingress: `/api/inngest` only (signed runtime callbacks).

## Out of Scope
- Durable endpoint additive-adapter posture (`AXIS_09_DURABLE_ENDPOINTS_VS_DURABLE_FUNCTIONS.md`).
- Full host wiring bootstrap/mount details (`AXIS_07_HOST_HOOKING_COMPOSITION.md`).

## References
- Core owner: `./ORPC_INGEST_SPEC_PACKET.md`
- Decision ledger: `./DECISIONS.md`
- Example orientation: `./examples/E2E_03_MICROFRONTEND_API_WORKFLOW_INTEGRATION.md`
- Example orientation: `./examples/E2E_04_CONTEXT_AND_MIDDLEWARE_REAL_WORLD.md`
- oRPC contract-first define: https://orpc.dev/docs/contract-first/define-contract
- Inngest serve: https://www.inngest.com/docs/reference/serve
