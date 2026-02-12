---
description: Run full lifecycle quality checks for multi-surface composed changes
argument-hint: "TARGET=<path|id>"
---

# Lifecycle: Composed Changes

Use `docs/process/runbooks/LIFECYCLE_COMPOSED_CHANGES.md` as canonical guidance.

## HQ Authoring Routing

- For net-new or substantial content authoring, start with:
  - `/hq:create-content`
  - `/hq:create-plugin`

## Steps

1. Apply all artifact updates.
2. Update tests/docs across touched surfaces.
3. Audit/update dependents across surfaces.
4. Run:
```bash
rawr plugins sync all --dry-run --json
rawr plugins sync drift --json
rawr plugins lifecycle check --target "$TARGET" --type composed --json
```
5. Resolve lifecycle blockers before publish.

## Done

- lifecycle check returns `ok: true` and `status: pass`.
