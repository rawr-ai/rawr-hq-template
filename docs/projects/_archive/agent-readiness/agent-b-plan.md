# Agent B Plan - Plugin E2E Workflow Runbook

Status: Complete  
Owner: Agent B  
Last Updated: 2026-02-06

## Scope

- Author canonical process runbook:
  - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/docs/process/PLUGIN_E2E_WORKFLOW.md`
  - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq/docs/process/PLUGIN_E2E_WORKFLOW.md`
- Maintain working artifacts:
  - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/docs/projects/agent-readiness/agent-b-plan.md`
  - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/docs/projects/agent-readiness/agent-b-scratch.md`

## Mandatory Constraints

- Keep command surfaces strictly separated:
  - Channel A: `rawr plugins ...` (oclif plugin manager)
  - Channel B: `rawr plugins web ...` (workspace runtime plugins)
- Deliver deterministic repo-root command sequences.
- Include verification checkpoints and common failure modes.
- Include publish posture: local-only default (`private: true`) plus publish-ready requirements.
- Do not change runtime/API behavior.

## Work Plan

1. Load required skills and routing/process docs.
2. Ground runbook commands in current CLI implementation.
3. Draft deterministic E2E workflows for Channel A and Channel B.
4. Add verification gates and failure-mode guidance.
5. Add publish posture section and explicit policy boundaries.
6. Mirror runbook from template repo to personal repo.
7. Validate channel separation and summarize key decisions.

## Execution Summary

- Added `PLUGIN_E2E_WORKFLOW.md` in template repo and mirrored identical content to personal repo.
- Added Agent B tracking artifacts (`agent-b-plan.md`, `agent-b-scratch.md`) under `docs/projects/agent-readiness/`.
- Validated documented commands against current CLI behavior in template repo.

## Policy Decisions

- Runbook will use `bun run rawr -- ...` command form to keep execution deterministic from repo root.
- Channel A local consume will prefer absolute link paths to avoid cwd ambiguity.
- Channel B workflow will use `factory plugin new` for package creation and `plugins web` commands for runtime consume.
- Channel A install rehearsal documents `file://` usage explicitly; plain filesystem path install is captured as a failure mode.
- Publish posture is explicit: local-only default keeps `private: true`; publish requires deliberate metadata and contract gates.
