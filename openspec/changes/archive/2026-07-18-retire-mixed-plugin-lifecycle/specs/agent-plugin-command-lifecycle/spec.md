## ADDED Requirements

### Requirement: Curated lifecycle has one exact qualified command ontology
The installed Template controller MUST expose curated lifecycle only as `rawr agent plugins check|create|vendors status|vendors update|build|test|package|export|sync|status|retire|undo|attest-promotion`. Every command and nested topic MUST be an immutable controller member. Bare `rawr plugins`, root `rawr undo`, `rawr agent sync`, and any alias or forwarding route MUST NOT expose curated lifecycle behavior.

#### Scenario: Discovery separates external and curated plugins
- **WHEN** command, topic, alias, hidden-alias, help, and manifest discovery are enumerated
- **THEN** the exact qualified curated family appears only below `rawr agent plugins`
- **AND** bare `rawr plugins` contains only the seven external-extension operations

### Requirement: CLI parsing preserves closed procedure requests
Every lifecycle command MUST reject unknown, legacy, cross-mode, relative, noncanonical, or ambiguous inputs before constructing a Git, artifact, provider, receipt, destination, output, capsule, Oclif, or hosted-governance port. Artifact inputs MUST use only canonical domain-qualified release or release-set handles. Provider selection MUST use only repeatable `provider=absolute-home` tuples. A parsed request MUST retain the typed procedure's discriminated union and MUST NOT collapse into an optional-field bag.

#### Scenario: Foreign mode fields reject without calls
- **WHEN** a command receives a raw digest/path, uppercase or surplus handle, legacy agent/source/repair flag, mixed release/release-set/channel inputs, unsupported provider, relative home, or duplicate canonical target
- **THEN** parsing exits as invalid input before every observable port call

### Requirement: Each service-backed command invokes one typed service procedure
Each service-backed lifecycle transition command MUST perform command-local value adaptation and invoke exactly one `@rawr/agent-plugin-lifecycle` client procedure. CLI code MUST NOT import a module-local router handler or repository, resolve lifecycle prerequisites, sequence plan/apply/verify/retire across modules, aggregate procedure results, persist another ledger/receipt/capsule, or introduce another lifecycle service. The C4 `create` command remains source authoring. Qualified `undo` invokes only the controller-owned capsule application. Neither exception may invoke a retired peer service.

#### Scenario: Dispatch cannot become an aggregate
- **WHEN** every command runs with all lifecycle procedures and module-local router handlers instrumented
- **THEN** exactly its declared typed procedure is called at most once
- **AND** every direct module-local router handler, foreign service, app-composition, web-mounting, Oclif-mutation, and compatibility port records zero calls

### Requirement: Status and convergence results remain truthful
Qualified status MUST preserve every canonical repository/provider classification and exit `0` only when every selected target is `CONVERGED`, `1` for a valid observed non-converged state, and `2` for invalid input or authority binding. A converged mutating operation MAY inspect live state but MUST NOT publish artifacts/projections, write receipts/ledgers/capsules/outputs, invoke native mutation, or change bytes or metadata.

#### Scenario: Repeated convergence stutters
- **WHEN** a qualified operation is repeated after its exact desired state is already visible and verified
- **THEN** it returns the same converged identity after live reads
- **AND** every mutation counter is zero and tracked bytes and mtimes are unchanged

### Requirement: Controller and repository identities never collapse
Controller data paths MUST derive only from the verified installed-controller layout. Content and lifecycle records MUST be read only through an explicit absolute versioned Git locator. A repository path MUST NOT select a controller, artifact identity, provider home, export destination, channel, receipt, or executable implementation, and personal executable modules MUST never load.

#### Scenario: Misleading personal runtime files have no authority
- **WHEN** an explicit content workspace contains command, service, adapter, renderer, or controller-like executable files
- **THEN** the controller reads only the admitted versioned data interface through fixed Git objects
- **AND** command resolution and every implementation import remain inside the installed Template controller
