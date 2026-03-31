# Phase 1 Current State

Milestone 1 is the authority-collapse plateau for the final architecture migration. The repo now tells one Phase 1 story again: semantic truth lives in the canonical homes, runtime projection is reduced to the canonical plugin topology, the HQ shell is real, and the remaining compatibility seams are explicit instead of implicit.

## Canonical Authority

- HQ operational truth lives in `services/hq-ops`, with `config`, `repo-state`, `journal`, and `security` as internal execution modules.
- The canonical HQ app shell lives in `apps/hq`:
  - `apps/hq/rawr.hq.ts`
  - `apps/hq/server.ts`
  - `apps/hq/async.ts`
  - `apps/hq/dev.ts`
- The canonical live runtime plugin topology is:
  - `plugins/server/api/example-todo`
  - `plugins/server/api/state`
  - `plugins/async/workflows`
  - `plugins/async/schedules`

## Execution Posture

- The live server path now consumes HQ shell authority through `@rawr/hq-app/legacy-cutover`; `apps/server/src/rawr.ts` and `apps/server/src/testing-host.ts` no longer import the legacy host chain directly.
- Phase 1 still retains one executable bridge:
  - `apps/hq/legacy-cutover.ts`
- That bridge is the only allowed executable carryover across the Phase 1 to Phase 2 boundary. It exists to quarantine the old host-composition chain while keeping the current runtime operational.

## Archived And Frozen Lanes

- Archived and out of the live lane:
  - `services/coordination`
  - `plugins/api/coordination`
  - `plugins/workflows/coordination`
  - `services/support-example`
  - `plugins/workflows/support-example`
- Frozen compatibility carryover:
  - `plugins/agents/hq`
- Frozen parked server API roots retained for Phase 1 continuity:
  - `plugins/server/api/example-todo`
  - `plugins/server/api/state`

## What Phase 1 Deliberately Does Not Claim

- Phase 1 does not build the Phase 2 runtime substrate.
- Phase 1 does not redesign the Cloud Code/Codex marketplace lane.
- Phase 1 does not claim that the executable bridge is permanent; if `apps/hq/legacy-cutover.ts` exists, it is deletion debt scheduled immediately for Phase 2 Slice 0.
