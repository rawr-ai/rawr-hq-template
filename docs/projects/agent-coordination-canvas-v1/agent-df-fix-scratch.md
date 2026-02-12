# Agent DF Fix Scratch

## Findings Log
- 2026-02-12T23:11:00Z: Introspection completed.
  - `useWorkflow.queueRun()` runs by `activeWorkflow.workflowId` without guaranteed persistence of current editor state.
  - Required fix: `ensureLatestWorkflowSaved()` before `runWorkflowById(...)`, and short-circuit run when save fails.
  - Polling in `useRunStatus` should avoid premature stop while run is still non-terminal and should keep stale-token cancellation strict.
  - Monitor links should be runtime-derived from trace links and no hardcoded port assumptions remain in UI layer.

## Verification Targets
1. Run never executes against unsaved workflow id.
2. `WORKFLOW_NOT_FOUND` only appears for actual missing persisted ids.
3. Busy/running states are concurrency-safe.
