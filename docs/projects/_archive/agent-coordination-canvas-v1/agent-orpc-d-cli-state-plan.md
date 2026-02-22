# Agent D Plan - CLI + State Cutover (S04/S05)

## Objective

Cut CLI coordination commands and state consumers to ORPC procedures.

## Scope

1. Replace CLI coordination transport helper.
2. Update all `workflow coord` command implementations.
3. Replace `/rawr/state` fetch consumer in mounts host path.

## Constraints

- Maintain existing command output contracts.
- Keep module-serving route behavior unchanged.
