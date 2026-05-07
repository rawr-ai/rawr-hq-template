# Agent Config Sync Common Service Anchors

`services/agent-config-sync` follows the `example-todo` service shell, with a
strict common allowlist.

Allowed common files:

- `errors.ts` for reusable ORPC boundary errors once multiple modules need them.
- `internal-errors.ts` for unexpected internal-only failures.
- `resources.ts` for the service-wide host resource contract.
- `entities.ts` for public/cross-module sync value objects used by multiple modules.
- `internal/source-scope.ts` because planning and retirement both need identical
  source-scope resolution semantics.

Module-owned behavior does not live here. Planning assessment types belong in
`modules/planning`, execution apply semantics belong in `modules/execution`,
retirement stale-managed behavior belongs in `modules/retirement`, and undo
capsule/apply behavior belongs in `modules/undo`.

Module routers use `router/index.ts` as the single oRPC composition point and
cohesive `router/*.router.ts` fragments for callable stories. Substantial
module-owned file/registry/capsule mechanics live in `repositories/*-repository.ts`;
they do not move into common unless multiple modules need the same behavior.
