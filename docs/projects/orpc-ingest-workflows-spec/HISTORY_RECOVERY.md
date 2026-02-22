# History Recovery Guide

This packet intentionally removed superseded planning/runtime working artifacts after closure. Use the patterns below to recover anything from git history without restoring it into the canonical packet by default.

## Removed Artifact Classes
- Planning pass directories:
  - `_phase-c-planning-pass-01-2026-02-21/`
  - `_phase-d-planning-pass-01-2026-02-21/`
  - `_phase-e-planning-pass-01-2026-02-21/`
  - `_phase-f-planning-pass-01-2026-02-21/`
- Autonomy assessment pass directory:
  - `_autonomy-assessment-pass-01-2026-02-20/`
- Superseded root docs:
  - `PHASE_B_PLANNING_RUNBOOK_DRAFT.md`
  - `PHASE_C_PLANNING_RUNBOOK_DRAFT.md`
  - `PHASE_D_PLANNING_RUNBOOK_DRAFT.md`
  - `PHASE_E_PREP_NOTE.md`
  - `PHASE_F_PREP_NOTE.md`
  - `GROUNDING_WORKSPACE_PREP_CLEANUP.md`
- Runtime pass working artifacts pruned from D/E/F:
  - `AGENT_*`
  - `ORCHESTRATOR_*`

## Recovery Workflow (Any Artifact)
1. Find commits that touched a path:
```bash
git log --oneline -- docs/projects/orpc-ingest-workflows-spec/<path-or-file>
```
2. Inspect files that existed at a commit:
```bash
git ls-tree -r --name-only <commit> -- docs/projects/orpc-ingest-workflows-spec
```
3. Open one file from that commit:
```bash
git show <commit>:docs/projects/orpc-ingest-workflows-spec/<path-or-file>
```
4. Export a recovered copy (without modifying tracked files):
```bash
git show <commit>:docs/projects/orpc-ingest-workflows-spec/<path-or-file> > /tmp/<recovered-file>
```

## By Artifact Type

### Planning Packet Docs
```bash
git log --oneline -- docs/projects/orpc-ingest-workflows-spec/_phase-*-planning-pass-01-2026-02-21
git ls-tree -r --name-only <commit> -- docs/projects/orpc-ingest-workflows-spec/_phase-e-planning-pass-01-2026-02-21
```

### Workbreakdowns
```bash
git log --oneline -- docs/projects/orpc-ingest-workflows-spec/*WORKBREAKDOWN*
git show <commit>:docs/projects/orpc-ingest-workflows-spec/PHASE_E_WORKBREAKDOWN.yaml
```

### Orchestrator Plans
```bash
git log --oneline -- docs/projects/orpc-ingest-workflows-spec | rg ORCHESTRATOR_PLAN_VERBATIM
git ls-tree -r --name-only <commit> -- docs/projects/orpc-ingest-workflows-spec | rg ORCHESTRATOR_
```

### Agent Artifacts
```bash
git log --oneline -- docs/projects/orpc-ingest-workflows-spec | rg AGENT_
git ls-tree -r --name-only <commit> -- docs/projects/orpc-ingest-workflows-spec | rg AGENT_
```

### Runtime Pass Artifacts
```bash
git log --oneline -- docs/projects/orpc-ingest-workflows-spec/_phase-d-runtime-execution-pass-01-2026-02-21
git log --oneline -- docs/projects/orpc-ingest-workflows-spec/_phase-e-runtime-execution-pass-01-2026-02-21
git log --oneline -- docs/projects/orpc-ingest-workflows-spec/_phase-f-runtime-execution-pass-01-2026-02-21
```

## Safety Note
Prefer recovering to a scratch path or separate branch first. Only reintroduce artifacts into this packet when they become canonical again.
