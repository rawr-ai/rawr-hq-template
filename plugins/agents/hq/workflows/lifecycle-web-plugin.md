---
description: Run full lifecycle quality checks for web plugin changes
argument-hint: "TARGET=<path|id>"
---

# Lifecycle: Web Plugin

Use `docs/process/runbooks/LIFECYCLE_WEB_PLUGIN.md` as canonical guidance.

## HQ Authoring Routing

- For net-new or substantial content authoring, start with:
  - `/hq:create-content`
  - `/hq:create-plugin`

## Steps

1. Apply runtime artifact updates.
2. Update tests and docs.
3. Audit/update dependents.
4. Run:
```bash
rawr plugins sync all --dry-run --json
rawr plugins sync drift --json
rawr plugins lifecycle check --target "$TARGET" --type web --json
```
5. Resolve failures before publish.

## Done

- lifecycle check returns `ok: true` and `status: pass`.
