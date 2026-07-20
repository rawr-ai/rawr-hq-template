## MODIFIED Requirements

### Requirement: Curated lifecycle has one exact qualified command ontology

The installed Template controller MUST expose curated lifecycle only as
`rawr agent plugins check|create|vendors status|vendors update|build|test|package|export|sync|status|undo`.
Every command and nested topic MUST be an immutable controller member. Bare
`rawr plugins`, root `rawr undo`, `rawr agent sync`, retired
`rawr agent plugins retire`, retired `rawr agent plugins attest-promotion`, and
any alias or forwarding route MUST NOT expose curated lifecycle behavior.

#### Scenario: Discovery separates external and curated plugins
- **WHEN** command, topic, alias, hidden-alias, help, and manifest discovery are
  enumerated
- **THEN** the exact qualified curated family appears only below
  `rawr agent plugins`
- **AND** bare `rawr plugins` contains only the seven external-extension
  operations and both retired commands are absent everywhere

### Requirement: CLI parsing preserves closed procedure requests

Every lifecycle command MUST reject unknown, legacy, retired, cross-mode,
relative, noncanonical, or ambiguous inputs before constructing a Git,
artifact, provider, destination, output, capsule, Oclif, app, or runtime port.
Artifact inputs MUST use only canonical domain-qualified release or release-set
handles. Provider selection MUST use only repeatable `provider=absolute-home`
tuples. A parsed request MUST retain the typed procedure's discriminated union
and MUST NOT collapse into an optional-field bag.

#### Scenario: Foreign mode fields reject without calls
- **WHEN** a command receives a raw digest/path, uppercase or surplus handle,
  legacy agent/source/repair/hosted-governance flag, retired promotion input,
  mixed release/release-set/channel input, unsupported provider, relative home,
  or duplicate canonical target
- **THEN** parsing exits as invalid input before every observable port call

### Requirement: Each service-backed command invokes one typed service procedure

Each service-backed lifecycle transition command MUST perform command-local
value adaptation and invoke exactly one `@rawr/agent-plugin-lifecycle` client
procedure. CLI code MUST NOT import a module-local router handler or repository,
resolve lifecycle prerequisites, sequence plan/apply/verify/retire across
modules, aggregate procedure results, persist another ledger/receipt/capsule, or
introduce another lifecycle service. The C4 `create` command remains source
authoring. Qualified `undo` remains available only to replay capsule state
emitted by managed export. Provider operations emit no capsule. Neither exception may
invoke a retired peer service.

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
publish artifacts/projections, write receipts/ledgers/capsules/outputs, invoke
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

## ADDED Requirements

### Requirement: Existing check command exposes closed repository and channel modes

`rawr agent plugins check` MUST parse exactly one of release eligibility,
staged/clean repository validation, release-input body/envelope
canonicalization, current-main v2 encode/validate, or current-main selection
validation before acquiring any Git, filesystem, artifact, provider,
destination, capsule, Oclif, app, or runtime port. Each selected mode MUST
invoke exactly one typed `@rawr/agent-plugin-lifecycle` procedure once.

The prior protected-lane runtime mode MUST be absent. C6 settlement MUST select
the exact canonical personal-main workspace/release input and MUST NOT supply or
read an external pending research candidate. The generic controller MUST NOT
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
select a repository path, or acquire Git, filesystem, artifact, provider,
destination, package, governance, capsule, Oclif, app, or runtime authority.

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
Codex/Claude bindings, wrong protocol/digest, and oversized input. The pure
codec MUST take no dependency argument; the procedure MUST NOT call, read, or
write a Git, provider, artifact, export, or other lifecycle port.

#### Scenario: Equivalent record bodies encode
- **WHEN** two semantically identical valid bodies differ only in input object
  insertion order
- **THEN** encoding returns the same canonical envelope bytes and `cm2_` digest

#### Scenario: Invalid record is supplied
- **WHEN** a body/envelope is malformed, noncanonical, surplus, duplicated, or
  bound to another protocol/digest
- **THEN** validation rejects with every exterior port cold
