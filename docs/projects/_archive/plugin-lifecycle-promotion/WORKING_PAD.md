# Plugin Lifecycle Promotion Working Pad

## Current Branch
- codex/plugin-lifecycle-promotion-phase1-runtime

## Notes
- Keep coordination/canvas branches untouched until their owner agent is done.
- Use `gt sync --no-restack` during active foreign-stack activity.

## Command Log
- Initialized template worktree and tracking branch.
- Created plan scratch + this working pad.

## Open Items
- Build lifecycle promotion matrix from personal commits.
- Port promote/split files into template in Graphite slices.

## Promotion Matrix
- Added `PROMOTION_MATRIX.md` with promote/keep/split classification from personal lifecycle commits.
- Slice B staged: promoted lifecycle runbooks and RUNBOOKS index updates.
- Slice C staged: expanded template-managed manifest + ownership docs for lifecycle split coverage.
- Slice D staged: extracted guard decision/matching helpers and added mode/path coverage tests.
- Adjusted two CLI tests to preserve template fixture assumptions (`plugins` sync ref, empty default web list).
- Verification: `bun install`, targeted turbo typecheck, targeted cli/plugin tests all passed.
- Note: full `bun run test` still has pre-existing timeout-heavy failures outside this slice scope.
