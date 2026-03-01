# ORPC Error Standard Reset Plan (`example-todo`)

## Summary

- Use actionable ORPC boundary errors only.
- Return expected business states as values inside the package boundary.
- Throw ORPC boundary errors directly in procedures.
- Do not keep a standing mapping layer pattern for translating domain exceptions.
- Allow unexpected internal failures to bubble as non-defined/internal errors.

## Scope

- In scope:
  - `docs/projects/orpc-ingest-domain-packages/{guidance.md,DECISIONS.md,examples.md}`
  - `packages/example-todo/*`
- Out of scope:
  - unrelated packages and stacks.

## Implementation Steps

1. Lock docs posture:
   - add guidance entry for actionable boundary errors and value-based expected states.
   - add decision entry superseding exception-mapping posture.
   - align examples doc with no-standing-mapper model.
2. Refactor `example-todo`:
   - remove expected-state domain exception classes from active flow.
   - repositories return values for expected states (`null`, `exists`) and throw only unexpected internals.
   - procedures throw caller-actionable ORPC errors directly from returned state.
   - remove typed `DATABASE_ERROR` from boundary contract for this example.
3. Update tests:
   - keep actionable error assertions.
   - replace typed database error assertion with non-defined internal failure behavior.
4. Validate:
   - typecheck, test, build for `packages/example-todo`.

## Acceptance Criteria

- `example-todo` routers no longer perform repetitive domain-exception-to-ORPC translation.
- Actionable boundary errors remain typed and explicit per procedure.
- Unexpected infra failures are not exposed as typed DB boundary errors by default.
- Package checks pass (`typecheck`, `test`, `build`).
