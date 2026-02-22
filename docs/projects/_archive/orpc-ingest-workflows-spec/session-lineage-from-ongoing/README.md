# Session Lineage (Non-Normative Archive)

## Purpose
This directory preserves execution history, reshape planning context, and migration lineage for the `flat-runtime` documentation set.

Nothing in this directory is canonical policy authority.

## How to Use This Folder
1. Use this folder to understand how and why the canonical docs evolved.
2. Use canonical docs for implementation policy decisions:
   - `docs/projects/flat-runtime/ARCHITECTURE.md`
   - `docs/projects/flat-runtime/DECISIONS.md`
   - `docs/projects/flat-runtime/axes/*.md`
   - `docs/projects/flat-runtime/examples/*.md`
3. When lineage notes conflict with canonical docs, canonical docs win.

## Expected Archive Categories
- `agent-work/`: agent plans, scratchpads, and recommendations used during reshapes/reviews.
- `closures/`: decision-closure reports and integration changelogs.
- `additive-extractions/`: legacy extracted materials retained for reference.
- Top-level lineage notes (for example `loop-closure-bridge.md`, `route-design-review.md`, `redistribution-traceability.md`) provide historical context.

## Maintenance Rule
Add new artifacts here only when they are historical/process context. Do not place new normative policy in `_session-lineage/`.
