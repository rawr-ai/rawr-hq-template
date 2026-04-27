# Lifecycle Runbook: Skill

## Scope

Use for skill-only lifecycle work (typically `plugins/agents/*/skills/*`).

## Required Steps

1. Artifact updates
- update skill entrypoint and references/assets as needed.

2. Tests
- if behavior-bearing scripts/commands are affected, update related tests.

3. Docs
- ensure `SKILL.md` + references/assets stay coherent and current.

4. Dependents audit
- audit references to skill names/paths in workflows/docs.
- update dependents if names/contracts changed.

5. Sync/drift verification
- `rawr plugins sync all --dry-run --json`
- `rawr plugins sync drift --json`

6. Lifecycle gate
- `rawr plugins lifecycle check --target <path|id> --type skill --json`

## Done Checklist

- [ ] Artifacts updated
- [ ] Tests updated (or N/A with rationale)
- [ ] Docs updated
- [ ] Dependents updated or marked N/A with rationale
- [ ] Sync dry-run verified
- [ ] Drift verified
- [ ] Lifecycle gate passes
