# Axis 03: Split vs Collapse

## Role Metadata
- Role: Normative Annex
- Authority: Binding posture for split architecture and anti-collapse guardrails.
- Owns: split-retention policy, anti-dual-path constraints, and explicit exception criteria.
- Depends on: `./ORPC_INGEST_SPEC_PACKET.md`, `./DECISIONS.md`, `./CANONICAL_ROLE_CONTRACT.md`.
- Last validated against: `../SESSION_019c587a_INFO_DESIGN_CONVERGED_DIRECTION.md`.

## Depends on Core (Normative)
1. Packet-global invariants and caller/auth matrix are owned in `./ORPC_INGEST_SPEC_PACKET.md`.
2. Decision state for split and boundary locks is owned in `./DECISIONS.md` (D-005, D-006, D-007).

## Axis-Specific Normative Deltas
1. Split architecture is canonical and retained: boundary API harness and durable execution harness are distinct and non-collapsible by default.
2. Capability-first caller-facing workflow paths remain manifest-driven on `/api/workflows/<capability>/*`, while `/api/inngest` remains runtime ingress only.
3. Full collapse into a single first-party authoring surface is rejected.
4. Disallowed: parallel first-party trigger authoring paths for the same capability behavior.
5. Allowed non-overlapping pair:
   - in-process package internal client path for synchronous internal work;
   - Inngest event/function path for durable asynchronous orchestration.
6. Composition and mount ownership language MUST remain explicit; black-box route narratives are not acceptable as policy text.

## Adoption Exception (Constrained)
A direct-adoption shortcut is allowed only when all are documented:
1. boundary and internal surfaces are truly 1:1;
2. reason for 1:1 overlap is explicit;
3. rollback criteria to boundary-owned contracts are explicit.

## Out of Scope
- Host wiring implementation details (`AXIS_07_HOST_HOOKING_COMPOSITION.md`).
- Detailed workflow trigger and durable endpoint authoring (`AXIS_08_WORKFLOWS_VS_APIS_BOUNDARIES.md`, `AXIS_09_DURABLE_ENDPOINTS_VS_DURABLE_FUNCTIONS.md`).

## References
- Core owner: `./ORPC_INGEST_SPEC_PACKET.md`
- Decision ledger: `./DECISIONS.md`
- Example orientation: `./examples/E2E_03_MICROFRONTEND_API_WORKFLOW_INTEGRATION.md`
