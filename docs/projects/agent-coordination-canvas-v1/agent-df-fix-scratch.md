# Agent DF Fix Scratch

## Findings Log
- Pending implementation pass.

## Verification Targets
1. Run never executes against unsaved workflow id.
2. `WORKFLOW_NOT_FOUND` only appears for actual missing persisted ids.
3. Busy/running states are concurrency-safe.
