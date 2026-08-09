# Synthesis

## Verdict

We are partially using CLI plugins correctly relative to OCLIF. The missing architectural move is app-manifest-selected OCLIF plugin membership.

The repo already has real OCLIF plugin packages, OCLIF command discovery config, `@oclif/plugin-plugins`, and a local link/install workflow. The phrase "CLI plugin" is not just RAWR vocabulary here; for `plugins/cli/*` packages with `package.json#oclif`, it maps to native OCLIF plugin mechanics.

The target architecture is not yet fully correct because it has not made the native OCLIF mount point part of the app composition story. `rawr.hq.ts` should select CLI command plugins, but OCLIF should still load and dispatch them. The current docs mention CLI command registries and `CliSurfaceRuntime` without spelling out that the deployed CLI must receive native OCLIF plugin membership.

The target architecture should also stop preserving two public meanings of "plugin." Use "OCLIF plugin" for native CLI command packages. Use "agent toolkit" for Claude Code/Codex-style artifacts. If RAWR needs runtime capability enable/disable state, put it under HQ Ops capability/topology management rather than another `rawr plugins ...` channel.

## Main Finding

The correct target is not:

```text
RAWR manifest builds a custom command registry
apps/cli dispatches commands from that registry
OCLIF becomes a thin parser
```

The correct target is:

```text
RAWR manifest selects CLI command plugins
RAWR runtime/binding provides process and role resources
RAWR dev/build tooling materializes selected plugins into native OCLIF config
OCLIF loads, discovers, helps, hooks, and dispatches the commands
```

## What Is Already Good

- `@rawr/cli` is a real OCLIF CLI.
- `@rawr/plugin-plugins` is loaded as an OCLIF plugin by the root CLI.
- Workspace CLI plugin packages already declare OCLIF command discovery config.
- OCLIF install/link is kept at the native OCLIF plugin-manager boundary.
- Current docs already notice that CLI command packages and workspace runtime enablement are different concerns.
- HQ Ops owns semantic assessment of plugin install/link health instead of making app code scrape local plugin manager state directly.

## What Needs Architectural Clarification

1. `roles.cli.commands` must compile to native OCLIF plugin membership.
2. `CliSurfaceRuntime` must describe selected command-plugin topology and runtime/binding views, not dispatch commands itself.
3. `defineCliCommandPlugin` must produce an OCLIF-aware plugin declaration, including package identity, command discovery shape, optional hooks, local path, and bind requirements.
4. The root CLI should stop being the long-term composition authority for command plugin membership.
5. `toolkit` should become a facet or distribution artifact family, not the single `rawr.kind` for CLI command plugins.
6. Local development should be first-class: either automatic dev plugin materialization from app composition or a single convergence command that is explicitly composition-driven.

## Dev Ergonomics Recommendation

Local CLI composition should have a native path with one of these two modes:

### Preferred dev mode

```text
rawr.hq.ts selects CLI command plugins
dev CLI bootstrap reads compiled CLI surface topology
selected local workspace plugins are materialized as OCLIF dev plugins
rawr command help/execution sees them immediately
```

This likely means using OCLIF `devPlugins` or a generated local OCLIF config in dev mode. The implementation detail can be decided during the actual runtime/compiler slice, but the architecture should bless native OCLIF plugin membership as the target.

### Acceptable single-command mode

```bash
rawr cli converge
```

This command should:

- read the intended app/CLI composition;
- build selected local CLI command plugins;
- generate per-plugin OCLIF manifests when useful for the selected packages;
- link or materialize selected packages through native OCLIF mechanisms;
- diagnose stale OCLIF link state without owning app membership itself;
- report exactly which CLI now sees which plugin package.

The existing `rawr plugins cli install all` is close, but it is currently "scan all eligible toolkit packages" rather than "materialize this app's selected CLI command surface."

## Secondary Distribution Path

Published or cloned usage should still exist:

- npm package install through the OCLIF plugin manager: `rawr plugins install @scope/plugin-name`;
- GitHub or cloned source install through the OCLIF plugin manager where supported;
- local `rawr plugins link /absolute/path --install` for cloned development.

This should be documented as secondary to local composition for RAWR authors, but first-class for other users who did not author the plugin.

## `toolkit` Recommendation

Do not delete the concept.

Use it more precisely and do not use it for CLI selection:

- `cli-command-plugin`: native OCLIF command plugin facet.
- `agent-toolkit`: Claude Code/Codex-style plugin artifact facet with skills/workflows/scripts.
- `distribution`: package can ship one or both facets.

In other words, a package may be:

```text
OCLIF command plugin only
agent toolkit only
both OCLIF command plugin and agent toolkit
```

The current `rawr.kind: "toolkit"` should be migrated carefully because it may encode the "agent toolkit" distribution path. It should not remain the only classifier for CLI app composition.

## Public Naming Recommendation

Do not preserve `Channel A` and `Channel B` as target architecture language. That framing was useful to describe current command surfaces, but it keeps "plugin" overloaded.

Target naming should be:

- OCLIF command plugins: native OCLIF packages loaded by the CLI.
- Agent toolkits: Claude Code/Codex-style artifacts shipped by a package.
- HQ Ops capabilities/topology: any future enable/disable or runtime membership state that is not native OCLIF plugin installation.

Current commands such as `rawr plugins web ...` can remain migration debt, but they should not define the target mental model.

## Risks If Not Clarified

- RAWR builds a parallel CLI command registry and fights OCLIF.
- Local command plugin development remains global-state-heavy and easy to break with deleted worktrees.
- App composition and OCLIF install/link state drift apart.
- `toolkit` continues to hide multiple concepts, making CLI command plugins and agent runtime plugin artifacts hard to reason about.
- "Plugin" remains overloaded across OCLIF, RAWR runtime enablement, and agent-runtime artifacts.
- Effect runtime work accidentally leaks into command authoring or CLI dispatch.

## Verification Signal

The docs-only spike packet did not change runtime code, but the targeted test band exposed existing instability in the current OCLIF plugin workflow:

- `@rawr/plugin-hello:test` passed.
- `@rawr/plugin-session-tools:test` passed.
- `@rawr/plugin-plugins:test` failed on a stale gate expectation for a missing HQ Ops manifest helper path.
- `@rawr/cli:test` failed in plugin sync/status/install tests with OCLIF `MODULE_NOT_FOUND` warnings, missing stdout JSON, and `PLUGIN_LINK_FAILED` during a build/link path.
- After `bun install` in the spike worktree, `bunx nx run-many -t build --all` failed only on `@rawr/plugin-plugins:build` with an existing `PlatformPath` type mismatch.

That result strengthens the recommendation: local command-plugin composition should not remain a broad scan plus global link-state repair flow. It needs a composition-driven native OCLIF convergence path with better stale-link diagnostics.

## Recommended Next Architecture Action

Promote `proposed-oclif-cli-composition-spec.md` into the migration planning queue as a prerequisite clarification before implementing any serious CLI role/surface runtime work.

The spec should not block M2-U00 server-runtime bridge deletion, because M2 explicitly keeps CLI optional/reserved. It should become the target reference before M2-U04/M2-U05-style builder/proof work tries to generalize plugin builders and surface runtimes across the CLI lane.
