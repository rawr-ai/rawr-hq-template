# Agent-Readiness Hardening Implementation Plan

Status: In Progress  
Owner: Orchestrator

## Objective

Harden documentation/process readiness across:

- `RAWR HQ-Template` (`/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template`)
- `RAWR HQ` (`/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq`)

with focused agents, traceable plan/scratch artifacts, and validated runbooks.

## Baseline Snapshot

- Template scoped `AGENTS.md` count: 11
- Personal scoped `AGENTS.md` count: 11
- Historical unique `AGENTS.md` paths in codebase: 32
- Graphite trunk (template): `main`
- Graphite trunk (personal): `main`
- Working tree state at start: clean in both repos

## Skills Contract

All agents must load:

1. `/Users/mateicanavra/.codex-rawr/skills/.system/skill-creator/SKILL.md`
2. `/Users/mateicanavra/.codex-rawr/skills/docs-architecture/SKILL.md`
3. `/Users/mateicanavra/.codex-rawr/skills/graphite/SKILL.md`

Agent-specific:

- Agent A: `/Users/mateicanavra/.codex-rawr/skills/fork-rebase-maintenance/SKILL.md` + references
- Agent B: `/Users/mateicanavra/.codex-rawr/skills/plugin-content/SKILL.md`, `/Users/mateicanavra/.codex-rawr/skills/bun/SKILL.md`
- Agent C and D: `/Users/mateicanavra/.codex-rawr/skills/workflow-extractor/SKILL.md`, `/Users/mateicanavra/.codex-rawr/skills/mental-map/SKILL.md`

## Phases

### Phase 0: Orchestrator Setup

- [x] Create implementation plan doc
- [x] Create orchestrator notebook
- [x] Capture baseline inventories

### Phase 1: Agent D (Coverage Gate)

- [x] Produce `AGENTS_COVERAGE_MATRIX.md` (historical-vs-current mapping)
- [x] Mark each missing historical path as `restore`, `replace_with_pointer`, or `archive_only`
- [x] Complete `agent-d-plan.md` and `agent-d-scratch.md`
- [x] Orchestrator approval before Agent C finalization

### Phase 2: Agents A and B (Parallel)

- [x] Agent A writes `UPSTREAM_SYNC_RUNBOOK.md` in template and personal repos
- [x] Agent B writes `PLUGIN_E2E_WORKFLOW.md` in template and personal repos
- [x] Agent A/B produce plan + scratch artifacts under `docs/projects/agent-readiness/`

### Phase 3: Agent C (Docs Hygiene + Root Routers)

- [x] Add root `AGENTS.md` to template and personal repos
- [x] Apply doc hygiene and stale cleanup updates
- [x] Archive/retain superseded docs per policy
- [x] Produce `agent-c-plan.md` and `agent-c-scratch.md`

### Phase 4: Orchestrator Integration

- [x] Cross-link runbooks from gateway docs and root routers
- [x] Validate role boundaries and command-channel clarity in both repos

### Phase 5: Validation and Final Report

- [x] Validate `AGENTS` coverage matrix and replacement pointers
- [x] Validate runbooks are command-complete and executable
- [x] Validate no broken internal links (excluding `node_modules`)
- [x] Produce `docs/projects/agent-readiness/FINAL_REPORT.md`

## Deliverables

Core:

- `AGENTS.md` (root) in both repos
- `docs/process/UPSTREAM_SYNC_RUNBOOK.md` in both repos
- `docs/process/PLUGIN_E2E_WORKFLOW.md` in both repos
- `docs/projects/agent-readiness/AGENTS_COVERAGE_MATRIX.md`
- `docs/projects/agent-readiness/FINAL_REPORT.md`

Per-agent:

- `docs/projects/agent-readiness/agent-a-plan.md`
- `docs/projects/agent-readiness/agent-a-scratch.md`
- `docs/projects/agent-readiness/agent-b-plan.md`
- `docs/projects/agent-readiness/agent-b-scratch.md`
- `docs/projects/agent-readiness/agent-c-plan.md`
- `docs/projects/agent-readiness/agent-c-scratch.md`
- `docs/projects/agent-readiness/agent-d-plan.md`
- `docs/projects/agent-readiness/agent-d-scratch.md`
