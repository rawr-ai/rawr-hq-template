## REMOVED Requirements

### Requirement: Provider projections consume immutable artifacts only
**Reason**: Native reconciliation now consumes selected content derived directly
from exact reviewed Personal Git objects. A projection renderer and persistent
artifact reader would recreate the rejected local release system.
**Migration**: Derive the closed release model in memory, pass the selected Git
marketplace source to the native provider, and verify declared provider-visible
files from live provider state.

### Requirement: Projection identity covers all provider-visible output
**Reason**: Git commit/tree identity, the release-input digest, member payload
manifests, and content digests already bind desired bytes. A second projection
digest has no independent consumer or authority.
**Migration**: Return bounded native observations and exact confirmed operation
prefixes; do not create a projection identity, storage address, or acceptance
binding.

### Requirement: Semantic capability profiles govern compatibility
**Reason**: No retained projection carries a capability profile or adapter
protocol. Compatibility is an operation-local check of the native capabilities
required by test, status, or sync.
**Migration**: Probe the explicit Codex or Claude session before mutation and
block when that native session lacks an operation-required capability.

### Requirement: Native renderer set is explicit and closed
**Reason**: The corrected flow does not render provider packages. It reconciles
the closed Codex and Claude provider set through their native marketplace and
plugin commands.
**Migration**: Keep provider IDs closed in the TypeBox contract, reject unknown
providers, and provide no export or standalone-skill fallback.

### Requirement: Byte-identical renderer refactors remain compatible
**Reason**: There is no renderer protocol, projection digest, or provider-visible
acceptance binding after direct native reconciliation.
**Migration**: Template implementation changes remain governed by ordinary
release tests; Personal records bind content only.

### Requirement: Projection is deterministic and side-effect free
**Reason**: The standalone projection stage is removed rather than preserved as
an unused pure abstraction.
**Migration**: Keep exact Git selection and desired-state comparison read-only.
Only the native reconciliation handler may invoke provider mutations.

### Requirement: Projection materialization is stable derived state
**Reason**: A stable Template projection root is part of the rejected private
release store and duplicates native provider snapshot/cache ownership.
**Migration**: Canonical sync passes the exact selected Personal Git marketplace
source to the native provider. Disposable tests use an explicit local workspace
and a provider home strictly below an explicit disposable root; no Template
projection is retained.
