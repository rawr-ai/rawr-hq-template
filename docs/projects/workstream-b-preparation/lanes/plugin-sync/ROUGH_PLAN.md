# Plugin Sync / Tooling Substrate Rough Plan

## Implementation Slices

1. Upstream parity proof:
   - Re-run upstream service/plugin tests.
   - Compare downstream `@rawr/agent-sync` tests against upstream
     `agent-config-sync` tests.
   - Port any still-relevant downstream behavior tests upstream.

2. Source workspace proof:
   - Verify upstream `--source-workspace` can inspect downstream content in a
     dry-run/status/drift mode without mutating provider homes.
   - Record content/source routing semantics clearly.
   - Record invocation workspace vs content source workspace responsibilities.

3. Downstream duplicate inventory:
   - Inventory downstream references to `@rawr/agent-sync`.
   - Inventory downstream plugin CLI imports and tests tied to old sync code.
   - Identify docs/skills that still route through downstream sync authority.
   - Classify each downstream-only behavior as bring upstream, preserve as
     content/source input, remove as duplicate authority, or clean as stale docs.

4. Upstream convergence validation:
   - Validate status/drift/sync dry-run behavior with bounded fixtures.
   - Validate managed cleanup logic through tests, not global provider-home
     mutation.

5. Downstream sunset planning:
   - Plan removal of `packages/agent-sync`.
   - Plan downstream plugin CLI update to upstream substrate or removal of
     duplicate authority.
   - Plan docs/skill cleanup.
   - Carry mixed oclif/dependency ownership as an explicit downstream sunset
     risk until removal is proven.

## Likely Touch Surfaces

Upstream parity work:

- `services/agent-config-sync/**`
- `packages/agent-config-sync-node/**`
- `plugins/cli/plugins/**`
- `services/agent-config-sync/docs/**`

Downstream sunset work, later:

- `/Users/mateicanavra/Documents/.nosync/DEV/habitat/rawr-hq/packages/agent-sync/**`
- `/Users/mateicanavra/Documents/.nosync/DEV/habitat/rawr-hq/plugins/cli/plugins/**`
- downstream package metadata and tests referencing `@rawr/agent-sync`.

## Validation

Upstream:

```bash
git status --short --branch
gt ls
bunx nx show project @rawr/agent-config-sync --json
bunx nx show project @rawr/agent-config-sync-node --json
bunx nx show project @rawr/plugin-plugins --json
bunx nx run @rawr/agent-config-sync:test
bunx nx run @rawr/agent-config-sync-node:test
bunx nx run @rawr/plugin-plugins:test
bunx nx run-many -t typecheck --projects=@rawr/agent-config-sync,@rawr/agent-config-sync-node,@rawr/plugin-plugins
```

Dry-run/status only, if explicitly scoped by the future DRA:

```bash
bun run rawr -- plugins status --checks sync --source-workspace /Users/mateicanavra/Documents/.nosync/DEV/habitat/rawr-hq --json
bun run rawr -- plugins sync drift --source-workspace /Users/mateicanavra/Documents/.nosync/DEV/habitat/rawr-hq --json
bun run rawr -- plugins sync all --source-workspace /Users/mateicanavra/Documents/.nosync/DEV/habitat/rawr-hq --dry-run --json
```

Do not run mutating global sync as a preparation or incidental validation step.

## Sequencing Notes

Run mutating service work after `undo` settles the narrow
`agent-config-sync` undo public surface. Before that, safe parallel work is
limited to downstream inventory and bounded non-mutating source-workspace
proof.

Upstream parity proof must precede the final downstream sunset phase.
Downstream duplicate inventory can run in parallel with upstream parity proof
because it is read-only.

Downstream sunset should be its own final branch/workstream after upstream
authority is explicit and tested across the relevant lanes. Do not remove
downstream sync packages, plugin paths, docs, or content during this upstream
implementation lane.

## Stop Conditions

- Upstream cannot read downstream source content without mutation.
- A downstream-only behavior remains valuable and has no upstream equivalent or
  test.
- Managed cleanup cannot prove ownership before deletion.
- The future lane requires global provider-home mutation to establish baseline
  facts.

## DRA Disposition

Accepted after review repair. The rough plan separates upstream parity from
downstream sunset and requires downstream behavior inventory plus bounded
non-mutating `--source-workspace` proof.
