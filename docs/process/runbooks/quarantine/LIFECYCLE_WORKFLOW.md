# Lifecycle Runbook: Workflow

## Scope

Use for workflow-only lifecycle work (typically `plugins/agents/*/workflows/*`).

## Required Steps

1. Artifact updates
- update workflow content and constraints.

2. Tests
- update/add tests for any code behavior affected by workflow contract changes.

3. Docs
- update related docs so operational guidance stays aligned.

4. Dependents audit
- audit references to workflow names/paths in skills/docs/automation.
- update dependents if changed.

5. Sync/drift verification
- `rawr plugins sync all --dry-run --json`
- `rawr plugins sync drift --json`

6. Lifecycle gate
- `rawr plugins lifecycle check --target <path|id> --type workflow --json`

## Done Checklist

- [ ] Artifacts updated
- [ ] Tests updated (or N/A with rationale)
- [ ] Docs updated
- [ ] Dependents updated or marked N/A with rationale
- [ ] Sync dry-run verified
- [ ] Drift verified
- [ ] Lifecycle gate passes
