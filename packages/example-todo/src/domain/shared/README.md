# `domain/shared/`

Cross-module shared, **domain-internal** constructs live here.

## Rules

- Keep module-owned constructs (schemas, errors, helpers) inside the module directory by default.
- Promote to `domain/shared/` only when **2+ modules** need the exact same construct.
- Keep `domain/shared/` focused on **domain semantics** (errors, schemas/types, invariants), not adapter glue.
- Put shared adapter/infrastructure helpers in `domain/adapters/` instead.
- Keep `domain/shared/` free of dependency wiring. Wiring belongs in:
  - `domain/setup.ts` (domain kit instance),
  - `domain/router.ts` (shipping router chain), or
  - `domain/modules/*/setup.ts` (module-local injection).
