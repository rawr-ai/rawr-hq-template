# ORPC Stacked Implementation Plan (Execution)

Status: In Progress
Owner: Orchestrator
Worktree: `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-a-orpc-v1-impl`
Base stack branch: `codex/coordination-fixpass-v1-cutover-purge`

## Summary

Execute a full ORPC cutover for all procedure-style APIs, keeping only explicit non-procedure framework routes (`/api/inngest`, `/rawr/plugins/web/:dirName`, `/health`).

The execution model is one fine-grained Graphite stack with orchestrator-led integration and specialist agent slices.

## Locked execution decisions

1. Bridge-then-remove in same stack.
2. Single fine-grained stack rooted on current top stack branch.
3. Domain contracts co-located with domain packages.
4. One HQ root router composing domain subrouters.
5. Day-1 OpenAPI exposure.
6. Full-cutover end state with no transitional legacy paths.

## Slice map

| Slice | Branch | Mode | Owner | Output |
| --- | --- | --- | --- | --- |
| S00 | `codex/orpc-v1-s00-plan-bootstrap` | Sequential | Orchestrator | Canonical plan + agent plans/scratch docs |
| S01 | `codex/orpc-v1-s01-contract-spine` | Sequential | Agent A | Coordination + state contracts and HQ root composition |
| S02 | `codex/orpc-v1-s02-hq-root-router-server-mount` | Sequential | Agent B | Elysia mounts for RPC/OpenAPI + temporary bridge |
| S03 | `codex/orpc-v1-s03-client-cutover-web-canvas` | Parallel | Agent C | Web coordination cutover to ORPC |
| S04 | `codex/orpc-v1-s04-client-cutover-cli` | Parallel | Agent D | CLI coordination cutover to ORPC |
| S05 | `codex/orpc-v1-s05-state-api-and-mount-host` | Parallel | Agent D | `/rawr/state` consumer cutover |
| S06 | `codex/orpc-v1-s06-openapi-day1-and-sdk` | Parallel | Agent E | OpenAPI exposure + usage conventions |
| S07 | `codex/orpc-v1-s07-test-hardening-contract-drift` | Sequential | Orchestrator + A-E | Contract drift + convergence tests |
| S08 | `codex/orpc-v1-s08-final-legacy-cleanup` | Sequential | Agent F | Delete all temporary bridges/manual legacy |
| S09 | `codex/orpc-v1-s09-docs-skills-runbooks-finalize` | Sequential | Agent E + Orchestrator | Final docs/skills alignment |

## Parallelization and integration rules

1. S00-S02 are strict sequential.
2. S03-S06 run in parallel-capable mode with isolated ownership and orchestrator integration.
3. S07 waits for S03-S06 completion and is convergence only.
4. S08 is mandatory dedicated cleanup pass.
5. S09 finalizes docs/runbooks/skills after cleanup.

## Non-ORPC endpoint exceptions

1. `/api/inngest` (ingress transport route).
2. `/rawr/plugins/web/:dirName` (module byte serving route).
3. `/health` (liveness route).

These are framework-native by design and not considered legacy bypasses.

## Initial task order

1. S00 bootstrap artifacts and commit.
2. S01 contracts + root router composition and commit.
3. S02 server mount with bridge and commit.
4. Run S03-S06 in orchestrated parallel workflow.
5. S07 convergence tests.
6. S08 cleanup to no-legacy end state.
7. S09 docs/runbooks/skills finalize.

## Notes on top-of-stack advancement

This stack is based on a newer top branch than the original ORPC scope research base. Agents must reconcile differences against current branch state before applying each slice and update their plan/scratch docs as needed.
