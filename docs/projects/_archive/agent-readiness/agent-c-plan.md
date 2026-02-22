# Agent C Plan - Docs Hygiene + Root AGENTS Finalization

Status: Complete  
Owner: Agent C  
Last Updated: 2026-02-06

## Scope

- `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template`
- `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq`

## Dependency Inputs Read

- `docs/projects/agent-readiness/AGENTS_COVERAGE_MATRIX.md`
- `docs/process/UPSTREAM_SYNC_RUNBOOK.md`
- `docs/process/PLUGIN_E2E_WORKFLOW.md`
- `docs/projects/agent-readiness/agent-a-plan.md`
- `docs/projects/agent-readiness/agent-b-plan.md`

## Required Skills Applied

- `docs-architecture`
- `graphite`
- `workflow-extractor`
- `mental-map`
- `skill-creator` (used minimally for concise artifact structure discipline)

## Mandatory Constraints

- Keep root `AGENTS.md` signpost-only (no context dump).
- Keep plugin command channels explicit and separated.
- Make Graphite requirement explicit in both repos; trunk is `main`.
- Add clear where-to-change routing pointers.
- Reference both process runbooks where applicable:
  - `docs/process/UPSTREAM_SYNC_RUNBOOK.md`
  - `docs/process/PLUGIN_E2E_WORKFLOW.md`
- Do not change runtime/API code.

## Work Plan

1. Verify current branch/trunk truth in both repos. [x]
2. Finalize root `AGENTS.md` in template + personal repo with role boundary and routing pointers. [x]
3. Run docs hygiene pass on stale `docs/projects/repo-split/cleanup*` docs in template repo. [x]
4. Refresh gateway docs (`README.md`, `docs/PROCESS.md`, `docs/AGENTS.md`) with runbook references where appropriate. [x]
5. Validate policy compliance and summarize exact file changes. [x]

## Evidence Snapshot (Current Truth)

- Template remote heads: `main` only.
- Personal remote heads: `main` + one active codex branch.
- `gt trunk` in template: `main`.
- `gt trunk` in personal: `main`.

## Completion Criteria

- Root `AGENTS.md` in both repos includes:
  - repo role boundary,
  - Graphite required + trunk `main`,
  - where-to-change routing,
  - links to upstream sync and plugin E2E runbooks.
- Stale cleanup docs under template repo-split are marked superseded and/or refreshed with traceable current state.
- Gateway docs reference new runbooks.

## Execution Summary

- Root routers finalized in both repos with explicit:
  - repo role boundary,
  - Graphite requirement (`gt trunk` = `main`),
  - change-routing pointer (`AGENTS_SPLIT.md`),
  - process runbook pointers.
- Added runbook references in both repos:
  - `README.md`
  - `docs/PROCESS.md`
  - `docs/AGENTS.md`
- Repo-split cleanup docs hygiene (template):
  - Added `docs/projects/repo-split/CLEANUP_CURRENT_STATE.md` as current-state addendum.
  - Marked stale cleanup snapshots as superseded while retaining history.
  - Updated residual-risk wording in `CLEANUP_FINAL.md` to current truth.
