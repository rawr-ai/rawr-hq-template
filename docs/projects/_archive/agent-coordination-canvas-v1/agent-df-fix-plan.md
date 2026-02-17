# Agent DF Fix Plan (Runtime Wiring)

## Mission
Eliminate run-path failures by enforcing persisted workflow preconditions and preserve typed runtime behavior.

## Skills
- `elysia`
- `inngest`

## Scope
- `apps/web/src/ui/coordination/hooks/useWorkflow.ts`
- `apps/web/src/ui/coordination/adapters/api-client.ts`
- `apps/server/src/coordination.ts`
- `packages/coordination/**/*`

## Planned Work
1. Implement save-before-run semantics in hook layer.
2. Ensure structured error envelope handling remains explicit in UI.
3. Validate run/timeline polling lifecycle and cancellation behavior.
4. Verify no endpoint path churn.
