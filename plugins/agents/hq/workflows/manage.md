# Manage Plugins (HQ + Sync + Packs)

This workflow is the operational check to ensure:
- the workspace builds and tests pass
- sync planning is conflict-free
- toolkit exports are flowing into the `tools` agent plugin
- internal references match the current plugin lineup

Load `agent-plugin-management` skill for the canonical deterministic loop and failure-mode handling.

## Preconditions

- You are in RAWR HQ.
- Working tree is clean (or you are intentionally mid-slice).

## Procedure

1. Validate + test the workspace (recommended)

```sh
bun run test
```

2. Plan full convergence (canonical dry-run)

Canonical surface:

```sh
bun run rawr -- plugins sync all --dry-run --json
```

Compatibility surface (legacy):

```sh
bun run rawr -- sync status all --json
```

3. Apply full convergence

```sh
bun run rawr -- plugins sync all --json
```

If the apply run produced unintended mutations, roll back immediately:

```sh
bun run rawr -- undo --json
```

4. Confirm toolkit packs compose into `tools` (optional targeted check)

```sh
bun run rawr -- plugins sync tools --dry-run --json
```

Expected signals:
- skills/workflows/agents/scripts in `tools` are namespaced (e.g. `toolkit-<toolkit>-<skill>` and `<toolkit>--<workflow>`)
- no conflicts in canonical full sync output
- Cowork `.plugin` artifacts are written under `dist/cowork/plugins/`
- stale managed plugin retirement runs (rename/delete cleanup)

5. Reference audit (stale names / paths)

```sh
bun run test
```

If the reference audit fails:
- run ripgrep for the offending token
- update skills/workflows/docs to the current names

Example:

```sh
rg -n "<stale-token>" .
```

6. Partial-mode exception handling (advanced only)

If you intentionally need partial behavior, use explicit override:

```sh
bun run rawr -- plugins sync all --allow-partial <partial-flags...>
```

Never run partial flags without `--allow-partial`.

## Notes

- Toolkit exports live under `agent-pack/` in toolkit plugins, and are synced only via the `tools` agent plugin.
- Curated offices should not copy toolkit packs; they should declare dependencies (via `plugin.yaml`) and add wrapper workflows locally.
