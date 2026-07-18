# agent-plugin-undo-capsule Specification

## Purpose
TBD - created by archiving change establish-agent-plugin-release-product. Update Purpose after archive.
## Requirements
### Requirement: Controller-owned one-state capsule
The Template lifecycle controller MUST own exactly one closed versioned persisted `CapsuleState` under a branded `CapsuleRoot` derived only by the CLI-owned agent-plugin layout from verified `ControllerRuntimeContext.dataRoot`. The state MUST be exactly one of `idle` with zero or one committed capsule, `applying` with the prior capsule and one bounded candidate transaction, or `undoing` with the committed capsule and bounded replay settlement. Independent optional committed and pending stores are forbidden. A committed capsule MUST bind controller protocol, content authority, affected canonical provider homes or export destinations, prior authority-local receipts or ledgers, and typed inverse actions in recorded mutation sequence for the most recent undo-capable mutation.

Every undo-capable mutation and undo replay MUST transition `CapsuleState` through a linearizable controller-owned store using atomic exclusive begin, an opaque generation token bound to the observed state digest and target ledger or receipt generations, and compare-and-set stage, observed-post bind, settle, abort, recover, and clear operations. Accepted begin MUST return a nonserializable applying-session capability that retains one operation-scoped exclusive lock across every stage, external mutation, observed-post bind, and terminal settle/abort or explicit suspension. Applying recovery and undo MUST acquire and retain that same exclusion across their complete workflows. Concurrent admission, recovery, undo, a stale token, `applying`, or `undoing` MUST block unrelated external mutation; a live owner MUST make competitors return busy before any owner classifier, replay executor, or target mutation runs. The controller store MUST NOT read `HOME`, cwd, environment variables, a content path, or a fallback root. Every service, provider, destination, personal repository, worktree, artifact, and research location MUST remain unable to persist another capsule, lease identity, or operation history.

#### Scenario: Service-local persistence is rejected
- **WHEN** export or a future provider service attempts to persist inverse actions under its package directory, source workspace, destination side store, provider home, or another runtime path
- **THEN** the write is rejected before it can become undo authority
- **AND** only the injected controller-owned `UndoWriter` can transition the stable one-state capsule authority

#### Scenario: Disposable source-fixture unavailability does not affect undo identity
- **WHEN** a capsule is written from a generated fixture artifact and that disposable source fixture is made unavailable or replaced
- **THEN** capsule lookup and validation still resolve only stable Template data and canonical target identities
- **AND** no source path, Git ancestry, or tree-equivalence mechanism is required; the actual personal checkout and protected research locations remain untouched

#### Scenario: Ambient roots cannot redirect capsule state
- **WHEN** cwd, `HOME`, XDG values, `RAWR_DATA_DIR`, and content-workspace paths differ from the injected branded capsule root
- **THEN** capsule begin, recovery, replay, and clear use only the root derived from verified controller runtime context
- **AND** no fallback state file is read, created, or treated as undo authority

#### Scenario: Concurrent operations have one atomic winner
- **WHEN** two undo-capable operations attempt to begin from the same committed capsule generation
- **THEN** exactly one transitions `idle` to `applying` and only its token may stage, bind observed post-state, settle, or abort that transaction
- **AND** the losing operation performs no destination, ledger, capsule, provider, receipt, Oclif, or personal repository mutation

### Requirement: Owners emit typed exact inverse actions
Each state owner MUST capture exact prior state and stage a typed inverse action through the declared `UndoWriter` before every external mutation. Every stage, observed-post bind, applied-subset settlement, abort, committed-capsule replacement, and clear MUST present the exclusive generation token and expected prior `CapsuleState` and target-state digests; stale or foreign tokens MUST fail closed. After application, the owner MUST bind one closed owner-typed canonical observed-post value to the staged action before continuing and MUST identify the exact applied mutation sequence regardless of later verification or ledger failure. The controller MUST validate that binding through the registered owner/version codec and MUST reject settlement when an applied action lacks it. A crash after external mutation but before binding MUST remain durably `applying` and ambiguous; recovery MUST block rather than infer ownership from path, mode, or emptiness. In C2 the export owner MUST emit destination-scoped actions that restore exact payload, directory, and ledger state. One export invocation over multiple destinations MUST preflight and begin one complete canonically ordered candidate, execute through one applying session, and settle once; it MUST NOT replace the controller slot once per destination. The controller writer MUST jointly validate action type, protocol version, canonical owner and target identities, authority-local ledger proof and generation, exact relative claims, affected path set, captured prior bytes and modes, expected current post-state identities, digests, modes, generation, and owner-specific action sequence before admission. Export destination groups MUST be canonical and contiguous; their write-phase actions MUST preserve plan order, payload retirement MUST precede bottom-up directory retirement, and a sole ledger action MUST be final. Duplicate actions, destination interleaving, phase regression, and ledger-first/middle sequences MUST reject before begin. Every action MUST match exactly one target by canonical destination plus prior ledger generation/digest, the complete candidate MUST exhaust every admitted target, and settlement MUST validate and retain exactly the target subset represented by the valid applied action prefix before transitioning `applying` to `idle`. A capsule sequence or token without that matching authority-local proof MUST grant no target mutation or cleanup authority.

#### Scenario: Invalid mutation sequence cannot enter applying
- **WHEN** an otherwise well-bound export candidate moves its ledger action first or into the middle, regresses an action class, interleaves destinations, duplicates a path or action, or leaves an incomplete directory-creation or retirement-closure sequence
- **THEN** the owner codec rejects the complete candidate before atomic begin and external mutation
- **AND** a valid applied prefix that stops before ledger publication remains admissible for settlement and retains only the targets represented by that prefix

#### Scenario: Export inverse restores bytes and ledger
- **WHEN** export replaces managed files, adopts an exact planned path, retires ledger-owned orphans, and commits a new destination ledger
- **THEN** its typed inverse actions contain exactly the applied mutation sequence needed to restore prior files and prior ledger bytes
- **AND** no unmanaged sibling, provider receipt, Oclif state, artifact, channel, or source record is included

#### Scenario: Multi-destination export leaves one truthful capsule
- **WHEN** one request plans destinations A, B, and C, A applies, B rejects before mutation, and C is not executed
- **THEN** one aggregate controller generation settles with exactly A's actions and A's target binding, regardless of caller destination order
- **AND** B and C do not replace, clear, or hide A's inverse coverage

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
- **THEN** the operation reports an unhealthy unsettled result and the controller remains durably `applying` with bounded inverse data sufficient to classify the exact applied sequence or preserve an ambiguous blocked action after a cold reopen
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
Undo MUST acquire the operation-scoped exclusive session before its first capsule observation, atomically compare-and-transition `idle` with a committed capsule to `undoing`, and retain the same session through all classification, inverse mutation, verification, and clear or unsettled return. It binds its token to the capsule digest and target generations before applying any inverse action. It MUST revalidate the complete capsule and live target boundaries, replay the recorded applied subset strictly in reverse mutation order, report each restored, already-restored, blocked, and failed action truthfully, and verify exact prior authority-local state. Any failure, interruption, or incomplete verification MUST remain durably `undoing` with the original complete capsule and bounded replay settlement, MUST release synchronization ownership for immediate cold retry, MUST block every new mutation or stale replay, and MUST NOT claim success. A fresh controller instance may only recover that exact state by reading its persisted token/generation, classifying each live target as expected post-state, already restored prior-state, or ambiguous, and continuing the reverse replay; ambiguous state remains blocked. Only complete verified restoration may compare-and-transition the same `undoing` generation to `idle` with no committed capsule; a concurrent or stale clear MUST fail without removing newer or unsettled state.

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
`CapsuleState` publication MUST use a private same-parent temporary regular file, validate canonical branded-root containment and file type, and atomically compare-and-replace one exact controller state slot under the matching generation token. Initial admission MUST use an equivalent linearizable compare-and-set; observation followed by an unconditional write is forbidden. The store MUST create one stable synchronization-only direct-child regular file exactly once when it successfully creates a brand-new capsule root. Every existing-root path MUST open that file without create and MUST fail closed rather than repair or recreate a missing entry. The store MUST expose one exclusive operation-scoped session over that file. Successful begin MUST retain the exact opened and validated lock through its entitled external mutation interval; applying recovery and undo MUST retain it across their complete workflows. Public store reads or compare-and-set calls MUST NOT reacquire from inside a held session. The session MUST reject concurrent or reentrant calls, close idempotently, and attempt release exactly once on every terminal or unsettled return; each such result MUST report `Released` or `ReleaseFailed` without rewriting the persisted lifecycle transition. A live session makes competing begin, applying recovery, and undo nonblocking busy with zero classifier, replay, or target mutation. After initialization, supported controller code MUST never unlink, rename, replace, or recreate that file, interpret it as capsule state, bind it into a generation, or expose it as lifecycle identity. The store MUST validate its canonical parent and direct-child path, non-symlink regular-file type, link count one, and opened device/inode identity while the lock is held; an observed alias or substitution MUST fail the current operation closed without repair. Kernel handle close or process exit MUST release lock ownership; an unsupported runtime, platform, symbol, filesystem, or unclassifiable lock result MUST fail closed. Lookup and transition MUST reject missing files, symlinks, aliases, directories, hardlinked or nonregular files, malformed protocol data, and paths outside `CapsuleRoot`. Successful clear MUST atomically publish the closed `idle` state with no committed capsule rather than recursively deleting state. Temporary-file cleanup MUST immediately revalidate the canonical same parent, owner-created direct-child private prefix, exact current-writer captured file identity, `lstat` non-symlink regular-file type, link count one, and realpath containment before individually unlinking only that file; substitution MUST be preserved and reported. Arbitrary external rewriting of the private controller state root is outside this product contract.

#### Scenario: Live owner excludes recovery and undo
- **WHEN** operation A has durably staged an action and pauses before its entitled external mutation while another controller attempts begin, applying recovery, or undo
- **THEN** every competing operation returns busy before invoking an owner classifier, replay executor, destination, ledger, provider, or capsule mutation
- **AND** A may finish its mutation, bind observed post-state, and settle one truthful capsule under the same held session

#### Scenario: Unsettled return releases only synchronization ownership
- **WHEN** begin, stage, observed-post bind, settle, applying recovery, or undo returns an unsettled persisted state
- **THEN** the operation-scoped session releases exactly once before the result is returned, while `CapsuleState` remains the exact durable `applying` or `undoing` generation
- **AND** the result reports `Released` or `ReleaseFailed` separately from that lifecycle state; successful release permits an immediate cold retry without sleep, timeout, PID inference, or lock stealing

#### Scenario: Session capability is single-owner and nonpersistent
- **WHEN** an applying-session method races another method or close, close is repeated, or a fresh process opens the same capsule root after process death
- **THEN** concurrent or post-close method use fails closed, close is idempotent, and process death releases the kernel lock
- **AND** no session ID, owner PID, heartbeat, timeout, second lock file, or lease record appears in persisted state

#### Scenario: Aliased capsule path fails closed
- **WHEN** the state slot or temporary candidate is replaced by a symlink, directory, hardlink, path alias, or outside-root target
- **THEN** read, transition, replay, or clearing fails before mutation as applicable
- **AND** the alias target, stable data parent, source workspaces, artifacts, providers, and destinations remain unchanged

#### Scenario: Capsule clear never performs recursive removal
- **WHEN** successful undo clears the current capsule
- **THEN** the controller atomically replaces the exact state slot with a closed `idle` state containing no committed capsule
- **AND** no state parent, sibling, temporary subtree, caller-supplied path, or stable synchronization file is recursively removed

#### Scenario: State transition crash releases only synchronization ownership
- **WHEN** the controller exits before or after atomic state replacement while holding its internal advisory lock
- **THEN** the kernel releases that process's lock, cold recovery observes exactly one complete prior or next `CapsuleState`, and a later process resumes only the persisted generation
- **AND** the stable lock file remains present and non-authoritative; cleanup may unlink only an exact owned private regular state temp

#### Scenario: Initial creation is the only lock creation path
- **WHEN** a brand-new capsule root initializes, or an existing root is opened after its synchronization file is missing, aliased, replaced, hardlinked, nonregular, or identity-mismatched
- **THEN** only the brand-new-root path may exclusively create the synchronization file; the existing-root path fails closed without repair
- **AND** later transition, recovery, undo, clear, and private-temp cleanup capabilities cannot unlink, rename, replace, or recreate it or mutate a target through the damaged session

#### Scenario: Substituted capsule temp is preserved
- **WHEN** the current writer's private state temp is replaced before cleanup by a symlink, hardlink, directory, foreign regular file, wrong-prefix child, or outside-resolving alias
- **THEN** cleanup blocks before unlink and leaves the candidate, state slot, and every alias or hardlink target unchanged
- **AND** no capsule parent, stable synchronization file, destination, artifact, source, or repository path is recursively removed

### Requirement: Capsule has no history or cleanup authority
The undo capsule MUST provide no operation-list, operation-ID lookup, retention, time-travel, scan, reconciliation, garbage-collection, provider-wide inference, or cross-home coordination API. A receipt or destination ledger remains the sole ownership proof for its state authority; capsule presence, path, name, or digest MUST NOT independently authorize deletion.

#### Scenario: Capsule cannot authorize unrelated cleanup
- **WHEN** a capsule names a target but its inverse action lacks matching authority-local ledger or receipt proof for a live object
- **THEN** undo preserves the object and blocks that action
- **AND** it does not infer ownership from name, path, bytes, capsule age, or another target's state

### Requirement: Undo results mirror persisted state
Undo MUST return exactly `NoCommittedCapsule`, `RejectedBeforeReplay`, `RestoredAndCleared`, or `ReplayUnsettled`. Every variant MUST carry one closed synchronization result, `NotAcquired`, `Released`, or `ReleaseFailed`, independently of its lifecycle class. Only `ReplayUnsettled` may carry the durable `undoing` generation and per-action restored, already-restored, blocked, and failed outcomes. `RestoredAndCleared` MUST correspond to persisted `idle` with no committed capsule; rejection MUST preserve the prior state; and no result may claim success while persisted state is `applying` or `undoing`. A release failure MUST remain diagnostic and MUST NOT convert `RestoredAndCleared` to `ReplayUnsettled` or erase an unsettled primary failure.

#### Scenario: Result and persisted state cannot disagree
- **WHEN** the controller is cold-reopened after an undo result
- **THEN** the parsed `CapsuleState` variant and generation match the result's declared transition exactly
- **AND** no boolean or optional event combination can overclaim clearing or restoration, and synchronization diagnostics cannot rewrite that transition

### Requirement: Provider inverse actions use the existing controller capsule
Provider deployment MUST integrate one closed provider owner protocol with the existing controller-owned bounded last-operation capsule. Provider services and adapters MUST NOT persist a second capsule, command-scoped undo file, operation history, or replay authority.

#### Scenario: Provider mutation replaces the last capsule once
- **WHEN** one or more provider targets apply native mutations
- **THEN** the controller begins one candidate for the complete operation, settles one capsule for the exact applied subset, and replaces the prior last-operation capsule only according to controller state-machine rules

#### Scenario: Read-only convergence preserves capsule bytes
- **WHEN** every selected target is already converged
- **THEN** no capsule preflight, begin, replacement, settle, or clear occurs

#### Scenario: Planning precedes capsule admission
- **WHEN** a multi-target operation is planned
- **THEN** all target plans complete read-only and capsule bounds are preflighted and one candidate begins only if at least one admitted mutation exists

### Requirement: Provider actions bind exact target and receipt truth
Every provider inverse action MUST bind the provider ID, canonical home identity, admitted target receipt generation and digest when applicable, bounded prior native/sidecar observation, expected post observation, and exact owner protocol. First target-sidecar admission MUST bind prior absence and exact expected sidecar bytes. An action or observation from another target, generation, digest, or provider MUST reject before replay.

#### Scenario: Cross-home replay rejects
- **WHEN** an inverse action or observed-post binding from home A is presented with home B target state
- **THEN** codec validation or replay classification rejects without native or receipt mutation

#### Scenario: First target admission is reversible
- **WHEN** an `AdmitTargetIdentity` action is the first target action and exact undo restores all later provider and receipt actions
- **THEN** replay verifies the exact action-owned sidecar and removes it last, returning the target to prior absence

### Requirement: Partial multi-target application retains complete inverse coverage
One multi-target capsule candidate MUST include every planned target action in canonical order and MAY settle only the exact validated applied subset. A failure at a later target MUST NOT erase, replace, or overclaim inverse coverage for earlier applied targets.

#### Scenario: Later target failure preserves earlier inverse
- **WHEN** home A applies and verifies while home B fails after zero or some actions
- **THEN** the settled or recoverable capsule covers exactly A plus B's actual applied prefix and no unapplied action

### Requirement: Provider replay is owner-specific and receipt-bounded
Undo and cold recovery MUST dispatch provider actions only through the registered provider codec, live classifier, inverse executor, and prior verifier. Replay MUST restore or remove only exact action-owned native state and the matching target receipt, in reverse applied order, and MUST block on ambiguous or foreign live state rather than invoke generic filesystem deletion.

#### Scenario: Exact provider undo restores prior state
- **WHEN** all observed postconditions still match the capsule
- **THEN** undo restores the exact prior native registration, visibility, managed bytes, and receipt for every applied target, verifies the prior state, and clears the capsule once

#### Scenario: Transition and final registrations replay distinctly
- **WHEN** one applied target contains transition registration, receipt-owned retirement, and final registration actions
- **THEN** each registration has a distinct action identity and reverse replay restores final registration, retired members, and transition registration in exact reverse order before prior-state verification

#### Scenario: Foreign substitution blocks retryably
- **WHEN** native or receipt state no longer matches expected post or already-restored prior state
- **THEN** replay reports a target-scoped blocked outcome, preserves the capsule for retry, and leaves ambiguous state unchanged

### Requirement: Provider failpoints preserve controller recovery truth
Failures before mutation MUST preserve the prior capsule. Failures after external mutation but before observed-post binding MUST leave controller applying state for cold classification. Receipt-publication and inverse-replay failures MUST report exact persisted state without manufacturing rollback.

#### Scenario: Crash boundaries recover from stable state
- **WHEN** a fresh process resumes at each sidecar-admission, provider apply, verify, receipt, and replay boundary after source worktrees are absent
- **THEN** owner classification either completes exact recovery or blocks truthfully using only the capsule, stable artifacts, target state, and receipt store

### Requirement: Operator undo is qualified and controller-owned
The controller-owned bounded last-operation capsule MUST be operator-reachable only as `rawr agent plugins undo`. Root `rawr undo`, mixed lifecycle undo, workspace-local capsules, aliases, forwarding routes, universal pre-dispatch expiry, and service-local undo stores MUST be absent. The qualified command MUST invoke only the controller-owned undo application, which dispatches replay through the capsule's registered owner protocol and MUST NOT scan source workspaces, app composition, provider homes, destinations, or Oclif state for recovery authority.

#### Scenario: Empty qualified undo is read-only
- **WHEN** no valid last-operation capsule exists
- **THEN** `rawr agent plugins undo` reports the exact empty classification without creating, replacing, expiring, or clearing capsule state
- **AND** root `rawr undo` is undiscoverable

#### Scenario: Qualified replay uses the registered owner only
- **WHEN** a valid export or provider capsule is replayed
- **THEN** the controller dispatches only the action's registered owner codec and verifies exact prior state before clearing the capsule
- **AND** no generic filesystem cleanup, aggregate service, or foreign state owner is invoked

