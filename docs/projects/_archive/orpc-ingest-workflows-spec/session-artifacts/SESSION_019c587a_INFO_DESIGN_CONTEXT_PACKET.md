# SESSION_019c587a Info Design Context Packet

## Locked Intent
- Build a standalone, portable canonical spec system.
- Improve implementation legibility by information shape, not by converting docs into an execution plan.

## Non-Goals
- No runtime code changes.
- No architecture policy redesign.
- No process/runbook redesign outside spec information architecture.

## Role Taxonomy (Mandatory)
- Normative Core: single source of subsystem policy and global invariants.
- Normative Annex: axis-specific deltas and constraints that depend on core.
- Reference: examples/overviews that explain and illustrate but do not own policy.
- Historical/Provenance: session logs, changelogs, review records, traceability narratives.

## Invariants
1. Canonical policy remains unchanged in meaning (D-005..D-010 preserved).
2. Global invariants are single-sourced in core, referenced elsewhere.
3. Every spec artifact declares its role and dependencies.
4. Examples remain comprehensive but explicitly non-normative unless tagged.
5. Canonical docs avoid machine-local absolute path anchors.

## Required Inputs
- Existing info-design analyses/proposals (A + B variants).
- Full packet corpus + examples + posture docs.

## Definition of Done
- One converged direction doc exists and is used by all redesign agents.
- Parallel outputs integrated into one coherent set with minimal duplication.
- Steward review passes all role/authority/portability gates.
- Superseded scratch/interim docs archived to existing archive path.
