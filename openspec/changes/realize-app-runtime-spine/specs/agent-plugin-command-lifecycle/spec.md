## RENAMED Requirements

- FROM: `### Requirement: Existing check command exposes closed repository and channel modes`
- TO: `### Requirement: Check command exposes closed repository and channel modes`

## MODIFIED Requirements

### Requirement: Curated lifecycle has one exact qualified command ontology

The private `@habitat-ai/plugin-agent-plugins` topic MUST expose curated
lifecycle only as `habitat agent plugins check`,
`habitat agent plugins package`, `habitat agent plugins status`,
`habitat agent plugins sync`, `habitat agent plugins test`, and
`habitat agent plugins vendors update`. Every command and nested topic MUST be
a declared first-party command of that topic. `habitat agent plugins create`,
bare `habitat plugins`, every `rawr`-qualified route, every other lifecycle
command, and any alias or forwarding route MUST NOT expose curated lifecycle
behavior.

#### Scenario: Discovery separates external and curated plugins

- **WHEN** command, topic, alias, hidden-alias, help, and manifest discovery are
  enumerated
- **THEN** exactly those six commands appear below `habitat agent plugins`
  through `@habitat-ai/plugin-agent-plugins`
- **AND** bare `habitat plugins` is distributed by `@habitat-ai/cli` directly
  from `@oclif/plugin-plugins`, contains no curated lifecycle behavior, and
  every curated create, Rawr-qualified, retired, and curated-lifecycle alias
  route is absent everywhere

### Requirement: Each service-backed command invokes one typed service procedure

Each retained lifecycle command MUST perform command-local value adaptation and
invoke exactly one `@habitat-ai/agent-plugin-lifecycle-service` client
procedure. CLI and topic code MUST NOT import a module-local router handler or
repository, resolve lifecycle prerequisites, sequence plan/apply/verify/retire
across modules, aggregate procedure results, persist another
ledger/receipt/capsule, or introduce another lifecycle service. No source-create,
export, or undo exception remains, and provider operations emit no capsule.

#### Scenario: Dispatch cannot become an aggregate

- **WHEN** every retained command runs with all lifecycle procedures and
  module-local router handlers instrumented
- **THEN** exactly its declared typed procedure is called once
- **AND** every direct module-local router handler, foreign service,
  app-composition, web-mounting, Oclif-mutation, and compatibility port records
  zero calls

### Requirement: CLI installation and content repository identities remain separate

Curated lifecycle MUST own no durable local data root. The installed
`@habitat-ai/cli` artifact MAY use its ordinary host-provided Oclif application
directories for its own extension and configuration state. The Habitat loader
MUST load executable command sources only from the selected application source
bundle, and the Habitat app MUST select `@habitat-ai/plugin-agent-plugins` as
topic membership for that bundle. Content and channel records MUST be read only
through an explicit absolute versioned Git locator; provider homes and package outputs
MUST remain explicit procedure inputs. A repository path MUST NOT select an
installed CLI package version, application topic, controller, provider home,
channel, executable implementation, or Oclif application directory, and MUST
NOT become a repository or symlink synchronization channel. External content
repository executable modules MUST never load.

#### Scenario: Misleading external-content runtime files have no authority

- **WHEN** an explicit content workspace contains command, service, adapter,
  renderer, or CLI-like executable files
- **THEN** lifecycle reads only the admitted versioned data interface through
  fixed Git objects
- **AND** Oclif dispatch and implementation imports remain inside the installed
  `@habitat-ai/cli` artifact and the app-selected
  `@habitat-ai/plugin-agent-plugins` topic

### Requirement: Check command exposes closed repository and channel modes

`habitat agent plugins check` MUST parse exactly one of release eligibility,
staged/clean repository validation, release-input body/envelope
canonicalization, release-input staged refresh, current-main v3 direct-record
encode/validate, or current-main selection validation before acquiring any Git,
filesystem, provider, Oclif, app, or runtime port. Each selected mode MUST invoke
exactly one typed `@habitat-ai/agent-plugin-lifecycle-service` procedure once.

Each request MUST carry every authority field required by its selected mode.
The lifecycle service MUST NOT infer candidate status or channel authority from
an explicit content-workspace path.

#### Scenario: Mixed check domains reject before ports

- **WHEN** flags from two modes, an unknown/retired mode, surplus fields, or an
  incomplete selector are supplied
- **THEN** CLI parsing rejects with zero service-procedure and resource-port
  calls

#### Scenario: One selected mode invokes one procedure

- **WHEN** a valid request for any check domain executes with every procedure
  instrumented
- **THEN** exactly its declared procedure is called once and every other
  procedure records zero calls

### Requirement: Current-main codec is pure and canonical

The current-main v3 encode/validate mode MUST return identical canonical record
bytes, protocol, and byte length for one semantically identical body. It MUST
reject unknown fields, malformed or noncanonical bytes, missing or duplicate
Marketplace-owned external-content selection fields, inconsistent Git
identities, and oversized input. The pure codec MUST take no dependency
argument; the procedure MUST NOT call, read, or write a Git, provider,
package-output, or other lifecycle port.

#### Scenario: Equivalent record bodies encode

- **WHEN** two semantically identical valid bodies differ only in input object
  insertion order
- **THEN** encoding returns the same direct canonical record bytes and v3
  protocol

#### Scenario: Invalid record is supplied

- **WHEN** a record is malformed, noncanonical, surplus, duplicated, or binds
  inconsistent Git identities
- **THEN** validation rejects with every exterior port cold
