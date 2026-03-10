# `service/shared/`

Cross-module shared, **domain-internal** constructs live here.

## Rules

- Keep module-owned constructs (schemas, errors, helpers) inside the module directory by default.
- Promote to `service/shared/` only when **2+ modules** need the exact same construct.
- Keep `service/shared/` focused on **domain semantics** (errors, schemas/types, invariants), not adapter glue.
- Put shared adapter/infrastructure helpers in `service/adapters/` instead.
- Keep `service/shared/` free of dependency wiring. Wiring belongs in:
- `service/base.ts` (declarative service definition + policy vocabulary)
- `service/impl.ts` (required service telemetry + package-wide assembly)
- `service/router.ts` (service router attach)
- `service/modules/*/setup.ts` (module-local injection)
