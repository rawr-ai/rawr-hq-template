# Orchestrator Notebook: Agent-Readiness Hardening

## Operating Rule

Observe agent progress; intervene only for drift, factual errors, or contract violations.

## Baseline Observations

- Both repos start clean on `main`.
- Graphite trunk is `main` in both repos.
- Historical `AGENTS.md` footprint is larger than current footprint:
  - historical unique paths: 32
  - current paths per repo: 11
- Missing root `AGENTS.md` in both repos is confirmed.

## Agent Direction Notes

- Enforce signpost model for `AGENTS.md`: routing + critical rules + pointers, no raw context dump.
- Preserve command channel separation:
  - Channel A: `rawr plugins ...`
  - Channel B: `rawr plugins web ...`
- Keep Graphite requirement explicit in both repos.
- Avoid runtime/API changes; docs/process hardening only.

## Checkpoints

1. Agent D matrix approved before Agent C finalization.
2. Agent A/B runbooks reviewed for command completeness and rollback clarity.
3. Agent C updates stale repo-split cleanup docs to current branch truth.
4. Final cross-link and link-integrity checks pass.

## Progress Log

- Agent D completed coverage matrix and restored minimal router set in both repos:
  - `AGENTS.md`
  - `apps/AGENTS.md`
  - `apps/cli/AGENTS.md`
  - `packages/AGENTS.md`
- Agent A completed deterministic upstream sync runbooks in both repos.
- Agent B completed plugin end-to-end workflow runbooks in both repos.
- Agent C finalized root router content, gateway cross-links, and stale cleanup-doc supersession markers.
- Orchestrator adjustment:
  - corrected personal runbook path examples in `docs/process/PLUGIN_E2E_WORKFLOW.md` to use `rawr-hq` path.
- Validation gate complete:
  - coverage matrix row count = 32
  - broken markdown links = 0 in both repos (excluding `node_modules`)
  - root/runbook routing checks passed
  - final report written at `docs/projects/agent-readiness/FINAL_REPORT.md`
