# Guidance

## What This Document Is

- `guidance.md` captures current implementation posture and defaults.
- It can evolve as examples mature.
- Hard architectural locks belong in `DECISIONS.md`.
- Example progression and invariant/axis framing belong in `examples.md`.

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

- procedures declare `.errors(...)` explicitly and throw only caller-actionable boundary errors.

This keeps external behavior predictable while still allowing neverthrow in the specific internal places where it earns its complexity.

## Guidance #3 (2026-03-01)

### Question
What is the simplest robust error model for our router-client-only domain packages?

### Guidance
Use boundary-actionable errors only.

- Procedures declare and throw only caller-actionable ORPC errors.
- Expected business states inside the boundary should be modeled as values (`null`, `exists`, result objects), not thrown domain exception classes.
- Do not keep a standing domain-exception-to-ORPC mapping layer pattern.
- Unexpected infra/runtime failures should bubble as non-defined/internal failures and be debugged through logs/traces.

For this example posture:

- keep typed boundary errors for domain-relevant states (validation/not found/conflict),
- do not expose `DATABASE_ERROR` as a default typed boundary contract.

neverthrow note:

- neverthrow remains available when composition/recovery is genuinely useful,
- the current `example-todo` baseline does not require it and should stay simple.
