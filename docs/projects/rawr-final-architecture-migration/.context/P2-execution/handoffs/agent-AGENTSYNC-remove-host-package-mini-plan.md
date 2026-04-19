# Agent Config Sync Host-Package Removal Mini Plan

Branch: `agent-AGENTSYNC-remove-host-package`
Parent: `agent-ORCH-service-resource-remediation-docs`
Worktree: `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-AGENTSYNC-remove-host-package`

## Current Violations Found

- `packages/agent-config-sync-host` is a service-specific host/runtime package. This directly violates the corrected rule that there are no service-specific `*-host` packages.
- `services/agent-config-sync/src/service/base.ts` declares `planningRuntime`, `executionRuntime`, `retirementRuntime`, and `undoRuntime` deps. These are same-named runtime method bags, not concrete resource seams.
- `services/agent-config-sync/src/service/modules/*/repository.ts` repositories mostly forward to same-named runtime methods (`previewSync`, `runSync`, `retireStaleManaged`, `runUndo`) instead of implementing service behavior.
- `services/agent-config-sync/src/service/modules/*/schemas.ts` are empty while contracts import most boundary schemas from `service/shared/schemas.ts`. Module-local schema ownership is not established.
- `packages/agent-config-sync-host/src/boundary.ts` currently owns the semantic binding layer and summarizes drift/workspace sync results, while `sync-engine.ts`, `retire-stale-managed.ts`, and `sync-undo.ts` own domain behavior that should be inside the service.
- `plugins/cli/plugins/package.json` depends on `@rawr/agent-config-sync-host`, and `plugins/cli/plugins/src/lib/agent-config-sync.ts` imports host exports for both service behavior and concrete helpers.
- Root scripts and test config still name the host package: `package.json` build/typecheck/test/lint project lists and `vitest.config.ts`.
- Active process docs and ratchets still bless or require the host package: `plugins/cli/plugins/AGENTS.md`, `docs/migration/phase-2-entry-conditions.md`, `docs/migration/phase-1-ledger.md`, `scripts/phase-1/verify-phase1-ledger.mjs`, and `scripts/githooks/template-managed-paths.txt`.
- Existing host tests under `packages/agent-config-sync-host/test` prove useful behavior but are attached to the wrong ownership boundary.

## Behavior That Stays Or Moves Into `services/agent-config-sync`

- Keep the current service module shape: `planning`, `execution`, `retirement`, and `undo`, with one service `base`, `impl`, root `contract`, and root `router`.
- Move sync planning and source-scope semantics into the planning module: source plugin/content model, scope filtering, workspace assessment, drift status, metadata/material change counting, and conflict summarization.
- Move apply semantics into the execution module: target item planning, conflict policy, force behavior, managed overwrite, managed GC, metadata action creation, Codex/Claude target result assembly, and `runSync`.
- Move stale managed retirement semantics into the retirement module: active plugin comparison, stale detection, planned/deleted/updated/skipped/failed action model, and `retireStaleManaged`.
- Move undo model and apply semantics into the undo module: capsule shape, capture/finalize semantics, expiration policy, restore/delete apply semantics, result summaries, and `runUndo`.
- Move registry/manifest semantics into service behavior: how Codex registry entries are claimed/upserted, how Claude plugin/marketplace/sync manifests are derived, and how those changes become sync items. Concrete file IO remains plugin-local.
- Move module-owned schemas into module `schemas.ts` files where they are procedure/module-specific. Keep `service/shared/schemas.ts` only for real cross-module primitives such as source plugin/content, target/result item primitives, sync scope, and target homes if still shared by multiple modules.
- Replace `*-runtime` ports with resource contracts named after concrete capabilities, not service verbs. Repositories should compose service algorithms over resources instead of delegating to `runtime.runSync()`-style methods.

## Concrete Resources Supplied From `plugins/cli/plugins`

- Filesystem resource: path exists, read text/JSON, write text/JSON, remove, mkdir, copy tree, list recursive files, compare files/dirs, stat path.
- Source discovery resource: find workspace root, list workspace plugin dirs, load source plugin metadata from package/plugin files, resolve plugin refs, scan canonical content directories.
- Registry file IO resource: read and write Codex registry JSON files. Service owns claim/upsert semantics.
- Claude marketplace/manifest file IO resource: read and write plugin manifests, marketplace JSON, and managed sync manifest files. Service owns manifest semantics.
- Process execution resource: bounded command execution for Claude CLI install/enable operations, using plugin-local process code.
- Archive/package resource: write Cowork `.zip` packages and plugin JSON/package content, using plugin-local archive implementation.
- Target home resource: resolve Codex and Claude homes from CLI flags, env, and hq-ops layered config. This stays plugin-local because it is surface/config orchestration, not service truth.
- Undo storage resource: read/write/clear active capsule metadata and backup files under the workspace. Service owns capsule semantics and apply rules.
- Logger/analytics remain normal service deps from `@rawr/hq-sdk` placeholder or host-provided adapters.

## `@rawr/agent-config-sync-host` Imports, Deps, And Files To Remove

- Delete `packages/agent-config-sync-host/**` after redistributing code into service behavior and plugin-local concrete resources.
- Remove `@rawr/agent-config-sync-host` from `plugins/cli/plugins/package.json`.
- Replace all imports from `@rawr/agent-config-sync-host` in `plugins/cli/plugins/src/lib/agent-config-sync.ts` with imports from `@rawr/agent-config-sync` plus plugin-local resource helpers.
- Remove `@rawr/agent-config-sync-host` from root `package.json` scripts: `build`, `lint`, `typecheck`, and `pretest:vitest`.
- Remove the `agent-config-sync-host` Vitest project from `vitest.config.ts`.
- Remove/update host package references in `plugins/cli/plugins/AGENTS.md`, `docs/migration/phase-2-entry-conditions.md`, `docs/migration/phase-1-ledger.md`, `scripts/phase-1/verify-phase1-ledger.mjs`, and `scripts/githooks/template-managed-paths.txt`.
- Move useful host tests to the owning layer: service behavior tests under `services/agent-config-sync/test`, concrete resource tests under `plugins/cli/plugins/test`.
- Re-run package manager install/update after deleting the package so `bun.lock` drops the workspace entry.

## Structural Ratchets To Update/Add

- Update `scripts/phase-03/verify-agent-config-sync-service-shape.mjs` so it requires no `packages/agent-config-sync-host`, no `@rawr/agent-config-sync-host` references in active sources/config, and no host package in root project scripts or Vitest config.
- Add service-shape checks that fail if `services/agent-config-sync/src/service/base.ts` declares `planningRuntime`, `executionRuntime`, `retirementRuntime`, `undoRuntime`, or imports `shared/ports/*-runtime`.
- Add repository checks that fail on forwarding-only patterns such as `return runtime.runSync(...)`, `runtime.previewSync(...)`, `runtime.retireStaleManaged(...)`, and `runtime.runUndo(...)`.
- Add module schema checks that fail if all module `schemas.ts` files are empty or if module contracts only consume a broad shared schema dump for module-specific inputs/outputs.
- Update structural suite wiring so `@rawr/agent-config-sync:structural` proves host package absence and service behavior ownership.
- Update `plugins/cli/plugins:structural` expectations so plugin command verification no longer builds/tests a host package and does require plugin-local resource binding.
- Consider a cross-service ratchet script for `packages/*-host` / `@rawr/*-host` after sibling remediation branches converge, but keep this branch focused on `agent-config-sync` unless the stack owner wants global enforcement here.

## Behavioral Proof Commands And Pass Criteria

- `bunx nx run @rawr/agent-config-sync:typecheck --skip-nx-cache`
  - Passes with no TypeScript errors; no `*-runtime` port imports remain.
- `bunx nx run @rawr/agent-config-sync:build --skip-nx-cache`
  - Emits service build output without depending on the deleted host package.
- `bunx nx run @rawr/agent-config-sync:test --skip-nx-cache`
  - Service tests cover preview/dry-run planning, apply behavior with fake resources, stale retirement, undo apply, and drift assessment.
- `bunx nx run @rawr/agent-config-sync:structural --skip-nx-cache`
  - Structural suite passes and proves host package absence, non-forwarding repositories, and module schema ownership.
- `bunx nx run @rawr/plugin-plugins:typecheck --skip-nx-cache`
  - CLI plugin compiles with plugin-local resources and no host package dependency.
- `bunx nx run @rawr/plugin-plugins:build --skip-nx-cache`
  - CLI plugin builds without `@rawr/agent-config-sync-host`.
- `bunx nx run @rawr/plugin-plugins:test --skip-nx-cache`
  - Plugin tests cover concrete filesystem/registry/marketplace/package/process/target-home resource helpers.
- `bunx nx run @rawr/plugin-plugins:structural --skip-nx-cache`
  - Existing import-boundary suite passes with no forbidden host dependency.
- `bun run lint:boundaries`
  - ESLint/boundary checks pass across apps/services/packages/plugins.
- `bun run build:affected`
  - Affected builds pass after workspace graph no longer includes the host package.
- `CODEX_HOME="$(mktemp -d)" CLAUDE_PLUGINS_LOCAL="$(mktemp -d)" bun run rawr -- plugins sync all --dry-run --json --codex-home "$CODEX_HOME" --claude-home "$CLAUDE_PLUGINS_LOCAL"`
  - Exits `0`, emits valid JSON, reaches service-backed sync preview, includes planned target actions for temp homes, and has no module resolution errors for the removed host package.
- `CODEX_HOME="$(mktemp -d)" CLAUDE_PLUGINS_LOCAL="$(mktemp -d)" bun run rawr -- plugins sync drift --json --codex-home "$CODEX_HOME" --claude-home "$CLAUDE_PLUGINS_LOCAL" --no-fail-on-drift`
  - Exits `0`, emits valid JSON with `summary` and `plugins`, and computes drift through the service rather than duplicated CLI loops.
- `! rg -n "@rawr/agent-config-sync-host|agent-config-sync-host" package.json vitest.config.ts services/agent-config-sync plugins/cli/plugins scripts docs/migration docs/projects/rawr-final-architecture-migration/.context`
  - No active references remain. Historical/resource references either get corrected in this branch or explicitly left only under archive-style historical context if the final implementation discovers a documented reason.

## Risks And Open Questions

- The service/resource split is larger than a simple import rewrite because the current host package mixes domain algorithms, filesystem IO, registry/manifest semantics, process execution, and packaging.
- `runSync`, `retireStaleManagedPlugins`, and `runUndoForWorkspace` have existing behavior tests only in the host package. Those tests should be moved rather than discarded so the cutover preserves behavior.
- Target home resolution is intentionally plugin-local because it depends on CLI flags, env, and layered hq-ops config. The service should receive target homes or a target-home resource, not read env or hq-ops config directly.
- Cowork archive creation and Claude CLI install/enable are concrete plugin post-steps, not service truth. They should stay in `plugins/cli/plugins` and be tested there.
- Active docs still contain temporary-host language from older phases. Implementation should update forward-facing docs/ratchets without rewriting archived historical records unnecessarily.
- Sibling branches are likely remediating `hq-ops-host` and `session-intelligence-host`. This branch should avoid global `packages/*-host` hard failure unless coordinated, but it can add agent-config-sync-specific hard failure now.
