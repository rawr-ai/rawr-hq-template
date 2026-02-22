# DEV UP Lifecycle Hardening Plan

Date: 2026-02-12
Worktree: `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-dev-up-lifecycle`
Branch: `codex/coordination-canvas-v1-dev-up-lifecycle`

## Problem Statement
`bun run dev:up` currently starts three long-running processes (server/web/inngest) without coordination state. A second invocation can start duplicate instances and trigger fallback ports. Browser opening can produce multiple tabs/windows. Startup output does not clearly communicate canonical canvas access and surface policy.

## Goals
1. Prevent duplicate stack startup on the same workspace.
2. Provide explicit lifecycle actions with safe defaults in both interactive and non-interactive runs.
3. Make browser open behavior minimal, deterministic, and configurable.
4. Standardize canvas surface guidance to canonical host-shell route (`/coordination`) unless standalone is explicitly requested.
5. Ensure signal handling shuts down child processes cleanly and avoids orphan listeners.

## Out of Scope
- Re-architecting web/server process model.
- Changing coordination APIs.
- Introducing new external process managers.

## Implementation Plan
1. Harden `scripts/dev/up.sh` lifecycle orchestration.
- Add state directory + lock + pid metadata under `.rawr/dev-up/`.
- Add runtime detection for existing managed processes and active listeners on expected ports.
- Add action resolver with modes: `attach/status`, `stop`, `restart`.
- Add non-interactive-safe default behavior (status/attach without blocking prompts).
- Add explicit open policy env surface (`RAWR_OPEN_UI` compatibility + new policy values).
- Add startup summary with canonical URLs and surface policy.
- Add graceful shutdown sequence for INT/TERM + EXIT with escalation and state cleanup.

2. Align CLI wrapper for discoverability and machine output.
- Update `apps/cli/src/commands/dev/up.ts` description/help to reflect lifecycle behavior and env controls.
- Preserve `--json`/`--dry-run` compatibility.
- Extend tests in `apps/cli/test/dev-up.test.ts` for updated command metadata/plan output if needed.

3. Update operations docs.
- Update `docs/process/runbooks/COORDINATION_CANVAS_OPERATIONS.md` with:
  - canonical canvas route policy
  - lifecycle action behavior for repeated `dev:up` invocations
  - browser open policy matrix
  - graceful shutdown expectations
- Add decision trace references in project docs where relevant.

4. Validation and smoke checks.
- Required lint: `bash -n scripts/dev/up.sh`
- Behavioral smoke:
  - first start succeeds
  - second start does not duplicate instances/ports
  - explicit stop/restart paths work
  - Ctrl+C leaves no listeners on 5173/3000/8288
- Web quality gates:
  - `bun run --cwd apps/web test`
  - `bun run --cwd apps/web build`
- Run affected CLI tests if CLI command/test files are changed.

## Proposed Behavior Contract
### Existing stack detection
- If managed state exists and processes are alive, `dev:up` treats stack as running.
- If state is stale but expected ports are occupied, report probable external/conflicting processes and do not auto-spawn duplicates.

### Action defaults
- Interactive terminal default: prompt with `attach/status` default.
- Non-interactive (`CI`, no TTY, or explicit non-interactive env): default to `status` and exit success without starting duplicates.
- Explicit override via env/action flag path in script internals.

### Browser open policy
- Canonical default: open only `http://localhost:5173/coordination` once on fresh start.
- Optional policies: `none`, `coordination`, `app`, `app+inngest`, `all`.
- Backward compatibility: `RAWR_OPEN_UI=0` disables opening.

### Surface standardization
- Canonical canvas surface: host shell route `/coordination`.
- Inngest UI treated as optional operational surface, not canvas primary route.
- Startup output and runbook explicitly call this out.

## Risks and Mitigations
- Risk: stale pid files produce false-positive running state.
- Mitigation: validate both pid liveliness and command/port checks; auto-prune stale state.

- Risk: port probing tools differ across environments.
- Mitigation: use portable checks with graceful fallback (`lsof` when present, otherwise TCP probe via curl).

- Risk: behavior regression for users expecting current auto-open of three tabs.
- Mitigation: preserve env override controls and document explicit policy values.

## Decision Log (Timestamped)
- 2026-02-12T18:45:48Z: Decision: implement stateful lifecycle orchestration directly in `scripts/dev/up.sh` (no external daemon/process manager) to keep compatibility with current Bun/Turbo workflow.
- 2026-02-12T18:45:48Z: Decision: canonical canvas URL remains host-shell `/coordination`; standalone canvas is treated as non-default/explicit mode only.
- 2026-02-12T18:45:48Z: Decision: non-interactive default will not prompt; it will return status/attach-safe behavior to avoid CI hangs and duplicate process starts.
- 2026-02-12T18:57:44Z: Decision: keep lifecycle hardening concentrated in `scripts/dev/up.sh` and only update CLI/runbook surfaces where lifecycle behavior or operator messaging changed.
- 2026-02-12T18:57:44Z: Decision: treat `5173/3000/8288` as canonical operator ports while allowing isolated smoke via env-overridden ports when external listeners already exist.
