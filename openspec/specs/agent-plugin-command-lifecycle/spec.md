# agent-plugin-command-lifecycle Specification

## Purpose
Define the exact Oclif command ontology and closed request/result boundaries
that separate external extension management from curated agent-plugin lifecycle.
## Requirements
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

### Requirement: CLI parsing preserves closed procedure requests

Native Oclif parsing MUST reject unknown, legacy, retired, cross-mode and
incomplete flags; unsupported scalar modes/providers; relative path scalars;
and ambiguous scalar selectors before live Habitat resource acquisition.
It MUST preserve the selected procedure's discriminated request rather than
an optional-field bag. Bounded invocation-local stdin is native input admission.
Cold app/provider declarations and native Command construction are permitted.

The lifecycle service MUST own aggregate domain validation, including target
uniqueness, canonical-home relationships, member cardinality and uniqueness,
disposable-root containment, and Git authority consistency. Such validation
MUST precede every domain resource operation. Acquiring inert process-owned
capability factories is not a domain resource operation. CLI code MUST NOT
duplicate these policies or introduce a second aggregate validator.

#### Scenario: Foreign mode fields reject without calls

- **WHEN** a request supplies unknown or retired flags, cross-mode fields, an
  unsupported provider, a relative home scalar, or incomplete native selectors
- **THEN** native parsing refuses before managed process startup and every
  service procedure and resource operation records zero calls

#### Scenario: Aggregate domain input is invalid

- **WHEN** a structurally admitted request contains duplicate canonical targets,
  duplicate members, or a target outside its disposable test root
- **THEN** its one typed service procedure returns the domain refusal before
  any Git, filesystem, package-output or native provider operation

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

### Requirement: Status and convergence results remain truthful

Qualified status MUST preserve every canonical repository/provider
classification and exit `0` only when every selected target is `Converged`, `1`
for a valid observed non-converged state, and `2` for invalid input or authority
binding. A converged canonical operation MAY inspect live state but MUST NOT
publish lifecycle state, write receipts/ledgers/capsules/outputs, invoke a
native mutating command, or change lifecycle-owned managed content or
configuration. Provider-native observation residue outside the lifecycle
mutation surface MAY change without becoming lifecycle state.

#### Scenario: Repeated convergence stutters
- **WHEN** a qualified canonical operation is repeated after its exact desired
  state is already visible and verified
- **THEN** it returns the same converged identity after live reads
- **AND** every lifecycle write and native mutating-command counter is zero and
  the managed semantic inventory is unchanged

#### Scenario: Selection failure and provider drift use distinct exits
- **WHEN** status observes `Blocked` with a selection issue versus a valid selected target
  whose live provider state is merely drifted
- **THEN** authority-invalid selection exits `2` while observed drift exits `1`

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

### Requirement: Release-input authoring is pure and canonical

The release-input-record mode MUST consume one nonempty bounded stdin byte
stream. A body request MUST produce one newline-terminated canonical envelope;
an envelope request MUST preserve the exact validated canonical bytes. Invalid
UTF-8, malformed JSON, noncanonical envelopes, digest mismatch, or invalid body
shape MUST return releases-owned typed issues. The CLI MUST NOT write a record
or select a repository path. The one procedure MUST perform no lifecycle
resource operation; it may run within the normally acquired managed process.

#### Scenario: Body and envelope reach one pure procedure

- **WHEN** an operator supplies either a valid body or the resulting canonical
  envelope through stdin
- **THEN** exactly one releases-owned procedure returns identical canonical
  envelope bytes and digest
- **AND** human output reproduces those bytes without reserialization or an
  additional newline

#### Scenario: Stdin refusal precedes service construction

- **WHEN** stdin is a terminal, empty, or exceeds the release-input protocol
  ceiling, or fields from another check mode are supplied
- **THEN** native parsing rejects before managed process startup and every
  lifecycle resource and procedure records zero calls

### Requirement: Release-input refresh derives one closed review candidate

Release-input-refresh mode MUST require one nonempty duplicate-free explicit
member list. It MUST observe the complete staged index while materializing only
the exact selected member roots and optional canonical release-input path. It
MUST reject noncanonical, missing, or undeclared immediate plugin children,
mixed opening/closing Git bindings, and invalid existing release-input bytes.
An existing record for another content authority MUST refuse rather than seed a
new record.
It MUST derive each selected member's payload from every regular staged file
under that root and validate skill ownership only from exact
`skills/<identity>/SKILL.md` paths. Toolkit `agent-pack/**` content and a root
`plugin.yaml` composition marker MUST reject rather than enter a member.
The handler MUST own one flat frozen copy of the validated workspace policy and
member list before its first await. Before payload construction it MUST enforce
the protocol entry count, per-member logical byte total, and complete-set
logical byte total. Each selected path counts its full logical bytes even when
multiple paths reference the same Git object.

A valid existing record MUST contribute surviving explicit vendor, curation,
alias, provider-identity, lock, and quality-policy declarations.
Absent existing state MUST contribute empty ancillary declarations; the
lifecycle service MUST NOT infer them from package metadata, frontmatter, legacy
tooling, installed providers, or repository paths. The operation MUST emit the
unique canonical release-input bytes and MUST NOT write, stage, build, publish,
package, export, mutate providers, or create a store, receipt, or ledger.

#### Scenario: Fresh closed member set produces a review candidate
- **WHEN** an explicit member list exactly equals the canonical immediate
  children and no release-input record is staged
- **THEN** one releases-owned procedure emits `ReleaseInputCandidateReady` with
  canonical bytes declaring those selected members and their explicit
  repository-owned metadata
- **AND** every ancillary array is empty unless supplied by valid existing
  repository-owned state
- **AND** no selected payload byte, file row, payload digest, skill inventory,
  or completeness witness is copied into the release input

#### Scenario: Exact refresh repeat is read-only
- **WHEN** the emitted canonical bytes are staged with unchanged selected roots
- **THEN** the same operation emits byte-identical
  `ReleaseInputReadOnlyConverged`
- **AND** every Git, package, provider, governance,
  and filesystem mutation counter remains zero

#### Scenario: Membership or source is not closed
- **WHEN** a canonical immediate child is absent from the explicit list, a
  declared member root is absent, or the staged binding changes during reads
- **THEN** the operation refuses with typed repository or `SourceChanged`
  diagnostics and emits no candidate

### Requirement: Repository validation has exact staged and clean modes

Staged mode MUST observe one exact Git index/blob snapshot without authoring Git
objects and MUST revalidate that binding before success. Clean mode MUST bind one
exact repository/ref/commit/tree and read only immutable Git objects below the
member roots declared by the release input. Both modes MUST derive and validate
the complete payload, skill ownership, and forbidden-unit policy from those
selected bytes. Staged mode MUST NOT authorize build or release.

#### Scenario: Index changes during staged validation
- **WHEN** a failpoint changes the index after opening observation and before
  final revalidation
- **THEN** the result is `SourceChanged` without implicit retry or mixed
  diagnostics
- **AND** every repository and lifecycle write counter remains zero

#### Scenario: Clean identity or declared input differs
- **WHEN** repository, ref, commit, tree, release input, or a declared consumed
  blob differs from the request
- **THEN** validation rejects before durable output

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

### Requirement: Check command exposes closed repository and channel modes

`habitat agent plugins check` MUST parse exactly one of release eligibility,
staged/clean repository validation, release-input body/envelope
canonicalization, release-input staged refresh, current-main v3 direct-record
encode/validate, or current-main selection validation before live Habitat
resource acquisition or domain Git, filesystem or provider operations. Cold
app/provider declarations and native Oclif discovery, Command construction and
the one native parse are permitted; bounded invocation-local stdin admission is
part of parsing, not lifecycle I/O. Each selected mode MUST invoke
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
