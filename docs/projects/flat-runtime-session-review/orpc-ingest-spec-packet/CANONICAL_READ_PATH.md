# ORPC/Inngest Packet Canonical Read Path

## Role Metadata
- Role: Normative Core
- Authority: Defines deterministic read order for this packet.
- Owns: canonical read sequence and entrypoint constraints.
- Depends on: `./ORPC_INGEST_SPEC_PACKET.md`, `./DECISIONS.md`, `./CANONICAL_ROLE_CONTRACT.md`.
- Last validated against: `../SESSION_019c587a_INFO_DESIGN_CONVERGED_DIRECTION.md`.

## Canonical Entrypoint
1. `./ORPC_INGEST_SPEC_PACKET.md` is the sole canonical read start.
2. No other file may be presented as a parallel policy root.

## Deterministic Read Sequence
1. `./ORPC_INGEST_SPEC_PACKET.md`
Read packet-wide invariants, caller/auth matrix, and ownership split.

2. `./DECISIONS.md`
Read closure/open status for D-005 through D-010 (and related locks), without re-owning global policy.

3. `./AXIS_01_EXTERNAL_CLIENT_GENERATION.md` through `./AXIS_09_DURABLE_ENDPOINTS_VS_DURABLE_FUNCTIONS.md`
Read annex constraints in axis order; treat these as delegated scope details under core invariants.

4. `../SESSION_019c587a_ORPC_INNGEST_WORKFLOWS_POSTURE_SPEC.md`
Use for integrative orientation only (reference role).

5. `./examples/E2E_01_BASIC_PACKAGE_PLUS_API_BOUNDARY.md` through `./examples/E2E_04_CONTEXT_AND_MIDDLEWARE_REAL_WORLD.md`
Use for implementation walkthroughs only (reference role).

6. `./REDISTRIBUTION_TRACEABILITY.md`
Use for section-lineage/provenance lookup only (reference role).

## Non-Canonical Inputs
1. Session plans/reviews/scratchpads/changelogs are historical/provenance artifacts and are not required to interpret current packet policy.
2. Local machine paths are not canonical anchors for packet interpretation.
