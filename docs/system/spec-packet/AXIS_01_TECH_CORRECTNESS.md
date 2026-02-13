# Axis 01: Tech Correctness (oRPC, Inngest, TypeBox, Elysia)

## Why this axis matters
If the architecture is correct in shape but wrong in technology mechanics, we accumulate invisible fragility: contracts drift, workflow behavior diverges, and host mounting becomes inconsistent.

## Grounding Anchors
- `packages/coordination/src/orpc/contract.ts`
- `packages/coordination/src/orpc/schemas.ts`
- `packages/core/src/orpc/hq-router.ts`
- `packages/coordination-inngest/src/adapter.ts`
- `apps/server/src/orpc.ts`
- `apps/server/src/rawr.ts`

## Findings with Rationale and Implications

### F1 (High): Composition authority is still host-centric in current code
Observation:
- ORPC and Inngest composition logic is still authored directly in server fixtures.

Rationale for change:
- This violates the manifest-first architecture and reintroduces dual wiring paths.

Implication if not fixed:
- New capabilities will require fixture edits and drift from package->plugin->manifest flow.

Required closure:
- `rawr.hq.ts` exports composed ORPC/Inngest artifacts,
- host fixtures mount exports only.

### F2 (Medium): Workflow registration must be plugin-aggregated, not capability-hardcoded
Observation:
- Inngest wiring is currently coordination-specific.

Rationale for change:
- The target model needs any workflow plugin to register functions without fixture edits.

Implication if not fixed:
- Workflow surface won’t scale; every new workflow capability becomes custom server plumbing.

Required closure:
- `registerWorkflowPlugin(...) -> { functions }`
- manifest aggregates function arrays into one mounted handler.

### F3 (Medium): TypeBox/oRPC schema bridge contract needs explicit enforcement
Observation:
- Schema conversion depends on a shared bridge helper pattern.

Rationale for change:
- Inconsistent schema wrapping breaks OpenAPI generation and runtime validation parity.

Implication if not fixed:
- contract docs and runtime behavior diverge, creating hard-to-debug API drift.

Required closure:
- one mandated TypeBox->Standard Schema bridge for all exposed procedures.

## Technology Policy Decisions
1. **oRPC**: contract-first per package; implementation per API plugin; root composition in manifest.
2. **Inngest**: functions registered per workflow plugin; one aggregated serve mount.
3. **TypeBox**: shared schema artifact source for API/workflow/CLI/agent knowledge surfaces.
4. **Elysia hosts**: mount composed artifacts, do not compose capabilities.

## Verification Gates
1. Manifest exports ORPC + Inngest artifacts consumed by hosts.
2. Workflow plugins register via standard registration contract.
3. ORPC contracts consistently use shared TypeBox bridge.
4. Boundary lint blocks plugin-to-plugin runtime imports.

## Residual Risks
1. Startup-time composition only (no hot reload) may delay dynamic toggles.
2. Transitional period may keep legacy paths alive longer than intended.

Mitigation:
- explicit migration gates in `AXIS_04_SYSTEM_TESTING_SYNC.md`.
