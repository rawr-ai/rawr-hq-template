# HQ Ops Shared Service Anchors

`services/hq-ops` follows the `example-todo` service shell exactly, including a
shared seam for reusable boundary and internal helpers.

U02 is reservation-only, so this directory stays intentionally thin:

- `errors.ts` reserves the shared ORPC boundary-error location.
- `internal-errors.ts` reserves the shared internal-only error helper location.

Later slices can add real shared service semantics here without changing the
package topology.
