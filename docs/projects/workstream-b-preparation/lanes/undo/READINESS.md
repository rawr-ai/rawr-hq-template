# Root Undo Readiness

## Readiness Verdict

Prepared for lane-specific planning after review repair. The target service API
exists, the missing projection is identified, and downstream behavior evidence
is bounded. The lifecycle export and failure behavior are fixed below.

## Pair Packet

Mapper: Undo CLI/Service Mapper.

Verifier: Undo Safety/Expiry Verifier.

Objective: wire upstream root `rawr undo` to service-owned
`agent-config-sync` undo behavior and add best-effort undo capsule expiration.

Allowed edit surfaces:

- `apps/cli/**`
- `services/agent-config-sync/**` only for missing test coverage or small helper
  export fixes.
- `packages/agent-config-sync-node/**` only if resource exports are insufficient.
- targeted docs that advertise `rawr undo`.

Forbidden scope:

- upstream `@rawr/agent-sync`,
- downstream mutation or downstream undo removal in this upstream lane,
- broad undo redesign,
- real global plugin sync as incidental validation.

Evidence paths:

- `services/agent-config-sync/src/service/modules/undo/contract.ts`
- `services/agent-config-sync/src/service/modules/undo/router.ts`
- `services/agent-config-sync/src/service/modules/undo/helpers/command-expiration.ts`
- `packages/agent-config-sync-node/src/resources.ts`
- `apps/cli/src/commands/tools/export.ts`
- `/Users/mateicanavra/Documents/.nosync/DEV/habitat/rawr-hq/apps/cli/src/commands/undo.ts`
- `/Users/mateicanavra/Documents/.nosync/DEV/habitat/rawr-hq/apps/cli/src/index.ts`
- `/Users/mateicanavra/Documents/.nosync/DEV/habitat/rawr-hq/apps/cli/src/lib/undo-lifecycle.ts`

Required output: lane-specific implementation plan or code changes, depending
on future user instruction.

Required gates:

- `bunx nx run @rawr/agent-config-sync:test`
- `bunx nx run @rawr/agent-config-sync-node:test`
- `bunx nx run @rawr/cli:test`
- `bunx nx run-many -t typecheck --projects=@rawr/agent-config-sync,@rawr/agent-config-sync-node,@rawr/cli`
- service tests for `expireUndoCapsuleOnUnrelatedCommand` through
  `@rawr/agent-config-sync/undo`.
- CLI tests for JSON/human failure output, missing workspace root exit `2`,
  service failure exit `1`, dry-run preservation, and related/unrelated command
  lifecycle behavior.

Lane done condition: `rawr undo` works through upstream service semantics,
plugin sync hints point at a valid command, lifecycle expiration is best-effort
and tested, and downstream old undo authority is ready for the final downstream
sunset phase.

DRA decision point: none on service API shape. The implementation may choose
the small app CLI binding helper, but the lifecycle export and command contract
are fixed.

## Execution Position

Run this after `upstream-fallout` when possible, and before mutating
`plugin-sync` service work. This lane settles the narrow `agent-config-sync`
undo public surface that plugin-sync may later consume.

Keep downstream undo files in place for now. They are behavior evidence only
during this upstream lane; removal waits for the final downstream sunset phase.

## First Reads

- `docs/projects/workstream-b-preparation/NEXT_PACKET.md`
- `docs/projects/workstream-b-preparation/AUTHORITY_MAP.md`
- `docs/projects/workstream-b-preparation/REVIEW_LEDGER.md`
- `docs/projects/workstream-b-preparation/LESSONS.md`
- `docs/projects/workstream-b-preparation/lanes/undo/DISCOVERY.md`
- `docs/projects/workstream-b-preparation/lanes/undo/SPEC.md`
- `docs/projects/workstream-b-preparation/lanes/undo/ROUGH_PLAN.md`
- `services/agent-config-sync/src/service/modules/undo/router.ts`
- `services/agent-config-sync/src/service/modules/undo/helpers/command-expiration.ts`
- downstream root command and lifecycle files listed above.

## First Commands

```bash
git status --short --branch
gt ls
bunx nx show project @rawr/cli --json
bunx nx show project @rawr/agent-config-sync --json
rg -n "rawr undo|Undo:|command-expiration|apps/cli/src/commands/undo|expireUndoCapsule" apps/cli services/agent-config-sync plugins/cli/plugins /Users/mateicanavra/Documents/.nosync/DEV/habitat/rawr-hq/apps/cli /Users/mateicanavra/Documents/.nosync/DEV/habitat/rawr-hq/packages/agent-sync
```

## Ready-To-Plan Checklist

- [x] Upstream service undo exists.
- [x] Upstream root command missing.
- [x] Upstream tool export advertises undo.
- [x] Downstream root command behavior captured.
- [x] Downstream lifecycle behavior captured.
- [x] Upstream service command-expiration helper captured.
- [x] Non-goal against `@rawr/agent-sync` revival captured.
- [x] Public lifecycle export decision captured.
- [x] JSON/human failure, dry-run, and exit behavior captured.

## Pause Conditions

Pause and ask the DRA before continuing if:

- `services/agent-config-sync` no longer exposes the expected undo/runUndo
  contract,
- lifecycle expiration would block normal command execution instead of running
  best-effort,
- implementation pressure would revive upstream `@rawr/agent-sync` or mutate
  downstream undo files,
- another active lane is editing the same `agent-config-sync` undo files, or
- root CLI workspace-root resolution cannot match plugin sync capsule storage.

## Deferred Risks

- Exact CLI binding helper file shape should be decided in lane-specific
  planning.
- Tests need temp capsule fixtures; avoid real provider-home mutation.

## DRA Acceptance

Accepted after review repair.

## Review Repair Addendum

- Accepted findings: `F-02-01`, `F-02-02`, `F-02-03`.
- Future implementation must export `expireUndoCapsuleOnUnrelatedCommand`
  through `@rawr/agent-config-sync/undo` and test the root CLI against that
  surface.
