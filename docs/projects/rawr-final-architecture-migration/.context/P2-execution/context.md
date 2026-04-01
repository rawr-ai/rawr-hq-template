# Current Phase Context

## Current State

- Phase: `P2` — `Minimal Canonical Runtime Shell`
- Current branch: `agent-FARGO-P2-execution-packet-bootstrap`
- Current status:
  - Phase 1 is closed, review-closed, and frozen.
  - The repo is starting from the explicit Phase 2 entry conditions in `docs/migration/phase-2-entry-conditions.md`.
  - A dedicated Phase 2 execution packet now exists instead of reusing the M1 live lane.
  - No Phase 2 milestone packet or issue stack has been cut yet in the local migration docs.

## What This Packet Is For

This packet exists to keep Phase 2 work from accreting into the frozen M1 packet.

The next live move is not code implementation yet. It is Phase 2 execution setup:

- ground on the canonical Phase 2 sources
- shape the local Phase 2 milestone and slice packet if needed
- start with the explicit Slice 0 goal:
  - replace and delete `apps/hq/legacy-cutover.ts`

## Canonical References

Use these as the Phase 2 first-hop packet:

1. [README.md](/Users/mateicanavra/conductor/workspaces/rawr-hq-template/guangzhou/docs/projects/rawr-final-architecture-migration/.context/P2-execution/README.md)
2. [grounding.md](/Users/mateicanavra/conductor/workspaces/rawr-hq-template/guangzhou/docs/projects/rawr-final-architecture-migration/.context/P2-execution/grounding.md)
3. [workflow.md](/Users/mateicanavra/conductor/workspaces/rawr-hq-template/guangzhou/docs/projects/rawr-final-architecture-migration/.context/P2-execution/workflow.md)
4. [frame.md](/Users/mateicanavra/conductor/workspaces/rawr-hq-template/guangzhou/docs/projects/rawr-final-architecture-migration/.context/P2-execution/frame.md)
5. [phase-2-entry-conditions.md](/Users/mateicanavra/conductor/workspaces/rawr-hq-template/guangzhou/docs/migration/phase-2-entry-conditions.md)
6. [phase-1-closeout-review.md](/Users/mateicanavra/conductor/workspaces/rawr-hq-template/guangzhou/docs/projects/rawr-final-architecture-migration/phase-1-closeout-review.md)
7. [RAWR_Architecture_Migration_Plan.md](/Users/mateicanavra/conductor/workspaces/rawr-hq-template/guangzhou/docs/projects/rawr-final-architecture-migration/resources/RAWR_Architecture_Migration_Plan.md)

## Phase Invariants

- Do not reopen settled Phase 1 authority decisions.
- Treat `apps/hq/legacy-cutover.ts` as the one sanctioned executable bridge that should die first.
- Keep the active runtime lane narrow:
  - `server.api`
  - `async.workflows`
  - `async.schedules`
- Keep `plugins/agents/hq` frozen as compatibility-only carryover, not runtime precedent.
- Treat boot/runtime packages as hidden realization seams, not new semantic homes.

## Carry-Forward Risk

Before blaming Phase 2 runtime substrate for HQ Ops confusion, re-check:

- `services/hq-ops/src/service/modules/*`
- `services/example-todo/src/service/modules/*`
- [carry-forward-risks.md](/Users/mateicanavra/conductor/workspaces/rawr-hq-template/guangzhou/docs/projects/rawr-final-architecture-migration/.context/P2-execution/notes/carry-forward-risks.md)
- [HQ-OPS-service-shape-followup.md](/Users/mateicanavra/conductor/workspaces/rawr-hq-template/guangzhou/docs/projects/rawr-final-architecture-migration/.context/M1-execution/notes/HQ-OPS-service-shape-followup.md)
- `docs/projects/orpc-ingest-domain-packages/guidance.md`
