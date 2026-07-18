# agent-plugin-packaging Specification

## Purpose
TBD - created by archiving change establish-agent-plugin-release-product. Update Purpose after archive.
## Requirements
### Requirement: Deterministic artifact-backed packaging
The Template-owned packaging request MUST accept exactly one closed artifact reference for a release or release set, one versioned package format, and one explicit output path. The application MUST invoke its consumer-owned read-only `ArtifactReader` internally and trust only the returned ownership-transferred immutable snapshot, never a request-supplied snapshot or mutable path. The reader's sole production adapter belongs to the build and artifact owner. Canonical package bytes and digest MUST depend only on that snapshot and the format protocol, with canonical entry order, paths, modes, metadata, and archive timestamps. Source checkout path, source availability, filesystem traversal order, input and output mtimes, ambient cwd, prior output, and research-vault availability MUST NOT affect the result.

#### Scenario: Environmental variation preserves package identity
- **WHEN** the same verified artifact is packaged from different cwd values after source removal with permuted traversal, different mtimes, and different prior output metadata
- **THEN** package bytes and package digest are identical
- **AND** the output contains no absolute source, worktree, research, or Template implementation path

#### Scenario: Artifact or format change changes identity
- **WHEN** an admitted artifact byte or the versioned format protocol changes
- **THEN** the package digest changes
- **AND** the prior package is never relabeled as the new output

### Requirement: Explicit output is the only packaging state
Packaging MUST write only the exact explicit output file through an owner-created private same-parent regular file and atomic path-entry replacement after byte verification. It MUST create no artifact-store entry, ledger, provider receipt, marketplace identity, channel record, undo capsule, or hidden state. If the existing output already has the exact package digest, packaging MUST report convergence without rewriting bytes or metadata. Replacement MUST accept only a canonical non-aliased regular file with link count one, capture and immediately revalidate its identity, and never open or truncate the live target. A symlink, hardlink, directory, special file, path alias, changed captured object, or nonmatching unsupported object MUST block; packaging MUST never use recursive removal.

Failed-operation temporary cleanup MUST immediately revalidate the output's canonical same parent, an owner-created direct-child private prefix, the exact current-operation captured file identity, `lstat` non-symlink regular-file type, link count one, and realpath containment before unlinking that one file. A substituted, aliased, hardlinked, wrong-prefix, foreign, or nonregular temporary candidate MUST be preserved and cleanup failure reported. Packaging MUST NOT recursively remove any temporary, output, or parent path.

#### Scenario: Repeated package output is read-only
- **WHEN** the explicit output already contains the exact deterministic package bytes
- **THEN** packaging verifies and reports convergence
- **AND** performs zero output, metadata, temp-file, artifact, ledger, provider, receipt, channel, or undo writes

#### Scenario: Unsafe output object is preserved
- **WHEN** the explicit output resolves through a symlink or alias, is hardlinked, names a directory or special file, changes after capture, or would require recursive cleanup
- **THEN** packaging rejects before mutation and preserves the object and its target
- **AND** no parent, sibling, source-workspace, artifact, provider, or destination state changes

#### Scenario: Substituted package temp is preserved
- **WHEN** the current operation's private temporary file is replaced before cleanup by a symlink, hardlink, directory, foreign regular file, wrong-prefix child, or outside-resolving alias
- **THEN** cleanup blocks before unlink and reports the exact failure without following or replacing the candidate
- **AND** no output, parent, sibling, alias target, or hidden state is removed

### Requirement: Cowork is package-only
The `cowork` format MUST produce a deterministic ZIP package and MUST NOT model Cowork as an agent provider. Packaging Cowork MUST create no home, native installation, enablement, capability preflight, sync or status result, retirement receipt, destination ledger, marketplace registration, convergence claim, or cleanup authority.

#### Scenario: Cowork ZIP has no provider side effects
- **WHEN** a verified release is packaged with the versioned `cowork` format
- **THEN** packaging reports only the explicit ZIP path, format protocol, package digest, and artifact provenance
- **AND** every provider, receipt, destination-ledger, Oclif, controller, channel, and undo mutation counter remains zero

### Requirement: Packaging results are closed and truthful
Packaging MUST return exactly `RejectedBeforeOutputMutation`, `ReadOnlyConverged`, `OutputReplacedVerified`, or `OutputUnsettled`. Only `OutputUnsettled` may report that atomic replacement occurred without successful final verification, and it MUST preserve primary and temporary-cleanup failures separately. Rejection MUST not claim output mutation, convergence MUST report zero writes, and verified replacement MUST bind the final package digest. Optional flags that can claim multiple states at once MUST be unrepresentable.

#### Scenario: Post-rename verification failure is unsettled
- **WHEN** atomic output replacement succeeds but final output verification fails
- **THEN** packaging returns `OutputUnsettled` with the expected package digest and exact verification failure
- **AND** it does not claim convergence, provider state, ledger state, or undo coverage

### Requirement: Packaging module remains isolated behind one qualified procedure
The lifecycle service's `packaging` module MUST own deterministic package rendering and explicit output only. It MUST NOT read source workspaces to rebuild bytes, import provider adapters, project generic filesystem layouts, mutate Oclif or controller state, issue acceptance, write personal lifecycle records, or participate in app composition. Its only operator reachability MUST be `rawr agent plugins package`, which parses one canonical release or release-set handle and invokes the typed packaging procedure once without a compatibility route.

#### Scenario: Package command cannot become another lifecycle path
- **WHEN** command dispatch and all non-output mutation ports are inspected during qualified packaging
- **THEN** exactly one typed packaging procedure is invoked and no adjacent authority is mutated
- **AND** only the explicit package output may change after every input and output guard passes

