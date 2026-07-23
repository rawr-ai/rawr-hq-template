## REMOVED Requirements

### Requirement: Read-only explicit source eligibility
**Reason**: Source verification remains product behavior but no longer belongs to
a build-artifact-store capability.
**Migration**: Move exact read-only Git selection to
`agent-plugin-release-derivation`.

### Requirement: Eligible build is commit-aligned and fail-closed
**Reason**: Canonical lifecycle derives an in-memory release model rather than
publishing a durable build artifact.
**Migration**: Read exact immutable Git objects and fail before provider
materialization or native mutation.

### Requirement: C2 proof isolates protected lanes
**Reason**: A phase-specific implementation record is not a lasting product
requirement and still mentions retired export work.
**Migration**: Personal content policy excludes the exact HF01 identities and
paths for this workstream while Template remains content-neutral.

### Requirement: Stable exact artifact storage
**Reason**: A branded persistent local release/set store recreates the rejected
private release system.
**Migration**: Use the reviewed Personal Git selection as immutable input and
derive values in memory.

### Requirement: One production artifact verification boundary
**Reason**: There is no persistent artifact reader or verified snapshot handle.
**Migration**: Surviving packaging and provider projection consume the same
in-memory derived release model through their public service boundary.

### Requirement: Atomic idempotent artifact publication
**Reason**: Canonical lifecycle publishes no local digest-addressed release or
set artifact.
**Migration**: Canonical mutation uses the selected immutable Personal Git
marketplace through provider-native distribution; local marketplace material is
limited to the lifetime of a disposable test home.

### Requirement: Complete-set publication commits last and reports partial output
**Reason**: A complete set is an in-memory closed model, not a multi-object local
publication transaction.
**Migration**: Derivation succeeds only after complete membership and ownership
validation; otherwise no provider materialization occurs.

### Requirement: Pin-aware and ownership-bounded retention
**Reason**: Without a persistent local release store there is no lifecycle
retention planner or deletion authority.
**Migration**: Git owns selected source retention; ordinary package/CI systems
own their own artifacts.

### Requirement: Build results are closed and truthful
**Reason**: Published/incomplete/unsettled artifact variants describe the removed
local publication state machine.
**Migration**: Return closed eligibility/derivation results and bounded issues
from `agent-plugin-release-derivation`.

### Requirement: Mechanical evidence uses the sole immutable artifact home
**Reason**: Disposable tests return inline verification facts and use no custom
evidence store.
**Migration**: Ordinary CI may retain the command result externally.

### Requirement: Evidence publication is no-replace and exact
**Reason**: The custom evidence publisher is removed.
**Migration**: Use ordinary CI artifact/checksum behavior when retention is
desired.

### Requirement: Evidence publication failure does not rewrite target truth
**Reason**: No custom evidence publication occurs.
**Migration**: Return exact target status, applied prefix, and uncertainty inline.

### Requirement: Governed evidence handles participate in retention
**Reason**: Channel selection and canonical sync consume no custom evidence
handle.
**Migration**: Git review selects desired content and native observation reports
installed state.

### Requirement: Release and vendor modules preserve artifact authority
**Reason**: The releases module no longer owns persistent artifact publication,
lookup, or retention.
**Migration**: Releases owns source verification and pure derivation; vendors
owns repository-vendor observation and reviewable authoring.
