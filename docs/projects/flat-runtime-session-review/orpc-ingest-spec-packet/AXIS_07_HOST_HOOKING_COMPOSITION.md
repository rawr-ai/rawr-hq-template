# Axis 07: Host Hooking and Composition

## Role Metadata
- Role: Normative Annex
- Authority: Binding host-composition and mount-order constraints for packet surfaces.
- Owns: host wiring order, route-family mount boundaries, runtime bundle ownership, and explicit composition visibility rules.
- Depends on: `./ORPC_INGEST_SPEC_PACKET.md`, `./DECISIONS.md`, `./CANONICAL_ROLE_CONTRACT.md`.
- Last validated against: `../SESSION_019c587a_INFO_DESIGN_CONVERGED_DIRECTION.md`.

## Depends on Core (Normative)
1. Packet-global caller/auth matrix and route-family contracts are owned in `./ORPC_INGEST_SPEC_PACKET.md`.
2. Decision-state ownership for host bootstrap and mount locks is in `./DECISIONS.md` (D-005, D-006, D-007, D-008).

## Axis-Specific Normative Deltas
1. Host MUST compose one runtime-owned Inngest bundle (`client + functions`) per process.
2. Host MUST initialize baseline `extendedTracesMiddleware()` before constructing Inngest bundle, workflow composition, or route registration (D-008).
3. Host MUST mount route families in explicit control-plane order:
   - `/api/inngest`
   - `/api/workflows/*`
   - `/rpc` and `/api/orpc/*`
4. Host MUST keep `/api/inngest` runtime-only ingress and never treat it as caller API.
5. Host MUST consume plugin-owned boundary contracts/routers from manifest composition; package layers remain transport-neutral contributors, not boundary owners.
6. Host MUST keep parse-safe forwarding semantics on oRPC forwarding mounts.
7. Host MUST NOT introduce a dedicated `/rpc/workflows` mount by default.
8. Composition docs/snippets MUST keep route ownership explicit and MUST NOT hide core wiring inside black-box policy narratives.

## Composition-Critical Inventory (Repo-Relative)
- `rawr.hq.ts`
- `apps/server/src/rawr.ts`
- `apps/server/src/orpc.ts`
- `apps/server/src/workflows/context.ts`
- `packages/core/src/orpc/hq-router.ts`
- `packages/coordination-inngest/src/adapter.ts`

## Out of Scope
- External client publication policy (`AXIS_01_EXTERNAL_CLIENT_GENERATION.md`).
- Trigger/durable boundary authoring details (`AXIS_08_WORKFLOWS_VS_APIS_BOUNDARIES.md`).

## References
- Core owner: `./ORPC_INGEST_SPEC_PACKET.md`
- Decision ledger: `./DECISIONS.md`
- Example orientation: `./examples/E2E_04_CONTEXT_AND_MIDDLEWARE_REAL_WORLD.md`
