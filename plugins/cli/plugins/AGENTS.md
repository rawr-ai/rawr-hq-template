# Plugins Toolkit Router

## Scope

- Applies to `plugins/cli/plugins/**`.

## Purpose

- Keep the `rawr plugins sync ...` command surface deterministic and explicit.
- Preserve full-convergence as the default daily path.
- Prevent silent drift and stale carryovers during plugin lifecycle changes.

## Canonical Command Contract

- Full convergence: `rawr plugins sync all`
- Plan first: `rawr plugins sync all --dry-run --json`
- Partial behavior is advanced-only and must be explicit with `--allow-partial`.

Do not weaken partial-mode guardrails by default.

## Invariants

- Keep `rawr plugins sync all` as the canonical “sync everything” command.
- Keep stale managed orphan retirement enabled by default.
- Keep deterministic overwrite + managed GC defaults for full sync.
- Keep command-surface clarity:
  - `rawr plugins sync ...` for cross-type sync orchestration.
  - `rawr plugins web ...` for runtime web enable/disable/status.
  - `rawr plugins cli ...` for toolkit batch operations.

## Lifecycle Handling (Update/Rename/Move/Delete)

### Command/behavior update

- After changing sync logic, run plugin tests/build and perform a sync dry-run.
- Validate JSON output remains stable and explicit.

### Source plugin rename/move/delete handling

- Ensure full sync still retires stale managed destinations for renamed/deleted plugins.
- Preserve explicit reporting for retirement actions and failures.

### Flag or flow changes

- Any change to defaults/flags must update:
  - `plugins/cli/plugins/README.md`
  - `plugins/cli/plugins/agent-pack/skills/agent-sync/SKILL.md`
  - `docs/process/PLUGIN_E2E_WORKFLOW.md` (if operator behavior changes)

## Verification Loop

From repo root:

```bash
bunx turbo run build --filter=@rawr/agent-sync --filter=@rawr/plugin-plugins
bunx turbo run test --filter=@rawr/agent-sync --filter=@rawr/plugin-plugins
rawr plugins sync all --dry-run --json
```

When applying full convergence intentionally:

```bash
rawr plugins sync all --json
```

## Related Guidance

- `docs/process/PLUGIN_E2E_WORKFLOW.md`
- `plugins/agents/hq/skills/plugin-content/SKILL.md`
- `plugins/agents/hq/workflows/manage.md`
