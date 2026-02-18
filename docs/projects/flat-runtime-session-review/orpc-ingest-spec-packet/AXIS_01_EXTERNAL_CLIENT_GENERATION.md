# Axis 01: External Client Generation

## Role Metadata
- Role: Normative Annex
- Authority: Binding rules for external SDK/client generation under canonical core policy.
- Owns: external publication boundaries, client generation defaults, and boundary contract ownership for client artifacts.
- Depends on: `./ORPC_INGEST_SPEC_PACKET.md`, `./DECISIONS.md`, `./CANONICAL_ROLE_CONTRACT.md`.
- Last validated against: `../SESSION_019c587a_INFO_DESIGN_CONVERGED_DIRECTION.md`.

## Depends on Core (Normative)
1. Packet-wide caller/auth matrix and route-family semantics are owned in `./ORPC_INGEST_SPEC_PACKET.md`.
2. Decision state for transport/publication and ownership policy locks is owned in `./DECISIONS.md` (D-006, D-007).

## Axis-Specific Normative Deltas
1. Externally published SDK/client artifacts MUST be generated from composed OpenAPI boundary surfaces only:
   - `/api/orpc/*`
   - `/api/workflows/<capability>/*`
2. RPC client artifacts (`RPCLink` on `/rpc`) MUST remain first-party/internal and MUST NOT be externally published.
3. First-party callers (including MFEs by default) SHOULD use RPC clients on `/rpc`; OpenAPI client usage is for external callers or explicit first-party exceptions.
4. Boundary contract ownership for published clients remains plugin-owned:
   - `plugins/api/<capability>/src/contract.ts`
   - `plugins/workflows/<capability>/src/contract.ts`
5. Packages MAY export shared domain schemas/helpers but MUST NOT own caller-facing workflow/API boundary contracts.
6. `/api/inngest` MUST NOT be published in external client artifacts or public SDK documentation.

## Out of Scope
- Internal in-process calling defaults (`AXIS_02_INTERNAL_CLIENTS_INTERNAL_CALLING.md`).
- Workflow trigger vs runtime-ingress split semantics (`AXIS_08_WORKFLOWS_VS_APIS_BOUNDARIES.md`).
- Host mount ordering and bootstrap composition (`AXIS_07_HOST_HOOKING_COMPOSITION.md`).

## References
- Core owner: `./ORPC_INGEST_SPEC_PACKET.md`
- Decision ledger: `./DECISIONS.md`
- Example orientation: `./examples/E2E_03_MICROFRONTEND_API_WORKFLOW_INTEGRATION.md`
- oRPC OpenAPI handler: https://orpc.dev/docs/openapi/openapi-handler
- oRPC OpenAPI client: https://orpc.dev/docs/openapi/client
