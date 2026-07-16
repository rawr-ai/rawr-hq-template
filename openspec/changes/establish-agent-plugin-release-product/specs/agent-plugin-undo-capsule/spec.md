## ADDED Requirements

### Requirement: Controller-owned one-state capsule
The Template lifecycle controller MUST own exactly one closed versioned persisted `CapsuleState` under a branded `CapsuleRoot` derived only by the CLI-owned agent-plugin layout from verified `ControllerRuntimeContext.dataRoot`. The state MUST be exactly one of `idle` with zero or one committed capsule, `applying` with the prior capsule and one bounded candidate transaction, or `undoing` with the committed capsule and bounded replay settlement. Independent optional committed and pending stores are forbidden. A committed capsule MUST bind controller protocol, content authority, affected canonical provider homes or export destinations, prior authority-local receipts or ledgers, and typed inverse actions in recorded mutation sequence for the most recent undo-capable mutation.

Every undo-capable mutation and undo replay MUST transition `CapsuleState` through a linearizable controller-owned store using atomic exclusive begin, an opaque generation token bound to the observed state digest and target ledger or receipt generations, and compare-and-set stage, settle, abort, recover, and clear operations. Concurrent admission, a stale token, `applying`, or `undoing` MUST block unrelated external mutation. The controller store MUST NOT read `HOME`, cwd, environment variables, a content path, or a fallback root. Every service, provider, destination, personal repository, worktree, artifact, and research location MUST remain unable to persist another capsule or operation history.

#### Scenario: Service-local persistence is rejected
- **WHEN** export or a future provider service attempts to persist inverse actions under its package directory, source workspace, destination side store, provider home, or another runtime path
- **THEN** the write is rejected before it can become undo authority
- **AND** only the injected controller-owned `UndoWriter` can transition the stable one-state capsule authority

#### Scenario: Source deletion does not affect undo identity
- **WHEN** a capsule is written and the content checkout and research locations are removed or replaced
- **THEN** capsule lookup and validation still resolve only stable Template data and canonical target identities
- **AND** no source path, Git ancestry, or tree-equivalence mechanism is required

#### Scenario: Ambient roots cannot redirect capsule state
- **WHEN** cwd, `HOME`, XDG values, `RAWR_DATA_DIR`, and content-workspace paths differ from the injected branded capsule root
- **THEN** capsule begin, recovery, replay, and clear use only the root derived from verified controller runtime context
- **AND** no fallback state file is read, created, or treated as undo authority

#### Scenario: Concurrent operations have one atomic winner
- **WHEN** two undo-capable operations attempt to begin from the same committed capsule generation
- **THEN** exactly one transitions `idle` to `applying` and only its token may stage, settle, or abort that transaction
- **AND** the losing operation performs no destination, ledger, capsule, provider, receipt, Oclif, or personal repository mutation

### Requirement: Owners emit typed exact inverse actions
Each state owner MUST capture exact prior state and stage a typed inverse action through the declared `UndoWriter` before every external mutation. Every stage, applied-subset settlement, abort, committed-capsule replacement, and clear MUST present the exclusive generation token and expected prior `CapsuleState` and target-state digests; stale or foreign tokens MUST fail closed. After application, the owner MUST identify the exact applied mutation sequence regardless of later verification or ledger failure. In C2 the export owner MUST emit destination-scoped actions that restore exact payload and ledger state. The controller writer MUST validate action type, protocol version, canonical owner and target identities, authority-local ledger proof and generation, exact relative claims, affected path set, captured prior bytes and modes, and expected current post-state identities, digests, modes, and generation before transitioning `applying` to `idle` with the exact applied subset as the new committed capsule. A capsule sequence or token without that matching authority-local proof MUST grant no target mutation or cleanup authority.

#### Scenario: Export inverse restores bytes and ledger
- **WHEN** export replaces managed files, adopts an exact planned path, retires ledger-owned orphans, and commits a new destination ledger
- **THEN** its typed inverse actions contain exactly the applied mutation sequence needed to restore prior files and prior ledger bytes
- **AND** no unmanaged sibling, provider receipt, Oclif state, artifact, channel, or source record is included

#### Scenario: Invalid owner action cannot replace the committed capsule
- **WHEN** an owner emits an unknown action type, wrong protocol, aliased target, out-of-scope path, malformed captured prior bytes, or an expected post-state that does not bind the current target
- **THEN** the controller writer rejects the entire candidate capsule
- **AND** the prior committed capsule remains byte-for-byte unchanged and no invalid `applying` state is admitted

### Requirement: Later mutation replaces earlier mutation
After an undo-capable operation applies at least one external mutation, settlement MUST atomically transition `applying` to `idle` with a committed capsule that replaces the prior capsule in full with the exact applied subset, including applied mutations that later fail verification. Operation B MUST therefore replace operation A rather than append to it. A read-only converged operation MUST never leave `idle` or write state. A failure before the first mutation MUST token-abort `applying` back to the exact prior `idle` state without replacing, refreshing, or clearing the existing committed capsule.

#### Scenario: Operation B replaces operation A
- **WHEN** operation A commits a valid capsule and later operation B applies a different mutation
- **THEN** the `idle` state contains only B's complete inverse action set and provenance
- **AND** no operation ID can retrieve or replay A

#### Scenario: Capsule settlement failure retains recovery authority
- **WHEN** one or more external mutations are applied and the final `applying` to `idle` committed-state transition fails
- **THEN** the operation reports an unhealthy unsettled result and the controller remains durably `applying` with bounded inverse data sufficient to classify the exact applied sequence after a cold reopen
- **AND** no later mutation or stale-capsule replay proceeds until recovery commits that applied subset or restores it

#### Scenario: Stale settlement token cannot overwrite another operation
- **WHEN** a commit, abort, or recovery call presents a token or expected capsule or target generation that no longer matches the exclusive in-flight transaction
- **THEN** it fails before changing `CapsuleState` or the committed capsule and reports the observed generation conflict
- **AND** it cannot erase or replace another operation's inverse data

#### Scenario: No-op and pre-mutation failure preserve the slot
- **WHEN** an identical converged operation performs reads only or a requested operation fails before any mutation
- **THEN** the existing `idle` state and committed capsule bytes and metadata remain unchanged after any required token-abort
- **AND** no empty or refresh capsule is written

### Requirement: Undo failure is retryable and success clears
Undo MUST atomically compare-and-transition `idle` with a committed capsule to `undoing`, binding its token to the capsule digest and target generations, before applying any inverse action. It MUST revalidate the complete capsule and live target boundaries, replay the recorded applied subset strictly in reverse mutation order, report each restored, already-restored, blocked, and failed action truthfully, and verify exact prior authority-local state. Any failure, interruption, or incomplete verification MUST remain durably `undoing` with the original complete capsule and bounded replay settlement, MUST block every new mutation or stale replay, and MUST NOT claim success. A fresh controller instance may only recover that exact state by reading its persisted token/generation, classifying each live target as expected post-state, already restored prior-state, or ambiguous, and continuing the reverse replay; ambiguous state remains blocked. Only complete verified restoration may compare-and-transition the same `undoing` generation to `idle` with no committed capsule; a concurrent or stale clear MUST fail without removing newer or unsettled state.

The controller MUST dispatch each closed action discriminator only to its registered owner-specific inverse executor; it MUST expose no generic path restore, delete, recursive cleanup, or caller-supplied filesystem executor. In C2, `ExportInverseActionV1` MUST be replayed only by the export owner's version-matched executor after revalidating the canonical destination, matching destination-ledger authority, exact relative claim, and bound prior and expected-post states. Restoring captured prior regular-file or ledger bytes MUST use an owner-created verified private same-parent regular file and either atomic expected-state replacement or atomic publish-if-absent when the expected post-state is absence. Restoring prior absence MUST individually unlink only the exact canonical expected-post regular file after immediate `lstat`, non-symlink type, link-count-one, identity, digest, containment, and ledger-claim checks. Directories created by the applied action MAY be pruned only when recorded by that action, revalidated empty and canonical, and removed bottom-up with non-recursive `rmdir`. Temporary replay-file cleanup MUST apply the same canonical-parent, current-operation direct-child private-prefix, captured-writer-identity, `lstat`, link-count-one, and realpath checks before one-file unlink. Any substituted, aliased, hardlinked, foreign, nonregular, nonempty, wrong-generation, wrong-ledger, or otherwise ambiguous entry MUST be preserved and leave the same generation durably `undoing`; replay MUST never recursively remove a target, destination, capsule, artifact, source, provider, repository, or temporary path.

#### Scenario: Partial replay failure preserves retry authority
- **WHEN** one inverse action succeeds and a later action fails or final verification differs from the bound prior state
- **THEN** undo reports a nonzero incomplete result and remains durably `undoing` with the original complete capsule and replay settlement
- **AND** every later mutation is blocked until token-bound recovery, including from a fresh controller process, classifies already-restored actions and finishes without operation history or source

#### Scenario: Cold recovery resumes every undo crash boundary
- **WHEN** the controller process exits after any inverse action or after final restoration but before clear
- **THEN** a fresh controller instance observes `undoing`, rejects a new operation, and resumes only the same persisted generation in reverse order
- **AND** it clears only after exact prior target state is verified, while an ambiguous target preserves the blocked recovery state

#### Scenario: Owner-specific replay restores only the bound entry
- **WHEN** an export inverse restores captured prior bytes over its exact expected-post file, republishes a retired prior file into an expected-absent slot, or restores prior absence
- **THEN** the version-matched export executor uses verified same-parent atomic replacement or publish-if-absent for prior bytes and individual verified unlink for prior absence
- **AND** it may prune only action-recorded empty directories bottom-up with non-recursive `rmdir`; the controller offers no generic path or recursive-delete fallback

#### Scenario: Replay substitution remains blocked and recoverable
- **WHEN** an expected-post entry, expected-absent slot, ledger, replay temporary file, or recorded directory is replaced before mutation by a symlink, hardlink, alias, directory, special file, foreign regular file, nonempty directory, wrong identity, wrong digest, or wrong-generation state
- **THEN** the owner-specific executor preserves the candidate and every alias or hardlink target, records the blocked action, and leaves the original complete capsule durably `undoing`
- **AND** no unlink, replacement, directory pruning, generic cleanup, or recursive removal proceeds from that failed proof

#### Scenario: Complete replay clears exactly one slot
- **WHEN** every inverse action restores and verifies the exact prior payload and ledger or receipt state
- **THEN** undo atomically transitions the exact `undoing` generation to `idle` with no committed capsule and reports success
- **AND** it performs no unrelated cleanup, artifact collection, provider reconciliation, Oclif mutation, or personal repository write

#### Scenario: Undo clear cannot race a newer commit
- **WHEN** undo is ready to clear while a stale or concurrent caller presents a different token, capsule digest, or target generation
- **THEN** only the token holding the exact `undoing` generation may transition the capsule it replayed to `idle`
- **AND** no newer capsule or unresolved settlement data is removed

### Requirement: Capsule protocol is hard bounded before mutation
Capsule protocol v1 MUST reject a candidate exceeding any of these hard limits before atomic begin or external mutation: 4,096 inverse actions, 16,384 distinct relative paths, 64 MiB of decoded captured prior bytes, or 96 MiB of canonical serialized `CapsuleState`. The controller MUST preflight the complete worst-case candidate, including ledger bytes and every planned destination, before admitting `applying`. It MUST NOT spill overflow to an artifact, service-local store, history file, secondary capsule, or caller path.

#### Scenario: Capsule bound overflow is pre-mutation rejection
- **WHEN** action count, distinct-path count, decoded prior-byte total, or canonical UTF-8 serialized size exceeds its v1 limit by one unit
- **THEN** the operation rejects after read-only prior-state capture but before atomic begin, controller-state write, or external mutation and preserves the prior `idle` state byte-for-byte
- **AND** boundary-equal input is parsed according to the same byte-counting rules without a hidden spill path

### Requirement: Capsule storage is atomic and path-safe
`CapsuleState` publication MUST use a private same-parent temporary regular file, validate canonical branded-root containment and file type, and atomically compare-and-replace one exact controller state slot under the matching generation token. Initial admission MUST use exclusive creation or equivalent linearizable compare-and-set; observation followed by an unconditional write is forbidden. Lookup and transition MUST reject symlinks, aliases, directories, hardlinked or nonregular files, malformed protocol data, and paths outside `CapsuleRoot`. Successful clear MUST atomically publish the closed `idle` state with no committed capsule rather than recursively deleting state. Any internal exclusive-admission entry is synchronization only and grants no capsule authority. It may be removed only after immediately proving the canonical same parent and direct-child name, `lstat` non-symlink directory type, captured entry identity such as device/inode, matching admission token/generation and current-owner binding, and emptiness, followed by one non-recursive `rmdir`. A stale releaser or a replaced, foreign, or reacquired admission entry MUST preserve the entry and block rather than weakening exclusivity. Temporary-file cleanup MUST immediately revalidate the canonical same parent, owner-created direct-child private prefix, exact current-writer captured file identity, `lstat` non-symlink regular-file type, link count one, and realpath containment before individually unlinking only that file; substitution MUST be preserved and reported.

#### Scenario: Aliased capsule path fails closed
- **WHEN** the state slot or temporary candidate is replaced by a symlink, directory, hardlink, path alias, or outside-root target
- **THEN** read, transition, replay, or clearing fails before mutation as applicable
- **AND** the alias target, stable data parent, source workspaces, artifacts, providers, and destinations remain unchanged

#### Scenario: Capsule clear never performs recursive removal
- **WHEN** successful undo clears the current capsule
- **THEN** the controller atomically replaces the exact state slot with a closed `idle` state containing no committed capsule
- **AND** no state parent, sibling, temporary subtree, caller-supplied path, or admission entry is recursively removed

#### Scenario: State-transition and admission cleanup crashes recover
- **WHEN** the controller exits before or after atomic state replacement or before releasing its internal admission primitive
- **THEN** cold recovery observes exactly one complete prior or next `CapsuleState`, validates any synchronization entry without treating it as capsule authority, and resumes only the persisted generation
- **AND** cleanup unlinks only an owned private regular temp file or uses non-recursive `rmdir` on an exact validated empty admission child

#### Scenario: Stale admission releaser cannot remove a newer lock
- **WHEN** a prior generation is ready to release admission after its entry was replaced or reacquired and bound to another token, generation, current owner, or filesystem identity
- **THEN** immediate pre-`rmdir` validation detects the mismatch and preserves the admission entry
- **AND** the stale releaser cannot remove the newer operation's exclusivity or mutate controller state

#### Scenario: Substituted capsule temp is preserved
- **WHEN** the current writer's private state temp is replaced before cleanup by a symlink, hardlink, directory, foreign regular file, wrong-prefix child, or outside-resolving alias
- **THEN** cleanup blocks before unlink and leaves the candidate, state slot, and every alias or hardlink target unchanged
- **AND** no capsule parent, admission entry, destination, artifact, source, or repository path is recursively removed

### Requirement: Capsule has no history or cleanup authority
The undo capsule MUST provide no operation-list, operation-ID lookup, retention, time-travel, scan, reconciliation, garbage-collection, provider-wide inference, or cross-home coordination API. A receipt or destination ledger remains the sole ownership proof for its state authority; capsule presence, path, name, or digest MUST NOT independently authorize deletion.

#### Scenario: Capsule cannot authorize unrelated cleanup
- **WHEN** a capsule names a target but its inverse action lacks matching authority-local ledger or receipt proof for a live object
- **THEN** undo preserves the object and blocks that action
- **AND** it does not infer ownership from name, path, bytes, capsule age, or another target's state

### Requirement: Undo results mirror persisted state
Undo MUST return exactly `NoCommittedCapsule`, `RejectedBeforeReplay`, `RestoredAndCleared`, or `ReplayUnsettled`. Only `ReplayUnsettled` may carry the durable `undoing` generation and per-action restored, already-restored, blocked, and failed outcomes. `RestoredAndCleared` MUST correspond to persisted `idle` with no committed capsule; rejection MUST preserve the prior state; and no result may claim success while persisted state is `applying` or `undoing`.

#### Scenario: Result and persisted state cannot disagree
- **WHEN** the controller is cold-reopened after an undo result
- **THEN** the parsed `CapsuleState` variant and generation match the result's declared transition exactly
- **AND** no boolean or optional event combination can overclaim clearing or restoration

### Requirement: Undo contract remains inactive in C2
C2 MUST add only the internal typed capsule schema, reader, writer, and replay contracts plus export integration. It MUST NOT add or reroute root `rawr undo`, add `rawr agent plugins undo`, add controller-manifest entries, bootstrap persistence, universal pre-dispatch expiry, runtime discovery, aliases, or compatibility routing. Operator reachability waits for the qualified later command cutover.

#### Scenario: Bootstrap and command discovery remain mutation-free
- **WHEN** ordinary controller startup and command discovery run after C2
- **THEN** the pre-C2 command inventory is unchanged, no new qualified undo command or alias is discoverable, and no new capsule read, expiry, write, replay, or clear occurs
- **AND** the internal contract remains testable through explicit injected ports only
