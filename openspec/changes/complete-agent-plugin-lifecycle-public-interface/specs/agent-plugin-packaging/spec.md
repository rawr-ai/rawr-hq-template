## RENAMED Requirements

- FROM: `### Requirement: Deterministic artifact-backed packaging`
- TO: `### Requirement: Deterministic selected-content packaging`

## MODIFIED Requirements

### Requirement: Deterministic selected-content packaging

The Template-owned packaging request MUST accept one explicit immutable Git
selection, one closed member or complete-set selection, one versioned package
format, and one explicit output path. The handler MUST use the same ready release
derivation capability as provider planning and package only its closed in-memory
result. It MUST NOT accept an artifact reference, mutable snapshot, source file
path, or retained projection root. Canonical package bytes and digest MUST depend
only on the derived content and format protocol, with canonical entry order,
paths, modes, metadata, and archive timestamps.

#### Scenario: Environmental variation preserves package identity
- **WHEN** the same selected Git objects are packaged from different cwd values,
  checkout paths, traversal orders, and mtimes
- **THEN** package bytes and digest are identical
- **AND** the output contains no absolute source, worktree, or Template path

#### Scenario: Selected content or format changes
- **WHEN** an admitted content byte or versioned format protocol changes
- **THEN** the package digest changes and the prior output is not relabeled

### Requirement: Explicit output is the only packaging state

Packaging MUST write only the explicit output file through an owner-created
same-parent temporary regular file and atomic replacement after byte
verification. It MUST create no release store, ledger, receipt, channel record,
undo state, or hidden lifecycle state. If an existing regular output already has
the exact package digest, packaging MUST report convergence without rewriting
bytes or metadata. A symlink, directory, special file, or output requiring
recursive deletion MUST reject without mutation. Cleanup may unlink only the
current operation's exact same-parent temporary file after verifying that it is
a non-symlink regular file.

#### Scenario: Repeated package output is read-only
- **WHEN** the explicit regular output already contains the exact package bytes
- **THEN** packaging verifies and reports convergence with zero writes

#### Scenario: Unsafe output object is preserved
- **WHEN** the output is a symlink, directory, special file, or would require
  recursive cleanup
- **THEN** packaging rejects and preserves the object, its target, and siblings

### Requirement: Cowork is package-only

The `cowork` format MUST produce a deterministic ZIP package and MUST NOT model
Cowork as an agent provider. It MUST create no provider home, native installation,
enablement, sync/status result, receipt, destination ledger, marketplace
registration, convergence claim, or cleanup authority.

#### Scenario: Cowork ZIP has no provider side effects
- **WHEN** selected content is packaged with the versioned `cowork` format
- **THEN** packaging reports only the explicit ZIP path, format protocol,
  package digest, and selected source identity
- **AND** every provider, Oclif, channel, and lifecycle-state mutation counter is
  zero

### Requirement: Packaging results are closed and truthful

Packaging MUST return exactly `RejectedBeforeOutputMutation`,
`ReadOnlyConverged`, `OutputReplacedVerified`, or `OutputUnsettled`. Only
`OutputUnsettled` may report that atomic replacement occurred without successful
final verification. Rejection cannot claim mutation, convergence reports zero
writes, and verified replacement binds the final package digest.

#### Scenario: Post-replacement verification fails
- **WHEN** atomic output replacement succeeds but final verification fails
- **THEN** packaging returns `OutputUnsettled` with the expected digest and exact
  verification issue without claiming convergence or rollback

### Requirement: Packaging module remains isolated behind one qualified procedure

The lifecycle service's `packaging` module MUST own deterministic rendering and
the explicit output only. Its module middleware MAY project the shared ready
release-derivation and output capabilities its handler consumes. It MUST NOT
read mutable workspace bytes, import provider adapters, expose a generic
filesystem layout, mutate Oclif state, issue channel selection, write Personal
records, or participate in app composition. Its only operator reachability is
`rawr agent plugins package`, which invokes the typed procedure once.

#### Scenario: Package command cannot become another lifecycle path
- **WHEN** command dispatch and non-output ports are instrumented
- **THEN** exactly one typed packaging procedure runs and no adjacent authority
  changes

