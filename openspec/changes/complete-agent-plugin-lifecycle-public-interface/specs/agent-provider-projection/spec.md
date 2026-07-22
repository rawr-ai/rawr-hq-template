## RENAMED Requirements

- FROM: `### Requirement: Provider projections consume immutable artifacts only`
- TO: `### Requirement: Provider projections consume exact derived release state`
- FROM: `### Requirement: Projection materialization is stable derived state`
- TO: `### Requirement: Projection distribution uses native marketplace ownership`

## MODIFIED Requirements

### Requirement: Provider projections consume exact derived release state

The projection renderer MUST consume only the closed in-memory release state
derived from exact selected Personal Git objects. It MUST NOT accept an
artifact reference, storage handle, mutable caller snapshot, content-worktree
path, destination ledger, provider receipt, or channel record as
provider-visible content. The provider module MUST NOT import build, export,
packaging, governance, a persistent artifact reader, or a legacy aggregate
service.

#### Scenario: Mutable checkout cannot change projection
- **WHEN** mutable worktree bytes differ from the selected immutable Git objects
- **THEN** projection renders from the selected objects or returns
  `BLOCKED_SELECTION`
- **AND** no local artifact lookup, rebuild fallback, or provider mutation occurs

#### Scenario: Selected Git input is unavailable
- **WHEN** the selected commit, tree, release-input blob, or member payload
  cannot be read and verified from the explicit content locator
- **THEN** projection and deployment return `BLOCKED_SELECTION` before native
  package materialization or provider mutation

### Requirement: Projection identity covers all provider-visible output

An `AgentProviderProjection` digest MUST canonically bind provider identity,
renderer protocol, adapter protocol, derived ordered member identities, native
package files and modes, provider metadata, visible plugin/skill/hook
identities, and its semantic capability profile. It is a verification value,
not a local storage address or lookup handle. Home paths, mtimes, traversal
order, receipts, lifecycle authorization records, and operation state MUST be
excluded.

#### Scenario: Permutations preserve projection identity
- **WHEN** equivalent selected Git inputs differ only by traversal order, object
  allocation, or checkout location
- **THEN** canonical projection bytes and digest are identical

#### Scenario: Provider-visible mutation changes identity
- **WHEN** any emitted byte, file mode, native metadata, visible identity,
  renderer protocol, adapter protocol, or capability requirement changes
- **THEN** the invocation's derived projection digest changes without rewriting
  or invalidating the Personal content selector

### Requirement: Semantic capability profiles govern compatibility

Every projection MUST carry a bounded semantic provider capability predicate and
exact adapter protocol identity covering the native operations and visibility it
needs. Canonical preflight/status MUST verify the live adapter protocol and
evaluate capabilities against the currently derived predicate. Exact provider
version equality MUST NOT substitute unless the predicate includes it.

#### Scenario: Compatible newer or alternate version proceeds
- **WHEN** an observed provider version differs from evaluation but satisfies
  every selected semantic capability predicate
- **THEN** the target remains compatible

#### Scenario: Adapter lacks a derived capability
- **WHEN** the live adapter does not satisfy a capability required by the
  currently derived provider projection
- **THEN** status and canonical preflight classify the target incompatible
  without requiring a Personal content-record change

### Requirement: Byte-identical renderer refactors remain compatible

A lifecycle implementation refactor MUST preserve deterministic output for the
same exact selected Git objects under the same renderer and adapter protocols.
Changing Template-owned rendering or adapter behavior MUST be governed by the
Template release and its tests; it MUST NOT require Personal to record a
Template-derived projection identity.

#### Scenario: Refactor preserves selected digest
- **WHEN** implementation changes under unchanged protocols but canonical
  provider-visible output and capability profile remain byte-identical
- **THEN** the invocation derives the same projection identity

#### Scenario: Rendering change remains Template-owned
- **WHEN** a renderer change alters canonical output or its capability predicate
- **THEN** the installed Template release derives and verifies the new projection
  without changing the Personal content selector

### Requirement: Projection is deterministic and side-effect free

Projection construction and verification MUST be pure over one owned in-memory
release model. They MUST perform no Git read, filesystem publication, provider,
receipt, export, Oclif, app-composition, channel, or other state mutation.

#### Scenario: Renderer mutation ports are trapped
- **WHEN** projection success and every validation failure are exercised
- **THEN** no I/O or mutation dependency is called
- **AND** the result depends only on the already-derived release model and
  declared renderer protocol

### Requirement: Projection distribution uses native marketplace ownership

Status MUST compare the in-memory derived projection with live native state
without materializing package bytes. Canonical sync MUST use the provider's
native Git marketplace support at the selected immutable Personal revision;
the provider owns its resulting snapshot or cache below the explicit home. A
local marketplace source is permitted only for a disposable test whose source
and provider home share one operation lifetime. The lifecycle MUST NOT retain,
reuse, or address a Template-owned projection root.

#### Scenario: Converged operation creates no package tree
- **WHEN** the selected projection is already visible in the explicit native home
- **THEN** status and sync perform derivation and native reads only
- **AND** no marketplace registration, package root, stable projection entry, or
  metadata write occurs

#### Scenario: Canonical mutation consumes an immutable Git marketplace
- **WHEN** a native install or same-ID refresh is required for canonical sync
- **THEN** the provider receives the selected Personal Git marketplace source,
  owns the resulting snapshot, and exposes verifiable source revision and plugin
  provenance without a Template projection store

#### Scenario: Disposable local projection is not retained
- **WHEN** a local projection is required to test an exact unpublished selection
- **THEN** its source stays valid through final native observation and is removed
  only with its disposable provider home
