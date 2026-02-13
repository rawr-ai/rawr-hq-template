# Runbook Hardening Execution Plan

## Goal
Tighten stack-drain and operations docs so future drains are lower-friction and less ambiguous.

## Scope
1. Add one canonical repo-boundary guard for template vs personal execution (including plugin sync location).
2. Add top-of-stack preflight checks to stack drain workflow.
3. Add transient test-failure retry policy.
4. Add a final acceptance checklist for two-repo drains.
5. Reduce duplicated instruction wording by linking to a single canonical section.

## Files to update
- `docs/process/runbooks/STACK_DRAIN_LOOP.md`
- `docs/process/HQ_OPERATIONS.md`
- `docs/process/HQ_USAGE.md`
- `docs/process/RUNBOOKS.md`
- `docs/process/GRAPHITE.md`

## Validation
1. Verify docs are internally consistent and cross-linked.
2. Run markdown lint checks if configured; otherwise manual consistency pass.
3. Commit as one scoped docs change and submit with Graphite.
