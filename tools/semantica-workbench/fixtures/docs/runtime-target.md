# Runtime Target

The fixture runtime authority is `@example/runtime-context`.

`apps/example` must start through the reviewed fixture runtime path. Legacy startup paths are transitional and should be treated as migration debt.

## Gates

The `phase-2:gate:u00:contract` gate verifies that legacy cutover authority is not reintroduced.
