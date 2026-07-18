## MODIFIED Requirements

### Requirement: Provider projections consume immutable artifacts only
The projection renderer MUST declare a narrow consumer-owned
`VerifiedReleaseReader` using only artifact-ref and verified-snapshot types from
the pure release domain. It MUST consume release or complete-set snapshots only
through the sole production artifact-reader adapter at the composition root.
The provider service MUST NOT import build, export, packaging, governance, or a
legacy aggregate service. It MUST NOT read a content worktree, source path,
mutable caller buffer, destination ledger, provider receipt, or channel record
as provider-visible content and MUST NOT rebuild a missing or invalid artifact.

#### Scenario: Source checkout is unnecessary
- **WHEN** verified release artifacts remain after the content checkout is
  removed
- **THEN** every selected provider projection renders and verifies identically
  without source access

#### Scenario: Missing artifact blocks without rebuild
- **WHEN** a selected release or set artifact is absent, tampered, or mismatched
- **THEN** projection and deployment return `BLOCKED_SELECTION` with no Git
  content read, build, publication, provider, receipt, or capsule mutation

### Requirement: Projection identity covers all provider-visible output
An `AgentProviderProjection` digest MUST canonically bind provider identity,
renderer protocol, adapter protocol, immutable member/set refs, native package
files and modes, provider metadata, visible plugin/skill/hook identities, and
its semantic capability profile. Home paths, mtimes, traversal order, receipts,
lifecycle authorization records, and operation state MUST be excluded.

#### Scenario: Permutations preserve projection identity
- **WHEN** equivalent immutable inputs differ only by input/traversal order,
  object allocation, or checkout location
- **THEN** canonical projection bytes and digest are identical

#### Scenario: Provider-visible mutation changes identity
- **WHEN** any emitted byte, file mode, native metadata, visible identity,
  renderer protocol, adapter protocol, or capability requirement changes
- **THEN** the projection digest changes and the prior current-main binding
  cannot authorize canonical deployment

### Requirement: Semantic capability profiles govern compatibility
Every projection MUST carry a bounded semantic provider capability predicate and
exact adapter protocol identity covering the native operations and visibility it
needs. Canonical preflight/status MUST verify the live adapter protocol and
evaluate capabilities against the selector-bound predicate. Exact provider
version equality MUST NOT substitute unless the predicate includes it.

#### Scenario: Compatible newer or alternate version proceeds
- **WHEN** an observed provider version differs from evaluation but satisfies
  every selected semantic capability predicate
- **THEN** the target remains compatible

#### Scenario: Adapter protocol differs from selection
- **WHEN** native package bytes remain identical but the live adapter protocol
  differs from the current-main projection binding
- **THEN** status and canonical preflight classify the target incompatible until
  a reviewed current-main record selects the new exact binding

### Requirement: Byte-identical renderer refactors remain compatible
A controller implementation refactor MUST remain compatible when the renderer
and adapter protocols plus selector-bound canonical projection bytes and digest
remain exact. A changed projection or adapter protocol MUST require a newly
reviewed current-main projection binding before canonical convergence.

#### Scenario: Refactor preserves selected digest
- **WHEN** implementation changes under unchanged protocols but canonical
  provider-visible output and capability profile remain byte-identical
- **THEN** the existing current-main projection binding remains valid

#### Scenario: Rendering change requires new selection
- **WHEN** a renderer change alters canonical output or its capability predicate
- **THEN** canonical convergence rejects until reviewed current-main binds the
  new projection digest

### Requirement: Projection materialization is stable derived state
Selected canonical and explicit noncanonical test projection bytes MUST
materialize below a stable Template runtime projection root keyed only by
verified projection digest. Existing materialization MUST be verified before
reuse; a missing entry MUST be reproducible only from verified immutable
artifacts; a converged repeat MUST not rewrite it. Materialization MUST NOT
become release, channel, provider-home, receipt, acceptance, or worktree
identity.

#### Scenario: Stable package source survives worktree removal
- **WHEN** a selector-bound canonical or explicit test projection is
  materialized and all source worktrees disappear
- **THEN** native installation and verification use the digest-addressed stable
  projection bytes without changing their identity

#### Scenario: Existing verified materialization is read-only
- **WHEN** the digest-addressed projection entry already matches canonical bytes
- **THEN** materialization performs verification reads and zero writes or
  metadata churn
