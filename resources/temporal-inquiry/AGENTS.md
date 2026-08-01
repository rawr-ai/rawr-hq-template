# Temporal Inquiry Resource Router

## Purpose

- Give repository-owned semantic models one provider-neutral foreground inquiry lifetime.

## Scope

- Applies to `resources/temporal-inquiry/**` until a provider router narrows the scope.

## Boundaries

- The resource owns scoped access and cleanup, not repository ontology, reviewed facts, projections, queries, ledger contents, or refresh policy.
- Provider selection belongs to application composition. No service, daemon, watcher, hook, schedule, oRPC router, or workflow owns this capability.
- Planning is inert. Refresh is an explicit write. Query and verification are explicit reads over an already sealed checkpoint.

## Behavior

- One foreground call may acquire one exact inquiry runtime, serialize reads and writes, and release every owned process, lock, and scratch path.

## Validation

- Run `bunx nx run @habitat/resource-temporal-inquiry:typecheck` and `bunx nx run provider-temporal-inquiry-fluree-effect-platform-node:test`.
