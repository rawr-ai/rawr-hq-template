## MODIFIED Requirements

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
