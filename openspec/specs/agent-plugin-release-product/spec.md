# agent-plugin-release-product Specification

## Purpose
Define provider-neutral releases and complete release sets derived
deterministically from exact Git-selected content without a persistent release
store.
## Requirements
### Requirement: Canonical provider-neutral release identity

The system MUST define closed versioned `AgentPluginRelease` and release-input
schemas whose TypeBox parsers reject unknown fields and path-unsafe values and
whose canonical serialization is independent of checkout path, traversal order,
map insertion order, mtime, and ambient process state. Digests MUST be computed
over digest-free canonical bodies and carried in separately validated envelopes.
Release input identity MUST cover declared membership, ownership, vendor, lock,
provenance, and declarative quality-policy values while excluding selected
content bytes and records that select an already-derived identity. The exact
selected Git commit and tree close those bytes. A release input MUST NOT persist
`skillInventory`, a payload or per-file manifest, payload or per-file digests,
file path/mode/length rows, or a completeness witness. `AgentPluginRelease`
MUST bind content authority, repository identity, selected commit/tree,
release-input digest, curated plugin ID and aliases, the payload manifest and
digest derived from every selected file below that member root,
vendor/curation provenance, schema protocol, builder protocol, and release
digest. It MUST NOT contain an artifact-store digest or local storage handle.

#### Scenario: Equivalent inputs have one identity
- **WHEN** equivalent selected Git inputs are read through different absolute
  locators with permuted traversal/declaration order and different mtimes
- **THEN** canonical serialization produces identical release-input, payload,
  and release digests
- **AND** neither locator path nor ambient process state appears in release
  identity

#### Scenario: Content and declarations affect their owning identities
- **WHEN** one selected content byte changes without changing membership,
  ownership, provenance, locks, or declarative quality policy
- **THEN** canonical release-input bytes and `ReleaseInputDigest` remain
  unchanged
- **AND** the selected tree plus each applicable payload, release, and
  release-set identity changes
- **WHEN** a release-input declaration changes
- **THEN** `ReleaseInputDigest` and every resulting identity that binds it
  change

#### Scenario: Selection records do not rewrite derived identity
- **WHEN** only the reviewed current-main record changes without changing its
  selected source content
- **THEN** canonical release-input and release payload digests remain unchanged
- **AND** the record cannot substitute bytes or mint another release identity

#### Scenario: Unknown and unsafe schema values fail closed
- **WHEN** a release input or release envelope contains an unknown field,
  absolute payload path, traversal, malformed identity, or self-referential
  digest claim
- **THEN** parsing rejects before canonical bytes or a trusted digest return

### Requirement: Closed-world release-set identity

The system MUST define one closed versioned in-memory `AgentPluginReleaseSet` as
the complete desired-content model. It MUST bind one content authority,
repository identity, selected commit/tree, release-input digest, canonical
ordered member IDs and release digests, complete skill/distribution ownership,
schema/builder protocols, and set digest. Construction MUST verify that supplied
members exactly equal the member declarations in the selected input, bind those
exact releases through one ordered plugin-ID/release-digest list, share one
authority, and remain within the protocol byte bounds. That ordered member list
is the complete-set witness; the set MUST NOT carry a second member or content
graph. A targeted subset MUST NOT claim completeness or authorize retirement of
omitted members.

#### Scenario: Complete derivation returns one closed set
- **WHEN** exact selected Git objects contain the complete valid membership
- **THEN** derivation returns one canonically ordered release set whose ownership
  index covers every member, skill, alias, and provider-facing identity
- **AND** no persistent set artifact is written

#### Scenario: Mixed source authority is rejected
- **WHEN** proposed members differ in authority, repository identity, selected
  commit/tree, or release-input digest
- **THEN** set derivation rejects before provider package materialization

#### Scenario: Omitted expected member rejects completeness
- **WHEN** a complete derivation omits one expected member or supplies an extra
  undeclared member
- **THEN** it reports the deterministic missing/extra identities and returns no
  complete set

#### Scenario: Targeted selection has no omission authority
- **WHEN** one member or a proper subset is selected for a targeted test
- **THEN** it remains explicitly targeted and omitted members receive no
  retirement or convergence meaning

### Requirement: Complete and unique distribution ownership

Release derivation MUST reject duplicate curated plugin IDs, skill identities,
ambiguous aliases, provider-facing IDs, missing declared owners, toolkit
packages, toolkit `agent-pack` content, and composition aliases before provider
package materialization. Rejection MUST report every claimant deterministically;
name, path, equal bytes, traversal order, or a fallback owner cannot resolve it.

#### Scenario: Conflicting ownership fails as one deterministic result
- **WHEN** selected input contains multiple claimants or a missing owner
- **THEN** derivation reports every conflict in canonical order and materializes
  no provider package

#### Scenario: Toolkit and composition units cannot become releases
- **WHEN** a CLI toolkit, toolkit-derived `agent-pack`, or composition alias is
  presented as a provider-facing member
- **THEN** derivation rejects it without assigning another distribution owner

### Requirement: Pure release authority boundary

Release schemas, canonicalizers, ownership validation, and digest functions MUST
be pure logic owned by the Habitat agent-plugin lifecycle service. They MUST NOT
discover Git state, read a provider home, mutate an output, inspect Oclif state,
select app composition, authorize lifecycle selection, or import executable code
from an external content repository. A ready Git reader MAY accept an explicit
external content repository locator solely to verify and read selected immutable
objects before passing canonical data to the pure model. The locator is not
release, package, provider, channel, or skill identity and does not authorize
repository or symlink synchronization.

#### Scenario: External content checkout is data rather than executable authority

- **WHEN** an external content workspace contains misleading Habitat-like
  runtime files
- **THEN** only exact selected Git data enters pure release functions
- **AND** no external executable module, adapter, renderer, or command loads

#### Scenario: Selected Git objects become unavailable

- **WHEN** the explicit repository locator cannot supply the reviewed commit,
  tree, release input, or payload objects
- **THEN** derivation returns a selection rejection before package
  materialization
- **AND** it does not fall back to mutable worktree bytes or retained local
  copies

### Requirement: Release lifecycle activates only through qualified procedures

Release derivation MUST remain owned by the lifecycle `releases` module and
become operator-reachable only through `habitat agent plugins check`. Packaging
and providers MAY consume its ready service-level derivation capability without
making release procedures or module internals reachable. The retained typed
`check|package|status|sync|test|vendors update` procedures MUST be projected
only at their exact `habitat agent plugins` commands through the final
app-selected Habitat topic. Export, undo, source creation, direct module-router
imports, runtime scans, aliases, aggregate projections, compatibility fallbacks,
and external content executable code MUST remain absent.

#### Scenario: Qualified activation does not add another owner

- **WHEN** Nx-built Oclif discovery and dispatch are inspected
- **THEN** each qualified `habitat agent plugins` command invokes exactly its
  lifecycle-service procedure
- **AND** no aggregate, external Oclif extension, app composition, artifact
  store, or external content implementation becomes an alternate path

### Requirement: Digest identities have exact non-circular preimages

The release protocol MUST define distinct opaque `ReleaseInputDigest`,
`PayloadDigest`, `ReleaseDigest`, and `ReleaseSetDigest` brands with exact
digest-free canonical preimages. `ReleaseSetDigest` MUST cover content
authority/provenance, release-input identity, the ownership index, and each
ordered member's plugin ID and `ReleaseDigest`. Every digest is a deterministic
verification value; none addresses a local store, selects a package path, or
serves as a lookup handle. Brands MUST NOT be assignable across domains, and no
digest field may enter its own direct or transitive preimage.

#### Scenario: Digest brands cannot be substituted
- **WHEN** a valid digest from one domain is supplied in another digest domain
- **THEN** parsing or type-negative compilation rejects it before derivation or
  provider access

#### Scenario: Derived values verify exact selected content
- **WHEN** any release body field, payload entry, path, normalized mode, or byte
  changes
- **THEN** the applicable payload, release, and release-set verification values
  change without publishing or looking up a local artifact
