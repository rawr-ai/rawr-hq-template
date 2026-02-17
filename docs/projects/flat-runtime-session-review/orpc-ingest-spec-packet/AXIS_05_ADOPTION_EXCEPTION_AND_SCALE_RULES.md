# Axis 05: Adoption Exception and Scale Rules

## Canonical Source
Extracted from:
- `../SESSION_019c587a_ORPC_INNGEST_WORKFLOWS_POSTURE_SPEC.md` (Adoption Exception, Scale Rule, Anti-Dual-Path Policy, Naming Rules)

## In Scope
- Explicit exception posture for direct boundary adoption of internal surfaces.
- Default scaling progression for handler/operation and contract decomposition.
- Guardrails to prevent policy drift while scaling.

## Out of Scope
- Defining core runtime boundaries from scratch (see [ORPC_INGEST_SPEC_PACKET.md](./ORPC_INGEST_SPEC_PACKET.md)).
- Replacing axis-specific policy ownership in other packet docs.

## Adoption Exception (Explicit)
Default posture remains boundary-owned contracts plus boundary operations.

Exception is allowed only when all of the following are documented:
1. Boundary overlap with internal package surface is truly 1:1.
2. Reason overlap is truly 1:1 is explicitly recorded.
3. Trigger for returning to boundary-owned contracts is explicitly recorded.

## Scale Rule (Default Progression)
1. Split implementation handlers/operations first.
2. Split contracts only when behavior, policy, or external audience diverges.

## Anti-Dual-Path Guardrail
Dual path is disallowed unless paths are truly non-overlapping by contract and runtime behavior.

Allowed non-overlap pairing:
1. Internal synchronous path via `packages/<capability>/src/client.ts`.
2. Durable asynchronous path via Inngest event/function flow.

## Practical Decision Checks
Before introducing more structure:
1. Is handler/operation complexity the real problem? If yes, split handlers first.
2. Has boundary behavior/policy/audience diverged? If no, do not split contracts.
3. Would this introduce a parallel first-party trigger path? If yes, reject.

## Cross-Axis Links
- Internal package defaults: [AXIS_01_INTERNAL_PACKAGE_LAYERING.md](./AXIS_01_INTERNAL_PACKAGE_LAYERING.md)
- Boundary contract-first defaults: [AXIS_02_BOUNDARY_CONTRACT_FIRST_PLUGINS.md](./AXIS_02_BOUNDARY_CONTRACT_FIRST_PLUGINS.md)
- Trigger-vs-ingress split posture: [AXIS_03_WORKFLOW_TRIGGERS_VS_INNGEST_INGRESS.md](./AXIS_03_WORKFLOW_TRIGGERS_VS_INNGEST_INGRESS.md)
- Composition and host fixtures: [AXIS_04_COMPOSITION_AND_HOST_FIXTURES.md](./AXIS_04_COMPOSITION_AND_HOST_FIXTURES.md)
- Decision log status: [DECISIONS.md](./DECISIONS.md)

## Implementation Checklist
1. Treat exception usage as explicit and documented, never implicit default.
2. Apply scale rule in order: handler split before contract split.
3. Preserve anti-dual-path guarantee while scaling.
