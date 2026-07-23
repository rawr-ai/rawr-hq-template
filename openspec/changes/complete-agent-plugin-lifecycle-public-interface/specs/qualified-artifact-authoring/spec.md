## RENAMED Requirements

- FROM: `### Requirement: Artifact creation has exactly three qualified command owners (B04, B05, B31)`
- TO: `### Requirement: Source creation has exactly three qualified command owners (B04, B05, B31)`

## MODIFIED Requirements

### Requirement: Source creation has exactly three qualified command owners (B04, B05, B31)

The installed Template Oclif CLI MUST expose exactly
`rawr agent plugins create <id> --content-workspace <path>`,
`rawr cli command create <topic> <name>`, and
`rawr cli extension create <id> --destination <path>` for the retained source
output kinds. Each command MUST parse to a distinct request and invoke one
per-kind authoring capability. Legacy scaffold and app-composition creation
commands MUST be undiscoverable.

#### Scenario: Command discovery is qualified by owner
- **WHEN** installed Oclif discovery, aliases, help, and direct command IDs are
  enumerated
- **THEN** only the three qualified create commands appear
- **AND** no aggregate factory or compatibility forwarder appears

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

`rawr cli extension create` MUST operate from an ordinarily installed Template
CLI in a foreign directory with no RAWR or Nx workspace. It MUST require one
explicit destination and produce a self-contained genuine external Oclif
extension package with no workspace-relative runtime dependency. It MUST NOT
call native Oclif mutation, load generated code, or claim activation.

#### Scenario: Foreign-directory extension creation succeeds
- **WHEN** the installed CLI runs from a fresh foreign directory with isolated
  HOME/XDG roots, no Nx files, and an explicit empty destination
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
