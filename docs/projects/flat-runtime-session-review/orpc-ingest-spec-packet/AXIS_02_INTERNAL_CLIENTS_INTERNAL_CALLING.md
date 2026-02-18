# Axis 02: Internal Clients and Internal Calling

## Role Metadata
- Role: Normative Annex
- Authority: Binding defaults for server-internal invocation and package-layer call structure.
- Owns: internal call-path defaults, package transport-neutral constraints, and internal-client usage boundaries.
- Depends on: `./ORPC_INGEST_SPEC_PACKET.md`, `./DECISIONS.md`, `./CANONICAL_ROLE_CONTRACT.md`.
- Last validated against: `../SESSION_019c587a_INFO_DESIGN_CONVERGED_DIRECTION.md`.

## Depends on Core (Normative)
1. Packet-wide caller/auth matrix and route-family boundaries are owned in `./ORPC_INGEST_SPEC_PACKET.md`.
2. Decision state for boundary ownership and transport/publication policy is owned in `./DECISIONS.md` (D-006, D-007).

## Axis-Specific Normative Deltas
1. Default server-internal cross-boundary calls MUST use in-process package internal clients (`packages/<capability>/src/client.ts`).
2. Server runtime code MUST NOT use local HTTP self-calls (`/rpc`, `/api/orpc/*`, `/api/workflows/*`) as the default internal path.
3. Packages MUST remain transport-neutral and MUST NOT own caller-facing workflow trigger/status boundary contracts.
4. Workflow/API boundary contracts remain plugin-owned; package reuse of domain logic does not transfer boundary ownership.
5. Shared procedure context contracts SHOULD live in explicit `context.ts` modules (or equivalent dedicated context modules) and be consumed by router/client modules.
6. Request/correlation/principal/network metadata contracts are context-layer concerns and SHOULD NOT be owned in `domain/*`.
7. Procedure/contract I/O schemas in docs/examples SHOULD default to inline `.input(...)` and `.output(...)`; extraction is exception-only for shared/large cases and SHOULD use paired `{ input, output }` shape.

## Canonical Internal Package Shape
```text
packages/<capability>/src/
  domain/*
  service/*
  procedures/*
  context.ts
  router.ts
  client.ts
  errors.ts
  index.ts
```

## Out of Scope
- External SDK generation policy (`AXIS_01_EXTERNAL_CLIENT_GENERATION.md`).
- Trigger/runtime split semantics (`AXIS_08_WORKFLOWS_VS_APIS_BOUNDARIES.md`).

## References
- Core owner: `./ORPC_INGEST_SPEC_PACKET.md`
- Decision ledger: `./DECISIONS.md`
- Example orientation: `./examples/E2E_02_API_PLUS_WORKFLOWS_COMPOSED_CAPABILITY.md`
- oRPC server-side clients: https://orpc.dev/docs/client/server-side
