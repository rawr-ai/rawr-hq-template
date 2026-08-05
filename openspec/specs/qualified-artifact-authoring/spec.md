# qualified-artifact-authoring Specification

## Purpose
Define separately owned source-authoring surfaces for curated agent plugins,
first-party CLI commands, and external CLI extensions without recreating an
aggregate scaffold or app-composition owner.
## Requirements
### Requirement: Source creation has exactly three qualified command owners (B04, B05, B31)

The private Template Oclif application MUST expose exactly
`rawr agent plugins create <id> --content-workspace <path>`,
`rawr cli command create <topic> <name>`, and
`rawr cli extension create <id> --destination <path>` for the retained source
output kinds. Each command MUST parse to a distinct request and invoke one
per-kind authoring capability. Legacy scaffold and app-composition creation
commands MUST be undiscoverable.

#### Scenario: Command discovery is qualified by owner
- **WHEN** Nx-built Oclif discovery, aliases, help, and direct command IDs are
  enumerated
- **THEN** only the three qualified create commands appear
- **AND** no aggregate factory or compatibility forwarder appears

### Requirement: Per-kind creators cannot become an aggregate factory (B05, B31)

Official command, external extension, and curated agent-plugin raw argument parsing, normalization, identity types, validation, templates, and domain decisions MUST live in separate per-kind modules. Shared code MUST accept only an already-verified destination root and qualified relative-path/byte plan constructed by one per-kind owner. It MAY enforce containment, canonicalize qualified paths, compare exact bytes, and execute exact write plans, but MUST NOT accept or validate a raw product identifier, accept an output-kind selector, choose a template family, infer an authority, install an output, or import one per-kind module from another.

#### Scenario: Aggregate dispatch is absent

- **WHEN** command flags, request types, shared helpers, and module imports are inspected for cross-kind `mode`, `kind`, or `type` dispatch
- **THEN** no reachable aggregate factory or sibling per-kind dependency exists
- **AND** each command reaches only its named owner plus kind-agnostic qualified write-plan primitives

### Requirement: Official command creation is Template-workspace authoring (B01, B31)

`rawr cli command create` MUST verify exact RAWR HQ-Template repository identity,
accept one safe topic and command name, and author one official command source,
behavior test, and required command metadata inside that workspace. It MUST
reject Personal and foreign repositories and paths outside the verified Template
root. It MUST NOT install, update, or select a CLI version.

#### Scenario: Personal repository cannot receive official command code
- **WHEN** official command creation is pointed at Personal
- **THEN** repository verification rejects before every planned write
- **AND** no Template command, manifest row, test, executable ancestry, or CLI
  installation state is added to Personal

### Requirement: External extension creation is portable outside Nx (B31)

`rawr cli extension create` MUST operate through the exact private Template
application while its working directory is a foreign directory with no RAWR or
Nx workspace. It MUST require one explicit destination and produce a
self-contained genuine external Oclif extension package with no
workspace-relative runtime dependency. It MUST NOT call Oclif extension
mutation, load generated code, or claim activation.

#### Scenario: Foreign-directory extension creation succeeds
- **WHEN** the exact Template application runs from a fresh foreign directory
  with isolated HOME/XDG roots, no Nx files, and an explicit empty destination
- **THEN** the extension package builds and its declared command tests pass from
  its own package contract
- **AND** Oclif installed state, Personal content, provider state, and app
  runtime state remain unchanged

#### Scenario: Extension collision blocks before write
- **WHEN** any planned extension path already contains divergent bytes
- **THEN** the operation rejects before the first write without installing,
  linking, or mutating Oclif state

### Requirement: Curated agent-plugin creation authors content only (B05, B31, I02, I17)

`rawr agent plugins create` MUST use an explicit Personal content workspace only
as a locator and author one canonical curated source skeleton plus declarative
content inputs. It MUST NOT create Template implementation, app source, derived
release state, channel records, provider state, package output, Oclif entries,
CLI installation state, or runtime state.

#### Scenario: Agent-plugin creation has no lifecycle side effect
- **WHEN** a valid curated plugin ID is created in a verified Personal workspace
- **THEN** only the owned curated source and declarative content paths are
  authored
- **AND** every package, sync, provider, Oclif, channel, and runtime mutation
  counter remains zero

#### Scenario: Content path cannot select executable authority
- **WHEN** the content workspace is moved or deleted after source authoring
- **THEN** no CLI command, Template implementation, or runtime identity depends
  on its absolute path

### Requirement: Authoring plans are deterministic, collision-safe, and idempotent (B21, B31)

Each creator MUST compute its complete ordered write plan before the first write
and return one closed result that truthfully distinguishes dry-run, converged,
authored, failed, partial, and rejected outcomes. Exact existing bytes converge
without writes; divergent bytes reject before mutation; a failure reports only
the exact paths actually written. Shared execution MUST remain kind-agnostic and
MUST NOT install or activate output.

#### Scenario: Identical creation repeat changes nothing
- **WHEN** a qualified create command repeats after exact output exists
- **THEN** it reports convergence with unchanged bytes, metadata, workspace
  membership, CLI installation, and adjacent authorities

#### Scenario: Partial publication remains truthful
- **WHEN** a filesystem failure occurs after one or more planned paths are
  written
- **THEN** the result reports only that ordered written subset and does not claim
  complete output

#### Scenario: First publication failure remains truthful
- **WHEN** a filesystem failure occurs before the first planned path completes
- **THEN** the result reports failure with an empty written subset

### Requirement: Source authoring cannot install, compose, or synchronize output (B05, B31)

Qualified create commands MUST NOT install/link an extension, select or generate
an app projection, edit app composition, build/package/sync agent content, mutate a
provider, select a channel, restart a process, install/update the RAWR CLI, or
invoke another product application's mutation API. Results identify source paths
only and cannot claim runtime availability.

#### Scenario: Mutation boundaries remain zero
- **WHEN** all three creators run with adjacent mutation capabilities trapped
- **THEN** every trapped counter remains zero and only the exact source write
  plan may mutate

### Requirement: Legacy scaffold semantics are absent (B04, B30, B31, I16)

Active code, help, docs, tests, manifests, and architecture inventories MUST NOT expose `rawr plugins scaffold`, its command IDs, generic output-kind flags, or guidance routing source creation through the mixed plugin aggregate. After the three qualified replacements exist, the mixed factory, obsolete scaffold/factory tests, and every factory-specific import/export/help/tool-registry entry MUST be deleted. The old implementation MUST NOT be copied wholesale, wrapped, forwarded, or retained as dormant active source.

#### Scenario: Semantic absence finds no route back

- **WHEN** active command code, help, docs, manifests, Nx graph inputs, and imports are scanned
- **THEN** no legacy scaffold producer, alias, wrapper, forwarding example, mixed factory, obsolete positive test/export, or aggregate dispatch remains reachable
- **AND** each retained source-authoring capability resolves to exactly one qualified owner
