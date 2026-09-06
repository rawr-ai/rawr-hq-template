## MODIFIED Requirements

### Requirement: Packaging module remains isolated behind one qualified procedure

The lifecycle service's `packaging` module MUST own deterministic rendering and
the explicit output only. Its module middleware MAY project the shared ready
release-derivation and output capabilities its handler consumes. It MUST NOT
read mutable workspace bytes, import provider adapters, expose a generic
filesystem layout, mutate Oclif state, issue channel selection, write external
content records, or participate in app composition. Its only operator
reachability is exactly `habitat agent plugins package`, which invokes the typed
procedure once through the final Habitat agent-plugin topic.

#### Scenario: Package command cannot become another lifecycle path

- **WHEN** `habitat agent plugins package` dispatch and non-output ports are
  instrumented
- **THEN** exactly one typed packaging procedure runs and no adjacent authority
  changes

### Requirement: Deterministic selected-content packaging

The Habitat lifecycle owner's packaging request MUST accept one explicit
external-content locator bound to one immutable Git selection, one closed member
or complete-set selection, one versioned package format, and one explicit output
path. The handler MUST use the same ready release-derivation capability as
provider planning and package only its closed in-memory result. It MUST NOT
accept an artifact reference, mutable snapshot, source file path, or retained
projection root. Canonical package bytes and digest MUST depend only on the
derived content and format protocol, with canonical entry order, paths, modes,
metadata, and archive timestamps. The external content locator is observation
input only and MUST NOT enter package identity or bytes.

#### Scenario: Environmental variation preserves package identity

- **WHEN** the same selected Git objects are packaged from different cwd values,
  checkout paths, traversal orders, and mtimes
- **THEN** package bytes and digest are identical
- **AND** the output contains no absolute source, worktree, external-content,
  or Habitat implementation path

#### Scenario: Selected content or format changes

- **WHEN** an admitted content byte or versioned format protocol changes
- **THEN** the package digest changes and the prior output is not relabeled
