# Root Undo Discovery

## Frame

This lane prepares upstream root `rawr undo`. Upstream already owns newer undo
semantics in `services/agent-config-sync`. The root command should be an
upstream CLI projection over that service-owned undo behavior, not a resurrection
of downstream `@rawr/agent-sync`.

## Current Upstream State

Upstream service undo exists:

- `services/agent-config-sync/src/service/modules/undo/contract.ts:10-64`
  defines `runUndo` input/output contract.
- `services/agent-config-sync/src/service/modules/undo/router.ts:17-96`
  implements capsule replay through service-owned filesystem ports.
- `services/agent-config-sync/src/undo.ts` exports the narrow public undo helper
  surface for sync command setup.
- `services/agent-config-sync/package.json:43-45` exports `./undo`.
- `packages/agent-config-sync-node/src/resources.ts:21-70` provides Node
  filesystem resources for the service.

Upstream command advertisement exists without root command implementation:

- `apps/cli/src/commands/tools/export.ts:39` advertises `undo`.
- `apps/cli/src/commands/undo.ts` is missing.

Upstream plugin sync produces undo capsules and tells users about root undo:

- `plugins/cli/plugins/src/commands/plugins/sync.ts` and
  `plugins/cli/plugins/src/commands/plugins/sync/all.ts` log
  `Undo: rawr undo (capsule=...)`.

Upstream has service command-expiration helper:

- `services/agent-config-sync/src/service/modules/undo/helpers/command-expiration.ts:20-37`
  clears an active undo capsule for unrelated commands using injected resources.
- The helper is not currently exported through the narrow public
  `@rawr/agent-config-sync/undo` surface; the repair decision is to export
  `expireUndoCapsuleOnUnrelatedCommand` there instead of importing internal
  service paths from the root CLI.

Upstream CLI lifecycle integration is missing:

- `apps/cli/src/index.ts:1-118` handles oclif execution and journaling.
- `apps/cli/src/lib/undo-lifecycle.ts` is missing.
- `apps/cli/src/index.ts` does not call service command-expiration before
  command execution.

## Current Downstream State

Downstream root command exists:

- `/Users/mateicanavra/Documents/.nosync/DEV/habitat/rawr-hq/apps/cli/src/commands/undo.ts:1-54`
  implements `rawr undo` using `@rawr/agent-sync`.
- It finds the workspace root, calls `runUndoForWorkspace`, honors
  `baseFlags.dryRun`, emits structured result data, and prints human summary.

Downstream lifecycle expiry exists:

- `/Users/mateicanavra/Documents/.nosync/DEV/habitat/rawr-hq/apps/cli/src/index.ts:87-95`
  calls `expireUndoCapsuleOnUnrelatedCommand` before command execution and
  treats failure as best-effort housekeeping.
- `/Users/mateicanavra/Documents/.nosync/DEV/habitat/rawr-hq/apps/cli/src/lib/undo-lifecycle.ts:44-57`
  clears the capsule unless the command is `undo`, `plugins sync`, or `sync`.

Downstream old package behavior exists:

- `/Users/mateicanavra/Documents/.nosync/DEV/habitat/rawr-hq/packages/agent-sync/src/lib/sync-undo.ts:285-429`
  implements `runUndoForWorkspace`.
- `/Users/mateicanavra/Documents/.nosync/DEV/habitat/rawr-hq/packages/agent-sync/src/lib/sync-undo.ts:431-462`
  implements command-expiration logic.

## Evidence

Commands used:

```bash
rg -n "rawr undo|Undo:|command-expiration|capsule|undo" apps/cli services/agent-config-sync plugins/cli/plugins packages /Users/mateicanavra/Documents/.nosync/DEV/habitat/rawr-hq/apps/cli /Users/mateicanavra/Documents/.nosync/DEV/habitat/rawr-hq/packages /Users/mateicanavra/Documents/.nosync/DEV/habitat/rawr-hq/plugins -g '!**/dist/**'
test -f apps/cli/src/commands/undo.ts
test -f apps/cli/src/lib/undo-lifecycle.ts
```

## Mismatches

1. Upstream advertises `rawr undo` but does not implement the root command.
2. Upstream service has undo semantics but the root CLI does not bind to them.
3. Upstream service has command-expiration helper but the root CLI does not call
   it.
4. Downstream proves user-facing command behavior but depends on old
   `@rawr/agent-sync`, which should not be revived upstream.

## Risks

- A future agent may copy downstream `@rawr/agent-sync` dependency instead of
  using `services/agent-config-sync`.
- Undo expiry must remain best-effort and must not block unrelated command
  execution.
- Root command must preserve JSON/human output consistency with `RawrCommand`
  base flags.
- Workspace-root resolution must use upstream `@rawr/core` behavior or a
  service-scoped equivalent, not downstream `workspace-plugins` helper paths.

## Unknowns

- The exact app CLI binding helper file shape should be chosen during
  implementation. The plugin CLI already has
  `plugins/cli/plugins/src/lib/agent-config-sync-binding.ts` as a reference, but
  `apps/cli` may want a smaller binding.
- Future implementation must inspect current app CLI test structure before
  adding tests.

## DRA Disposition

Accepted after review repair. The service API shape is already fixed enough for
lane-specific planning. The lane should wire projection and lifecycle, not
redesign undo.

## Review Repair Addendum

- `F-02-01` accepted: export
  `expireUndoCapsuleOnUnrelatedCommand` through
  `@rawr/agent-config-sync/undo`; do not import the helper from an internal
  module path.
- `F-02-02` accepted: future implementation must pin human/JSON error output,
  dry-run preservation, and service/CLI tests.
- `F-02-03` accepted: CLI tests must assert success JSON, service failure JSON,
  missing workspace root JSON/exit `2`, service failure exit `1`, human output,
  and dry-run preservation.
