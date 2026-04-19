# Agent Config Sync Shared Service Anchors

`services/agent-config-sync` follows the `example-todo` service shell, with a
strict shared allowlist.

Allowed shared files:

- `errors.ts` for reusable ORPC boundary errors once multiple modules need them.
- `internal-errors.ts` for unexpected internal-only failures.
- `resources.ts` for the service-wide host resource contract.
- `schemas.ts` for public/cross-module sync value objects used by multiple modules.
- `internal/source-scope.ts` because planning and retirement both need identical
  source-scope resolution semantics.

Module-owned behavior does not live here. Planning assessment types belong in
`modules/planning`, execution apply semantics belong in `modules/execution`,
retirement stale-managed behavior belongs in `modules/retirement`, and undo
capsule/apply behavior belongs in `modules/undo`.
