# `service/adapters/`

Cross-module **adapter glue** lives here: infrastructure-facing helpers that are shared by multiple modules but are not domain semantics.

This directory is intentionally small and optional. Create files here only when at least **2+ modules** need the same adapter/helper.

## What belongs here

- SQL helpers used by multiple repositories (query builders, transaction wrappers, row-shape helpers).
- Infrastructure mapping utilities that are shared across modules.
- “Glue” code that depends on service ports (from `service/deps.ts`) but is not itself domain behavior.

## What does *not* belong here

- Domain semantics, invariants, and reusable domain types → `service/shared/`
- Module-local repositories/services → `service/modules/<name>/`
- Router composition and middleware chains → `service/router.ts`
