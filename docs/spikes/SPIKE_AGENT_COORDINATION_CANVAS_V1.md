# Spike: Agent Coordination Canvas v1 (Inngest + Microfrontend Envelope)

Date: 2026-02-06  
Status: Completed (implementation-facing)

## Scope
1. Confirm Inngest viability for typed coordination workflow execution and tracing.
2. Confirm microfrontend strategy choice for v1 delivery constraints.

## Findings

### Inngest
1. `inngest` and `@inngest/workflow-kit` are available and version-pinnable.
2. Inngest-oriented model can map desk actions + handoff edges with typed contracts.
3. Run timeline/tracing can be surfaced in RAWR endpoints and enriched with app-specific events.

### Microfrontend Strategy
1. Vercel microfrontends are a valid longer-term deployment/composition path.
2. For v1, retaining current local-first RAWR host/runtime provides lower migration risk and faster delivery.
3. Future Vercel migration remains viable by preserving clean app/package boundaries.

## Implementation Decisions
1. Pin adapter package dependencies:
   - `inngest@3.51.0`
   - `@inngest/workflow-kit@0.1.3`
2. Implement v1 on current RAWR app shell + server runtime.
3. Expose typed run/timeline endpoints and CLI parity commands now.

## Risks
1. Full remote Inngest execution semantics are represented through a local deterministic adapter in this phase.
2. As Inngest APIs evolve, adapter package should be version-reviewed before upgrades.

## Next Checks
1. End-to-end tests validate create/validate/run/timeline path.
2. Add follow-up issue for managed Inngest environment integration if hosted mode is needed.
