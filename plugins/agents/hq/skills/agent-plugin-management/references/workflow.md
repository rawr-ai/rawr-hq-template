# Workflow: Deterministic Agent-Plugin Sync Loop

Use this workflow when changing agent-plugin content in RAWR HQ and you need one explicit, safe sync loop.

> **Canonical command:** `rawr plugins sync all`
> **Related:** `plugins/agents/hq/workflows/manage.md`, `docs/process/PLUGIN_E2E_WORKFLOW.md`

## Plugin loop as a workflow

The "plugin loop" means a fixed, repeatable sequence:

1. Make plugin changes in source (`plugins/agents/*`, and any toolkit `agent-pack/` exports).
2. Plan full convergence.
3. Apply full convergence.
4. If needed, immediately roll back with `rawr undo`.
5. Confirm outputs and zero drift signals.

No ad-hoc destination edits. No hidden side effects.

## Steps

<workflow-loop>
<step n="1" name="plan">
Run dry-run first:

```bash
rawr plugins sync all --dry-run --json
```

Check for:
- `ok: true`
- no unexpected conflicts
- expected plugin set in results
</step>

<step n="2" name="apply">
Run canonical apply:

```bash
rawr plugins sync all --json
```

Default deterministic behavior includes force overwrite, managed GC, Cowork packaging, Claude install/enable refresh, and stale managed plugin retirement.
</step>

<step n="3" name="rollback-if-needed">
If apply had unintended effects, run:

```bash
rawr undo --json
```
</step>

<step n="4" name="verify">
Verify outcome artifacts/signals:

```bash
ls dist/cowork/plugins/*.plugin
```

From JSON/human output, confirm:
- total conflicts are zero
- stale managed plugin retirement did not fail
- Cowork packaging actions are successful/planned as expected
</step>
</workflow-loop>

## Lifecycle/Improve integration

Use lifecycle and no-policy improvement commands as a layered gate on top of the sync loop:

1. Run lifecycle completeness for the change unit:

```bash
rawr plugins lifecycle check --target <path|id> --type <cli|web|agent|skill|workflow|composed> --json
```

2. For no-policy quality improvements with merge automation:

```bash
rawr plugins improve --target <path|id> --type <...> --publish --json
```

3. For scheduled/manual plugin-system sweeps:

```bash
rawr plugins sweep --scope plugin-system --scheduled --json
# or
rawr plugins sweep --scope plugin-system --manual --json
```

4. If judges return `fix_first`, create/continue fix slice and re-run lifecycle checks before merge.
5. If judges return `policy_escalation` or disagreement/low confidence, hold for human or human+agent review.

## Exception path (advanced only)

Use partial mode only when there is a concrete reason and never silently:

```bash
rawr plugins sync all --allow-partial <partial-flags...>
```

Typical temporary exceptions:
- scoped run: `--scope agents`
- target-limited run: `--agent codex`
- disabling Cowork/Claude steps in a controlled maintenance window

## Failure modes

<failure-modes>
<failure name="partial-blocked">
**Symptom**: command exits with partial-mode guard error.
**Fix**: either remove partial flags or add `--allow-partial` deliberately.
</failure>
<failure name="orphan-surprise">
**Symptom**: stale plugin directory/marketplace entry remains after rename.
**Fix**: run full `rawr plugins sync all` with stale retirement enabled (default).
</failure>
<failure name="surface-confusion">
**Symptom**: trying to solve sync drift with `rawr plugins web ...`.
**Fix**: use `rawr plugins sync ...` for agent-plugin distribution and keep runtime enablement separate.
</failure>
</failure-modes>
