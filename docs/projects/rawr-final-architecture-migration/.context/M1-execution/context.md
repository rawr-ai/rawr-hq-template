# Current Issue Context

## Current State

- Milestone: `M1` — `Collapse Authority onto the Canonical HQ Lane`
- Current branch: `agent-FARGO-M1-U07-neutralize-legacy-composition-authority`
- Current status:
  - `M1-U00` through `M1-U08` are complete.
  - the working tree is clean after the Milestone 1 closure commits.
  - the repo is on the frozen Phase 1 plateau described by the milestone packet and the migration docs under `docs/migration/`.

## What Changed In The Final Runway

- `M1-U06` made `apps/hq` the real canonical app shell.
- `M1-U07` removed direct live authority from `apps/server/src/rawr.ts` and `apps/server/src/testing-host.ts`, quarantining the old host chain behind `apps/hq/legacy-cutover.ts`.
- `M1-U08` promoted the full Phase 1 proof band into the root gate set, added the parked-lane freeze verifier, landed the durable plateau docs, and updated the milestone packet to record the Phase 2 entry condition explicitly.

## Canonical References

Use these as the Milestone 1 closeout and Phase 2 handoff packet:

1. [grounding.md](/Users/mateicanavra/conductor/workspaces/rawr-hq-template/guangzhou/docs/projects/rawr-final-architecture-migration/.context/M1-execution/grounding.md)
2. [workflow.md](/Users/mateicanavra/conductor/workspaces/rawr-hq-template/guangzhou/docs/projects/rawr-final-architecture-migration/.context/M1-execution/workflow.md)
3. [frame.md](/Users/mateicanavra/conductor/workspaces/rawr-hq-template/guangzhou/docs/projects/rawr-final-architecture-migration/.context/M1-execution/frame.md)
4. [M1-authority-collapse.md](/Users/mateicanavra/conductor/workspaces/rawr-hq-template/guangzhou/docs/projects/rawr-final-architecture-migration/milestones/M1-authority-collapse.md)
5. [phase-1-current-state.md](/Users/mateicanavra/conductor/workspaces/rawr-hq-template/guangzhou/docs/migration/phase-1-current-state.md)
6. [phase-2-entry-conditions.md](/Users/mateicanavra/conductor/workspaces/rawr-hq-template/guangzhou/docs/migration/phase-2-entry-conditions.md)

## Invariants For What Comes Next

- Do not reopen settled Phase 1 authority decisions during Phase 2.
- Treat `apps/hq/legacy-cutover.ts` as the one explicit executable bridge that should be deleted first in Phase 2.
- Treat `plugins/agents/hq` as the one frozen non-executable compatibility lane that remains in place for continuity.

## Deferred Follow-On Risk

- `services/hq-ops` now matches the required external Phase 1 service shape, but its internal module/package structure still does not cleanly mirror `services/example-todo`.
- Expect the current HQ Ops internals, especially under `services/hq-ops/src/service/modules/*`, to remain a likely source of future confusion when expanding structural proofs or runtime verification.
- When Phase 2 touches HQ Ops verification or runtime behavior, first compare:
  - `services/hq-ops/src/service/modules/*`
  - `services/example-todo/src/service/modules/*`
  - `docs/projects/rawr-final-architecture-migration/.context/M1-execution/HQ-OPS-service-shape-followup.md`
  - `docs/projects/orpc-ingest-domain-packages/guidance.md`
- During this handoff capture, no repo-local service-package `decisions.md` was found alongside `services/hq-ops` or `services/example-todo`; do not assume one exists without re-checking.
