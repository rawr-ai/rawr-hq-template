# Root Undo Implementation Plan

Status: `implemented`.
DRA: `Codex`.
Branch: `agent-undo-workstream-b-undo-lane`.
Baseline: `3623f6eb`.

## Objective

Implement upstream root `rawr undo` as a narrow CLI projection over
`services/agent-config-sync` undo behavior, and add best-effort lifecycle
expiration for plugin-sync undo capsules before unrelated root CLI commands.

## Opening State

At workstream opening, upstream already had:

- `services/agent-config-sync/src/service/modules/undo/contract.ts`
- `services/agent-config-sync/src/service/modules/undo/router.ts`
- `services/agent-config-sync/src/service/modules/undo/helpers/command-expiration.ts`
- `services/agent-config-sync/src/undo.ts`
- `packages/agent-config-sync-node/src/resources.ts`
- plugin sync hints that tell users to run `rawr undo`

At workstream opening, upstream lacked:

- `apps/cli/src/commands/undo.ts`
- `apps/cli/src/lib/undo-lifecycle.ts`
- public export of `expireUndoCapsuleOnUnrelatedCommand` from
  `@rawr/agent-config-sync/undo`
- CLI tests for root undo behavior and lifecycle behavior
- service tests for the public lifecycle helper/export path
- direct `@rawr/cli` dependencies on `@rawr/agent-config-sync` and
  `@rawr/agent-config-sync-node`

Downstream has a working root command and lifecycle hook, but it imports
`@rawr/agent-sync`. That is behavior evidence only.

## Solution Shape

### Hard Core

1. Service semantics stay in `services/agent-config-sync`.
2. Root CLI owns projection, workspace-root lookup, output rendering, and exit
   codes.
3. Node filesystem behavior is supplied through `packages/agent-config-sync-node`.
4. Lifecycle expiration is best-effort and nonblocking.
5. Tests use temp workspaces/capsules, not real provider homes or global sync.

### Explicit Exterior

- No upstream `@rawr/agent-sync`.
- No downstream mutation.
- No real/global plugin sync validation.
- No broad undo redesign.
- No internal service helper import from root CLI.

### Reframe Trigger

Reframe this plan if current code proves that `findWorkspaceRoot` and undo
capsule storage cannot resolve the same workspace root, or if the service
client cannot run `undo.runUndo` from the root CLI without creating a new public
service API beyond the already-decided `./undo` lifecycle export.

Current source-workspace boundary: plugin sync writes undo capsules under the
selected source workspace root. Root `rawr undo` resolves the active workspace
root with `@rawr/core`. For this lane, prove the normal and nested-cwd case
where those roots match. External `plugins sync --source-workspace <path>`
operators can target that capsule by running `rawr undo` from the source
workspace or by setting `RAWR_WORKSPACE_ROOT`; changing plugin-sync hint
wording for that external case is a plugin-sync lane follow-up unless the DRA
explicitly expands this lane's public surface.

## Implementation Phases

### Phase 1: Public Undo Surface

Expected changes:

- Export `expireUndoCapsuleOnUnrelatedCommand` from
  `services/agent-config-sync/src/undo.ts`.
- Add a test that imports the helper through `@rawr/agent-config-sync/undo`.
- Add service-level `runUndo` behavior tests through the public client for
  success, dry-run preservation, non-dry-run clear, no capsule, unsupported
  provider, failed replay operation, and lifecycle expiration.
- Use at least one public capture-path proof via
  `beginPluginsSyncUndoCapture` from `@rawr/agent-config-sync/undo`; do not rely
  only on hand-written manifests.

Acceptance:

- No root CLI import reaches into
  `services/agent-config-sync/src/service/modules/undo/helpers/*`.
- CLI tests do not substitute for service behavior tests.
- Dry-run preserves a real captured capsule.
- Successful non-dry-run replay clears a real captured capsule.
- Related commands preserve the capsule.
- Unrelated commands clear the capsule.

### Phase 2: Root CLI Binding

Expected changes:

- Add `@rawr/agent-config-sync` and `@rawr/agent-config-sync-node` to
  `apps/cli/package.json` if the root CLI imports them.
- Add a small root CLI binding/helper if needed to create a local
  `agent-config-sync` client with `createNodeAgentConfigSyncResources`.
- Keep the helper root-CLI-local unless an existing upstream pattern clearly
  fits.

Acceptance:

- The root CLI client binds to `@rawr/agent-config-sync` and
  `@rawr/agent-config-sync-node`.
- No plugin-specific CLI helper is imported into `apps/cli`.

### Phase 3: Root Command

Expected changes:

- Add `apps/cli/src/commands/undo.ts`.
- Resolve workspace root with upstream `@rawr/core` behavior.
- Call `client.undo.runUndo({ dryRun: baseFlags.dryRun })`.
- Render stable `RawrCommand` JSON and human output.
- Exit `2` for missing workspace root.
- Exit `1` for service `ok: false`.

Acceptance:

- Success JSON contains `workspaceRoot` and service-shaped `undo`.
- Failure JSON carries service error code/details.
- Human output includes capsule, provider, dry-run state, and summary counts.

### Phase 4: Root Lifecycle Hook

Expected changes:

- Add `apps/cli/src/lib/undo-lifecycle.ts` or equivalent.
- Call it before `run(argv, import.meta.url)` in `apps/cli/src/index.ts`.
- Swallow lifecycle errors.

Acceptance:

- `undo`, `plugins sync`, and `sync` preserve active plugin-sync capsules.
- Unrelated commands clear capsules.
- Lifecycle failures do not block command execution.

### Phase 5: Gates And Repair

Expected checks:

```bash
bunx nx run @rawr/agent-config-sync:test
bunx nx run @rawr/agent-config-sync-node:test
bunx nx run @rawr/cli:sync
bunx nx run @rawr/cli:test
bunx nx run @rawr/cli:build
bunx nx run-many -t typecheck --projects=@rawr/agent-config-sync,@rawr/agent-config-sync-node,@rawr/cli
```

Run targeted tests first while developing, then full required gates.

## Test Contract

Service/public helper tests must cover, through the public service client where
applicable:

- no workspace root returns a non-clearing result;
- no capsule returns `ok: false` / `UNDO_NOT_AVAILABLE`;
- unsupported provider returns `UNDO_PROVIDER_UNSUPPORTED`;
- successful dry-run returns planned operations and preserves the capsule;
- successful non-dry-run replay applies operations and clears the capsule;
- failed replay returns `UNDO_FAILED` and preserves failure details;
- related commands preserve provider `plugins.sync` capsules;
- unrelated commands clear provider `plugins.sync` capsules;
- helper is imported through `@rawr/agent-config-sync/undo`.

Root CLI tests must cover:

- `rawr undo --json --dry-run` success from a temp workspace with a capsule;
- at least one success capsule is created through the public
  `beginPluginsSyncUndoCapture` path, not a hand-written manifest;
- nested-cwd invocation resolves the same workspace root and capsule directory;
- success human output includes capsule/provider/dry-run/summary;
- missing capsule returns service error code/details and exits `1`;
- missing workspace root returns `WORKSPACE_ROOT_MISSING` and exits `2`;
- dry-run preserves the capsule and reports `undo.dryRun: true`;
- non-dry-run successful undo clears the capsule through service semantics;
- service failure exits `1` with stable JSON failure shape;
- related command lifecycle preservation;
- unrelated command lifecycle expiration;
- lifecycle expiration errors are nonblocking at the entrypoint level: force the
  lifecycle call to fail and prove a harmless command still executes and exits
  normally.

## Review Plan

Before implementation:

- Red-team this plan against F-02 findings and authority boundaries.
- Repair accepted P1/P2 findings before coding.

After implementation:

- Run review lanes for service boundary, CLI behavior, test sufficiency, and
  repo/Graphite cleanliness.
- Repair accepted findings.
- Re-run affected tests.

## Completion Audit Inputs

The completion audit must map every item in `SPEC.md` and `READINESS.md` to
evidence:

- changed files;
- test assertions;
- `apps/cli/package.json` dependencies and any lockfile impact;
- command output;
- absence of upstream `@rawr/agent-sync` imports;
- absence of `apps/cli` imports from internal `services/agent-config-sync/src/**`
  helper paths;
- clean `git status --short --branch`;
- current `gt ls`.

## Implementation Evidence

Plan status: executed with one post-worker repair.

Post-worker repair:

- Added human failure assertions for missing workspace and missing capsule.
- Adjusted `apps/cli/src/commands/undo.ts` so the missing-workspace path uses
  the same human renderer as service failures and prints
  `WORKSPACE_ROOT_MISSING`.
- Added human service-detail rendering and unsupported-provider CLI coverage.
- Tightened lifecycle expiration so `rawr undo` preserves the active capsule
  regardless of provider, allowing the service to report unsupported providers
  instead of the lifecycle hook clearing the capsule first.
- Added service proofs for `workspaceRoot: null` and the legacy `sync` related
  token.
- Added root-entrypoint related-command coverage proving `plugins sync --help`
  preserves a public-captured capsule before dispatch.

Evidence by phase:

- Phase 1:
  - `services/agent-config-sync/src/undo.ts` exports
    `expireUndoCapsuleOnUnrelatedCommand` through
    `@rawr/agent-config-sync/undo`.
  - `services/agent-config-sync/src/service/modules/undo/helpers/command-expiration.ts`
    preserves `undo` invocations before provider validation, and preserves
    `plugins sync` / `sync` for plugin-sync capsules.
  - `services/agent-config-sync/test/undo-behavior.test.ts` covers service
    dry-run, apply-and-clear, no capsule, unsupported provider, failed replay,
    missing workspace root during expiration, related command preservation, and
    unrelated command expiration.
- Phase 2:
  - `apps/cli/package.json` declares direct dependencies on
    `@rawr/agent-config-sync` and `@rawr/agent-config-sync-node`.
  - `apps/cli/src/lib/agent-config-sync-client.ts` binds the root CLI to the
    service client and Node resource adapter.
- Phase 3:
  - `apps/cli/src/commands/undo.ts` implements root `rawr undo`, workspace-root
    resolution, service invocation, JSON/human rendering, exit `2` for missing
    workspace root, and exit `1` for service failure.
- Phase 4:
  - `apps/cli/src/lib/undo-lifecycle.ts` calls the public lifecycle helper.
  - `apps/cli/src/index.ts` invokes lifecycle expiration before OCLIF dispatch
    and keeps it nonblocking.
- Phase 5:
  - Required checks passed; see `WORKSTREAM_RECORD.md` verification record.

Acceptance mapping:

- Public capture-path proof: `apps/cli/test/undo.test.ts` creates capsules with
  `beginPluginsSyncUndoCapture` from `@rawr/agent-config-sync/undo`.
- Nested-cwd proof: `apps/cli/test/undo.test.ts` verifies `rawr undo` resolves
  the same workspace root from a nested directory.
- Human/JSON failure proof: `apps/cli/test/undo.test.ts` verifies missing
  capsule and missing workspace root behavior in JSON and human modes, plus
  human service details for unsupported providers.
- Related-command entrypoint proof: `apps/cli/test/undo.test.ts` verifies
  `plugins sync --help` preserves a public-captured capsule before dispatch.
- Entrypoint nonblocking proof: `apps/cli/test/undo.test.ts` forces lifecycle
  failure with `RAWR_TEST_UNDO_LIFECYCLE_THROW=1` and proves `doctor --json`
  still exits successfully.
- Forbidden dependency proof: `rg` found no upstream `@rawr/agent-sync` imports
  in the implemented app/service/node surfaces.
- Internal-boundary proof: `rg` found no `apps/cli` or node-resource imports
  from service undo helper internals.
