# Repo Split Implementation Plan

Status: Completed  
Owner: Orchestrator  
Canonical baseline policy: merge full open stack (#20 -> current top) before split

## Objective
Split the current repository into:
- Template: `RAWR HQ-Template` (`rawr-ai/rawr-hq-template`, public, GitHub template)
- Personal: `RAWR HQ` (`rawr-ai/rawr-hq`, private)

while preserving top-of-stack behavior and validating plugin/publish/sync flows.

## Source-of-Truth Stack Snapshot
- Active stack discovered via `gt ls` / open PR chain.
- Include any new atop branches that appear during execution window.

## Execution Phases

### Phase 0: Plan + Orchestration Artifacts
- [x] Create this living plan doc.
- [x] Create orchestrator notebook.
- [x] Create per-agent plan/scratch docs.
- [x] Keep this doc and `update_plan` in sync.

### Phase 1: Stack Awareness + Landing
- [x] Snapshot stack (`gt ls`, open PR list, top commit log).
- [x] Agent D sign-off that full atop stack is included.
- [x] Land full stack into `main`.
- [x] Validate no legacy/dual-path command surface.
- [x] Run full tests + CLI smoke.

### Phase 2: Template Conversion
- [x] Rename repo `rawr-ai/rawr-hq` -> `rawr-ai/rawr-hq-template`.
- [x] Keep public and mark as GitHub template.
- [x] Tag `template-baseline-v1` on landed SHA.
- [x] Verify template naming consistency.

### Phase 3: Personal Repo Creation
- [x] Create private `rawr-ai/rawr-hq` from template baseline.
- [x] Ensure local clone layout:
  - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template`
  - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq`
- [x] Configure personal remotes (`origin` personal, `upstream` template).

### Phase 4: Agent Routing Docs
- [x] Add `AGENTS_SPLIT.md` in template repo.
- [x] Add `AGENTS_SPLIT.md` in personal repo.
- [x] Cross-link from READMEs.

### Phase 5: Validation and Connectivity
- [x] Workspace plugin flow passes.
- [x] oclif plugin link flow passes.
- [x] Publish dry-run checks pass where applicable.
- [x] Template -> personal upstream sync smoke test passes.

### Phase 6: Final Verification Gates
- [x] Template tests green.
- [x] Personal tests green.
- [x] No legacy compatibility paths.
- [x] Stack completeness evidence captured.

### Phase 7: Closeout
- [x] Write `FINAL_REPORT.md` (template + personal).
- [x] Archive repo-split scratch pads.
- [x] Close all execution agents.
- [x] Record final SHAs (landed, template tag, personal init, sync validation).

## Drift Handling Rule
If a new branch appears on top of the stack during execution:
1. Pause at safe checkpoint.
2. Refresh stack snapshot and update this plan.
3. Include branch in landing scope.
4. Resume only after Agent D sign-off.

## Evidence Log
- Agent A outputs:
  - `docs/projects/repo-split/agent-a-plan.md`
  - `docs/projects/repo-split/agent-a-scratch.md`
- Agent B outputs:
  - `docs/projects/repo-split/agent-b-plan.md`
  - `docs/projects/repo-split/agent-b-scratch.md`
- Agent C outputs:
  - `docs/projects/repo-split/agent-c-plan.md`
  - `docs/projects/repo-split/agent-c-scratch.md`
- Agent D outputs:
  - `docs/projects/repo-split/agent-d-plan.md`
  - `docs/projects/repo-split/agent-d-scratch.md`

## Snapshot Update (Pre-merge)
- Verified full chain is in-scope: PR #20 through PR #34.
- Current top branch: `codex/feat-reflect-skill-packet`.
- Commit span from `main..codex/feat-reflect-skill-packet`: 22 commits.

## Progress Update
- Full stack landed to canonical `main` via merged PR #34 (`334ade3f25ab19b41fd0f4cccd8ea00ec96fb009`).
- Continuing with validation and pre-rename drift sign-off.
- Template repo renamed to `rawr-ai/rawr-hq-template` and `template-baseline-v1` tag published.
- Personal repo created as `rawr-ai/rawr-hq` (private) with `upstream` remote wired to template.
- Full verification matrix passed in both repos.
- Final reports written and scratch pads archived.
