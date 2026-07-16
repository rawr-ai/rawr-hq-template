# Interim Plugin Lifecycle Package

## Scope

- Applies to `plugins/cli/plugins/**` during lifecycle normalization.

## Authority

This package is migration evidence, not the target lifecycle owner. Do not add new
aggregate sync, official link/relink, external Oclif mutation, curated release,
provider reconciliation, export, compatibility, or fallback behavior here.

- External Oclif extension lifecycle belongs to Template root commands under
  `rawr plugins ...` and delegates mutation solely to the native manager.
- Curated agent-plugin lifecycle belongs to `rawr agent plugins ...` and the
  generic Template services introduced by its owning container.
- App composition remains useful but owns no lifecycle state.

C1 removes official link/relink and native mutation reachability. C5 owns deletion
of the remaining mixed aggregate after qualified capabilities have explicit owners.

## Verification

Run the package's Nx test/lint targets plus the controller architecture guards.
Any remaining command must be read-only, ontology-valid, and unable to mutate Oclif,
controller selection, curated release, provider, or export state.
