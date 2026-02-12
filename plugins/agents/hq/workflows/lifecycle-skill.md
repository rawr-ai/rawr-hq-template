---
description: Run full lifecycle quality checks for skill changes
argument-hint: "TARGET=<path|id>"
---

# Lifecycle: Skill

Use `docs/process/runbooks/LIFECYCLE_SKILL.md` as canonical guidance.

## HQ Authoring Routing

- For net-new or substantial content authoring, start with:
  - `/hq:create-content`
  - `/hq:create-plugin`

## Steps

1. Apply skill artifact updates.
2. Update required tests/docs.
3. Audit/update dependents.
4. Run:
```bash
rawr plugins sync all --dry-run --json
rawr plugins sync drift --json
rawr plugins lifecycle check --target "$TARGET" --type skill --json
```
5. Resolve lifecycle blockers.

## Done

- lifecycle check returns `ok: true` and `status: pass`.
