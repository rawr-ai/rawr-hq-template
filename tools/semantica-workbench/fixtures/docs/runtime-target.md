# Runtime Target

The canonical runtime authority is `@rawr/runtime-context`.

`apps/server` must start through the canonical server runtime path. Legacy startup paths are transitional and should be treated as migration debt.

## Gates

The `phase-2:gate:u00:contract` gate verifies that legacy cutover authority is not reintroduced.
