## ADDED Requirements

### Requirement: RAWR is a conventional Oclif CLI package

RAWR HQ-Template MUST build one versioned Oclif CLI package through Nx. The
package MUST expose the `rawr` binary through its ordinary entrypoint and MUST
declare every first-party command plugin through Oclif configuration. Source and
installed invocation MUST use the same Oclif application and command ontology.
The package MUST NOT require a controller selector, private release store,
per-file runtime envelope, source checkout, Personal repository, or worktree
identity.

#### Scenario: Source and installed command discovery agree
- **WHEN** the exact revision is invoked through the Nx development target and
  through a package installed in a disposable prefix
- **THEN** both expose the same first-party command IDs and topics
- **AND** neither reads a controller selector or source checkout to dispatch

#### Scenario: Source checkout is absent after installation
- **WHEN** the installed package is invoked after its build checkout is made
  unavailable
- **THEN** ordinary help, version, external plugin management, and read-only
  agent-plugin status remain usable from installed package dependencies

### Requirement: Nx and Oclif own their native release relationships

Nx project targets MUST own CLI build, generated Oclif manifest, and packaging
with explicit inputs, outputs, and project dependencies. Top-level
`nx.json#release` MUST declare the coherent runtime project group; `nx release`
owns version/changelog and `nx release publish` owns registry publication when a
package registry is selected. Oclif's pack command MUST own standalone archive
construction when standalone distribution is selected. No route may introduce
a RAWR-owned selector or retained local version store.

#### Scenario: Released package is inspected
- **WHEN** one clean source revision produces a release candidate through the
  selected standard package path
- **THEN** package inventory, generated command metadata, installed command
  discovery, ordinary checksum, and repository release provenance verify
- **AND** RAWR adds no private archive canonicalizer, per-file envelope, or
  metadata rewrite

#### Scenario: Runtime compatibility is not proven
- **WHEN** surviving first-party commands still require Bun runtime APIs
- **THEN** release uses a registry-published Oclif package whose executable
  requires installed Bun, or fails closed
- **AND** it does not claim Oclif Node standalone compatibility or create a
  custom runtime manager or whole-application Bun-compiled Oclif bundle

### Requirement: CLI diagnostics report standard installed state

Installed CLI diagnostics MUST use standard installed-package concepts. They MAY
report package version, executable path, release
provenance, Oclif data/config/cache directories, loaded core and external
plugins, and provider command reachability. They MUST NOT make a controller
digest, release-store path, selector, or per-file verification envelope an
operational prerequisite.

#### Scenario: Conventional package is healthy
- **WHEN** diagnostics run from a valid installed package
- **THEN** they report the package and Oclif state without reading or repairing
  an obsolete controller store

### Requirement: Published dependency closure is truthful

The CLI project's declared runtime dependency graph MUST exclude known
app-server, workflow, async-runtime, and Inngest-only projects unless a
CLI-owned import requires them. Standard transitive package contents need not be
globally minimal. The release MUST achieve the declared boundary through correct
package and project metadata, not a post-pack dependency filter or manifest
rewrite.

#### Scenario: Shared SDK declares a server-only runtime
- **WHEN** a shared package declaration would pull an otherwise unreachable
  server, workflow, or Inngest runtime into the CLI package
- **THEN** packaging fails until the package boundary or dependency metadata is
  corrected
- **AND** no release filter silently removes the dependency after build

#### Scenario: Shared dependency metadata changes
- **WHEN** CLI packaging changes `@rawr/hq-sdk` dependency or export boundaries
- **THEN** the legitimate server project passes its typecheck and owning
  behavior tests before the package change is accepted
