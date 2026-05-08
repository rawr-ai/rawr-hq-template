# Root Undo Rough Plan

## Implementation Slices

1. CLI service binding:
   - Add a small app CLI binding to create an `agent-config-sync` client with
     `createNodeAgentConfigSyncResources`.
   - Reuse existing service binding patterns where appropriate without pulling
     plugin-specific helpers into root CLI.

2. Public lifecycle export:
   - Export `expireUndoCapsuleOnUnrelatedCommand` from
     `services/agent-config-sync/src/undo.ts`.
   - Ensure `services/agent-config-sync/package.json` continues exposing it via
     `./undo`.
   - Add or adjust service tests for related/unrelated command behavior.

3. Root command:
   - Add `apps/cli/src/commands/undo.ts`.
   - Resolve workspace root.
   - Call service `undo.runUndo`.
   - Render JSON/human output through `RawrCommand`.
   - Preserve pinned exit behavior: workspace-root missing exits `2`, service
     failure exits `1`, dry-run is passed through unchanged.

4. Lifecycle hook:
   - Add `apps/cli/src/lib/undo-lifecycle.ts` or equivalent.
   - Bind public `@rawr/agent-config-sync/undo` command-expiration helper with
     Node resources.
   - Call it best-effort before `run(argv, import.meta.url)` in
     `apps/cli/src/index.ts`.

5. Tests:
   - Add root CLI tests for command output and error behavior.
   - Add lifecycle tests using temp workspace/capsule fixtures.
   - Add JSON/human tests for missing workspace root, service failure, dry-run,
     related command preservation, and unrelated command expiration.
   - Ensure existing `agent-config-sync` undo tests still pass.

6. Docs:
   - Update command references only if needed, because `tools export` already
     advertises the command.

## Likely Touch Surfaces

- `apps/cli/src/commands/undo.ts`
- `apps/cli/src/index.ts`
- `apps/cli/src/lib/undo-lifecycle.ts`
- `apps/cli/test/**`
- `services/agent-config-sync/src/undo.ts`
- `services/agent-config-sync/test/**`

## Validation

```bash
git status --short --branch
gt ls
bunx nx show project @rawr/cli --json
bunx nx show project @rawr/agent-config-sync --json
bunx nx run @rawr/agent-config-sync:test
bunx nx run @rawr/cli:test
bunx nx run-many -t typecheck --projects=@rawr/agent-config-sync,@rawr/agent-config-sync-node,@rawr/cli
```

## Sequencing Notes

Run this after `upstream-fallout` when practical and before mutating
`plugin-sync` service work. The purpose is to settle the narrow
`agent-config-sync` undo public surface so the broader sync substrate lane does
not race the root undo lane.

Wire the command after confirming the service client binding shape. Add
lifecycle expiration after the command so tests can share capsule fixtures.

Downstream sunset should happen only after upstream root command is integrated
downstream and plugin sync hints point to a working command. Do not remove
downstream undo material during this upstream implementation lane.

## Stop Conditions

- The service undo contract has drifted and no longer exposes `runUndo`.
- Root CLI cannot resolve workspace root consistently with plugin sync capsule
  storage.
- Lifecycle expiration would block normal command execution.

## DRA Disposition

Accepted after review repair. These slices are prepared for a future
implementation workstream; the public lifecycle export and failure behavior are
fixed inputs.
