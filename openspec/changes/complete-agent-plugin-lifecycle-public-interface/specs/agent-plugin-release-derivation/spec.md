## ADDED Requirements

### Requirement: Reviewed Git selection is the immutable content input

Canonical lifecycle MUST accept one explicit Personal content locator and one
reviewed channel record. It MUST verify repository identity, selected commit and
tree, reachability, clean fixed-record bytes, and release-input digest, then read
payload only from exact immutable Git objects. It MUST NOT import Personal code,
read mutable worktree payload, infer a newer release input, or publish a local
release/set artifact.

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

### Requirement: Noncanonical operations use an exact explicit Git selection

Check, build, package, and test operations that do not use `current-main` MUST
require one explicit repository identity, absolute locator, commit, tree, and
release-input digest. Targeted operations MUST also name a nonempty closed member
selection. These operations MAY derive and inspect the named content but MUST NOT
select a channel or authorize retirement of omitted members. No operation may
read mutable payload bytes from the worktree.

#### Scenario: Explicit targeted selection is exact but non-authorizing
- **WHEN** a targeted test names a verified commit/tree/release input and member
  subset
- **THEN** only that subset is derived for the disposable test
- **AND** omitted members receive no cleanup or channel meaning

#### Scenario: Explicit selection disagrees with Git objects
- **WHEN** repository identity, commit, tree, release input, or selected member
  content differs
- **THEN** the operation rejects before package output, provider materialization,
  or native mutation

### Requirement: One ready capability derives closed release state in memory

The releases module MUST own and implement one ready service-level derivation
capability that derives a closed release model, complete membership, unique
skill/distribution ownership, canonical release-set identity, native marketplace
source, and declared provider-visible files in memory from selected Git objects. Packaging and providers
MUST consume that capability rather than import a releases handler or recreate
derivation. Digests MAY verify invocation-local deterministic values but MUST
NOT enter channel authority, address a local store, or become lookup handles.
Failed closure MUST leave no durable lifecycle output.

#### Scenario: Membership or ownership conflicts
- **WHEN** a selected member is missing/extra or a skill, alias, or provider
  identity has multiple owners
- **THEN** derivation returns one deterministic bounded conflict result and no
  provider package is materialized

#### Scenario: Equivalent selected Git content is derived again
- **WHEN** the same selected commit/tree/release input is evaluated by a later
  invocation
- **THEN** the same semantic release identity and declared native content are derived without
  reading or writing a local release store

### Requirement: Native marketplace sources preserve owner-correct lifetime

Status MUST compare in-memory derived identity with live native state without
materializing provider package bytes. Canonical sync MUST give the native
provider an immutable Git marketplace source at the selected Personal revision;
the provider owns any clone or cache below its explicit home. A disposable test
MAY expose the selected Git bytes through an owner-created temporary marketplace
only when the temporary source and disposable provider home share one bounded
lifetime. No Template-owned persistent projection root may participate.

#### Scenario: Converged status and sync are read-only
- **WHEN** live provider state already matches the selected native content
- **THEN** status and sync perform zero filesystem mutation and native mutating
  commands

#### Scenario: Canonical mutation uses native Git distribution
- **WHEN** canonical sync must install or refresh a selected member
- **THEN** it passes the selected Personal repository identity and immutable
  revision through the provider's native marketplace command, verifies the
  provider-owned snapshot and visible state, and creates no Template-owned
  marketplace tree

#### Scenario: Disposable local source shares the target lifetime
- **WHEN** a not-yet-published exact selection is tested through a local native
  marketplace
- **THEN** the source remains valid for the entire disposable-home test and both
  are retired together after final observation

#### Scenario: Temporary cleanup candidate is unsafe
- **WHEN** the bounded disposable root fails exact temp-parent, owner-prefix,
  directory/non-symlink, or realpath-containment checks
- **THEN** cleanup refuses without recursive removal or mutation of any provider,
  repository, or unrelated path
