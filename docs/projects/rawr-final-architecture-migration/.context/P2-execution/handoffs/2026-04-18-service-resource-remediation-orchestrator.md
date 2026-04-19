# Service Resource Remediation Orchestrator Scratchpad

Created: 2026-04-19T02:54:08Z

## Current Branch

- Main checkout branch: `codex/session-intelligence-migration`
- Stack head at capture: `14825ca2 refactor(session-intelligence): promote session tooling service`
- Existing dirty files from abandoned host-package direction:
  - `packages/session-intelligence-host/src/index-runtime.ts`
  - `packages/session-intelligence-host/src/source-runtime.ts`
  - `packages/session-intelligence-host/src/types.ts`
  - `docs/projects/rawr-final-architecture-migration/.context/P2-execution/handoffs/2026-04-18-session-intelligence-promotion-plan.md`

Do not base agent work on those dirty host-package edits. Agents must create worktrees from committed stack head.

## Governing Decision

`*-host` packages are invalid and must be deleted:

- `packages/hq-ops-host`
- `packages/agent-config-sync-host`
- `packages/session-intelligence-host`

Concrete resources move to plugin/app/runtime surfaces for now. Services own behavior. Packages only hold truly shared primitives.

## Orchestrator Runbook

1. Commit this documentation as the first Graphite remediation slice.
2. Launch one default agent per service in separate worktrees from stack head.
3. Require a service-local mini plan scratchpad before each agent implements.
4. Review each mini plan for the invariants in `service-resource-remediation-cheatsheet.md`.
5. Let agents implement service-local branches.
6. Integrate completed branches into a small Graphite stack.
7. Perform cross-service cleanup and ratchets after service branches return.
8. Launch fresh review agents for architecture, service style, testing/proof, and live command checks.
9. Leave all worktrees and the main checkout clean.

## Agent Launch Ledger

| Service | Agent | Branch | Worktree | Scratchpad | Status |
| --- | --- | --- | --- | --- | --- |
| `hq-ops` | `019da3ab-8e92-7762-b778-9cec747d23f9` | `agent-HQOPS-remove-host-package` | `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-HQOPS-remove-host-package` | `.../agent-HQOPS-remove-host-package-mini-plan.md` | discovery / mini-plan |
| `agent-config-sync` | `019da3ab-dfd3-79b3-99ba-c96f0f05577e` | `agent-AGENTSYNC-remove-host-package` | `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-AGENTSYNC-remove-host-package` | `.../agent-AGENTSYNC-remove-host-package-mini-plan.md` | discovery / mini-plan |
| `session-intelligence` | `019da3ac-3040-7a90-babb-54c67ec32269` | `agent-SESSIONS-remove-host-package` | `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-SESSIONS-remove-host-package` | `.../agent-SESSIONS-remove-host-package-mini-plan.md` | discovery / mini-plan |

## Shared Agent Prompt Notes

Agents are stateless. Prompts must include:

- repo and branch/worktree workflow
- no `*-host` packages
- service owns semantic behavior
- packages only for multiple-service primitives
- required docs and example service reading
- scratchpad-before-implementation requirement
- service-specific objective
- proof and final response requirements

Use `service-resource-remediation-cheatsheet.md` as the canonical prompt payload source.
