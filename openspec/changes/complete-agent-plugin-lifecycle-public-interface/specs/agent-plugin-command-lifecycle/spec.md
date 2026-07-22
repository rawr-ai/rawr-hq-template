## RENAMED Requirements

- FROM: `### Requirement: Controller and repository identities never collapse`
- TO: `### Requirement: CLI installation and content repository identities remain separate`

## MODIFIED Requirements

### Requirement: Curated lifecycle has one exact qualified command ontology

The installed Template CLI MUST expose curated lifecycle only as
`rawr agent plugins check|create|status vendors|update vendors|build|test|package|sync|status`.
Every command and nested topic MUST be a declared first-party Oclif command. Bare
`rawr plugins`, root `rawr undo`, `rawr agent sync`, retired
`rawr agent plugins retire`, retired `rawr agent plugins attest-promotion`,
retired `rawr agent plugins export`, retired `rawr agent plugins undo`, and any
alias or forwarding route MUST NOT expose curated lifecycle behavior.

#### Scenario: Discovery separates external and curated plugins
- **WHEN** command, topic, alias, hidden-alias, help, and manifest discovery are
  enumerated
- **THEN** the exact qualified curated family appears only below
  `rawr agent plugins`
- **AND** bare `rawr plugins` is owned directly by `@oclif/plugin-plugins`,
  contains no curated lifecycle behavior, and every retired lifecycle command
  is absent everywhere

### Requirement: CLI parsing preserves closed procedure requests

Every lifecycle command MUST reject unknown, legacy, retired, cross-mode,
relative, noncanonical, or ambiguous inputs before constructing a Git,
provider, output, Oclif, app, or runtime port. Retired artifact handles,
destinations, capsules, receipts, and evidence identities MUST reject. Git
selection MUST use a closed procedure-specific locator/commit/tree/channel
shape, and provider selection MUST use only repeatable
`provider=absolute-home` tuples. A parsed request MUST retain the typed
procedure's discriminated union and MUST NOT collapse into an optional-field
bag.

#### Scenario: Foreign mode fields reject without calls
- **WHEN** a command receives a raw digest/path, uppercase or surplus handle,
  legacy agent/source/repair/hosted-governance flag, retired promotion input,
  mixed targeted/canonical selection input, unsupported provider, relative home,
  or duplicate canonical target
- **THEN** parsing exits as invalid input before every observable port call

### Requirement: Each service-backed command invokes one typed service procedure

Each service-backed lifecycle transition command MUST perform command-local
value adaptation and invoke exactly one `@rawr/agent-plugin-lifecycle` client
procedure. CLI code MUST NOT import a module-local router handler or repository,
resolve lifecycle prerequisites, sequence plan/apply/verify/retire across
modules, aggregate procedure results, persist another ledger/receipt/capsule, or
introduce another lifecycle service. The C4 `create` command remains source
authoring. No lifecycle export or undo exception remains, and provider
operations emit no capsule.

#### Scenario: Dispatch cannot become an aggregate
- **WHEN** every command runs with all lifecycle procedures and module-local
  router handlers instrumented
- **THEN** exactly its declared typed procedure is called at most once
- **AND** every direct module-local router handler, foreign service,
  app-composition, web-mounting, Oclif-mutation, and compatibility port records
  zero calls

### Requirement: Status and convergence results remain truthful

Qualified status MUST preserve every canonical repository/provider
classification and exit `0` only when every selected target is `CONVERGED`, `1`
for a valid observed non-converged state, and `2` for invalid input or authority
binding. A converged canonical operation MAY inspect live state but MUST NOT
  publish lifecycle state, write receipts/ledgers/capsules/outputs, invoke
native mutation, or change bytes or metadata.

#### Scenario: Repeated convergence stutters
- **WHEN** a qualified canonical operation is repeated after its exact desired
  state is already visible and verified
- **THEN** it returns the same converged identity after live reads
- **AND** every lifecycle/native mutation counter is zero and tracked bytes and
  mtimes are unchanged

#### Scenario: Selection failure and provider drift use distinct exits
- **WHEN** status observes `BLOCKED_SELECTION` versus a valid selected target
  whose live provider state is merely drifted
- **THEN** authority-invalid selection exits `2` while observed drift exits `1`

### Requirement: CLI installation and content repository identities remain separate

Curated lifecycle MUST own no durable local data root. Oclif MAY use its
ordinary host-provided application directories for its own installed
extension/configuration state. Content and channel records MUST be read only through an
explicit absolute versioned Git locator; provider homes and package outputs
MUST remain explicit procedure inputs. A repository path MUST NOT select a CLI
package version, provider home, channel, executable implementation, or Oclif
application directory. Personal executable modules MUST never load.

#### Scenario: Misleading Personal runtime files have no authority
- **WHEN** an explicit content workspace contains command, service, adapter,
  renderer, or CLI-like executable files
- **THEN** lifecycle reads only the admitted versioned data interface through
  fixed Git objects
- **AND** Oclif dispatch and implementation imports remain inside the ordinarily
  installed Template package

## ADDED Requirements

### Requirement: Existing check command exposes closed repository and channel modes

`rawr agent plugins check` MUST parse exactly one of release eligibility,
staged/clean repository validation, release-input body/envelope
canonicalization, release-input staged refresh, current-main v2 encode/validate,
  or current-main selection validation before acquiring any Git, filesystem,
  provider, Oclif, app, or runtime port. Each selected mode MUST
invoke exactly one typed `@rawr/agent-plugin-lifecycle` procedure once.

The prior protected-lane runtime mode MUST be absent. C6 settlement MUST select
the exact canonical personal-main workspace/release input and MUST NOT supply or
read an external pending research candidate. The generic lifecycle service MUST NOT
infer candidate status from an explicit content-workspace path.

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

### Requirement: Release-input authoring is pure and canonical

The release-input-record mode MUST consume one nonempty bounded stdin byte
stream. A body request MUST produce one newline-terminated canonical envelope;
an envelope request MUST preserve the exact validated canonical bytes. Invalid
UTF-8, malformed JSON, noncanonical envelopes, digest mismatch, or invalid body
shape MUST return releases-owned typed issues. The CLI MUST NOT write a record,
  select a repository path, or acquire Git, filesystem, provider, package,
  governance, Oclif, app, or runtime authority.

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
- **THEN** the CLI rejects the request before client construction and every
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
under that root and derive inventory plus skill ownership only from exact
`skills/<identity>/SKILL.md` paths.
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
  canonical bytes derived from the selected roots
- **AND** every ancillary array is empty unless supplied by valid existing
  repository-owned state

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
exact repository/ref/commit/tree and read only immutable Git objects declared by
the release input. Staged mode MUST NOT authorize build or release.

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

The current-main v2 encode/validate mode MUST return identical canonical bytes,
protocol, digest, and byte length for one semantically identical body. It MUST
reject unknown fields, malformed or noncanonical bytes, missing/duplicate
Personal-owned fields, wrong protocol/digest, and oversized input. The pure
codec MUST take no dependency argument; the procedure MUST NOT call, read, or
write a Git, provider, package-output, or other lifecycle port.

#### Scenario: Equivalent record bodies encode
- **WHEN** two semantically identical valid bodies differ only in input object
  insertion order
- **THEN** encoding returns the same canonical envelope bytes and `cm2_` digest

#### Scenario: Invalid record is supplied
- **WHEN** a body/envelope is malformed, noncanonical, surplus, duplicated, or
  bound to another protocol/digest
- **THEN** validation rejects with every exterior port cold
