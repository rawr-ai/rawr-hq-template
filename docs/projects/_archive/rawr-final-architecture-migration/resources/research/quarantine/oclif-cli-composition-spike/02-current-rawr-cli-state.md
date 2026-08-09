# Current RAWR CLI State

## Direct Answer

Current RAWR CLI plugins are real OCLIF plugins when they expose `package.json#oclif` command wiring. The current repo already has a native OCLIF command-plugin path.

However, the current system still treats these packages as `toolkit` plugins in RAWR metadata and links them through a local convergence helper. That is workable during migration, but it does not yet express the target app-manifest composition model for `roles.cli.commands`.

## Current Gaps

1. `rawr.hq.ts` does not currently express `roles.cli.commands`; it has `server` and `async` only. Evidence: `apps/hq/rawr.hq.ts:25-36`.
2. `@rawr/cli` directly lists OCLIF plugins in `apps/cli/package.json`, rather than consuming app-manifest-selected CLI plugin membership.
3. Current command-plugin eligibility is anchored on `toolkit`, not on an explicit native OCLIF command-plugin facet.
4. Local development works through a helper and OCLIF link/install state, but the app composition model does not yet make local command-plugin membership automatic or obviously first-class.
5. Current docs distinguish two public `plugins` command families. The target architecture should not preserve that overload; runtime capability enablement, if needed, should be named as HQ Ops capability/topology state rather than a second "RAWR plugin" channel.

## Root CLI

`apps/cli/package.json` defines `@rawr/cli` as the OCLIF root CLI:

- it depends on `@oclif/core`, `@oclif/plugin-help`, `@oclif/plugin-plugins`, and `@rawr/plugin-plugins`;
- `package.json#oclif.bin` is `rawr`;
- `package.json#oclif.commands` points at `./src/commands`;
- `package.json#oclif.plugins` includes `@oclif/plugin-help`, `@oclif/plugin-plugins`, and `@rawr/plugin-plugins`;
- `package.json#oclif.typescript.commands` points at `./src/commands`.

Evidence: `apps/cli/package.json:6-34`.

The runtime entrypoint calls OCLIF directly:

- `apps/cli/src/index.ts:1` imports `run` from `@oclif/core`.
- `apps/cli/src/index.ts:92-94` executes `run(argv, import.meta.url)` and then flushes OCLIF output.

## Current Command Plugins

The current CLI plugin packages are:

- `plugins/cli/chatgpt-corpus`
- `plugins/cli/hello`
- `plugins/cli/plugins`
- `plugins/cli/session-tools`

These are workspace packages and Nx projects:

- `@rawr/plugin-chatgpt-corpus`
- `@rawr/plugin-hello`
- `@rawr/plugin-plugins`
- `@rawr/plugin-session-tools`

`@rawr/plugin-hello`, `@rawr/plugin-session-tools`, and `@rawr/plugin-chatgpt-corpus` have direct OCLIF command discovery config:

- `plugins/cli/hello/package.json:23-28`
- `plugins/cli/session-tools/package.json:11-16`
- `plugins/cli/chatgpt-corpus/package.json:6-11`

`@rawr/plugin-plugins` also has OCLIF command config, but points to source commands:

- `plugins/cli/plugins/package.json:28-33`

## Vocabulary Mismatch

Current plugin routing says:

- `plugins/cli/*` are CLI toolkits.
- `rawr.kind=toolkit` is authoritative for that root.

Evidence: `plugins/AGENTS.md:11-20`, `plugins/AGENTS.md:29-32`.

The current package metadata follows that rule:

- `plugins/cli/hello/package.json:39-41`
- `plugins/cli/plugins/package.json:48-50`
- `plugins/cli/session-tools/package.json:29-31`
- `plugins/cli/chatgpt-corpus/package.json:29-31`

This conflicts with target docs that say `rawr.kind` should include `cli` and that runtime plugin roots include `plugins/cli/*`.

Evidence: `docs/system/PLUGINS.md:21-32`, `docs/SYSTEM.md:91-103`.

The user's clarification matters here: `toolkit` should not be treated as accidental. It likely comes from agent-runtime plugin packaging, where a package may also ship Claude Code/Codex plugin content such as skills and workflows. The target should preserve that path as an `agent-toolkit` facet while separating native OCLIF command-plugin classification from agent toolkit packaging.

## Current Local Link/Install Workflow

`plugins/cli/plugins/src/commands/plugins/cli/install/all.ts` owns the helper:

- description: "Link all workspace command plugins into the local oclif plugin manager (Channel A)";
- it asks HQ Ops for workspace plugins with `kind: "toolkit"`;
- it plans eligible plugins;
- on non-dry-run, it builds each plugin and invokes `rawr plugins link <absPath> --install`.

Evidence: `plugins/cli/plugins/src/commands/plugins/cli/install/all.ts:51-58`, `plugins/cli/plugins/src/commands/plugins/cli/install/all.ts:82-85`, `plugins/cli/plugins/src/commands/plugins/cli/install/all.ts:126-139`.

HQ Ops catalog logic currently maps the `cli` discovery root to `toolkit`:

- `services/hq-ops/src/service/shared/repositories/workspace-plugin-catalog-repository.ts:15-22`

It marks command-plugin eligibility only when:

- `kind === "toolkit"`;
- `package.json#oclif.commands` exists;
- `package.json#oclif.typescript.commands` exists.

Evidence: `services/hq-ops/src/service/shared/repositories/workspace-plugin-catalog-repository.ts:84-106`.

This is a good transitional rule, but it conflates a command plugin's OCLIF capability with `toolkit` as the RAWR kind.

## Current OCLIF State Observation

`plugins/cli/plugins/src/lib/plugin-install-service.ts` reads the OCLIF plugin manager's data directory and runtime plugin objects. This is correctly projection-side because it observes the host CLI installation and sends normalized state to HQ Ops.

Evidence:

- manager manifest shape: `plugins/cli/plugins/src/lib/plugin-install-service.ts:69-73`
- default OCLIF data dir: `plugins/cli/plugins/src/lib/plugin-install-service.ts:82-90`
- manager state read: `plugins/cli/plugins/src/lib/plugin-install-service.ts:92-124`
- runtime plugin snapshot: `plugins/cli/plugins/src/lib/plugin-install-service.ts:138-157`

## Current Docs And Naming Debt

The repo currently distinguishes two command families:

- `rawr plugins ...` for the native OCLIF plugin manager.
- `rawr plugins web ...` for workspace runtime plugin enablement.

Evidence:

- `docs/system/PLUGINS.md:9-13`
- `docs/SYSTEM.md:84-89`
- `docs/process/AGENT_LOOPS.md:63-69`
- `docs/process/runbooks/PLUGIN_BUILD_AND_WIRING_MATRIX.md:7-12`

The build/wiring matrix says a local OCLIF command plugin must be built and linked into the user/global CLI plugin manager, and that published OCLIF plugins are installed through the plugin manager.

Evidence: `docs/process/runbooks/PLUGIN_BUILD_AND_WIRING_MATRIX.md:39-45`, `docs/process/runbooks/PLUGIN_BUILD_AND_WIRING_MATRIX.md:63-86`.

This split is useful as a current-state observation, but it should not be promoted as target vocabulary. The target should reserve "OCLIF plugin" for native CLI command packages and move any workspace enable/disable behavior under HQ Ops capability or topology language.

## Current State Check

From the primary checkout, `bun run rawr -- plugins cli install all --json --dry-run` with temporary home/data/config/cache directories planned four eligible command plugins and skipped none:

- `@rawr/plugin-chatgpt-corpus`
- `@rawr/plugin-hello`
- `@rawr/plugin-plugins`
- `@rawr/plugin-session-tools`

The command returned `ok: true`, but OCLIF emitted `MODULE_NOT_FOUND` warnings while loading plugin state. That warning is a local plugin-manager health signal, not evidence that the planned plugins are not OCLIF-shaped.

## Build Signal From Spike Worktree

After `bun install` in the spike worktree, `bunx nx run-many -t build --all` ran the real build surface from this checkout. It failed only on `@rawr/plugin-plugins:build` with a `PlatformPath` type mismatch in `src/lib/agent-config-sync-resources/resources.ts`.

That does not invalidate the docs-only spike, but it does confirm that the current package owning OCLIF plugin management helpers is in a transient, failing build state.
