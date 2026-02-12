# Agent Scratchpad: dev:up Lifecycle Hardening

Date: 2026-02-12
Worktree: `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-dev-up-lifecycle`
Branch: `codex/coordination-canvas-v1-dev-up-lifecycle`

## Mission
Harden `dev:up` lifecycle behavior to prevent duplicate stacks, provide safe lifecycle actions, standardize surface/open policy, and improve graceful shutdown.

## Timeline (Timestamped)
- 2026-02-12T18:45:48Z: Confirmed correct worktree + branch + clean status.
- 2026-02-12T18:45:48Z: Loaded required skills: graphite, git-worktrees, bun, turborepo, inngest, elysia.
- 2026-02-12T18:45:48Z: Inspected baseline files: `scripts/dev/up.sh`, `apps/cli/src/commands/dev/up.ts`, `apps/cli/test/dev-up.test.ts`, runbook docs.
- 2026-02-12T18:45:48Z: Wrote required plan doc: `docs/projects/agent-coordination-canvas-v1/DEV_UP_LIFECYCLE_PLAN.md`.

## Command Evidence
- `git rev-parse --abbrev-ref HEAD` -> `codex/coordination-canvas-v1-dev-up-lifecycle`
- `git status --short --branch` -> clean on target branch
- `sed -n '1,240p' scripts/dev/up.sh` -> baseline script has no lock/state and opens 3 surfaces by default.
- `cat package.json` -> `dev:up` maps to `bash ./scripts/dev/up.sh`.
- `sed -n '1,260p' docs/process/runbooks/COORDINATION_CANVAS_OPERATIONS.md` -> docs currently state 3 auto-open URLs.

## Decisions (Timestamped)
- 2026-02-12T18:45:48Z: Implement lifecycle state under `.rawr/dev-up/` (pid + lock + metadata).
- 2026-02-12T18:45:48Z: Use canonical canvas URL `http://localhost:5173/coordination` for startup messaging and default open policy.
- 2026-02-12T18:45:48Z: Preserve backward compatibility for `RAWR_OPEN_UI=0` while introducing explicit open policy values.

## Deviations (Timestamped)
- None yet.
- 2026-02-12T18:48:15Z: Decision: implement lifecycle as script-first hardening (`scripts/dev/up.sh`) with optional CLI metadata/doc updates only where they improve operator clarity.
- 2026-02-12T18:48:22Z: Deviation: initial scratchpad append command used an unquoted heredoc and triggered shell backtick substitution; reran append safely with printf. No repo file content was corrupted.
- 2026-02-12T18:51:29Z: Validation: `bash -n scripts/dev/up.sh` passed.
- 2026-02-12T18:52:29Z: Deviation: smoke run exposed conflict-detection return-code bug (conflicts logged but startup continued). Patched `has_unmanaged_port_conflicts` to return success when conflicts exist and fail-fast before spawn.
- 2026-02-12T18:52:29Z: Decision: make web startup honor computed WEB port via `bunx vite --strictPort --port ${WEB_PORT}` so lifecycle checks and custom-port smoke runs are consistent.
- 2026-02-12T18:52:29Z: Validation: reran `bash -n scripts/dev/up.sh` after patch; pass.
- 2026-02-12T18:52:40Z: Command evidence: `bun install` completed in this worktree (dependencies resolved; required for local smoke/test execution).
- 2026-02-12T18:56:37Z: Decision: include Inngest internal ports (gateway + grpc) in lifecycle conflict checks; these are part of the effective stack and can cause hidden duplicate/failure behavior.
- 2026-02-12T18:56:51Z: Deviation: second unquoted heredoc append caused command-substitution stripping in several scratchpad lines; preserving record and adding corrected entries below.
- 2026-02-12T18:56:51Z: Corrected command evidence: baseline `bash scripts/dev/up.sh --action status --non-interactive` on default ports showed pre-existing listeners on `3000/5173/8288` (pids `47718/47785/57572`).
- 2026-02-12T18:56:51Z: Corrected command evidence: isolated first-start smoke succeeded with `PORT=3900`, `WEB=5273`, `INNGEST=8388`, `gateway=8399`, `grpc=51052/51053` and reached `dev stack ready`.
- 2026-02-12T18:56:51Z: Corrected command evidence: second invocation in non-interactive mode defaulted to `status` without spawning duplicate listeners.
- 2026-02-12T18:56:51Z: Corrected command evidence: `--action stop` terminated managed isolated stack; ports `3900/5273/8388/8399/51052/51053` were no longer listening.
- 2026-02-12T18:56:51Z: Corrected command evidence: `--action restart` successfully stopped/started stack and Ctrl+C cleanup left isolated lifecycle ports clear.
- 2026-02-12T18:56:51Z: Corrected deviation: default-port Ctrl+C listener-clear check for `5173/3000/8288` is blocked by pre-existing listeners from an external stack in another worktree; validated duplicate-prevention on default ports and orphan-free cleanup on isolated ports.
- 2026-02-12T18:57:11Z: Decision: expose overridable Inngest internal ports via env (`RAWR_DEV_UP_INNGEST_CONNECT_GATEWAY_PORT`, `RAWR_DEV_UP_INNGEST_CONNECT_GATEWAY_GRPC_PORT`, `RAWR_DEV_UP_INNGEST_CONNECT_EXECUTOR_GRPC_PORT`) to support isolated local stacks when needed.
- 2026-02-12T18:57:43Z: Decision: canonicalized runbook guidance to `/coordination` as primary canvas surface; standalone canvas remains non-default.
- 2026-02-12T18:57:43Z: Command evidence: updated `docs/process/runbooks/COORDINATION_CANVAS_OPERATIONS.md` with lifecycle actions (`status/attach/stop/restart`), non-interactive default behavior, and open policy matrix.
- 2026-02-12T18:57:43Z: Command evidence: updated CLI `dev up` description in `apps/cli/src/commands/dev/up.ts` to reflect stack management scope (server+web+inngest).
- 2026-02-12T18:58:25Z: Validation: `bun run --cwd apps/web test` passed (2 files, 3 tests).
- 2026-02-12T18:58:25Z: Validation: `bun run --cwd apps/web build` passed.
- 2026-02-12T18:58:25Z: Validation: affected CLI check `bun run --cwd apps/cli test test/dev-up.test.ts` passed.
- 2026-02-12T18:58:25Z: Validation: final `bash -n scripts/dev/up.sh` passed after all edits.
- 2026-02-12T18:58:25Z: Command evidence: default-port auto start now fails fast on occupied unmanaged ports (3000/5173/8288/8289/50052/50053) instead of spawning duplicate instances.
- 2026-02-12T19:00:26Z: Deviation: detected a lingering managed isolated stack (`.rawr/dev-up/state.env`) during final verification; executed explicit stop to avoid leaving orphan listeners.
- 2026-02-12T19:00:26Z: Command evidence: `bash scripts/dev/up.sh --action stop --non-interactive --open none` cleaned managed processes and removed listeners on `3900/5273/8388/8399/51052/51053`.
