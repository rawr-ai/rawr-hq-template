## MODIFIED Requirements

### Requirement: Reviewed Git selection is the immutable content input

Canonical lifecycle MUST accept one explicit Marketplace content locator and
one reviewed channel record. It MUST verify repository identity, selected
commit and tree, reachability, clean fixed-record bytes, and release-input
digest, then read payload only from exact immutable Git objects. It MUST NOT
import Marketplace code, read mutable worktree payload, infer a newer release
input, or publish a local release/set artifact.

#### Scenario: Mutable checkout differs from selected Git objects

- **WHEN** worktree files differ while the selected commit and tree remain
  available
- **THEN** derivation uses only the selected immutable Git objects or rejects
  dirty eligibility before provider access

#### Scenario: Source identity is wrong

- **WHEN** repository identity, reachability, commit, tree, or release-input
  digest differs from the reviewed record
- **THEN** derivation returns a selection rejection before provider preparation
  or native calls

### Requirement: Native marketplace sources preserve owner-correct lifetime

Status MUST compare in-memory derived identity with live native state without
materializing provider package bytes. Canonical sync MUST give the native
provider an immutable Git marketplace source at the selected Marketplace
revision; the provider owns any clone or cache below its explicit home. A
disposable test MAY expose the selected Git bytes through one reserved
marketplace child below its explicit disposable root. The caller MUST give each
live test call exclusive use of that root. Sequential calls MAY reuse the root
after the preceding call settles; concurrent calls MUST use distinct roots. The
reserved child MAY remain stable until the caller removes the disposable root.
It is derived test material, not Habitat channel, repository, or provider
authority. No Habitat-owned persistent projection root may participate.

#### Scenario: Converged status and sync are read-only

- **WHEN** live provider state already matches the selected native content
- **THEN** status and sync dispatch zero lifecycle-owned filesystem writes and
  zero native mutating commands
- **AND** the managed semantic inventory is unchanged even if a provider-native
  read updates observation residue outside lifecycle-owned state

#### Scenario: Canonical mutation uses native Git distribution

- **WHEN** canonical sync must install or refresh a selected member
- **THEN** it passes the selected Marketplace repository identity and immutable
  revision through the provider's native marketplace command, verifies the
  provider-owned snapshot and visible state, and creates no Habitat-owned
  marketplace tree

#### Scenario: Disposable local source shares the caller-root lifetime

- **WHEN** a not-yet-published exact selection is tested through a local native
  marketplace
- **THEN** the source remains valid for the entire disposable-home test and
  both initial and final provider observation
- **AND** a later call can inspect or refresh the same path until the caller
  removes its disposable root

#### Scenario: Provider tests overlap

- **WHEN** two provider-test calls are live at the same time
- **THEN** their callers supply distinct disposable roots and reserved children
- **AND** reuse of one root begins only after its preceding call settles

#### Scenario: Disposable materialization candidate is unsafe

- **WHEN** the bounded disposable parent or reserved child fails canonical
  directory, direct-containment, non-alias, or provider-home-disjointness
  admission
- **THEN** materialization refuses without mutation of any provider,
  repository, caller-owned home, or unrelated path
