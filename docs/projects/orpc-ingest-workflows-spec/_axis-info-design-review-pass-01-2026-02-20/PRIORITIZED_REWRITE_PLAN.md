# Prioritized Rewrite Plan (Info-Design Only)

## Objective
Improve axis clarity and packet scanability without changing policy semantics.

## Priority 1 (Immediate)
1. Axis 08: split canonical policy into grouped sections and add Axis Opening.
2. Axis 07: same grouping treatment; isolate naming defaults as secondary.
3. Axis 02 + Axis 06: add grouped policy blocks and concise summary table.

## Priority 2
1. Add Axis Opening to all axes.
2. Add/normalize `Why` + `Trade-Offs` sections in later axes where inconsistent.

## Priority 3
1. Add authority banner to examples clarifying non-normative status.
2. Reduce duplicated navigation prose across README/ARCHITECTURE/NAV via role separation.

## Constraints
1. No semantics edits to canonical policies.
2. No decision-lock changes required.
3. Keep changes reviewable in a single docs-focused commit stack.

## Acceptance Checks
1. Each axis has explicit opening intent.
2. Long policy sections are grouped by concern.
3. Example authority boundaries are explicit.
4. Packet entry docs no longer duplicate large routing lists.
