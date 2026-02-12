---
description: Run full lifecycle quality checks for agent plugin changes
argument-hint: "TARGET=<path|id>"
---

# Lifecycle: Agent Plugin

Use `docs/process/runbooks/LIFECYCLE_AGENT_PLUGIN.md` as canonical guidance.

## HQ Authoring Routing

- For net-new or substantial content authoring, start with:
  - `/hq:create-content`
  - `/hq:create-plugin`

## Steps

1. Apply agent plugin artifact updates.
2. Update tests/docs.
3. Audit/update dependents.
4. Run:
```bash
rawr plugins sync all --dry-run --json
rawr plugins sync drift --json
rawr plugins lifecycle check --target "$TARGET" --type agent --json
```
5. Resolve lifecycle blockers before publish.

## Done

- lifecycle check returns `ok: true` and `status: pass`.
