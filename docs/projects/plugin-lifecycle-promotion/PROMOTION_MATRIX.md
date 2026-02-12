# Lifecycle Promotion Matrix (from personal commit chain)

Source commits reviewed:
- `0d5f81d` feat(plugins): add lifecycle quality system scaffolding (#96)
- `8d62801` feat(plugins): add install repair to plugins status command (#94)
- `61f8e17` feat(plugins): add install state drift detection and repair (#90)

## Classification

### PROMOTE_TO_TEMPLATE
- `apps/cli/test/factory.test.ts`
- `apps/cli/test/plugins-command-surface-cutover.test.ts`
- `apps/cli/test/plugins-enable-all.test.ts`
- `apps/cli/test/plugins-install-all.test.ts`
- `apps/cli/test/plugins-status.test.ts`
- `apps/cli/test/plugins-sync-drift.test.ts`
- `apps/cli/test/stubs.test.ts`
- `docs/process/RUNBOOKS.md`
- `docs/process/runbooks/LIFECYCLE_AGENT_PLUGIN.md`
- `docs/process/runbooks/LIFECYCLE_CLI_PLUGIN.md`
- `docs/process/runbooks/LIFECYCLE_COMPOSED_CHANGES.md`
- `docs/process/runbooks/LIFECYCLE_SKILL.md`
- `docs/process/runbooks/LIFECYCLE_WEB_PLUGIN.md`
- `docs/process/runbooks/LIFECYCLE_WORKFLOW.md`
- `plugins/cli/plugins/README.md`
- `plugins/cli/plugins/src/commands/plugins/improve.ts`
- `plugins/cli/plugins/src/commands/plugins/lifecycle/check.ts`
- `plugins/cli/plugins/src/commands/plugins/status.ts`
- `plugins/cli/plugins/src/commands/plugins/sweep.ts`
- `plugins/cli/plugins/src/commands/plugins/sync.ts`
- `plugins/cli/plugins/src/commands/plugins/sync/all.ts`
- `plugins/cli/plugins/src/lib/install-reconcile.ts`
- `plugins/cli/plugins/src/lib/install-state.ts`
- `plugins/cli/plugins/src/lib/plugins-lifecycle/fix-slice.ts`
- `plugins/cli/plugins/src/lib/plugins-lifecycle/lifecycle.ts`
- `plugins/cli/plugins/src/lib/plugins-lifecycle/policy.ts`
- `plugins/cli/plugins/src/lib/plugins-lifecycle/process.ts`
- `plugins/cli/plugins/src/lib/plugins-lifecycle/types.ts`
- `plugins/cli/plugins/test/fix-slice.test.ts`
- `plugins/cli/plugins/test/lifecycle-check.test.ts`
- `plugins/cli/plugins/test/policy-decision.test.ts`

### KEEP_PERSONAL
- `docs/projects/plugin-lifecycle-quality/scratch/REBASE_TOP_STACK_PLAN_VERBATIM.md`
- `docs/projects/plugin-lifecycle-quality/scratch/SESSION_NOTES_REBASE_TOP_STACK.md`

### SPLIT_REQUIRED
- `plugins/agents/hq/skills/agent-plugin-management/SKILL.md`
- `plugins/agents/hq/skills/agent-plugin-management/references/judge-template-pass-a.md`
- `plugins/agents/hq/skills/agent-plugin-management/references/judge-template-pass-b.md`
- `plugins/agents/hq/skills/agent-plugin-management/references/lifecycle-contract.md`
- `plugins/agents/hq/skills/agent-plugin-management/references/policy-classification.md`
- `plugins/agents/hq/skills/agent-plugin-management/references/workflow.md`
- `plugins/agents/hq/workflows/create-content.md`
- `plugins/agents/hq/workflows/create-plugin.md`
- `plugins/agents/hq/workflows/lifecycle-agent-plugin.md`
- `plugins/agents/hq/workflows/lifecycle-cli-plugin.md`
- `plugins/agents/hq/workflows/lifecycle-composed.md`
- `plugins/agents/hq/workflows/lifecycle-skill.md`
- `plugins/agents/hq/workflows/lifecycle-web-plugin.md`
- `plugins/agents/hq/workflows/lifecycle-workflow.md`
- `plugins/agents/hq/workflows/merge-no-policy-stack.md`

## Decision for this execution pass
- Promote template-core runtime and test surfaces now (`PROMOTE_TO_TEMPLATE`).
- Promote lifecycle runbooks in `docs/process/runbooks/**` now.
- Defer `SPLIT_REQUIRED` hq content movement until ownership-safe extraction pass in the same stack (Slice C/D), while immediately extending guard coverage to remove blind spots.
