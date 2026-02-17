# Agent D Scratchpad

## Timeline (UTC)

- 2026-02-06: Initialized Agent D ownership and loaded required skills (`skill-creator`, `docs-architecture`, `graphite`, `workflow-extractor`, `mental-map`).
- 2026-02-06: Confirmed current scoped AGENTS count is 11 in each repo and baseline target is 32 historical unique paths.
- 2026-02-06: Started reconstruction of historical AGENTS path inventory from repo docs/history.
- 2026-02-06: Reconstructed exact 32-path historical inventory from git history (`git log --all --name-only -- '*AGENTS.md' | sort -u`) in both repos; inventories are identical.
- 2026-02-06: Compared against current state; both repos are missing the same 21 historical AGENTS paths.
- 2026-02-06: Retrieved last historical router content for all 21 missing paths to ground restore-vs-pointer decisions.
- 2026-02-06: Authored `AGENTS_COVERAGE_MATRIX.md` with required sections and full 32-path decision table.
- 2026-02-06: Applied approved minimal restore set in both repos (`AGENTS.md`, `apps/AGENTS.md`, `apps/cli/AGENTS.md`, `packages/AGENTS.md`).
- 2026-02-06: Final validation confirms required matrix sections and expected repo diffs only.

## Breadcrumb Map

- `docs/projects/agent-readiness/IMPLEMENTATION_PLAN.md`: declares 32 historical unique AGENTS paths and required matrix decisions.
- `docs/projects/agent-readiness/ORCHESTRATOR_NOTEBOOK.md`: signpost-model and command-surface invariants are mandatory.
- Current AGENTS footprint exists primarily at `docs/`, `packages/*`, `plugins/*`, and `scripts/`.
- `2d3ed3b25bbcfbfbbbe193c31a7e887f747340eb`: last commit containing most removed routers; useful baseline for minimal router restoration language.
- `apps/cli/src/commands/plugins`: removed; command surface is now `plugins/cli/plugins/src/commands/plugins/web`.
- Restored parent routers are sufficient to avoid reintroducing deep AGENTS sprawl while preserving navigation quality.

## Open Questions

- None.
