# Proposed Spec: OCLIF-Native CLI Plugin Composition

Status: proposal from spike, not canonical until promoted.

## Purpose

Define how RAWR CLI command plugins should compose natively with OCLIF while preserving the canonical RAWR app manifest, plugin binding, service boundary, and hidden Effect-backed runtime model.

## Core Rule

CLI command plugins are native OCLIF plugin packages.

RAWR app composition decides which CLI command plugins belong to an app or CLI. OCLIF loads, discovers, helps, hooks, installs, links, and dispatches those plugin commands.

RAWR must not build a second command discovery or dispatch plane beside OCLIF.

## Terms

| Term | Meaning |
| --- | --- |
| OCLIF command plugin | A native OCLIF plugin package that contributes CLI commands, hooks, or nested OCLIF plugins. |
| App-selected CLI plugin | An OCLIF command plugin selected by `rawr.hq.ts` for a specific CLI role/surface. |
| OCLIF plugin manager | The native `@oclif/plugin-plugins` install/link/inspect/reset/update surface. |
| Agent toolkit | Claude Code/Codex-style artifact set, such as skills, workflows, scripts, command banks, or generated agent plugin bundles. |
| HQ Ops capability/topology state | Any RAWR-owned enablement, catalog, or membership state that is not native OCLIF plugin installation. |

Use "plugin" without a qualifier only when the surrounding framework already defines it. Target RAWR docs should not preserve a second public "RAWR plugin" meaning beside OCLIF plugins.

## Target Topology

Canonical command plugin root:

```text
plugins/cli/commands/<plugin-name>
```

Transitional current root:

```text
plugins/cli/<plugin-name>
```

The current root may remain during migration, but target docs and generators should converge on the role-first shape from the integrated architecture spec.

## Repo Touchpoints

| Area | Target responsibility | Current-state note |
| --- | --- | --- |
| `apps/hq/rawr.hq.ts` | Select CLI command plugins under `roles.cli.commands`. | Currently has `server` and `async`, no `cli` role. |
| `apps/cli/package.json` | Remain the OCLIF root CLI config; receive generated or materialized plugin membership in dev/build flows. | Currently hand-lists OCLIF plugins in `oclif.plugins`. |
| `plugins/cli/commands/*` | Target root for official OCLIF command plugins. | Current packages live under `plugins/cli/*`. |
| `packages/hq-sdk` | Expose `defineCliCommandPlugin(...)` and binding helpers without raw Effect leakage. | Current `plugins.ts` is pre-Effect binding substrate. |
| `services/hq-ops` | Own catalog/topology diagnostics and OCLIF link/install health assessment. | Current catalog maps `cli` root to `toolkit`. |
| `plugins/AGENTS.md` and docs | Define target vocabulary: OCLIF command plugin, agent toolkit, HQ Ops capability/topology. | Current docs preserve `toolkit` and two `plugins` command families. |

## Package Contract

Each CLI command plugin package must own:

- `package.json#name`
- `package.json#oclif`
- `package.json#oclif.commands`
- `package.json#oclif.typescript.commands` for TypeScript source workflows
- command classes extending OCLIF `Command` or RAWR's approved command base
- optional OCLIF hooks declared through native OCLIF config
- build output aligned with `oclif.commands`
- generated `oclif.manifest.json` for production/shipped builds when command metadata caching matters

Each package may also own:

- agent toolkit artifacts such as skills, workflows, scripts, or plugin bundles for Claude Code/Codex-style runtimes;
- local docs;
- publishing metadata;
- test fixtures.

## Manifest Contract

`rawr.hq.ts` selects CLI command plugins under explicit role/surface membership:

```ts
export const rawrHq = defineApp({
  id: "hq",
  roles: {
    cli: {
      commands: [
        pluginManagementCommands,
        sessionToolCommands,
      ],
    },
  },
})
```

The manifest authors membership. It does not manually build OCLIF plugin arrays, resolve local paths, run installs, or materialize command lists.

## Builder Contract

`defineCliCommandPlugin(...)` should describe an OCLIF plugin package in RAWR-shaped terms:

```ts
export const sessionToolCommands = defineCliCommandPlugin({
  capability: "session-tools",
  packageName: "@rawr/plugin-session-tools",
  localRoot: import.meta.dirname,
  oclif: {
    commands: "./dist/commands",
    typescriptCommands: "./src/commands",
    topicSeparator: " ",
  },
  bind({ process, role }) {
    return {
      sessionIntelligence: bindService(createSessionIntelligenceClient, {
        bindingId: "cli/session-tools/session-intelligence",
        deps: ...,
        scope: ...,
        config: ...,
      }),
    }
  },
})
```

The builder should be semantic and OCLIF-aware. It should not expose raw Effect types or require command authors to write runtime lowering code.

## Runtime Contract

The runtime compiler consumes app manifest CLI membership and produces a `CliSurfaceRuntime`.

`CliSurfaceRuntime` should contain:

- selected command plugin identities;
- package names;
- local workspace roots where available;
- built command targets;
- optional hook declarations;
- generated manifest presence/status;
- role-local binding declarations;
- diagnostics and topology export data;
- enough information for dev/build tooling to materialize native OCLIF plugin membership.

`CliSurfaceRuntime` must not:

- discover command files itself;
- dispatch commands itself;
- own command semantics;
- expose raw Effect substrate internals;
- replace OCLIF plugin manager state.

## Harness Contract

The CLI harness is OCLIF.

RAWR's harness edge may add:

- context bootstrap;
- correlation propagation;
- workspace-root detection;
- process/role runtime-view access;
- command journaling;
- service-client binding helpers;
- diagnostics around selected/linked plugins.

It must not become a second execution plane.

## Local Development Ergonomics

Local development is the primary path.

The intended CLI should pick up selected local command plugins through native OCLIF mechanics with either automatic dev materialization or one command.

### Preferred path: composition-driven dev plugins

Dev bootstrap should:

1. compile or read the app's CLI surface topology;
2. identify local workspace command plugin packages selected by `roles.cli.commands`;
3. build selected plugins when needed;
4. generate `oclif.manifest.json` when needed;
5. materialize native OCLIF dev/core plugin membership for the intended CLI;
6. run OCLIF normally.

Native OCLIF `devPlugins` or generated local OCLIF config should be considered first because OCLIF already distinguishes dev plugins from core and user plugins. This is proposed target behavior; the current repo does not yet configure `devPlugins`.

### Acceptable path: one convergence command

Provide a single command:

```bash
rawr cli converge
```

It should:

- read app/CLI composition, not scan every possible toolkit package by default;
- build selected local plugins;
- generate per-plugin OCLIF manifests when useful for selected packages;
- link/materialize selected packages through native OCLIF mechanisms;
- warn on stale OCLIF links that conflict with the selected CLI surface;
- print the final selected plugin set and command source.

The existing `rawr plugins cli install all` can evolve into or be replaced by this, but its semantics should shift from "install all eligible toolkit packages" to "materialize this CLI's selected command plugin surface."

## External User Distribution

Published or cloned installation remains supported but secondary to local authoring ergonomics.

Supported paths:

```bash
rawr plugins install @scope/plugin-name
rawr plugins install https://github.com/org/repo
rawr plugins link /absolute/path/to/cloned/plugin --install
```

Published plugins should include built output and OCLIF manifests. Cloned plugins should support the same build/link convergence path used locally.

## Public Command Vocabulary

The target architecture should not preserve `Channel A` and `Channel B` as public concepts.

Native OCLIF plugin-manager commands remain available because they are OCLIF's user-install and link surface:

```bash
rawr plugins install @scope/plugin-name
rawr plugins link /absolute/path/to/cloned/plugin --install
rawr plugins inspect @scope/plugin-name
```

Those commands are not RAWR app composition authority. They are plugin-manager mechanics.

Runtime capability enablement should not be another `rawr plugins ...` channel in the target model. If RAWR needs enable/disable/toggle behavior later, place it under HQ Ops capability or topology commands with distinct vocabulary, for example `rawr hq capabilities ...` or `rawr hq topology ...`.

## `toolkit` Facet

`toolkit` should become a facet or distribution artifact family, not the sole classifier for CLI command plugins.

Recommended vocabulary:

- CLI command facet: native OCLIF commands.
- Agent toolkit facet: Claude Code/Codex plugin artifacts such as skills, workflows, scripts, command banks, or generated plugin bundles.
- Distribution posture: whether a package ships one facet or several.

Allowed package shapes:

- OCLIF command plugin only.
- Agent toolkit only.
- Combined OCLIF command plugin plus agent toolkit.

This preserves the intended agent-runtime path while making native CLI composition explicit.

## Dependency Inversion Rules

CLI command plugins may import:

- service package clients/contracts/types;
- public `@rawr/hq-sdk` authoring and binding helpers;
- `@rawr/core` command base and common CLI helpers;
- OCLIF command APIs;
- package-local code.

CLI command plugins must not import:

- `apps/cli/src/*` internals;
- other plugin runtime code;
- `packages/runtime/substrate`;
- raw Effect runtime internals;
- server/web harness internals.

Cross-capability work should go through service package boundaries, not plugin-to-plugin imports.

## Proof Requirements

Any implementation slice promoting this spec must prove:

- a selected local CLI command plugin is visible to the intended CLI through native OCLIF loading;
- command help shows the plugin command;
- command execution reaches the expected service client through `bindService(...)`;
- deselected plugins are not silently included through global scan behavior;
- temporary or deleted worktree links are diagnosed clearly;
- published/cloned install docs match OCLIF behavior;
- RAWR does not introduce a second public plugin channel for runtime capability toggles;
- raw Effect types do not leak into plugin authoring APIs.

## Migration Notes

1. Keep current `plugins/cli/*` packages working during migration.
2. Add target docs/generators for `plugins/cli/commands/*`.
3. Introduce `defineCliCommandPlugin(...)` in `@rawr/hq-sdk` only when a slice consumes it.
4. Change catalog/convergence language from `toolkit`-only to facet-aware classification.
5. Make `rawr plugins cli install all` either legacy/deprecated or an alias for composition-driven `rawr cli converge`.
6. Do not make CLI runtime work block the M2-U00 server bridge deletion; schedule it before CLI/generalized surface runtime work.
