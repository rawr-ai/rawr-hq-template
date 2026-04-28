# Plugin Logic Service Split Execution Plan

## Objective

Finish the plugin-management migration by making `services/hq-ops` the owner of HQ-specific plugin catalog, install, and lifecycle behavior; keeping `services/agent-config-sync` as the standalone owner of agent destination sync; and leaving `plugins/cli/plugins` as a thin projection that binds typed service clients, gathers concrete local resources, executes local commands, and renders output.

Do not recreate `@rawr/plugin-workspace`, `services/plugin-management`, module `model.ts` files, or all-in-one helper godfiles. Procedure handlers are the authored service behavior. Small `lib/` helpers are allowed only for reusable mechanics inside the owning module.

## Current Target Shape

- `packages/core`
  - Owns neutral workspace-root bootstrap only.
  - Exports `findWorkspaceRoot`, which checks `RAWR_WORKSPACE_ROOT`, then `RAWR_HQ_ROOT`, then bounded upward search from the caller directory.

- `services/hq-ops/src/service/modules/plugin-catalog`
  - Owns plugin discovery roots, `rawr.kind` / `rawr.capability` parsing, forbidden legacy metadata keys, manifest classification, package-name / dir-name / ID resolution, command-plugin eligibility, and runtime web eligibility.
  - Exposes `listWorkspacePlugins` and `resolveWorkspacePlugin` through the HQ Ops contract.

- `services/hq-ops/src/service/modules/plugin-install`
  - Owns install/link drift policy and semantic repair action planning.
  - Computes expected CLI command-plugin links from `pluginCatalog`, not from CLI-provided expectations.
  - Returns semantic actions; CLI maps them to local `rawr` process commands.

- `services/hq-ops/src/service/modules/plugin-lifecycle`
  - Owns catalog-backed lifecycle target resolution, lifecycle completeness policy, scratch policy evaluation, sweep candidate planning, and merge policy.
  - CLI remains responsible for command flags, local git/process execution, scratch-file publishing, and rendering.

- `services/agent-config-sync`
  - Remains standalone.
  - Owns agent destination sync planning/execution/retirement/undo and source-content composition semantics.
  - Does not depend on `hq-ops`.

- `plugins/cli/plugins`
  - Uses `@rawr/core` for root lookup and typed service clients for service behavior.
  - Does not import `@rawr/plugin-workspace` or HQ Ops module internals.
  - Does not own semantic catalog/install/lifecycle/sync policy.

## Implementation Sequence

1. Keep the HQ Ops catalog/install/lifecycle module shape aligned with current service conventions while avoiding `model.ts` and extracted IO-schema files.
2. Delete active `@rawr/plugin-workspace` package references from package metadata, Vitest config, Nx/structural inventories, gate scripts, tests, and lockfile.
3. Move remaining agent-config-sync source-content semantics out of CLI resources and into an internal `source-content` service module, keeping resources primitive.
4. Update structural ratchets:
   - HQ Ops service shape ratchets `pluginCatalog`, `pluginInstall`, and `pluginLifecycle`.
   - Phase-A gates assert HQ Ops catalog ownership and projection import boundaries.
   - Projection boundary gates forbid `@rawr/plugin-workspace` and HQ Ops catalog internals from projections.
   - Agent-config-sync shape forbids semantic source-content resource ports and CLI content scanners.
5. Run focused tests first, then full sync/structural/typecheck/test/build verification and plugin smoke commands.
6. Use reviewer agents at the end, fix actionable findings, then commit via Graphite.

## Verification Targets

Focused:

```bash
bunx nx run @rawr/core:typecheck
bunx nx run @rawr/hq-ops:typecheck
bunx nx run @rawr/plugin-plugins:typecheck
bunx nx run @rawr/agent-config-sync:typecheck
bunx vitest run --project core --project hq-ops --project agent-config-sync --project plugin-plugins
```

Final:

```bash
bun install
bunx nx run-many -t sync --projects=@rawr/core,@rawr/hq-ops,@rawr/agent-config-sync,@rawr/plugin-plugins,@rawr/cli,@rawr/server
bunx nx run-many -t structural --projects=@rawr/core,@rawr/hq-ops,@rawr/agent-config-sync,@rawr/plugin-plugins,@rawr/cli,@rawr/server
bunx nx run-many -t typecheck --projects=@rawr/core,@rawr/hq-ops,@rawr/agent-config-sync,@rawr/plugin-plugins,@rawr/cli,@rawr/server
bunx nx run-many -t test --projects=@rawr/core,@rawr/hq-ops,@rawr/agent-config-sync,@rawr/plugin-plugins,@rawr/cli,@rawr/server
bunx nx run-many -t build --projects=@rawr/core,@rawr/hq-ops,@rawr/agent-config-sync,@rawr/plugin-plugins,@rawr/cli,@rawr/server
bun run rawr -- plugins web status --json
bun run rawr -- plugins cli install all --dry-run --json
bun run rawr -- plugins sync all --dry-run --json
```
