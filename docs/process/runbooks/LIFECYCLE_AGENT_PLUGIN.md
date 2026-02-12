# Lifecycle Runbook: Agent Plugin

## Scope

Use for create/update/delete lifecycle work in `plugins/agents/*`.

## Required Steps

1. Artifact updates
- update skills/workflows/agents/scripts in canonical plugin source.

2. Tests
- update/add tests in affected packages/plugins for behavior-bearing changes.

3. Docs
- update plugin-level docs and relevant process docs.

4. Dependents audit
- audit cross-plugin references, naming, and command/workflow dependencies.
- update impacted dependents.

5. Sync/drift verification
- `rawr plugins sync all --dry-run --json`
- `rawr plugins sync drift --json`

6. Lifecycle gate
- `rawr plugins lifecycle check --target <path|id> --type agent --json`

## Done Checklist

- [ ] Artifacts updated
- [ ] Tests updated
- [ ] Docs updated
- [ ] Dependents updated or marked N/A with rationale
- [ ] Sync dry-run verified
- [ ] Drift verified
- [ ] Lifecycle gate passes
