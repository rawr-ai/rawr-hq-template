# Plugin Logic Service-Split Remediation

## Summary

Create a new isolated Graphite worktree/stack on top of the current checked-out stack head. The goal is to make `plugins/cli/plugins` a projection again: it keeps oclif flags, command dispatch, JSON/human output, concrete CLI/process/zip/Claude resources, and service binding; durable plugin-sync, install-link, lifecycle-check, and policy semantics move behind service/package boundaries.

Takeover result from session `019da3e0-5fc2-7653-b1cf-3780bd6a531b`: keep the corrected service-remediation workflow and discard the earlier `*-host` mistake. Services own semantic behavior; plugin/app surfaces provide concrete resources; packages hold only true reusable primitives.

Domain decision: do not create a broad `plugin-management` service. Use existing bounded contexts:
- `services/agent-config-sync` owns agent/Codex/Claude/Cowork sync semantics.
- `services/hq-ops` owns HQ operational config, plugin install/link health, lifecycle quality policy, journal/security/repo-state concerns.
- `packages/plugin-workspace` owns workspace plugin discovery/manifest classification primitives.
- `plugins/cli/plugins` owns CLI projection and concrete command-side adapters.

## Canonical Branch And Worktree Sequence

Implementation happens only after this plan is reviewed and compacted.

1. From the current checked-out stack head, run `git status --short --branch`, `gt ls`, and `git worktree list --porcelain`.
2. Run `gt sync --no-restack`.
3. Create a Graphite child branch named `agent-ORCH-plugin-logic-service-split` from the current stack head with Graphite tracking.
4. Create an isolated worktree at `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-ORCH-plugin-logic-service-split`.
5. In that worktree, run `gt ls` and confirm `agent-ORCH-plugin-logic-service-split` is the current Graphite branch.
6. Integrate worker slices into the orchestrator worktree in this order: sync-service ownership, hq-ops install/lifecycle service ownership, plugin CLI thinning, ratchets, proof.
7. Worker branch names are fixed:
   - `agent-SYNC-plugin-sync-service-ownership`
   - `agent-HQOPS-plugin-install-lifecycle-service`
   - `agent-PROJ-plugin-cli-thinning`
   - `agent-RATCHET-plugin-service-boundary-ratchets`
   - `agent-PROOF-plugin-service-boundary-proof`
8. All agents are default agents. Explorers are forbidden.

## Service Ownership Decisions

### `services/agent-config-sync`

`services/agent-config-sync` owns workspace sync assessment and planning. It must absorb the semantics currently duplicated in `plugins/cli/plugins/src/lib/agent-config-sync-resources`.

Expose exactly these service-owned planning procedures under `services/agent-config-sync/src/service/modules/planning`:
- `planWorkspaceSync(input)`
- `assessWorkspaceSync(input)`
- `evaluateFullSyncPolicy(input)`

The planning module owns these semantics. They may be implemented as internal module helpers, but they are not extra public procedures:
- sync source discovery
- canonical content scanning
- tool-composed content scanning
- plugin YAML parsing
- source scope calculation
- scope filtering
- target-home policy
- drift/status aggregation
- full-sync planning
- partial/full-sync policy
- material-vs-metadata drift classification
- workspace skip reasons

`assessWorkspaceSync` becomes the canonical public workspace assessment procedure. Existing `planning.assessWorkspace` behavior is migrated into that procedure. The existing `execution`, `retirement`, and `undo` modules remain the apply/retire/undo boundaries. Single-plugin sync source resolution is service-owned inside the existing execution path; the CLI passes the plugin reference and concrete resources, not pre-scanned source content.

Align sync kind/scope semantics with `packages/plugin-workspace` `WORKSPACE_PLUGIN_KINDS`; do not preserve a narrower agent-config-sync-only plugin-kind model.

Actual file IO continues through `AgentConfigSyncResources`. Claude CLI execution, Cowork zip creation, process execution, and target-home environment resolution remain projection-side resources until Effect process resources exist.

### `services/hq-ops`

Add exactly two modules under `services/hq-ops/src/service/modules`:
- `plugin-install`
- `plugin-lifecycle`

Mount them on the root hq-ops router/client as:
- `pluginInstall`
- `pluginLifecycle`

Add both module entity names to `services/hq-ops/src/service/base.ts` metadata vocabulary as `pluginInstall` and `pluginLifecycle`. Add both module contracts to `services/hq-ops/src/service/contract.ts` and both routers to `services/hq-ops/src/service/router.ts`.

Each new module uses the canonical hq-ops service-module file shape already used by sibling modules:
- `schemas.ts`
- `contract.ts`
- `middleware.ts`
- `model.ts`
- `module.ts`
- `repository.ts`
- `router.ts`

`pluginInstall` exposes exactly:
- `assessInstallState(input)`
- `planInstallRepair(input)`

`pluginInstall.assessInstallState(input)` returns install/link drift status, issues, expected links, actual links, actions, and summary.

`pluginInstall.planInstallRepair(input)` returns a command plan for uninstall/relink/install repair. It never executes commands.

`pluginLifecycle` exposes exactly:
- `resolveLifecycleTarget(input)`
- `evaluateLifecycleCompleteness(input)`
- `checkScratchPolicy(input)`
- `decideMergePolicy(input)`

`pluginLifecycle` owns lifecycle target resolution, changed-file evaluation, completeness rules, scratch-policy evaluation, pull-request context normalization, judge-result normalization, deterministic fix-branch naming, and merge-policy decisions. Pull-request normalization, judge-result normalization, and fix-slice planning are internal service helpers behind those four procedures, not extra public procedures.

The CLI remains responsible for `git`, `gh`, `gt`, `rawr`, judge-command execution, waits, publishing, subprocesses, and command orchestration for `improve`, `sweep`, and `converge`.

### `packages/plugin-workspace`

`packages/plugin-workspace` owns reusable workspace plugin discovery and manifest classification primitives. It does not become service truth and does not own sync policy, install/link policy, lifecycle policy, or command execution.

Consolidate duplicate plugin discovery/classification from `plugins/cli/plugins` into `packages/plugin-workspace` where reusable. CLI code may keep a thin adapter file that calls `@rawr/plugin-workspace`.

### `plugins/cli/plugins`

`plugins/cli/plugins` is a projection and owns only:
- oclif command definitions
- flags and default flag normalization
- command dispatch
- human and JSON rendering
- exit-code decisions
- service binding through `bindService(...)`
- concrete filesystem/process/zip/Claude/Cowork adapters
- oclif manifest reads
- shell/process orchestration
- scaffold/factory generation

Scaffold/factory generation stays in `plugins/cli/plugins`; it is command-local generation and is not part of this service promotion.

## Public Export Policy

Do not broaden service public surfaces while moving behavior.

Service root exports stay thin and match the canonical `example-todo` pattern:
- `createClient`
- `Client`
- `CreateClientOptions`
- `Deps`
- `Scope`
- `Config`
- `router`
- `Router`

Stable public DTO aliases needed by projections go through `src/types.ts` and the service package `./types` export. Resource port types needed by projection binding may use an explicit `./resources` subpath. Do not export module repositories, module schemas, module contracts, module routers, or low-level helper functions from service roots.

## Files To Delete Or Move Out Of `plugins/cli/plugins`

Delete these production semantic files from `plugins/cli/plugins` after their behavior is moved to service/package boundaries:
- `src/lib/install-state.ts`
- `src/lib/install-reconcile.ts`
- `src/lib/sync-policy.ts`
- `src/lib/agent-config-sync-resources/sync-all.ts`
- `src/lib/agent-config-sync-resources/source-scope.ts`
- `src/lib/agent-config-sync-resources/targets.ts`
- `src/lib/agent-config-sync-resources/workspace.ts`
- `src/lib/agent-config-sync-resources/resolve-source-plugin.ts`
- `src/lib/agent-config-sync-resources/scan-source-plugin.ts`
- `src/lib/agent-config-sync-resources/scan-canonical-content.ts`
- `src/lib/agent-config-sync-resources/scan-tools-composed.ts`
- `src/lib/agent-config-sync-resources/plugin-content.ts`
- `src/lib/agent-config-sync-resources/plugin-yaml.ts`
- `src/lib/agent-config-sync-resources/effective-content.ts`
- `src/lib/agent-config-sync-resources/types.ts`
- `src/lib/plugins-lifecycle/fix-slice.ts`
- `src/lib/plugins-lifecycle/lifecycle.ts`
- `src/lib/plugins-lifecycle/policy.ts`
- `src/lib/plugins-lifecycle/scratch-policy.ts`
- `src/lib/plugins-lifecycle/types.ts`

Delete the `src/lib/plugins-lifecycle/` directory as a semantic home. Move any remaining subprocess helper to a neutral projection adapter named `src/lib/process-adapter.ts`.

## Files That Stay In `plugins/cli/plugins`

Keep these projection files:
- `src/lib/agent-config-sync-binding.ts`
- `src/lib/hq-ops-client.ts`
- `src/lib/agent-config-sync-resources/resources.ts`
- `src/lib/agent-config-sync-resources/claude-cli.ts`
- `src/lib/agent-config-sync-resources/cowork-package.ts`
- `src/lib/agent-config-sync-resources/fs-utils.ts`
- `src/lib/agent-config-sync-resources/index.ts`
- `src/lib/workspace-plugins.ts`
- `src/lib/layered-config.ts`
- `src/lib/factory.ts`
- command files under `src/commands/plugins/**`

The kept `agent-config-sync-resources` files must become pure resource adapters. They accept already-decided service inputs and must not discover source policy, target policy, drift aggregation, or sync scope semantics.

## Command Rewrites

- `plugins sync all` calls `agentConfigSync.planning.planWorkspaceSync` for full planning and then calls service execution/retirement APIs for apply behavior. It performs no local workspace source merge, scope policy, target policy, or drift summary calculation.
- `plugins sync drift` calls `agentConfigSync.planning.assessWorkspaceSync`; it formats the returned assessment.
- `plugins status --checks sync` calls `agentConfigSync.planning.assessWorkspaceSync`; it formats the returned assessment and maps service status to CLI status.
- `plugins sync <plugin-ref>` calls the existing agent-config-sync execution procedure with the plugin reference and concrete resources; service-owned execution resolves/scans source content internally. The CLI does not locally scan source content.
- `plugins status --checks install` calls `hqOps.pluginInstall.assessInstallState`.
- `plugins doctor links` calls `hqOps.pluginInstall.assessInstallState`; repair mode calls `hqOps.pluginInstall.planInstallRepair` and executes the returned command plan.
- `plugins cli install all` keeps oclif manifest reads and child-process execution, but install/link state classification comes from `hqOps.pluginInstall`.
- `plugins lifecycle check` calls `hqOps.pluginLifecycle.resolveLifecycleTarget`, `evaluateLifecycleCompleteness`, and `checkScratchPolicy`; it formats the returned report.
- `plugins improve` and `plugins sweep` call `hqOps.pluginLifecycle` for target resolution, lifecycle completeness, scratch policy, and merge-policy decision. The service performs PR context normalization, judge-result normalization, and deterministic fix-slice planning internally. The CLI executes git/gh/gt/rawr/judge commands.
- `plugins converge` remains a CLI orchestration command that chains `doctor links`, `sync all`, and `status`. It does not reimplement their policy.
- `plugins web *` commands remain CLI projection over existing hq-ops config/security/repo-state APIs. They are not part of this service split except where duplicate workspace discovery is replaced by `@rawr/plugin-workspace`.

## Ratchets

Add a new structural verifier:
- `scripts/phase-03/verify-plugin-plugins-service-boundary.mjs`

Wire it into `scripts/phase-03/run-structural-suite.mjs` for `@rawr/plugin-plugins` default structural checks before `phase-a:gate:import-boundary`.

`verify-plugin-plugins-service-boundary.mjs` must fail on production occurrences of:
- `plugins/cli/plugins/src/lib/install-state.ts`
- `plugins/cli/plugins/src/lib/install-reconcile.ts`
- `plugins/cli/plugins/src/lib/sync-policy.ts`
- `plugins/cli/plugins/src/lib/plugins-lifecycle/lifecycle.ts`
- `plugins/cli/plugins/src/lib/plugins-lifecycle/policy.ts`
- `plugins/cli/plugins/src/lib/plugins-lifecycle/scratch-policy.ts`
- `plugins/cli/plugins/src/lib/plugins-lifecycle/fix-slice.ts`
- `plugins/cli/plugins/src/lib/agent-config-sync-resources/sync-all.ts`
- `plugins/cli/plugins/src/lib/agent-config-sync-resources/source-scope.ts`
- `plugins/cli/plugins/src/lib/agent-config-sync-resources/targets.ts`
- `plugins/cli/plugins/src/lib/agent-config-sync-resources/workspace.ts`
- `plugins/cli/plugins/src/lib/agent-config-sync-resources/resolve-source-plugin.ts`
- `plugins/cli/plugins/src/lib/agent-config-sync-resources/scan-source-plugin.ts`
- `plugins/cli/plugins/src/lib/agent-config-sync-resources/scan-canonical-content.ts`
- `plugins/cli/plugins/src/lib/agent-config-sync-resources/scan-tools-composed.ts`
- `plugins/cli/plugins/src/lib/agent-config-sync-resources/plugin-content.ts`
- `plugins/cli/plugins/src/lib/agent-config-sync-resources/plugin-yaml.ts`
- production functions named `planSyncAll`, `resolveTargets`, `scanSourcePlugin`, `scanCanonicalContent`, `scanToolsComposed`, `loadSourcePluginContent`, `parsePluginYaml`, `assessInstallState`, `planInstallRepair`, `evaluateLifecycleCompleteness`, `checkScratchPolicy`, `assessMergePolicy`, `decideMergePolicy`
- direct imports from deleted semantic files
- local service-client mirror object types
- direct service `createClient(...)` calls outside approved binding modules
- `PluginManagerRuntime`
- `PluginInstallRuntime`
- `OclifStore`
- `*-host`
- `rawClient as any`
- `rawClient: unknown`
- `procedure: unknown`
- `callProcedure(`
- construction-time `provided:` boundary bags

Approved plugin projection adapter paths for this verifier:
- `plugins/cli/plugins/src/lib/agent-config-sync-binding.ts`
- `plugins/cli/plugins/src/lib/hq-ops-client.ts`
- `plugins/cli/plugins/src/lib/layered-config.ts`
- `plugins/cli/plugins/src/lib/workspace-plugins.ts`
- `plugins/cli/plugins/src/lib/process-adapter.ts`
- `plugins/cli/plugins/src/lib/agent-config-sync-resources/resources.ts`
- `plugins/cli/plugins/src/lib/agent-config-sync-resources/claude-cli.ts`
- `plugins/cli/plugins/src/lib/agent-config-sync-resources/cowork-package.ts`
- `plugins/cli/plugins/src/lib/agent-config-sync-resources/fs-utils.ts`
- `plugins/cli/plugins/src/lib/agent-config-sync-resources/index.ts`

Extend `scripts/phase-03/verify-agent-config-sync-service-shape.mjs` to require:
- `services/agent-config-sync/src/service/modules/planning/contract.ts` defines `planWorkspaceSync`, `assessWorkspaceSync`, and `evaluateFullSyncPolicy`.
- `services/agent-config-sync/test/service-shape.test.ts` ratchets those procedure names.
- `services/agent-config-sync/src/types.ts` exports public planning DTO aliases needed by the CLI.
- `plugins/cli/plugins` no longer contains agent-config-sync source scanning, source scope, target policy, or drift aggregation duplicates.

Extend `scripts/phase-1/verify-hq-ops-service-shape.mjs` to require:
- `services/hq-ops/src/service/modules/plugin-install/{contract,middleware,model,module,repository,router,schemas}.ts`
- `services/hq-ops/src/service/modules/plugin-lifecycle/{contract,middleware,model,module,repository,router,schemas}.ts`
- root hq-ops contract/router mount keys `pluginInstall` and `pluginLifecycle`
- hq-ops metadata entity vocabulary includes `pluginInstall` and `pluginLifecycle`
- `services/hq-ops/test/service-shape.test.ts` ratchets every new procedure name
- `services/hq-ops/src/types.ts` exports public plugin install/lifecycle DTO aliases needed by the CLI

Extend `scripts/phase-03/verify-hq-ops-resource-binding.mjs` to reject:
- `PluginManagerRuntime`
- `PluginInstallRuntime`
- `OclifStore`
- `plugin-management-host`
- `hq-ops-host`
- service-specific adapter packages for plugin install/lifecycle behavior

Keep `scripts/phase-03/verify-projection-boundary-invocation.mjs` focused on typed invocation, `bindService(...)`, direct service client creation, and weak service-client casts. Do not overload it with plugin-management semantic file allowlists.

## Tests To Add Or Move

Move semantic tests out of `plugins/cli/plugins/test` when their assertions become service-owned:
- `install-state.test.ts` becomes `services/hq-ops/test/plugin-install.test.ts`.
- `lifecycle-check.test.ts`, `policy-decision.test.ts`, and `fix-slice.test.ts` become `services/hq-ops/test/plugin-lifecycle.test.ts`.
- sync workspace/drift/status behavior tests become `services/agent-config-sync/test/workspace-planning.test.ts`.

Keep projection tests in `plugins/cli/plugins/test` focused on:
- flags
- output shape
- service-call integration
- command exit behavior
- child-process execution behavior
- scaffold/factory generation
- distribution alias and instance alias command behavior where semantics are already delegated

Add service tests:
- `services/agent-config-sync/test/workspace-planning.test.ts`
- `services/hq-ops/test/plugin-install.test.ts`
- `services/hq-ops/test/plugin-lifecycle.test.ts`

## Verification Gates

Run these after integration:

```bash
bunx nx run-many -t sync --projects=@rawr/plugin-plugins,@rawr/agent-config-sync,@rawr/hq-ops,@rawr/plugin-workspace,@rawr/cli
bunx nx run-many -t structural --projects=@rawr/plugin-plugins,@rawr/agent-config-sync,@rawr/hq-ops,@rawr/plugin-workspace,@rawr/cli
bunx nx run-many -t typecheck --projects=@rawr/plugin-plugins,@rawr/agent-config-sync,@rawr/hq-ops,@rawr/plugin-workspace,@rawr/cli
bunx nx run-many -t test --projects=@rawr/plugin-plugins,@rawr/agent-config-sync,@rawr/hq-ops,@rawr/plugin-workspace,@rawr/cli
bunx nx run-many -t build --projects=@rawr/plugin-plugins,@rawr/agent-config-sync,@rawr/hq-ops,@rawr/plugin-workspace,@rawr/cli
bunx nx run-many -t lint --projects=@rawr/plugin-plugins,@rawr/cli
bun run lint:boundaries
bun run build:affected
```

Run direct structural scripts after integration:

```bash
bun scripts/phase-03/verify-plugin-plugins-service-boundary.mjs
bun scripts/phase-03/verify-projection-boundary-invocation.mjs
bun scripts/phase-03/verify-agent-config-sync-service-shape.mjs
bun scripts/phase-1/verify-hq-ops-service-shape.mjs
bun scripts/phase-03/verify-hq-ops-resource-binding.mjs
bun run phase-a:gate:import-boundary
```

Run focused service tests after integration:

```bash
bunx vitest run --project agent-config-sync services/agent-config-sync/test/sync-behavior.test.ts services/agent-config-sync/test/service-shape.test.ts services/agent-config-sync/test/workspace-planning.test.ts
bunx vitest run --project hq-ops services/hq-ops/test/service-shape.test.ts services/hq-ops/test/ports-backed-service.test.ts services/hq-ops/test/plugin-install.test.ts services/hq-ops/test/plugin-lifecycle.test.ts
```

Run focused projection tests after integration:

```bash
bunx vitest run --project plugin-plugins plugins/cli/plugins/test/plugin-plugins.test.ts plugins/cli/plugins/test/distribution-alias-lifecycle.test.ts plugins/cli/plugins/test/instance-alias-isolation.test.ts plugins/cli/plugins/test/workspace-plugins-discovery.test.ts
bunx vitest run --project cli apps/cli/test/plugins-command-surface-cutover.test.ts apps/cli/test/plugins-status.test.ts apps/cli/test/plugins-sync-drift.test.ts apps/cli/test/plugins-install-all.test.ts apps/cli/test/plugins-converge-and-doctor.test.ts
```

## Live Proof

Use only isolated homes for live command proof:

```bash
PROOF_HOME="$(mktemp -d /tmp/rawr-plugin-proof.XXXXXX)"
```

Run:

```bash
HOME="$PROOF_HOME" XDG_CONFIG_HOME="$PROOF_HOME/.config" XDG_DATA_HOME="$PROOF_HOME/.local/share" XDG_STATE_HOME="$PROOF_HOME/.local/state" CODEX_HOME="$PROOF_HOME/.codex-rawr" CODEX_MIRROR_HOME="$PROOF_HOME/.codex" CLAUDE_PLUGINS_LOCAL="$PROOF_HOME/.claude/plugins/local" bun run rawr -- plugins sync all --dry-run --json --scope cli --allow-partial --agent codex --codex-home "$PROOF_HOME/.codex-rawr"
HOME="$PROOF_HOME" XDG_CONFIG_HOME="$PROOF_HOME/.config" XDG_DATA_HOME="$PROOF_HOME/.local/share" XDG_STATE_HOME="$PROOF_HOME/.local/state" CODEX_HOME="$PROOF_HOME/.codex-rawr" bun run rawr -- plugins status --json --checks sync --agent codex --codex-home "$PROOF_HOME/.codex-rawr" --material-only --no-fail
HOME="$PROOF_HOME" XDG_CONFIG_HOME="$PROOF_HOME/.config" XDG_DATA_HOME="$PROOF_HOME/.local/share" XDG_STATE_HOME="$PROOF_HOME/.local/state" CODEX_HOME="$PROOF_HOME/.codex-rawr" bun run rawr -- plugins lifecycle check --target plugins/cli/plugins --type cli --base main --json
```

Do not run mutating plugin sync/install proof against the real user home from this template repo. Runtime/server logs are not part of this proof because server/HQ runtime paths are not touched by this slice.

## Non-Negotiable Invariants

- No new broad `plugin-management` service.
- No new `*-host`, runtime, adapter, dumping-ground, or service-specific host package.
- No explorer agents.
- No local service-client mirror types in projections.
- No untyped dispatch helpers.
- No `create*Boundary` helpers in production projections.
- No construction-time `provided` boundary bags.
- No `createServiceInvocationOptions` revival.
- Services own semantic behavior; projections provide concrete resources and command orchestration.
- `plugin-workspace` remains a reusable primitive package, not service truth.
- Concrete Claude CLI, Cowork zip, oclif manifest reads, filesystem, process execution, and target-home environment resolution remain projection-side resources until Effect process resources exist.
- `improve`, `sweep`, and `converge` command orchestration stays in the CLI; deterministic lifecycle/policy semantics live in `hq-ops`.

Skills used: takeover-session, domain-design, parallel-development-workflow, architecture, nx-workspace.
