# Plugin Lifecycle Contract

> **Canonical scope**: plugin-system changes only (`plugins/cli/*`, `plugins/web/*`, `plugins/agents/*`, `packages/agent-sync/*`, `plugins/cli/plugins/*`, directly related docs/tests).
> **Related**: `policy-classification.md`, `judge-template-pass-a.md`, `judge-template-pass-b.md`, `plugins/agents/hq/workflows/merge-no-policy-stack.md`

## Purpose

Define one strict, reusable lifecycle quality contract for plugin creation, update, rename, move, and deletion. This contract is the source of truth for:

- runbooks,
- executable workflows,
- `rawr plugins lifecycle check`,
- `rawr plugins improve`,
- `rawr plugins sweep`.

## Required Lifecycle Steps

For each unit of change, all steps are mandatory unless explicitly marked `N/A` with rationale:

1. **Artifact step**
- create/update/delete the target artifact(s) only in canonical source paths.
- keep command-surface boundaries explicit (`rawr plugins ...` vs `rawr plugins web ...`).

2. **Tests step**
- update or add tests for behavior and failure modes affected by the change.
- include regression coverage for renamed/deleted/moved lifecycle operations where relevant.

3. **Docs step**
- update artifact-local docs (for example `README.md`) and process docs affected by behavior/contract changes.
- keep docs and command flags in sync.

4. **Dependents step**
- audit references to plugin ids/names/paths/contracts outside the edited target.
- update dependents or explicitly state no dependent changes are required.

5. **Sync/drift verification step**
- run:
  - `rawr plugins sync all --dry-run --json`
  - `rawr plugins sync drift --json`
- verify expected signals and no unresolved drift/conflicts.

6. **Done checklist step**
- record completion with explicit pass/fail for artifact/tests/docs/dependents/sync-drift.

## Minimum Acceptance Criteria

A change unit passes lifecycle quality only when all are true:

- tests: `pass`
- docs: `pass`
- dependents: `pass`
- sync/drift: `pass`
- no unresolved lifecycle blockers

## Output Contract (Machine-readable)

Every lifecycle checkable unit produces this shape:

```json
{
  "changeUnitId": "string",
  "scope": "plugin-system",
  "lifecycleCheck": {
    "status": "pass|fail",
    "missingTests": ["..."],
    "missingDocs": ["..."],
    "missingDependents": ["..."],
    "syncVerified": true,
    "driftVerified": true
  }
}
```

## Guardrails

- Do not classify behavior/policy changes as no-policy.
- Do not auto-merge when lifecycle check fails.
- Do not skip dependent audit on rename/move/delete.

## Future Direction

Current state uses LLM-based policy judging (see `policy-classification.md`).
Target state is deterministic policy-block composition + deterministic policy diffing.
