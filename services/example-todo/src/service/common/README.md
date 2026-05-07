# `service/common/`

Cross-module common, **domain-internal** constructs live here.

## Rules

- Keep module-owned constructs (schemas, errors, helpers) inside the module directory by default.
- Promote to `service/common/` only when **2+ modules** need the exact same construct.
- Keep `service/common/` focused on **domain semantics** (errors, schemas/types, invariants), not adapter glue.
- If common infrastructure helpers ever become necessary, reassess the package boundary first instead of defaulting to a `service/adapters/` layer.
- Keep `service/common/` free of dependency wiring. Wiring belongs in:
- `service/base.ts` (declarative service definition + policy vocabulary)
- `service/impl.ts` (required service middleware extensions + package-wide assembly)
- `service/router.ts` (service router attach)
- `service/modules/*/module.ts` (module-local composition/injection)
