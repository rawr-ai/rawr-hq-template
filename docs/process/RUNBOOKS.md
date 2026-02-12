# Runbooks Index

This index is the canonical entrypoint for CLI/plugin workflow runbooks.

Use this when you need exact commands for:
- building/using the CLI,
- creating local personal plugins,
- wiring plugins into `rawr`,
- consuming published plugins,
- migrating ad-hoc scripts into proper plugins.

## Quick Chooser

| Goal | Runbook |
| --- | --- |
| Full source narrative + all commands exactly as provided | `docs/process/runbooks/SOURCE_PLUGIN_PATH_MATRIX_VERBATIM.md` |
| Understand all CLI build/use variants | `docs/process/runbooks/CLI_BUILD_PATHS.md` |
| Understand plugin build + install/wiring/discovery model | `docs/process/runbooks/PLUGIN_BUILD_AND_WIRING_MATRIX.md` |
| Path A: Local runtime plugin (Channel B) | `docs/process/runbooks/PATH_A_LOCAL_RUNTIME_PLUGIN.md` |
| Path B: Local command plugin + link (Channel A) | `docs/process/runbooks/PATH_B_LOCAL_COMMAND_PLUGIN_LINK.md` |
| Path C: Install published third-party plugin (Channel A) | `docs/process/runbooks/PATH_C_PUBLISHED_PLUGIN_INSTALL.md` |
| Path D: Global CLI owner + workspace runtime plugin | `docs/process/runbooks/PATH_D_GLOBAL_CLI_PLUS_WORKSPACE_PLUGIN.md` |
| Path E: Migrate an ad-hoc script into plugin form | `docs/process/runbooks/PATH_E_MIGRATE_SCRIPT_TO_PLUGIN.md` |

## Command Surface Invariant

- Channel A: `rawr plugins ...` (oclif plugin manager)
- Channel B: `rawr plugins web ...` (workspace runtime plugins)

Do not mix command families.

## Related Process Docs

- `docs/process/PLUGIN_E2E_WORKFLOW.md` (umbrella E2E)
- `docs/process/CROSS_REPO_WORKFLOWS.md` (template/personal workflow model)
- `docs/process/UPSTREAM_SYNC_RUNBOOK.md` (template -> personal sync)
- `docs/process/GRAPHITE.md` (branch/stack workflow)
