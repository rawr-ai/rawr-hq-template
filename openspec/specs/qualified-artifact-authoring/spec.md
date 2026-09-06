# qualified-artifact-authoring Specification

## Purpose
Define two separately owned Habitat source-authoring projections for first-party
CLI commands and external CLI extensions without recreating an aggregate scaffold
or app-composition owner.
## Requirements
### Requirement: Source creation has exactly two qualified Habitat generator projections

The private `@habitat-ai/plugin-authoring` topic MUST live at
`plugins/cli/topics/authoring` and expose exactly
`habitat cli command create <topic> <name>` and
`habitat cli extension create <id> --destination <path>`. Each command MUST
parse to a distinct request and project exactly one of the two native Nx
generator entrypoints owned by `@habitat-ai/cli` through its generator
mechanics and shared verified-write boundary. Curated agent-plugin creation,
legacy scaffold, app-composition creation, every `rawr`-qualified
source-authoring command, and every alias or compatibility forwarder MUST be
undiscoverable.

#### Scenario: Command discovery is qualified by owner

- **WHEN** Nx-built Oclif discovery, aliases, help, direct command IDs, and
  `@habitat-ai/cli` generator registration are enumerated
- **THEN** only the two qualified Habitat create commands from
  `@habitat-ai/plugin-authoring` and their exact `@habitat-ai/cli` command and
  extension generator projections appear
- **AND** no agent-plugin creator, aggregate factory, or compatibility forwarder
  appears

### Requirement: Per-kind creators cannot become an aggregate factory

`@habitat-ai/plugin-authoring` MUST keep the two commands' raw argument
parsing, normalization, and request projection in separate per-kind modules.
`@habitat-ai/cli` MUST own two independent native Nx generator entrypoints
whose schemas, identity types, validation, templates, and domain decisions do
not dispatch between output kinds. Shared generator mechanics MUST accept only
an already-verified destination root and qualified relative-path/byte plan
constructed by one generator. They MAY enforce containment, canonicalize
qualified paths, compare exact bytes, and stage one complete native Nx write plan,
but MUST NOT accept or validate a raw product identifier, accept an output-kind
selector, choose a template family, infer an authority, install an output, or
import one per-kind generator from the other.

#### Scenario: Aggregate dispatch is absent

- **WHEN** command flags, request types, generator schemas, shared helpers, and
  module imports are inspected for cross-kind `mode`, `kind`, or `type` dispatch
- **THEN** no reachable aggregate factory or sibling per-kind dependency exists
- **AND** each `@habitat-ai/plugin-authoring` projection reaches only its named
  `@habitat-ai/cli` Nx generator entrypoint plus kind-agnostic qualified
  write-plan primitives

### Requirement: Official command creation is Habitat-workspace authoring

`habitat cli command create` MUST project the native command generator
entrypoint owned by `@habitat-ai/cli`. That generator MUST verify exact Habitat
repository and owning Nx project identity, accept one safe topic and command
name, and author one official Habitat command source, behavior test, and explicit
membership in its existing Nx-owned topic. Preserve that Nx project's identity;
required native Args/Flags and command metadata belong in the authored source.
The ordinary build and Oclif manifest generator materialize discovery from that
membership; the source creator MUST NOT hand-edit generated manifest rows or
create a replacement Nx project.
Generated output MUST use the one Habitat command contract. The generator MUST
reject downstream product, Marketplace, and foreign repositories, paths outside
the verified Habitat root, and any request that would create manifest/project
drift. It MUST NOT install, update, or select a CLI version.

#### Scenario: Foreign repository cannot receive official command code

- **WHEN** official command creation is pointed at an external content or
  downstream product repository
- **THEN** repository and Nx-project verification reject before every planned
  write
- **AND** no Habitat command, manifest row, test, executable ancestry, or CLI
  installation state is added there

### Requirement: External extension creation is portable outside Nx

`habitat cli extension create` MUST project the native extension generator
entrypoint owned by `@habitat-ai/cli` while its working directory is a foreign
directory with no Habitat or Nx workspace. The generator MUST require one
explicit destination and produce a self-contained genuine external Oclif
extension package with no workspace-relative runtime dependency. It MUST NOT
call Oclif extension mutation, load generated code, or claim activation.

#### Scenario: Foreign-directory extension creation succeeds

- **WHEN** the installed Habitat CLI runs from a fresh foreign directory with
  isolated HOME/XDG roots, no Nx files, and an explicit empty destination
- **THEN** the extension package builds and its declared command tests pass from
  its own package contract
- **AND** Oclif installed state, external content, provider state, and app
  runtime state remain unchanged

#### Scenario: Extension collision blocks before write

- **WHEN** any planned extension path already contains divergent bytes
- **THEN** the operation rejects before the first write without installing,
  linking, or mutating Oclif state

### Requirement: Authoring plans are deterministic, collision-safe, and idempotent

Each generator MUST compute and validate its complete deterministic ordered
write plan before staging the first change in the native Nx Tree. Exact existing
bytes converge without writes. Divergent output, stale registration preimages,
and unsafe existing paths reject before staging. An intentional registration
update MUST carry its exact inspected preimage rather than overwrite arbitrary
existing bytes. Planning, validation or generator failure before native flush
MUST publish no planned source or registration change; native dry-run MUST also
publish nothing.

Native Nx owns publication. Its filesystem flush is sequential, not a multi-file
transaction: an I/O failure after publication starts MAY leave a written prefix.
The operation MUST propagate that failure and MUST NOT claim convergence,
complete authored output, rollback or zero mutation. No custom filesystem
transaction engine is required. A successful result identifies only complete
source/registration output after native publication; a failure never presents a
partial prefix as an accepted result. Shared mechanics MUST remain kind-agnostic
and MUST NOT install or activate output.

#### Scenario: Identical creation repeat changes nothing

- **WHEN** a qualified create command repeats with exact output already present
- **THEN** it reports convergence with unchanged bytes, metadata, workspace
  membership, CLI installation, and adjacent authorities

#### Scenario: Partial publication remains truthful

- **WHEN** a filesystem change or I/O failure interrupts native flush after the
  first path of a fully staged multi-path plan was published
- **THEN** the native operation fails, even if a written prefix remains
- **AND** it claims neither complete output nor rollback and does not accept
  that prefix as a successful partial result

#### Scenario: First publication failure remains truthful

- **WHEN** planning, validation or generator staging fails before native flush
- **THEN** the operation fails with no planned output published
- **AND** native dry-run also leaves source and registration bytes unchanged

### Requirement: Source authoring cannot install, compose, or synchronize output

The two qualified Habitat generator projections MUST NOT install or link an
extension, select or generate an app projection, edit app composition,
build/package/sync agent content, mutate a provider, select a channel, restart a
process, install or update the Habitat CLI, or invoke another product
application's mutation API. Results identify source paths and registration
changes only and cannot claim runtime availability.

#### Scenario: Mutation boundaries remain zero

- **WHEN** both generators run with adjacent mutation capabilities trapped
- **THEN** every trapped counter remains zero and only the qualified source and
  registration plan may be published by native Nx

### Requirement: Legacy scaffold semantics are absent

Active code, help, docs, tests, manifests, and architecture inventories MUST NOT
expose `rawr plugins scaffold`, any `rawr` source-authoring command,
`habitat agent plugins create`, their command IDs, generic output-kind flags, or
guidance routing source creation through the mixed plugin aggregate. The mixed
factory, obsolete scaffold/factory tests, and every factory-specific
import/export/help/tool-registry entry MUST be absent. No mixed scaffold or
factory implementation may be copied wholesale, wrapped, forwarded, or retained
as dormant active source.

#### Scenario: Semantic absence finds no route back

- **WHEN** active command code, help, docs, manifests, Nx graph inputs, and
  imports are scanned
- **THEN** no legacy scaffold producer, agent-plugin creator, alias, wrapper,
  forwarding example, mixed factory, obsolete positive test/export, or aggregate
  dispatch remains reachable
- **AND** each retained source-authoring capability resolves to exactly one
  qualified Habitat Nx generator owner
