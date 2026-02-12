---
name: agent-plugin-management
description: |
  This skill should be used when the user asks to manage RAWR agent plugins, run full plugin sync, resolve sync conflicts, handle plugin rename/delete orphans, verify Cowork .plugin artifacts, or explain safe daily plugin sync workflow in RAWR HQ.

  Key triggers: "rawr plugins sync all", "sync agent plugins", "orphan plugins", "partial sync", "cowork plugin zip", "plugin drift", "manage plugins in rawr".
---

<skill-usage-tracking>

# Agent Plugin Management (RAWR HQ)

Use this skill to operate agent-plugin sync in a deterministic, low-drift way.

## Reference map

| Reference | Path | Purpose |
|-----------|------|---------|
| Workflow loop | `references/workflow.md` | Canonical day-to-day loop, exception handling, and observability checks |
| Lifecycle contract | `references/lifecycle-contract.md` | Source of truth for lifecycle completeness and done criteria |
| Policy classification | `references/policy-classification.md` | No-policy vs policy semantics and judge outcomes |
| Judge template A | `references/judge-template-pass-a.md` | First independent policy/pass judgment prompt |
| Judge template B | `references/judge-template-pass-b.md` | Second independent policy/pass judgment prompt |
| Merge workflow | `../../workflows/merge-no-policy-stack.md` | Two-pass no-policy merge automation and hold/escalation rules |

## Canonical command contract

- Full convergence command: `rawr plugins sync all`
- Safety preview command: `rawr plugins sync all --dry-run --json`
- Rollback command for last mutating sync: `rawr undo`
- Partial mode is advanced-only and must include: `--allow-partial`

## Core invariants

<invariants>
<invariant name="single-canonical-entrypoint">Use `rawr plugins sync all` as the default command after plugin create/update/delete/rename.</invariant>
<invariant name="dry-run-before-apply">Run `--dry-run --json` before apply when validating a change set or debugging.</invariant>
<invariant name="partial-gated">Do not run partial sync flags unless `--allow-partial` is explicitly present.</invariant>
<invariant name="orphan-retirement-on">Keep stale managed plugin retirement enabled for rename/delete safety.</invariant>
<invariant name="scope-clarity">Do not mix command surfaces: `rawr plugins ...` for sync/orchestration, `rawr plugins web ...` for runtime enablement only.</invariant>
</invariants>

## Anti-patterns to avoid

- **Silent partial mode**: disabling parts of sync without `--allow-partial`.
- **Manual destination edits**: editing target homes directly instead of syncing from source plugins.
- **Rename orphan buildup**: renaming/deleting source plugins without retirement pass.
- **Surface mixing**: using `rawr plugins web ...` for agent-office sync operations.

## Grounding in this repo

- Agent-office source plugins live in `plugins/agents/*`.
- Canonical process docs:
  - `plugins/agents/hq/workflows/manage.md`
  - `docs/process/PLUGIN_E2E_WORKFLOW.md`
  - `docs/system/PLUGINS.md`

</skill-usage-tracking>
<!-- Skill usage disclosure: On completion, state "Skills used: [name], [name]" with optional rationale. Omit if no skills invoked. -->
