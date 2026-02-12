---
description: Run full lifecycle quality checks for CLI plugin changes
argument-hint: "TARGET=<path|id>"
---

# Lifecycle: CLI Plugin

Use `docs/process/runbooks/LIFECYCLE_CLI_PLUGIN.md` as canonical guidance.

## HQ Authoring Routing

- For net-new or substantial content authoring, start with:
  - `/hq:create-content`
  - `/hq:create-plugin`

## Steps

1. Apply artifact updates in target CLI plugin.
2. Update tests and docs.
3. Audit/update dependents.
4. Run:
```bash
rawr plugins sync all --dry-run --json
rawr plugins sync drift --json
rawr plugins lifecycle check --target "$TARGET" --type cli --json
```
5. If lifecycle check fails, fix missing areas before publish.

## Done

- lifecycle check returns `ok: true` and `status: pass`.
