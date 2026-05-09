# Plugin Sync / Tooling Substrate Readiness

## Readiness Verdict

Prepared for lane-specific planning after review repair. Upstream canonical
surfaces are identified, downstream duplicate authority is bounded, and the
content/source-workspace boundary is explicit.

## Pair Packet

Mapper: Plugin Sync Authority Mapper.

Verifier: Projection/Content Boundary Verifier.

Objective: prove upstream sync/tooling parity and prepare downstream duplicate
authority sunset without deleting content or unmanaged projections by accident.

Allowed edit surfaces:

- upstream `services/agent-config-sync/**`
- upstream `packages/agent-config-sync-node/**`
- upstream `plugins/cli/plugins/**`
- targeted upstream sync docs.
- downstream duplicate sync paths only in a later downstream sunset workstream.
  Those paths are inventory inputs first, not deletion targets.

Forbidden scope:

- mutating global provider homes as incidental validation,
- deleting downstream plugin content,
- treating `source-workspace` as architecture authority,
- hiding provider gaps with projection fallback,
- downstream duplicate removal during this upstream lane.

Evidence paths:

- `services/agent-config-sync/package.json`
- `packages/agent-config-sync-node/package.json`
- `plugins/cli/plugins/package.json`
- `plugins/cli/plugins/src/lib/agent-config-sync-binding.ts`
- `plugins/cli/plugins/src/lib/agent-config-sync.ts`
- `services/agent-config-sync/docs/PARITY_INVESTIGATION_REPORT.md`
- `services/agent-config-sync/docs/NATIVE_SUPERSEDED_PROJECTION_CLEANUP_HANDOFF.md`
- `/Users/mateicanavra/Documents/.nosync/DEV/habitat/rawr-hq/packages/agent-sync/package.json`
- `/Users/mateicanavra/Documents/.nosync/DEV/habitat/rawr-hq/plugins/cli/plugins/package.json`

Required output: lane-specific implementation plan or code changes, depending
on future user instruction.

Required gates:

- `bunx nx run @rawr/agent-config-sync:test`
- `bunx nx run @rawr/agent-config-sync-node:test`
- `bunx nx run @rawr/plugin-plugins:test`
- `bunx nx run-many -t typecheck --projects=@rawr/agent-config-sync,@rawr/agent-config-sync-node,@rawr/plugin-plugins`
- bounded non-mutating `--source-workspace` status/drift/dry-run proof before
  downstream sunset claims.
- downstream behavior inventory classified into bring, preserve, remove, or
  stale-doc cleanup.

Lane done condition: upstream sync/tooling parity is proven; downstream
duplicate sync authority has a precise removal plan; downstream content and
duplicate implementation remain in place until the final downstream sunset
phase.

DRA decision point: approve any downstream duplicate removal only after upstream
parity proof and content/source boundaries are recorded.

## Execution Position

Run this after `undo` has settled the narrow `agent-config-sync` undo public
surface, or keep this lane read-only until that branch is stable. The safe
parallel work before `undo` lands is downstream inventory and non-mutating
source-workspace proof only.

Keep downstream `packages/agent-sync`, downstream plugin CLI paths, and
downstream content in place for now. This lane prepares the removal plan; it
does not execute downstream sunset.

## First Reads

- `docs/projects/workstream-b-preparation/NEXT_PACKET.md`
- `docs/projects/workstream-b-preparation/AUTHORITY_MAP.md`
- `docs/projects/workstream-b-preparation/REVIEW_LEDGER.md`
- `docs/projects/workstream-b-preparation/LESSONS.md`
- `docs/projects/workstream-b-preparation/lanes/plugin-sync/DISCOVERY.md`
- `docs/projects/workstream-b-preparation/lanes/plugin-sync/SPEC.md`
- `docs/projects/workstream-b-preparation/lanes/plugin-sync/ROUGH_PLAN.md`
- `services/agent-config-sync/docs/PARITY_INVESTIGATION_REPORT.md`
- `services/agent-config-sync/docs/NATIVE_SUPERSEDED_PROJECTION_CLEANUP_HANDOFF.md`
- upstream and downstream package files listed above.

## First Commands

```bash
git status --short --branch
gt ls
bunx nx show project @rawr/agent-config-sync --json
bunx nx show project @rawr/agent-config-sync-node --json
bunx nx show project @rawr/plugin-plugins --json
rg -n "source-workspace|cleanup-behind|retire|retirement|managed|agent-config-sync|@rawr/agent-sync|Undo: rawr undo" services/agent-config-sync packages/agent-config-sync-node plugins/cli/plugins /Users/mateicanavra/Documents/.nosync/DEV/habitat/rawr-hq/packages/agent-sync /Users/mateicanavra/Documents/.nosync/DEV/habitat/rawr-hq/plugins/cli/plugins -g '!**/dist/**'
```

## Ready-To-Plan Checklist

- [x] Upstream canonical service/node/plugin surfaces identified.
- [x] Downstream duplicate package/plugin surfaces identified.
- [x] `source-workspace` boundary captured.
- [x] Native provider vs projection boundary captured.
- [x] Managed cleanup ownership risk captured.
- [x] Downstream content safety captured.
- [x] Downstream behavior inventory requirement captured.
- [x] Non-mutating `--source-workspace` proof requirement captured.
- [x] Downstream plugin CLI paths classified as inventory before deletion.

## Pause Conditions

Pause and ask the DRA before continuing if:

- mutating service work would collide with an active `undo` branch,
- parity proof requires mutating global provider homes,
- `--source-workspace` cannot inspect downstream content in bounded dry-run,
  status, or drift mode,
- managed cleanup cannot prove ownership before deletion,
- a downstream-only behavior remains valuable but has no upstream equivalent or
  test home, or
- the lane would delete downstream packages, plugin CLI paths, docs, or content
  before the final downstream sunset phase.

## Deferred Risks

- Future implementation must compare downstream tests against upstream tests
  before removing `@rawr/agent-sync`.
- Downstream sunset must be separate after parity proof.
- Mixed oclif/dependency ownership remains a downstream sunset risk.

## DRA Acceptance

Accepted after review repair.

## Review Repair Addendum

- Accepted findings: `F-04-01`, `F-04-02`.
- Deferred finding: `F-04-03` stays recorded for downstream sunset.
