# Axis 09: Durable Endpoints vs Durable Functions

## Role Metadata
- Role: Normative Annex
- Authority: Binding choice and guardrails for durable execution path selection.
- Owns: canonical durable-execution primitive for first-party workflows and additive-adapter constraints.
- Depends on: `./ORPC_INGEST_SPEC_PACKET.md`, `./DECISIONS.md`, `./CANONICAL_ROLE_CONTRACT.md`.
- Last validated against: `../SESSION_019c587a_INFO_DESIGN_CONVERGED_DIRECTION.md`.

## Depends on Core (Normative)
1. Packet-global route-family and caller/auth boundaries are owned in `./ORPC_INGEST_SPEC_PACKET.md`.
2. Decision-state ownership for workflow split posture remains in `./DECISIONS.md`.

## Axis-Specific Normative Deltas
1. Inngest durable functions are canonical for first-party durable workflow execution.
2. Durable endpoints MAY be used only as additive ingress adapters for non-overlapping ingress needs.
3. Durable endpoints MUST NOT create a parallel first-party trigger authoring path for the same capability behavior.
4. If durable endpoints are introduced, they MUST remain explicitly subordinate to canonical workflow-trigger and durable-function ownership, with non-overlap documented.

## Canonical Placement
```text
plugins/workflows/<capability>/src/
  functions/*   # canonical durable execution
  durable/*     # optional additive ingress adapters only
```

## Out of Scope
- Workflow trigger contract/router authoring (`AXIS_08_WORKFLOWS_VS_APIS_BOUNDARIES.md`).
- Host mount/bootstrap wiring (`AXIS_07_HOST_HOOKING_COMPOSITION.md`).

## References
- Core owner: `./ORPC_INGEST_SPEC_PACKET.md`
- Decision ledger: `./DECISIONS.md`
- Inngest durable endpoints: https://www.inngest.com/docs/learn/durable-endpoints
- Inngest functions: https://www.inngest.com/docs/reference/functions/create
