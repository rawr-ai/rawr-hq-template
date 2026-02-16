# SESSION_019c587a - Agent F Step 4 Plan

## Objective (Step 4 Only)
Define workflow model and exposure defaults so workflows are Inngest-first for execution, with trigger-router defaults and explicit internal/external usage semantics.

## In Scope
1. Keep workflow execution model ingest-first (Inngest-first).
2. Make workflow trigger router generation a default requirement for workflow plugins.
3. Preserve internal-by-default trigger visibility with explicit per-procedure promotion to external.
4. Add concrete internal/external usage matrix language:
   - internal callers = trusted/server/operator flows,
   - external callers = promoted procedures only.
5. Clarify workflow-to-workflow orchestration via Inngest-native composition (`step.invoke`, `step.sendEvent`) with no plugin-to-plugin imports.

## Out of Scope
1. Step 5+ changes.
2. API boundary/domain policy rewrites beyond workflow policy alignment.
3. Any implementation/code changes.

## Planned Edits
1. Tighten `Workflows Policy` text with explicit ingest-first default and trigger-router generation requirement.
2. Clarify visibility defaults and promotion semantics for triggers.
3. Strengthen composition constraints to state all cross-workflow calls use composed surfaces.
4. Update trigger usage matrix notes to explicitly constrain external callers to promoted procedures only.

## Step 4 Gate
Workflow policy text clearly enforces ingest-first execution + trigger-router defaults, visibility defaults, and composed-surface call flows with no plugin-to-plugin runtime imports.
