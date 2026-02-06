# Agent A Plan - Upstream Sync Runbook Hardening

Date: 2026-02-06
Owner: Agent A

## Scope

- `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template`
- `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq`

## Inputs

- `docs/projects/agent-readiness/AGENTS_COVERAGE_MATRIX.md`

## Deliverables

- `docs/process/UPSTREAM_SYNC_RUNBOOK.md` (template)
- `docs/process/UPSTREAM_SYNC_RUNBOOK.md` (personal repo mirror)
- `docs/projects/agent-readiness/agent-a-plan.md`
- `docs/projects/agent-readiness/agent-a-scratch.md`

## Execution Plan

1. Confirm docs-routing constraints and command-channel policy. [x]
2. Confirm current remote/trunk facts in both repos. [x]
3. Create concise executable runbook with required sections. [x]
4. Mirror runbook to personal repo path. [x]
5. Verify content completeness and command accuracy. [x]
6. Publish summary of file changes and key decisions. [x]

## Required Runbook Sections Checklist

- exact remote setup commands [x]
- default merge sync path [x]
- rebase variant path [x]
- conflict handling [x]
- rollback/recovery [x]
- verification gates (`bun run build`, `bun run test`, trunk/remotes checks) [x]
- Graphite expectations (`main`, safe sync/restack) [x]
- gotchas (divergence + protected branches) [x]

## Notes

- Runbook file did not exist in either repo at start; created net-new.
- Content kept signpost-style per docs architecture and process constraints.
- Mirrored runbook parity confirmed between template and personal repos.
