# Agent C Plan - Web Cutover (S03)

## Objective

Replace manual web coordination API usage with ORPC client usage in hooks/adapters/pages.

## Scope

1. Replace manual coordination fetch adapter.
2. Update `useWorkflow` and `useRunStatus`.
3. Update `CoordinationPage` to use ORPC-driven results.

## Constraints

- Preserve React Flow/Workflow Kit behavior.
- Preserve visual and timeline behavior.
