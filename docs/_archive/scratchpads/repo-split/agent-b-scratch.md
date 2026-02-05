# Agent B Scratch

## Canonical Inputs Read
- `docs/projects/repo-split/IMPLEMENTATION_PLAN.md`
- `docs/projects/repo-split/ORCHESTRATOR_NOTEBOOK.md`

## Local/Remote Baseline Observations (2026-02-05)
- Current local path: `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq`
- Local branch at inspection time: `codex/feat-reflect-skill-packet`
- Local origin remote:
  - `https://github.com/rawr-ai/rawr-hq.git` (fetch/push)
- `gh auth status`: logged in as `mateicanavra` with scopes `gist`, `read:org`, `repo`, `workflow`
- `gh` version: `2.80.0`

## GitHub State Snapshot at Planning Time
- `rawr-ai/rawr-hq` exists
- `rawr-ai/rawr-hq` visibility: `PUBLIC`
- `rawr-ai/rawr-hq` is currently `isTemplate=true`
- `rawr-ai/rawr-hq-template` does not exist yet (expected pre-Phase-2 condition)
- Tag `template-baseline-v1` not found locally or on remote at planning time

## Command-Syntax Verification Performed
- `gh repo rename --help`
- `gh repo edit --help`
- `gh repo create --help`
- `gh repo delete --help`
- `gh repo set-default --help`
- `gh repo view --help`

All required CLI surfaces for planned Phase 2/3 runbook exist in installed gh version.

## Open Execution Constraints
- Do not execute rename/create yet (planning-only pass).
- Must assume Phase 1 completion/sign-off before running Phase 2 command block.
- Full rollback that deletes newly created personal repo may require `delete_repo` scope refresh.

## Ownership Boundary
- Agent B scope retained: repo split mechanics + remote wiring runbook only.
- No changes to other agent-owned docs/codepaths.
