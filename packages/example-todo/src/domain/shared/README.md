# `domain/shared/`

Cross-module shared, **domain-internal** constructs live here.

## Rules

- Keep module-owned constructs (schemas, errors, helpers) inside the module directory by default.
- Promote to `domain/shared/` only when **2+ modules** need the exact same construct.
- Do not import from `boundary/` anywhere under `domain/`.
- Keep `domain/shared/` free of execution logic and dependency wiring. Those belong in:
  - `domain/setup.ts` (domain kit instance), or
  - `domain/modules/*/setup.ts` (module-local injection).

