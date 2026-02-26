# Guidance

## Guidance #1 (2026-02-25)

### Question
Where should ORPC error definitions live when we need procedure-level precision?

### Guidance
Use a hybrid placement model based on actual sharing:

- Service-level errors for failures shared across modules (for example generic database/not-found surfaces).
- Module-level errors for failures shared within one module.
- Procedure-local errors for truly local behavior.

Each procedure should still declare only the errors it can throw via `.errors(...)`. Shared definitions can be reused, but declaration remains procedure-specific.

## Guidance #2 (2026-02-26)

### Question
How should we use neverthrow after Decision #3 if procedure-level ORPC errors are the boundary contract?

### Guidance
Use neverthrow as an internal tool, not a package-wide repository API requirement.

Use it where it clearly helps:

- multi-step internal composition (`andThen`, `combine`) where failures stay inside module/service logic,
- conditional recovery/fallback logic (`orElse`, `match`) before crossing the ORPC procedure boundary,
- pure function pipelines where explicit `Result` flow improves readability.

Do not use it by default where it does not add leverage. Repository methods can return `Promise<T>` and throw typed domain errors when that is clearer.

At the ORPC boundary, keep one rule:

- procedures declare `.errors(...)` explicitly and map known domain failures to those declared ORPC errors.

This keeps external behavior predictable while still allowing neverthrow in the specific internal places where it earns its complexity.
