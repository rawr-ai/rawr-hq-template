# Reflect Boundaries

This file defines what belongs in reflection and what does not.

## Does not belong

- Single-session, one-off details.
- Project-specific or bug-specific logs.
- Narrow domain notes that do not generalize.
- Any rule that silently changes agent behavior without explicit user approval.
- De-facto policy encoded from one session without explicit confirmation.

## Belongs

- Repeated workflow patterns across tasks.
- Collaboration norms that improve coordination.
- Invariants that stayed true across a successful workflow.
- Reusable trap warnings and sequencing guidance.
- User preferences about *how* work should be done when repeatedly observed and explicitly framed as preference, not hidden policy.

## Canonical filter

Before keeping a reflection, ask:

1. Would this still be useful in a different project?
2. Is this about process/collaboration rather than a single incident?
3. Is this explicit and reviewable, not silently binding?

If any answer is no, keep it out of canonical reflection.
