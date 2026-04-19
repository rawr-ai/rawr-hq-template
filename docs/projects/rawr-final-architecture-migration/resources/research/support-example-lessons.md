# Support-Example Archive Lessons

`support-example` is archived in Phase 1 because it was valuable as an illustrative fixture set, but not as live architecture. This note keeps the useful examples for later async/wiring work without preserving the implementation itself.

## What To Preserve

### Lifecycle fixture

Keep the example lifecycle shape:

- queued -> running -> completed|failed

This is the useful mental model for a later async acceptance story, even though the original run store and workflow package are gone.

### Representative trigger payload

Keep the representative event fields:

- `runId, workItemId, repoRoot, queueId, requestedBy, dryRun, requestId, correlationId`

Those fields are the useful part of the example because they show the minimum wiring needed to connect a request, a repo-scoped execution context, and correlation/trace metadata.

### Async acceptance language

Translate the strongest old tests into later async acceptance language:

- trigger acceptance records a queued run
- execution marks the run running before side effects
- dry-run execution completes without fabricated business counts
- successful completion records finished state and summary
- failure completion records a reason and closes the run cleanly

## What To Leave Behind

- the in-memory run store and host-fabricated persistence
- the split truth between service state and workflow state
- hard-coded demo counts and story-specific implementation details
- the idea that this package should remain a live Phase 1 capability

## Reuse Rule

Use this archive as a fixture/reference source only. Future work can borrow the lifecycle framing, payload fields, and proof language, but it must re-enter through canonical service ownership and canonical plugin topology instead of reviving the old package tree.
