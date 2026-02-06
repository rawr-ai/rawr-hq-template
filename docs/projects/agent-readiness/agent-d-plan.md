# Agent D Plan - AGENTS Coverage/Recovery Matrix

Status: Complete  
Owner: Agent D  
Last Updated: 2026-02-06

## Scope

- Build historical-vs-current `AGENTS.md` coverage matrix for 32 historical paths across:
  - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template`
  - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq`
- Decide one action per missing historical path:
  - `restore`
  - `replace_with_pointer`
  - `archive_only`
- Keep decisions concise and actionable for Agent C implementation/finalization.

## Work Plan

1. Load required skills and enforce signpost-only AGENTS model.
2. Reconstruct historical 32-path inventory from repo docs/history.
3. Snapshot current AGENTS coverage in both repos.
4. Apply deterministic decision rules per missing path.
5. Write `AGENTS_COVERAGE_MATRIX.md` with required sections.
6. Restore scoped `AGENTS.md` files only if any matrix row is `restore`.
7. Final validation pass for completeness and navigation quality.

## Decision Criteria

- Keep AGENTS as routing/policy signposts; avoid context duplication.
- Prefer `replace_with_pointer` when parent/root router can cover the historical path.
- Use `archive_only` for dead/legacy paths with no active ownership surface.
- Use `restore` only when path remains active and requires local routing to prevent navigation ambiguity.

## Current Decision Direction

- `restore` set (minimal, applied in both repos): `AGENTS.md`, `apps/AGENTS.md`, `apps/cli/AGENTS.md`, `packages/AGENTS.md`.
- `replace_with_pointer`: all remaining active historical paths currently missing routers.
- `archive_only`: removed historical paths with no current directory surface (`apps/cli/src/commands/plugins/AGENTS.md`, `docs/scratchpads/AGENTS.md`).
