## ADDED Requirements

### Requirement: `rawr` is a private Oclif application

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

#### Scenario: Application publication metadata is inspected
- **WHEN** the `rawr` application and its internal workspace projects are
  inspected
- **THEN** every project is private and absent from Nx Release
- **AND** `@habitat-ai/sdk` and `@habitat-ai/cli` remain the only supported
  public artifacts in the current Nx Release group

### Requirement: Nx and Oclif own their native build relationships

Nx project targets MUST own CLI build and generated Oclif manifests with
explicit inputs, outputs, and project dependencies. Top-level
`nx.json#release` MUST NOT include the `rawr` application or its internal
services, resources, plugins, or support packages. No route may introduce a
RAWR-owned selector or retained local version store.

#### Scenario: Application build is inspected
- **WHEN** one clean source revision produces the Oclif application through Nx
- **THEN** generated command metadata and command discovery verify
- **AND** `rawr` adds no package cohort, private archive canonicalizer, per-file
  envelope, or metadata rewrite

#### Scenario: Runtime compatibility is not proven
- **WHEN** surviving first-party commands still require Bun runtime APIs
- **THEN** the `rawr` application remains private
- **AND** this change does not create a custom runtime manager, release group,
  or whole-application bundle

### Requirement: Application diagnostics report ordinary state

Application diagnostics MUST use standard application and Oclif concepts. They MAY
report application version, source revision, executable path, Oclif
data/config/cache directories, loaded core and external plugins, and provider
command reachability. They MUST NOT make a controller digest, release-store
path, selector, or per-file verification envelope an operational prerequisite.

#### Scenario: Private application is healthy
- **WHEN** diagnostics run from an exact Nx-built Template revision
- **THEN** they report the application and Oclif state without reading or
  repairing an obsolete controller store

### Requirement: Workspace dependency closure is truthful

The private application's declared runtime dependency graph MUST exclude known
app-server, workflow, async-runtime, and Inngest-only projects unless a
CLI-owned import requires them. Internal workspace packages MUST remain private.
The application MUST achieve the declared boundary through correct package and
project metadata, not a release filter or manifest rewrite.

#### Scenario: Shared SDK declares a server-only runtime
- **WHEN** a shared package declaration would pull an otherwise unreachable
  server, workflow, or Inngest runtime into the private application graph
- **THEN** validation fails until the package boundary or dependency metadata is
  corrected
- **AND** no release filter silently removes the dependency

#### Scenario: Shared dependency metadata changes
- **WHEN** CLI composition changes `@habitat-ai/rawr-hq-sdk` dependency or export
  boundaries
- **THEN** the legitimate server project passes its typecheck and owning
  behavior tests before the package change is accepted
