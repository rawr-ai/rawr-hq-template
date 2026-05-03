# Lifecycle Runbook: Web Plugin

## Scope

Use for create/update/delete lifecycle work in `plugins/web/*`.

## Required Steps

1. Artifact updates
- implement runtime plugin changes (`src/server.ts` / `src/web.ts` / package metadata).

2. Tests
- update/add plugin tests for changed routes/mount behavior.

3. Docs
- update plugin `README.md` and runtime operator docs as needed.

4. Dependents audit
- audit runtime references (enablement ids, route/mount consumers, docs).
- update dependents when contracts move.

5. Sync/drift verification
- `rawr plugins sync all --dry-run --json`
- `rawr plugins sync drift --json`

6. Lifecycle gate
- `rawr plugins lifecycle check --target <path|id> --type web --json`

## Done Checklist

- [ ] Artifacts updated
- [ ] Tests updated
- [ ] Docs updated
- [ ] Dependents updated or marked N/A with rationale
- [ ] Sync dry-run verified
- [ ] Drift verified
- [ ] Lifecycle gate passes
