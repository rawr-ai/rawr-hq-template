---
description: Run full lifecycle quality checks for workflow changes
argument-hint: "TARGET=<path|id>"
---

# Lifecycle: Workflow

Use `docs/process/runbooks/LIFECYCLE_WORKFLOW.md` as canonical guidance.

## HQ Authoring Routing

- For net-new or substantial content authoring, start with:
  - `/hq:create-content`
  - `/hq:create-plugin`

## Steps

1. Apply workflow artifact updates.
2. Update required tests/docs.
3. Audit/update dependents.
4. Run:
```bash
rawr plugins sync all --dry-run --json
rawr plugins sync drift --json
rawr plugins lifecycle check --target "$TARGET" --type workflow --json
```
5. Resolve lifecycle blockers.

## Done

- lifecycle check returns `ok: true` and `status: pass`.
