# Axis 04: Composition and Host Fixtures

## Canonical Source
Extracted from:
- `../SESSION_019c587a_ORPC_INNGEST_WORKFLOWS_POSTURE_SPEC.md` (Per-Axis Policy Axis 7, Hard Rules, Canonical File Inventory, Required Root Fixtures, Canonical Harness Files, Glue Boundaries and Ownership)

## In Scope
- Composition spine and mount ownership in host runtime.
- Required root fixtures for contract/router/function composition.
- Canonical host and harness file responsibilities.

## Out of Scope
- Internal package domain/service/procedure details (see [AXIS_01_INTERNAL_PACKAGE_LAYERING.md](./AXIS_01_INTERNAL_PACKAGE_LAYERING.md)).
- Boundary plugin contract policy details (see [AXIS_02_BOUNDARY_CONTRACT_FIRST_PLUGINS.md](./AXIS_02_BOUNDARY_CONTRACT_FIRST_PLUGINS.md)).
- Trigger-vs-ingress boundary rationale details (see [AXIS_03_WORKFLOW_TRIGGERS_VS_INNGEST_INGRESS.md](./AXIS_03_WORKFLOW_TRIGGERS_VS_INNGEST_INGRESS.md)).

## Policy
1. Host MUST mount oRPC endpoints and Inngest ingress as separate explicit mounts.
2. Host MUST own Inngest client/function bundle composition and pass Inngest client into oRPC context where enqueue bridging is required.
3. Host SHOULD keep parse-safe forwarding semantics for oRPC handler mounts.
4. One runtime-owned Inngest client bundle per process MUST be preserved.

## Composition Spine (Canonical)
1. Build composed contract/router tree at the composition root (`rawr.hq.ts` fixture shape).
2. Build Inngest bundle (`client + functions`) in host composition.
3. Mount `/api/inngest` as runtime ingress.
4. Register oRPC routes and OpenAPI generation from the composed oRPC router.

## Required Root Fixtures
- `packages/orpc-standards/src/index.ts`
- `packages/orpc-standards/src/typebox-standard-schema.ts`
- `rawr.hq.ts` (composition root fixture)
- `apps/server/src/rawr.ts` (host fixture mount root)

## Canonical Harness File Responsibilities
- `packages/core/src/orpc/hq-router.ts`: aggregate oRPC contract root.
- `packages/coordination-inngest/src/adapter.ts`: Inngest client/serve/function/queue bridge.
- `apps/server/src/orpc.ts`: oRPC handlers, context injection, OpenAPI generation, route mounting.
- `apps/server/src/rawr.ts`: host composition order and explicit split mounts.

## Glue Boundaries and Ownership
1. Host app owns mount boundaries and runtime wiring.
2. oRPC layer owns boundary contract exposure and request context.
3. Workflow trigger routers own enqueue semantics.
4. Inngest functions own durable step execution semantics.
5. Domain packages own reusable capability logic and internal client contract.

## Optional Composition Helpers
Optional DX helpers are allowed when they do not change semantic policy:
- `packages/core/src/composition/capability-composer.ts`
- `packages/core/src/composition/surfaces.ts`
- `packages/core/src/orpc/with-internal-client.ts`

## Cross-Axis Links
- Internal package layering: [AXIS_01_INTERNAL_PACKAGE_LAYERING.md](./AXIS_01_INTERNAL_PACKAGE_LAYERING.md)
- Boundary contract-first plugins: [AXIS_02_BOUNDARY_CONTRACT_FIRST_PLUGINS.md](./AXIS_02_BOUNDARY_CONTRACT_FIRST_PLUGINS.md)
- Trigger-vs-ingress boundary: [AXIS_03_WORKFLOW_TRIGGERS_VS_INNGEST_INGRESS.md](./AXIS_03_WORKFLOW_TRIGGERS_VS_INNGEST_INGRESS.md)
- Exception and scale governance: [AXIS_05_ADOPTION_EXCEPTION_AND_SCALE_RULES.md](./AXIS_05_ADOPTION_EXCEPTION_AND_SCALE_RULES.md)

## Implementation Checklist
1. Keep mount order explicit: runtime setup -> Inngest bundle -> `/api/inngest` mount -> oRPC route registration.
2. Keep composed oRPC tree as external SDK/OpenAPI generation source.
3. Keep Inngest ingress isolated from caller-facing trigger route semantics.
4. Keep helper abstractions optional and transparent.
