# ORPC + Inngest Spec Packet

## Canonical Source
This packet is an extraction of:
- `../SESSION_019c587a_ORPC_INNGEST_WORKFLOWS_POSTURE_SPEC.md`

If any text in this packet conflicts with the source posture spec, the source posture spec wins.

## In Scope
- Canonical posture for oRPC boundary APIs, workflow trigger APIs, Inngest durable execution, and optional durable endpoint adapters.
- Packet-level routing so implementers can find the right policy file quickly.
- Concern ownership boundaries to prevent policy duplication.

## Out of Scope
- Introducing new architecture choices not already present in the posture spec.
- Migration sequencing details beyond what is already locked in posture.
- Expanding examples into additional policy.

## Locked Posture (Inherited)
1. Keep split semantics between API boundary and durable execution; reject full runtime-surface collapse.
2. Use oRPC as the primary API harness (contracts, routers, OpenAPI, external client generation).
3. Use Inngest functions as the primary durability harness (durable orchestration, retries, step semantics).
4. Treat Inngest durable endpoints as additive ingress adapters only, never as a second first-party trigger authoring path.

## Packet Topology
- [AXIS_01_INTERNAL_PACKAGE_LAYERING.md](./AXIS_01_INTERNAL_PACKAGE_LAYERING.md): internal package shape and internal-calling defaults.
- [AXIS_02_BOUNDARY_CONTRACT_FIRST_PLUGINS.md](./AXIS_02_BOUNDARY_CONTRACT_FIRST_PLUGINS.md): boundary API contract-first plugin posture.
- [AXIS_03_WORKFLOW_TRIGGERS_VS_INNGEST_INGRESS.md](./AXIS_03_WORKFLOW_TRIGGERS_VS_INNGEST_INGRESS.md): trigger surfaces vs `/api/inngest` ingress boundary.
- [AXIS_04_COMPOSITION_AND_HOST_FIXTURES.md](./AXIS_04_COMPOSITION_AND_HOST_FIXTURES.md): composition spine, host mounts, and fixture glue.
- [AXIS_05_ADOPTION_EXCEPTION_AND_SCALE_RULES.md](./AXIS_05_ADOPTION_EXCEPTION_AND_SCALE_RULES.md): explicit exception and scaling guardrails.
- [DECISIONS.md](./DECISIONS.md): packet-local decision ledger status.

## Concern Ownership (No Duplication)
| Concern | Owner file | Linked files |
| --- | --- | --- |
| Internal package layering and internal call defaults | [AXIS_01_INTERNAL_PACKAGE_LAYERING.md](./AXIS_01_INTERNAL_PACKAGE_LAYERING.md) | [AXIS_02_BOUNDARY_CONTRACT_FIRST_PLUGINS.md](./AXIS_02_BOUNDARY_CONTRACT_FIRST_PLUGINS.md), [AXIS_04_COMPOSITION_AND_HOST_FIXTURES.md](./AXIS_04_COMPOSITION_AND_HOST_FIXTURES.md) |
| Boundary API contract-first policy and external client generation path | [AXIS_02_BOUNDARY_CONTRACT_FIRST_PLUGINS.md](./AXIS_02_BOUNDARY_CONTRACT_FIRST_PLUGINS.md) | [AXIS_03_WORKFLOW_TRIGGERS_VS_INNGEST_INGRESS.md](./AXIS_03_WORKFLOW_TRIGGERS_VS_INNGEST_INGRESS.md), [AXIS_04_COMPOSITION_AND_HOST_FIXTURES.md](./AXIS_04_COMPOSITION_AND_HOST_FIXTURES.md) |
| Workflow triggers vs durable ingress and durable endpoint posture | [AXIS_03_WORKFLOW_TRIGGERS_VS_INNGEST_INGRESS.md](./AXIS_03_WORKFLOW_TRIGGERS_VS_INNGEST_INGRESS.md) | [AXIS_02_BOUNDARY_CONTRACT_FIRST_PLUGINS.md](./AXIS_02_BOUNDARY_CONTRACT_FIRST_PLUGINS.md), [AXIS_04_COMPOSITION_AND_HOST_FIXTURES.md](./AXIS_04_COMPOSITION_AND_HOST_FIXTURES.md) |
| Host composition and mount wiring | [AXIS_04_COMPOSITION_AND_HOST_FIXTURES.md](./AXIS_04_COMPOSITION_AND_HOST_FIXTURES.md) | [AXIS_01_INTERNAL_PACKAGE_LAYERING.md](./AXIS_01_INTERNAL_PACKAGE_LAYERING.md), [AXIS_03_WORKFLOW_TRIGGERS_VS_INNGEST_INGRESS.md](./AXIS_03_WORKFLOW_TRIGGERS_VS_INNGEST_INGRESS.md) |
| Exception and scale governance | [AXIS_05_ADOPTION_EXCEPTION_AND_SCALE_RULES.md](./AXIS_05_ADOPTION_EXCEPTION_AND_SCALE_RULES.md) | All axis docs |

## Navigation Map (If You Need X, Read Y)
- If you need internal package structure and where `client.ts` fits, read [AXIS_01_INTERNAL_PACKAGE_LAYERING.md](./AXIS_01_INTERNAL_PACKAGE_LAYERING.md).
- If you need boundary plugin contract/router rules and OpenAPI client-generation source policy, read [AXIS_02_BOUNDARY_CONTRACT_FIRST_PLUGINS.md](./AXIS_02_BOUNDARY_CONTRACT_FIRST_PLUGINS.md).
- If you need workflow trigger route policy and `/api/inngest` ingress boundaries, read [AXIS_03_WORKFLOW_TRIGGERS_VS_INNGEST_INGRESS.md](./AXIS_03_WORKFLOW_TRIGGERS_VS_INNGEST_INGRESS.md).
- If you need host mount order, composition spine, and required root fixtures, read [AXIS_04_COMPOSITION_AND_HOST_FIXTURES.md](./AXIS_04_COMPOSITION_AND_HOST_FIXTURES.md).
- If you need to decide whether direct adoption is allowed or whether to split handlers/contracts, read [AXIS_05_ADOPTION_EXCEPTION_AND_SCALE_RULES.md](./AXIS_05_ADOPTION_EXCEPTION_AND_SCALE_RULES.md).
- If you need to check whether new packet-local decisions exist, read [DECISIONS.md](./DECISIONS.md).

## Integrity Rules
1. This packet inherits policy only from the canonical posture spec.
2. Examples in this packet are illustrative and cannot introduce new normative policy.
3. Any new architecture-impacting choice discovered during further extraction or implementation must be recorded in [DECISIONS.md](./DECISIONS.md) before proceeding.
