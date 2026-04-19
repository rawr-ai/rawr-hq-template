# `service/shared/`

Cross-module, service-internal HQ Ops primitives live here.

## Rules

- Keep module-owned config, repo-state, journal, and security behavior inside the owning module directory.
- Promote to `service/shared/` only when multiple modules need the exact same primitive.
- Keep concrete runtime implementations outside `src/service/**`; app/plugin layers provide concrete resources through the service boundary.
- Keep `ports/resources.ts` limited to primitive resource capability shapes, not high-level behavior ports such as config stores, repo-state stores, journal stores, or security runtimes.
- Keep shared errors focused on reusable cross-module boundary/internal error seams. Module-specific errors stay module-local.

## Current Shared Files

- `errors.ts`: reserved shared ORPC boundary-error location.
- `internal-errors.ts`: shared internal-only unexpected-error helper location.
- `ports/resources.ts`: primitive resource port bundle consumed by all HQ Ops modules.
