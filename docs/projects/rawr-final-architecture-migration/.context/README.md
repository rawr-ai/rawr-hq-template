# Migration Context

This directory is the active context router for final-architecture migration planning.

For M2 migration planning, start from:

- `docs/system/HABITAT_ARCHITECTURE.md`
- `docs/system/HABITAT_RUNTIME_REALIZATION.md`
- `docs/projects/rawr-final-architecture-migration/.context/M2-migration-planning-packet/`
- a fresh current-repo audit

## Active Packet

Current phase-scoped migration-provenance packet:

- `M2-migration-planning-packet/`: retained M2 planning context subordinate to the
  canonical Habitat specifications. Its audits describe source snapshots and do
  not override current system authority.

## Archived Context

Archive-only historical packets:

- The frozen Phase 1 execution packet under `_archive/`.
- `_archive/pre-M2-shared-context/`: pre-M2 shared grounding, workflow, and prework scaffolding.

Archived context is not active migration authority. Use it only for historical reconstruction when the active M2 packet or final specs explicitly need that background.

## Quarantined Context

Quarantined phase packets are target-sensitive provenance that may still be mined during migration planning or follow-up rebuilds:

- `quarantine/M2-execution/`: pre-final M2 execution packet, preserved for provenance only.
- `quarantine/M2-runtime-realization-lock-spike/`: finalization/lock-spike packet, preserved for provenance only.

Quarantine paths are not active instructions. Use their ledgers first, then mine individual documents only when needed.
