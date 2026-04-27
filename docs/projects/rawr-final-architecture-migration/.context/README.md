# Migration Execution Packets

This directory holds two kinds of migration context:

- shared pre-phase context that applies across the migration
- phase-scoped execution packets that act like durable session packets for an active phase

## Shared Context

These files are cross-phase scaffolding, not live phase packets:

- `grounding.md`: original cross-phase grounding for the migration effort
- `workflow.md`: original cross-phase workflow framing
- `prework-agent-team.md`: pre-execution team/orchestration notes

Treat them as background context. When a phase has its own execution packet, that packet becomes the first-hop re-entry lane.

## Phase Packets

Current phase-scoped execution packets:

- `M1-execution/`: the frozen Phase 1 packet
- `M2-migration-planning-packet/`: active first-hop packet for M2 migration planning authority, scope, and reference boundaries.

Quarantined phase packets:

- `quarantine/M2-execution/`: pre-final M2 execution packet, preserved for provenance only.
- `quarantine/M2-runtime-realization-lock-spike/`: finalization/lock-spike packet, preserved for provenance only.

Each phase packet should keep the same shape:

```text
M?-execution/
  README.md
  grounding.md
  workflow.md
  frame.md
  context.md
  handoffs/
  notes/
```

The invariants are:

- live packet files stay small, current, and authoritative for that phase
- historical handoffs stay preserved, but out of the first-hop lane
- retained notes stay available without becoming hidden authority
- when a phase closes, its packet freezes instead of being reused as the next phase's live context

For M2 migration planning, start from:

- `docs/projects/rawr-final-architecture-migration/resources/spec/RAWR_Canonical_Architecture_Spec.md`
- `docs/projects/rawr-final-architecture-migration/resources/spec/RAWR_Effect_Runtime_Realization_System_Canonical_Spec.md`
- `docs/projects/rawr-final-architecture-migration/.context/M2-migration-planning-packet/`
- a fresh current-repo audit
