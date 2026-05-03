# Lifecycle Runbook: CLI Plugin

## Scope

Use for create/update/delete lifecycle work in `plugins/cli/*`.

## Required Steps

1. Artifact updates
- implement CLI/plugin changes under target plugin path.

2. Tests
- update/add `test/**/*.test.ts` for changed behavior.

3. Docs
- update plugin `README.md` and any affected process docs.

4. Dependents audit
- audit references to plugin id/dir/command ids outside target plugin.
- update dependents if references are affected.

5. Sync/drift verification
- `rawr plugins sync all --dry-run --json`
- `rawr plugins sync drift --json`

6. Lifecycle gate
- `rawr plugins lifecycle check --target <path|id> --type cli --json`

## Done Checklist

- [ ] Artifacts updated
- [ ] Tests updated
- [ ] Docs updated
- [ ] Dependents updated or marked N/A with rationale
- [ ] Sync dry-run verified
- [ ] Drift verified
- [ ] Lifecycle gate passes
