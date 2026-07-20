## MODIFIED Requirements

### Requirement: Controller-owned one-state capsule
The Template lifecycle controller MUST own exactly one closed versioned
persisted `CapsuleState` under the verified controller data root. The capsule is
available only to managed export and MUST bind only canonical export
destinations, their destination-ledger generations, and typed export inverse
actions. Provider homes, native provider state, provider receipts, channel
selection, artifacts, content repositories, and worktrees MUST NOT enter this
state or its authority.

Every export mutation and export replay MUST use the landed atomic exclusive
begin, stage, observed-post bind, settle, recover, and clear protocol. Competing
export mutation or undo MUST block before destination or ledger mutation. The
capsule root MUST come only from verified controller runtime context and MUST
have no environment, cwd, content-checkout, or service-local fallback.

#### Scenario: Provider convergence leaves the capsule cold
- **WHEN** any targeted, complete-test, or canonical provider operation plans,
  mutates, verifies, fails, or retries
- **THEN** it neither reads nor transitions capsule state and emits no capsule
  action

#### Scenario: Export has one recovery authority
- **WHEN** managed export applies at least one destination or ledger mutation
- **THEN** only the controller-owned export capsule records the exact applied
  prefix and no destination-local or service-local undo state is created

### Requirement: Owners emit typed exact inverse actions
Managed export MUST capture exact prior destination and ledger state and stage a
typed export inverse action before each external mutation. Every action MUST
bind one canonical export destination, matching destination-ledger generation
and digest, exact relative claims, captured prior state, expected post-state,
and the export owner protocol. The controller MUST reject unknown owners,
provider actions, provider receipts, interleaved destinations, duplicate paths,
phase regression, or an action sequence whose applied prefix cannot be
validated. One multi-destination export MUST preflight one canonically ordered
candidate, execute through one applying session, and settle once with exactly
the validated applied prefix.

#### Scenario: Export inverse restores bytes and ledger
- **WHEN** export replaces planned files, retires ledger-owned orphans, and
  publishes a destination ledger
- **THEN** its inverse actions cover exactly the applied destination and ledger
  mutations and no provider, channel, artifact, Oclif, or source state

#### Scenario: Foreign owner action cannot enter applying
- **WHEN** a candidate contains a provider action, unknown owner, wrong
  protocol, aliased target, out-of-scope path, or mismatched ledger proof
- **THEN** the candidate rejects before capsule or destination mutation and the
  prior committed capsule remains unchanged

### Requirement: Undo failure is retryable and success clears
Undo MUST acquire the controller's exclusive capsule session, transition the
committed export capsule to `undoing`, validate its complete export action set
against live destination and ledger state, replay the applied subset strictly
in reverse order through the registered export executor, and verify exact prior
state. Failure, interruption, substitution, or incomplete verification MUST
remain durably retryable as the same `undoing` generation and MUST block later
export mutation. Only complete verified restoration may clear the capsule.

The export executor MAY replace or unlink only exact action-owned regular files
and MAY prune only action-recorded empty directories bottom-up with
non-recursive `rmdir`. It MUST reject aliases, symlinks, hardlinks, foreign
bytes, nonempty directories, wrong ledger generations, and paths outside the
canonical destination. The controller MUST expose no generic filesystem,
provider, receipt, or recursive-cleanup executor.

#### Scenario: Partial replay remains retryable
- **WHEN** one export inverse succeeds and a later inverse blocks or fails
- **THEN** undo reports the exact restored prefix, retains the original capsule
  generation, and a cold retry resumes from live export state

#### Scenario: Complete export replay clears exactly one slot
- **WHEN** every export inverse restores and verifies the exact prior payload
  and destination-ledger state
- **THEN** undo atomically returns the same generation to `idle` with no
  committed capsule and performs no provider, channel, artifact, or source
  mutation

### Requirement: Capsule has no history or cleanup authority
The export undo capsule MUST provide no operation list, operation-ID lookup,
retention, time travel, scan, reconciliation, garbage collection, provider
inference, or cross-destination coordination API. The destination ledger remains
the sole ownership proof for export state; capsule presence, path, name, or
digest MUST NOT independently authorize replacement, unlink, or pruning.

#### Scenario: Capsule cannot authorize unrelated cleanup
- **WHEN** an export capsule names a path without matching live destination
  ledger proof
- **THEN** undo preserves the path and blocks that action rather than inferring
  ownership from name, bytes, location, or capsule age

### Requirement: Operator undo is qualified and controller-owned
The controller-owned bounded export capsule MUST be operator-reachable only as
`rawr agent plugins undo`. Root `rawr undo`, mixed lifecycle undo, provider
undo, workspace-local capsules, aliases, forwarding routes, and service-local
undo stores MUST be absent. The qualified command MUST invoke only the export
undo application and MUST NOT scan provider homes, content workspaces, app
composition, Oclif state, or artifacts for recovery authority.

#### Scenario: Empty qualified undo is read-only
- **WHEN** no valid export capsule exists
- **THEN** `rawr agent plugins undo` reports the exact empty classification
  without creating, replacing, or clearing capsule state

#### Scenario: Qualified replay dispatches only export
- **WHEN** a valid export capsule is replayed
- **THEN** the controller dispatches only the version-matched export codec and
  executor and no provider or generic filesystem replay route exists

## REMOVED Requirements

### Requirement: Provider inverse actions use the existing controller capsule
**Reason**: Native provider operations re-read live state and converge by exact applied prefix; a provider capsule can later revert or block a home after its authority changes.
**Migration**: Remove provider capsule writers/owner protocol from every provider mode. Qualified undo remains for export capsules only.

### Requirement: Provider actions bind exact target and receipt truth
**Reason**: No provider operation emits an inverse action after the thin-convergence correction.
**Migration**: Targeted/complete receipts remain mode-local observations; canonical ownership uses live marketplace plus embedded provenance. Neither enters undo authority.

### Requirement: Partial multi-target application retains complete inverse coverage
**Reason**: Provider partial truth is represented by ordered per-target outcomes and exact applied prefixes, not a controller rollback transaction.
**Migration**: Preserve successful targets, report the failing target's exact prefix, and retry from a fresh native read.

### Requirement: Provider replay is owner-specific and receipt-bounded
**Reason**: Provider replay is removed with provider capsule production.
**Migration**: Qualified undo dispatches only export actions. Provider recovery is ordinary native re-convergence.

### Requirement: Provider failpoints preserve controller recovery truth
**Reason**: Controller recovery truth is a second provider-state authority and is unnecessary for native idempotent convergence.
**Migration**: Every provider failure reports observed native state and the exact applied prefix; retry re-inventories before any next mutation.

## ADDED Requirements

### Requirement: Legacy committed provider capsules retire without replay
The upgraded controller MUST retain one closed migration-only decoder for an
exact landed v1 `idle` state containing a committed provider capsule. Its tests
MUST consume frozen exact landed-v1 bytes rather than construct provider
actions. The decoder MUST expose no encoder, provider action constructor,
provider codec, classifier, executor, undo action, public export, or production
or test construction API. Provider sync and status MUST remain capsule-cold even
while those bytes exist.

When managed export first opens the capsule authority, it MUST acquire the
existing exclusive session, validate the complete legacy state and generation,
and atomically replace that exact committed provider capsule with the new
export-only `idle` state before admitting an export transaction. This retirement
MUST make zero provider or native calls and MUST NOT infer or change live
provider state. A malformed legacy state or a legacy provider state already in
`applying` or `undoing` MUST remain byte-for-byte unchanged and block export;
export/undo capsule activation MUST report that prerequisite rather than delete
state, replay provider actions, or accept an override. Targeted, complete-test,
and canonical provider sync/status MUST remain read/write-cold to those bytes.

#### Scenario: Exact committed provider capsule upgrades once
- **WHEN** the new controller opens an exact landed v1 `idle` state with one
  committed provider capsule for a managed export operation
- **THEN** it atomically retires that capsule without provider calls, admits the
  export under the export-only state model, and a repeat performs no migration

#### Scenario: Provider operations ignore the legacy capsule
- **WHEN** canonical provider status or sync runs while the exact legacy
  committed provider capsule remains on disk
- **THEN** native planning and convergence proceed without capsule reads or
  writes and qualified undo has no provider replay capability

#### Scenario: Unsettled legacy provider state blocks activation
- **WHEN** the landed v1 state is malformed, `applying`, or `undoing`
- **THEN** export/undo activation reports the exact unsupported legacy state
  with zero capsule, export, provider, or native mutation and no lifecycle
  override, while every provider mode remains capsule-cold

#### Scenario: Retirement failure cannot admit export
- **WHEN** legacy retirement rejects, conflicts, has unknown commit truth, or
  fails to release its exclusive session
- **THEN** export returns non-success before destination mutation and a cold
  retry re-reads the slot, either retries the same exact legacy compare-and-set
  or observes the already-retired export-only `idle` state, with zero provider
  or native calls in either branch
