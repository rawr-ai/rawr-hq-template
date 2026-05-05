# Native-Superseded Projection Cleanup Handoff

Status: forward-looking implementation handoff.

Audience: an external senior/pro agent starting cold in this repository.

Primary objective: when a RAWR agent plugin is successfully installed through
native Codex provider plugin deployment, retire that same plugin's old
RAWR-managed direct Codex projections so the provider skill picker and runtime
state do not show duplicate legacy entries.

## Start Here

Use this file when you are working on duplicate skills, stale direct-sync
artifacts, or the `Duplicate legacy provider claims` gap from
`services/agent-config-sync/docs/PARITY_INVESTIGATION_REPORT.md`.

Read these files first:

- `services/agent-config-sync/docs/PARITY_INVESTIGATION_REPORT.md`
- `services/agent-config-sync/docs/MANAGED_PROVIDER_PLUGIN_PARITY_WORKSTREAM.md`
- `services/agent-config-sync/docs/MANAGED_PROVIDER_PLUGIN_PARITY_DECISIONS.md`
- `services/agent-config-sync/src/service/modules/retirement/router.ts`
- `services/agent-config-sync/src/service/modules/retirement/helpers/apply-codex-retirement.ts`
- `services/agent-config-sync/src/service/modules/execution/helpers/sync-codex-homes.ts`
- `services/agent-config-sync/src/service/shared/repositories/codex-runtime-paths.ts`
- `services/agent-config-sync/src/service/shared/repositories/codex-registry-repository.ts`
- `packages/agent-config-sync-node/src/codex-cli.ts`
- `plugins/cli/plugins/src/commands/plugins/sync.ts`
- `plugins/cli/plugins/src/commands/plugins/sync/all.ts`

Start with repo state:

```bash
git status --short --branch
gt status --short
gt ls
bunx nx show project @rawr/agent-config-sync --json
bunx nx show project @rawr/plugin-plugins --json
```

Graphite is required in this repo. Work on a `codex/...` branch and keep the
branch clean when handing off.

## Problem

Native provider deployment is now the sanctioned Codex and Claude deployment
path. Direct filesystem projection still exists, but it is an explicit
auxiliary export/repair path.

The missing lifecycle behavior is for active plugins that have moved from old
direct Codex projection to native Codex provider installation. Existing cleanup
does not retire their direct projection claims because the plugin is still
active.

The visible failure mode is duplicate Codex skill picker entries:

- one native plugin skill, for example `hyperresearch:hyperresearch-codex`
- one or more stale direct-projection skills, for example
  `hyperresearch-codex` from top-level user skill roots

Do not solve this with path-name guessing. The cleanup must be ownership-based.

## Existing Cleanup Boundaries

These mechanisms already exist and should be reused where possible:

- Per-plugin direct projection GC runs only when Codex filesystem projection is
  executed. Code path: `sync-codex-homes.ts`.
- Stale managed plugin retirement handles plugins that are no longer active.
  Code path: `retirement/router.ts` plus `apply-codex-retirement.ts`.
- Codex package pruning cleans generated package output under the local
  marketplace root. Code path: `packages/agent-config-sync-node/src/codex-package.ts`.

Those mechanisms do not cover native-superseded active plugin claims.

## Required Behavior

After native Codex install verification succeeds for a plugin in a specific
Codex home, the sync command should retire that plugin's old RAWR-managed
direct Codex projection claims from that same Codex home, unless direct
destination projection is explicitly enabled.

Required trigger:

- `--codex-package` is enabled
- `--codex-install` is enabled
- Codex install verification reports the plugin as installed and enabled for
  the same `codexHome`
- `--destination-projection` is not enabled
- dry-run reports the cleanup plan from planned native install actions without
  mutating or claiming provider verification

Required no-op cases:

- `--no-codex-install`
- Codex install failure
- plugin package generation skipped
- `--destination-projection`
- a different configured Codex home without a same-run verified install action
- unmanaged files with matching names
- surviving registry claims from other managed plugins
- present same-named registry entries whose `source_plugin_path` resolves to a
  different source plugin root

The behavior should apply to both:

- `rawr plugins sync <plugin-ref>`
- `rawr plugins sync all`

## Ownership Rules

The only safe authority for destructive Codex projection cleanup is
`<codex-home>/plugins/registry.json` entries with:

```json
{
  "managed_by": "@rawr/plugin-plugins"
}
```

Do not infer ownership from:

- a directory name under `~/.agents/skills`
- a directory name under `<codex-home>/skills`
- a skill title or frontmatter name
- the presence of identical file contents
- a matching native plugin cache path

If no registry claim exists, do not delete. Report the residual as unclaimed.

Plugin identity must be source-aware:

- match by plugin name plus the source plugin root used to create the native
  package when the old registry entry's `source_plugin_path` still exists
- if a registry entry's `source_plugin_path` no longer exists, allow
  `managed_by` plus plugin name to identify old worktree projections
- if a same-named managed entry points at an existing different source root,
  block that entry and report it as a collision instead of retiring by name

## Paths To Handle

Use the existing path helpers:

- `getCodexRetiredRootSkillsDir(codexHome, pathOps)`
- `getCodexRuntimeSkillsDir(codexHome, pathOps)`
- `getCodexManagedMcpDir(codexHome, pluginName, pathOps)`

Important path rule:

- for real `~/.codex` or `~/.codex-rawr` homes, runtime skills live at
  `$HOME/.agents/skills`, not inside the Codex home
- old retired root skill copies live at `<codex-home>/skills`
- because `$HOME/.agents/skills` can be shared by multiple Codex homes,
  runtime skill deletion must check surviving registry claims across every
  known Codex home that resolves to the same runtime skill root

Automatic cleanup must be scoped to native-backed surfaces. Retire artifacts
only when owned exclusively by the native-superseded plugin and backed by
provider-visible native capability evidence:

- retired root skills: `<codex-home>/skills/<skill>`
- runtime skills: `getCodexRuntimeSkillsDir(...)/<skill>`
- hook scripts: `<codex-home>/hooks/rawr/<plugin>/<hook>`
- hook lifecycle entries: `<codex-home>/hooks.json` entries for that plugin
- MCP runtime files: `<codex-home>/mcp/rawr/<plugin>/<server>`
- registry entries for the retired direct projection claim

Retain and report these projection-only or under-specified surfaces by default:

- prompts/workflows: `<codex-home>/prompts/<workflow>.md`
- scripts: `<codex-home>/scripts/<script>`
- agents: `<codex-home>/agents/<agent>.toml`
- settings/config fragments
- MCP `config.toml` entries unless the implementation has exact resolved
  config-key ownership metadata for the plugin

Do not touch:

- native Codex plugin cache under
  `<codex-home>/plugins/cache/<marketplace>/<plugin>/<version>`
- native marketplace roots such as `dist/codex`
- Claude local plugin directories unless a separate Claude cleanup mode is
  explicitly designed
- unmanaged user skills or manually installed skills

## Recommended Design

Add a new retirement capability rather than overloading stale-plugin
retirement.

Proposed service procedure:

```ts
retireNativeSupersededCodexProjections({
  workspaceRoot: string;
  claimCheckCodexHomes: string[];
  candidates: Array<{
    codexHome: string;
    plugin: string;
    sourcePluginRoot: string;
    verifiedNativeCapabilities: {
      skills: boolean;
      hooks: boolean;
      mcp: boolean;
    };
    verification: "verified" | "dry-run-planned";
  }>;
  dryRun: boolean;
})
```

Output should reuse or extend the existing retirement action shape:

```ts
{
  ok: boolean;
  retiredPlugins: Array<{ agent: "codex"; home: string; plugin: string }>;
  actions: RetireAction[];
}
```

Implementation notes:

- In `retirement/router.ts`, load only the Codex registries named by cleanup
  candidates for home-local targets.
- Select registry entries where `managed_by === "@rawr/plugin-plugins"`,
  `name` matches the candidate plugin, and the source-path collision rules
  above pass.
- Build surviving claim sets from all registry entries not being retired.
- Delete home-local filesystem targets only if no surviving managed registry
  entry in the same Codex home still claims that same target name.
- For runtime skills under a shared `getCodexRuntimeSkillsDir(...)` root, build
  the surviving claim set from `claimCheckCodexHomes` filtered to homes whose
  runtime skill root matches the candidate target. At minimum this must include
  all selected target homes plus well-known sibling homes that share the user
  root, such as `~/.codex` and `~/.codex-rawr`.
- If a shared runtime root cannot be fully claim-checked because a relevant
  registry cannot be read, do not delete the runtime skill directory. Remove
  only the candidate registry claim and report the physical path as retained.
- Delete only surfaces covered by the candidate's verified native capability
  booleans. For dry-run, report the candidate as `dry-run-planned` and do not
  claim provider verification.
- Remove the retired plugin entries from `plugins/registry.json`.
- Use undo capture for every write/delete when not in dry-run.
- Reuse `applyCodexRetirement` only after it is hardened for surviving-claim
  checks, or add a sibling helper that performs those checks before deletion.

Do not call this procedure "stale plugin retirement." The plugin is active; the
legacy projection claim is stale.

## CLI Integration

In `plugins sync <plugin-ref>`:

1. Generate and install the native Codex package.
2. Inspect `codexInstall.actions`.
3. Select plugins with a `verified` action where `installed === true` and
   `enabled === true`.
4. Build cleanup candidates from those verified actions, preserving each
   action's `codexHome`; do not fan a verified action out to other Codex homes.
5. Derive cleanup capability booleans from the verified action and package
   metadata. For example, native skills require provider-visible native skills,
   hooks require provider-visible hooks, and MCP requires native MCP servers.
6. Build `claimCheckCodexHomes` from selected target homes plus known sibling
   homes that share runtime skill roots with those targets.
7. If native cleanup is enabled, call
   `retireNativeSupersededCodexProjections`.
8. Include the result in JSON output, for example:

```json
{
  "nativeProjectionCleanup": {
    "ok": true,
    "actions": []
  }
}
```

In `plugins sync all`, use the same logic for all verified installed packages.

In dry-run, `installCodexMarketplacePlugins` returns `planned` actions rather
than `verified` actions. For dry-run output, build cleanup candidates from
those planned actions with `verification: "dry-run-planned"`, calculate the
same registry-backed action plan, and keep the result explicitly marked as
non-verified.

Recommended flag policy:

- default native cleanup on
- add `--no-native-projection-cleanup` only if a real fallback need appears
- suppress cleanup automatically when `--destination-projection` is enabled
- suppress mutating cleanup when `--dry-run`, but still show planned actions

If the team decides against a new flag, still expose the result in JSON so
reviewers can see what was cleaned or skipped.

## Safety Rules

The cleanup is destructive, so these rules are mandatory:

- Never delete unregistered skill directories.
- Never delete a target still claimed by another managed registry entry.
- Never delete native plugin package/cache material.
- Never delete projection-only Codex surfaces that native provider activation
  has not proven for the same plugin and Codex home.
- Never delete direct projection material unless native install verification
  succeeded in the same command run, or an explicit future cleanup command is
  invoked by name.
- Dry-run must not mutate filesystem or registry state.
- Undo capture must include every deleted path and registry/config write.
- If cleanup fails after install succeeds, the command should report partial
  post-step failure but must not roll back the provider install by default.

## Edge Cases To Handle

Shared skill name:

- If plugin A and plugin B both claim `skill-x`, and only plugin A is
  native-superseded, remove plugin A's registry claim but keep the physical
  skill directory.

Old root plus runtime skill:

- Remove both `<codex-home>/skills/<skill>` and the runtime skill path when no
  surviving claim owns the skill.

Old worktree source path:

- Source paths in old registry entries may point at deleted worktrees. Do not
  require the source path to exist before cleanup.

Hook lifecycle cleanup:

- Prune only hook entries owned by the plugin being cleaned. Preserve manual
  hook entries and hooks owned by other plugins.

MCP cleanup:

- Remove only managed plugin MCP runtime files. Preserve `config.toml` sections
  unless the implementation can prove exact config-key ownership for this
  plugin.

Dry-run:

- Plan the same registry-backed action set without writes and label it as based
  on planned install actions, not verified provider state.

Destination projection explicitly enabled:

- Do not clean. Projection is being requested as an active output path.

Multiple Codex homes:

- Clean only the Codex home attached to a verified or planned install action.
  A verified install in `<home-a>` never authorizes cleanup in `<home-b>`.
- Runtime skill physical deletion is stricter: if `<home-a>` and `<home-b>`
  share the same runtime skill root, preserve the physical runtime skill while
  any surviving registry claim from either home still owns it.

Projection-only surfaces:

- If a legacy registry entry includes prompts, scripts, agents, or config
  material, retain those files by default and report them as
  `projection-only-retained`.

## Tests

Add service tests in:

- `services/agent-config-sync/test/sync-behavior.test.ts`

Required service cases:

1. Retires native-superseded active Codex projection claims:
   - seed registry with `managed_by: "@rawr/plugin-plugins"`
   - create root skill and runtime skill files
   - call the new retirement procedure
   - assert files are deleted and registry entry removed

2. Preserves unmanaged matching skill directories:
   - create matching skill path without a registry claim
   - assert it remains

3. Preserves surviving shared claims:
   - seed two managed plugin entries with the same skill
   - retire one plugin
   - assert physical skill directory remains
   - assert only the retired plugin registry entry is removed

4. Dry-run reports planned cleanup without changes.

5. Existing stale-plugin retirement still passes unchanged.

6. Multi-home safety:
   - configure two Codex homes
   - verify native install only for the first home
   - assert cleanup plans or mutates only the first home

7. Same-name source collision:
   - seed two managed entries with the same plugin name and different existing
     `source_plugin_path` roots
   - assert the different-source entry is blocked and reported

8. MCP/config safety:
   - seed managed MCP runtime files and `config.toml` fragments
   - assert runtime files can be planned for removal when native MCP is proven
   - assert `config.toml` entries are retained without exact key ownership

9. Projection-only surface retention:
   - seed prompts, scripts, and agents for a native-superseded plugin
   - assert they are retained and reported unless provider activation proof is
     added for those surfaces

10. Shared runtime skill root safety:
    - configure `~/.codex-rawr` as the verified cleanup home
    - seed `~/.codex/plugins/registry.json` with a surviving managed claim for
      the same runtime skill
    - assert the `~/.agents/skills/<skill>` directory remains
    - assert the cleaned home's registry entry is still removed or narrowed

Add CLI tests in:

- `plugins/cli/plugins/test/plugin-plugins.test.ts`
- `apps/cli/test/plugins-command-surface-cutover.test.ts` if command help or
  flag surface changes

Required CLI cases:

1. Default native sync calls cleanup after verified install.
2. `--destination-projection` suppresses cleanup.
3. `--no-codex-install` suppresses cleanup.
4. JSON output includes `nativeProjectionCleanup`.

If mocking `codexInstall.actions`, model the real verified action shape from
`packages/agent-config-sync-node/src/codex-cli.ts`.

## Verification Commands

Use a focused loop first:

```bash
bunx nx run @rawr/agent-config-sync:test --output-style=stream
bunx nx run @rawr/plugin-plugins:test --output-style=stream
bunx nx run-many -t typecheck,test,build,structural -p @rawr/agent-config-sync,@rawr/agent-config-sync-node,@rawr/plugin-plugins --output-style=stream
git diff --check
```

Provider smoke for the real class of bug:

```bash
bun apps/cli/src/index.ts plugins sync hyperresearch \
  --json \
  --agent all \
  --codex-home /Users/mateicanavra/.codex-rawr \
  --source-workspace /Users/mateicanavra/Documents/.nosync/DEV/habitat/rawr-hq \
  --codex-bin /Users/mateicanavra/.volta/bin/codex \
  --no-install-reconcile \
  --no-cowork
```

Then verify Codex sees only native plugin skills for that plugin:

```bash
CODEX_HOME=/Users/mateicanavra/.codex-rawr \
  /Users/mateicanavra/.volta/bin/codex app-server \
  --listen stdio:// \
  --enable plugins \
  --enable plugin_hooks
```

Through app-server JSON-RPC, call:

- `plugin/list`
- `plugin/read`
- `skills/list`
- `hooks/list`

Acceptance for Hyperresearch-like plugins:

- `plugin/list` shows `hyperresearch@rawr-hq` installed and enabled
- `plugin/read` shows native plugin skills
- `skills/list` shows `hyperresearch:hyperresearch-codex`
- `skills/list` does not show stale top-level `hyperresearch-codex`
- `hooks/list` still reports provider-visible hooks for the native plugin
- `<codex-home>/plugins/registry.json` no longer carries the cleaned direct
  projection claim for the native-superseded plugin
- the sync command, install actions, cleanup JSON, and app-server proof all
  name the same Codex home

## Acceptance Criteria

The work is done when all of these are true:

- Native Codex install remains the deployment authority.
- Verified native installs retire old direct projection claims for the same
  plugin and same Codex home by default.
- No unmanaged user file is deleted.
- Shared managed projection targets are preserved if another registry entry
  still claims them.
- Projection-only or under-specified surfaces are retained unless provider
  activation is proven for that exact surface.
- Cleanup is visible in JSON output.
- Dry-run is truthful, non-mutating, and labeled as planned rather than
  verified.
- Destination projection remains available and suppresses cleanup when
  explicitly requested.
- Tests prove the safety boundaries.
- The parity report's `Duplicate legacy provider claims` gap can be marked
  closed or narrowed to provider uninstall lifecycle.

## Non-Goals

Do not do these in this workstream:

- Do not remove downstream `packages/agent-sync`.
- Do not backport template sync code into downstream `rawr-hq`.
- Do not merge template `main` into downstream plugin branches.
- Do not count direct projection as provider parity.
- Do not add a broad filesystem janitor that scans and deletes by name.
- Do not remove Claude native plugin directories.
- Do not solve Codex custom agent activation, command activation, or settings
  activation residuals here.

## Handoff Summary

The implementation target is a service-owned active-plugin cleanup path:

native Codex install verified -> retire same-plugin RAWR-managed direct
projection registry claims in the same Codex home -> delete only exclusively
owned legacy projection files whose native capability is proven -> retain and
report projection-only surfaces -> remove that direct projection registry entry
-> report the action in CLI JSON.

If you are unsure where to edit, start in the retirement module. The cleanup is
destructive policy, not packaging, not downstream content, and not a generic
filesystem operation.
