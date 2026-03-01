# Guidance

## What This Document Is

- `guidance.md` captures current implementation posture and defaults.
- It can evolve as examples mature.
- Hard architectural locks belong in `DECISIONS.md`.
- Example progression and invariant/axis framing belong in `examples.md`.

## Boundary Error Posture (Current Default)

### Router-Client Boundary Rule

- Domain packages are consumed through ORPC router clients.
- ORPC procedure `.errors(...)` declarations are the boundary contract callers rely on.
- Procedures should throw only caller-actionable boundary errors.

### What We Surface vs Hide

- Surface: validation/not-found/conflict style errors when callers must branch.
- Hide: infra/runtime internals that callers cannot meaningfully action.
- Default for hidden internals: bubble and let ORPC treat them as internal server failures, with logging/traces for diagnosis.

For this posture:

- do not expose `DATABASE_ERROR` as a default typed boundary contract,
- do not maintain a standing domain-catalog-to-ORPC mapping layer.

## Internal Error Taxonomy (Inside The Boundary)

### Expected Business States

- Model expected states as values (`null`, `exists`, result objects), not thrown exception classes.

### Unexpected Internal Faults

- Throw plain internal errors for dependency/runtime failures.
- Optionally throw `UnexpectedInternalError` only when local code detects an invariant break ("this should be impossible").

When to use `UnexpectedInternalError`:

- Use it as an internal marker for invariant violations you want to classify in logs/alerts.
- Do not expose it as a typed ORPC boundary error unless callers should action it (normally they should not).

When plain throws are enough:

- If you are not actively using invariant classification/telemetry, plain internal throws are sufficient.
- Client-visible behavior is the same by default (internal failure at boundary).

## neverthrow Guidance

Use neverthrow as an internal tool, not a package-wide repository API requirement.

Use it where it clearly helps:

- multi-step internal composition (`andThen`, `combine`) where failures stay inside module/service logic,
- conditional recovery/fallback logic (`orElse`, `match`) before crossing the ORPC procedure boundary,
- pure function pipelines where explicit `Result` flow improves readability.

Do not use it by default where it does not add leverage. Repository methods can return `Promise<T>` when that is clearer.

Boundary reminder:

- procedures still declare `.errors(...)` explicitly and throw only caller-actionable boundary errors.

## Error Definition Placement

Use a hybrid placement model based on actual sharing:

- service-level errors for failures shared across modules,
- module-level errors for failures shared within one module,
- procedure-local errors for truly local behavior.

Each procedure still declares only the errors it can throw via `.errors(...)`. Shared definitions can be reused, but declaration remains procedure-specific.
