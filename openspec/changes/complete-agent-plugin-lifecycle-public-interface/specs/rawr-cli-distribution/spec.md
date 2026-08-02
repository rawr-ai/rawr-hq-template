## ADDED Requirements

### Requirement: RAWR is a conventional Oclif application

RAWR HQ-Template MUST build one Oclif CLI application through Nx. The
application MUST expose the `rawr` binary through its ordinary entrypoint and
MUST declare every first-party command plugin through Oclif configuration. The
application MUST NOT require a controller selector, private release store,
per-file runtime envelope, Personal repository, or worktree identity.

#### Scenario: Nx and Oclif command discovery agree
- **WHEN** the exact revision is built and invoked through its Nx-owned Oclif
  targets
- **THEN** generated and live discovery expose the same first-party command IDs
  and topics
- **AND** neither reads a controller selector to dispatch

#### Scenario: Public distribution is requested
- **WHEN** a later change proposes an installable RAWR application
- **THEN** it selects an ordinary Oclif distribution independently
- **AND** it does not publish RAWR internal workspace projects as products

### Requirement: Nx and Oclif own their native build relationships

Nx project targets MUST own CLI build and generated Oclif manifests with
explicit inputs, outputs, and project dependencies. Top-level
`nx.json#release` MUST NOT include the RAWR application or its internal
services, resources, plugins, or support packages. No route may introduce a
RAWR-owned selector or retained local version store.

#### Scenario: Application build is inspected
- **WHEN** one clean source revision produces the Oclif application through Nx
- **THEN** generated command metadata and command discovery verify
- **AND** RAWR adds no package cohort, private archive canonicalizer, per-file
  envelope, or metadata rewrite

#### Scenario: Runtime compatibility is not proven
- **WHEN** surviving first-party commands still require Bun runtime APIs
- **THEN** a later distribution decision remains open or fails closed
- **AND** this change does not create a custom runtime manager, release group,
  or whole-application bundle

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

### Requirement: Workspace dependency closure is truthful

The CLI project's declared runtime dependency graph MUST exclude known
app-server, workflow, async-runtime, and Inngest-only projects unless a
CLI-owned import requires them. Internal workspace packages MUST remain private.
The application MUST achieve the declared boundary through correct package and
project metadata, not a release filter or manifest rewrite.

#### Scenario: Shared SDK declares a server-only runtime
- **WHEN** a shared package declaration would pull an otherwise unreachable
  server, workflow, or Inngest runtime into the CLI package
- **THEN** validation fails until the package boundary or dependency metadata is
  corrected
- **AND** no release filter silently removes the dependency

#### Scenario: Shared dependency metadata changes
- **WHEN** CLI composition changes `@habitat-ai/rawr-hq-sdk` dependency or export
  boundaries
- **THEN** the legitimate server project passes its typecheck and owning
  behavior tests before the package change is accepted
