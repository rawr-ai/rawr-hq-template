## RENAMED Requirements

- FROM: `### Requirement: Source creation has exactly three qualified command owners (B04, B05, B31)`
- TO: `### Requirement: Source creation has exactly two qualified Habitat generator projections`

- FROM: `### Requirement: Per-kind creators cannot become an aggregate factory (B05, B31)`
- TO: `### Requirement: Per-kind creators cannot become an aggregate factory`

- FROM: `### Requirement: Official command creation is Template-workspace authoring (B01, B31)`
- TO: `### Requirement: Official command creation is Habitat-workspace authoring`

- FROM: `### Requirement: External extension creation is portable outside Nx (B31)`
- TO: `### Requirement: External extension creation is portable outside Nx`

- FROM: `### Requirement: Authoring plans are deterministic, collision-safe, and idempotent (B21, B31)`
- TO: `### Requirement: Authoring plans are deterministic, collision-safe, and idempotent`

- FROM: `### Requirement: Source authoring cannot install, compose, or synchronize output (B05, B31)`
- TO: `### Requirement: Source authoring cannot install, compose, or synchronize output`

- FROM: `### Requirement: Legacy scaffold semantics are absent (B04, B30, B31, I16)`
- TO: `### Requirement: Legacy scaffold semantics are absent`

## MODIFIED Requirements

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
qualified paths, compare exact bytes, and execute one atomic exact write plan,
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
name, and author one official Habitat command source, behavior test, Nx
registration, and required Oclif manifest metadata inside that workspace.
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
write plan before the first mutation. The verified-write boundary MUST apply the
plan atomically: exact existing bytes converge without writes, divergent or
unsafe existing paths reject without mutation, and any planning or application
failure leaves no planned output or registration change. Results MUST be closed
to dry-run, read-only convergence, complete authored output, or refusal before
mutation; a partial-output result or partially published workspace MUST NOT
exist. Shared execution MUST remain kind-agnostic and MUST NOT install or
activate output.

#### Scenario: Identical creation repeat changes nothing

- **WHEN** a qualified create command repeats with exact output already present
- **THEN** it reports convergence with unchanged bytes, metadata, workspace
  membership, CLI installation, and adjacent authorities

#### Scenario: Partial publication remains truthful

- **WHEN** an application failpoint interrupts a fully staged multi-path plan
  before atomic publication completes
- **THEN** the operation refuses with no planned path or registration published
- **AND** it does not expose a partial result or claim complete output

#### Scenario: First publication failure remains truthful

- **WHEN** planning, validation, or atomic application fails before output can
  commit
- **THEN** the operation refuses with zero output mutation and no written subset

### Requirement: Source authoring cannot install, compose, or synchronize output

The two qualified Habitat generator projections MUST NOT install or link an
extension, select or generate an app projection, edit app composition,
build/package/sync agent content, mutate a provider, select a channel, restart a
process, install or update the Habitat CLI, or invoke another product
application's mutation API. Results identify source paths and registration
changes only and cannot claim runtime availability.

#### Scenario: Mutation boundaries remain zero

- **WHEN** both generators run with adjacent mutation capabilities trapped
- **THEN** every trapped counter remains zero and only the exact atomic source
  and registration write plan may mutate

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

## REMOVED Requirements

### Requirement: Curated agent-plugin creation authors content only (B05, B31, I02, I17)

**Reason**: Curated agent-plugin source belongs to the independent Marketplace
content repository, and Habitat retains no generic source-creation command for
it. `rawr agent plugins create` has no Habitat owner and must not be renamed,
aliased, or folded into lifecycle.
