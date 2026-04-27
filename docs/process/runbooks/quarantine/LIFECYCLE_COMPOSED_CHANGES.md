# Lifecycle Runbook: Composed Changes

## Scope

Use for multi-surface lifecycle work touching more than one unit type (plugin + skill/workflow/docs/tests/dependents).

## Required Steps

1. Artifact updates
- apply all target changes across involved paths.

2. Tests
- update/add all relevant test suites for touched behavior.

3. Docs
- update local docs + process docs for all changed surfaces.

4. Dependents audit
- run cross-surface dependent audit (names, paths, command ids, docs links).
- update dependent files before merge.

5. Sync/drift verification
- `rawr plugins sync all --dry-run --json`
- `rawr plugins sync drift --json`

6. Lifecycle gate
- `rawr plugins lifecycle check --target <path|id> --type composed --json`

## Done Checklist

- [ ] Artifacts updated
- [ ] Tests updated
- [ ] Docs updated
- [ ] Dependents updated
- [ ] Sync dry-run verified
- [ ] Drift verified
- [ ] Lifecycle gate passes
