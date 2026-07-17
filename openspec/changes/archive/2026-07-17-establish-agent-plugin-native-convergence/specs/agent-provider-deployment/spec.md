## ADDED Requirements

### Requirement: Live provider truth is read for every operation
Each selected provider home MUST be inventoried through its native adapter on every plan, status, test, sync, and retire operation. Inventory MUST include native plugin identity, enablement, visible skills and hooks required by the projection, relevant marketplace/source identity, and receipt state. A receipt MUST NOT replace or suppress live reads.

#### Scenario: Receipt and live state disagree
- **WHEN** a receipt claims convergence but native plugins, skills, hooks, enablement, or bytes are missing or altered
- **THEN** live truth wins and the target is classified drifted or blocked without unrelated repair

#### Scenario: Manually added native state is observed
- **WHEN** unmanaged native state appears after the last receipt
- **THEN** inventory reports it and planning preserves it unless it blocks an exact planned identity

### Requirement: Receipt scope is closed by lifecycle mode
Every target receipt MUST contain exactly one scope: `TargetedTestScope` binding explicit tested member refs and target-local evaluation identity; `CompleteTestScope` binding one candidate complete-set ref, target-local request/evaluation identity, projection, adapter protocol, capability profile, visible fingerprint, and verified member identities; or `CanonicalAcceptedScope` binding one complete-set ref plus governed acceptance, promotion, fixed-channel, projection, adapter protocol, capability profile, and visible fingerprint identities. `CompleteTestScope` MUST NOT bind the later aggregate mechanical-evidence digest or any absent-member retirement authority. Scope fields MUST NOT be optional or combined.

#### Scenario: Targeted and complete test receipts cannot claim canonical authority
- **WHEN** a targeted or complete-test receipt contains acceptance, promotion, channel, canonical retirement, or aggregate evidence fields
- **THEN** receipt validation rejects before planning or mutation

#### Scenario: Canonical receipt requires every authority binding
- **WHEN** a canonical receipt omits or mismatches its accepted set, acceptance, promotion, or channel identity
- **THEN** it is invalid and authorizes no convergence or cleanup

### Requirement: Planning is target-scoped and read-only
The deployment service MUST canonicalize selected homes and create a deterministic independent plan per provider-home target from the accepted projection, observed capabilities, live inventory, and that target's receipt. Planning MUST emit planned, skipped, or blocked events and MUST perform no mutation.

#### Scenario: Same desired state yields independent plans
- **WHEN** home A is converged and home B is missing one plugin
- **THEN** A plans read-only verification while B plans only its target-local native changes

#### Scenario: Foreign receipt cannot plan cleanup
- **WHEN** receipt bytes from home A are copied to home B
- **THEN** B rejects their canonical target binding and they authorize no mutation or deletion

### Requirement: Native replacement is visible before receipt-owned cleanup
When a desired member has the same native identity but changed release bytes or version, apply MUST retire the exact receipt-owned old member against the old registration, verify that neither native membership nor provider configuration retains that identity, switch to the transition registration, install the new member, and verify every accepted provider-visible plugin, skill, hook, and metadata claim. Fresh catalog or plugin-list metadata MUST NOT substitute for this active native refresh. When canonical desired state omits other receipt-owned members, apply MUST preserve them in the transition catalog until the replacement is visible, then retire each exact owned omission, verify membership and configuration residue absent, register the final desired-only catalog, and verify final state. Transition and final registrations MUST be distinct typed actions. Explicit managed retirement MUST verify and retire against the current receipt registration before narrowing or removing it. The target receipt MUST advance only after final replacement and retirement verification.

#### Scenario: Successful canonical replacement orders mutations
- **WHEN** canonical convergence replaces managed prior state
- **THEN** a changed same-ID member retires and leaves no native/config residue before source transition and reinstall, replacement visibility precedes omitted-member cleanup, complete-set visibility precedes absent-member retirement, and receipt publication is the target's final mutation

#### Scenario: Catalog metadata cannot masquerade as an active refresh
- **WHEN** a marketplace source now advertises changed bytes for an enabled native identity but the old native installation or provider configuration remains
- **THEN** the target is not converged, no receipt advances, and apply must complete typed native retire plus install rather than accepting the fresh catalog observation

#### Scenario: Retired configuration residue blocks settlement
- **WHEN** native uninstall removes the member listing but leaves its native plugin configuration entry
- **THEN** retirement verification fails, no source transition or later cleanup runs, and the receipt does not advance

#### Scenario: Catalog transition preserves retirees until typed cleanup
- **WHEN** canonical desired state omits an exact same-target receipt-owned member
- **THEN** a transition registration keeps the desired and retiring members provider-visible, transition verification precedes typed retirement, final registration follows verified retirement, and receipt publication remains last

#### Scenario: Transition verification failure prevents retirement
- **WHEN** applying or verifying the transition registration loses or alters a desired or receipt-owned retiring member
- **THEN** no retirement or final registration runs, the prior receipt does not advance, and the applied transition action remains explicit in controller recovery truth

#### Scenario: Final registration failure preserves exact applied prefix
- **WHEN** desired visibility and owned retirement succeed but final registration fails
- **THEN** the target reports the transition and retirement as its exact applied prefix, publishes no receipt successor, and controller undo can replay those typed actions in reverse

#### Scenario: Visibility failure preserves prior state
- **WHEN** native install returns success but provider-visible verification fails
- **THEN** cleanup does not run, the receipt does not advance, the result is non-success, and any applied mutation remains explicitly covered by undo

### Requirement: Ownership proof bounds all native retirement
Automatic or explicit retirement MUST affect only native state proven managed by the same target receipt. The controller MUST NOT infer durable ownership from provider metadata. Names, paths, hashes, byte equality, another home's receipt, an export ledger, or a channel record MUST NOT prove native ownership. Unmanaged and ambiguous collisions MUST be preserved and block the conflicting plan.

#### Scenario: Receipt-owned member retires
- **WHEN** a complete accepted canonical set omits a member claimed by the same target's current receipt and the replacement set is fully visible
- **THEN** only that exact managed native member retires and the new receipt truthfully excludes it

#### Scenario: Unmanaged collision is preserved
- **WHEN** an unmanaged marketplace, standalone skill, or native plugin occupies a planned identity or has byte-identical content
- **THEN** it is preserved, the target is `BLOCKED_COLLISION`, and no fallback or automatic adoption occurs

### Requirement: Desired-state mode limits convergence authority
Targeted tests MUST mutate only selected release members in explicit test homes and MUST NOT retire omitted members or claim channel convergence. Complete tests MAY evaluate the full candidate set in explicit test homes, MUST preserve every omitted member, and MUST NOT authorize absent-member retirement, acceptance, or canonical state. A complete test encountering canonical receipt scope MUST block. Canonical convergence MUST use only the governed accepted promoted complete set and is the only mode that may authorize absent-member retirement.

#### Scenario: Targeted omission is non-retiring
- **WHEN** targeted test selects one member in a home containing other members
- **THEN** omitted members remain untouched and the outcome contains no complete-set or channel claim

#### Scenario: Complete-test omission is non-retiring
- **WHEN** a complete candidate set is fully visible and omits a member claimed by that target's prior complete-test receipt
- **THEN** the omitted member remains untouched and no retirement, acceptance, promotion, or channel claim is created

#### Scenario: Complete test cannot reclassify canonical home
- **WHEN** complete test targets a home whose live receipt has canonical accepted scope
- **THEN** the target blocks before mutation rather than reclassifying or changing canonical state

#### Scenario: Canonical requires governed desired state
- **WHEN** canonical deployment lacks a valid governed acceptance, promotion attestation, fixed channel, or exact accepted projection
- **THEN** every target blocks before provider mutation

### Requirement: Repeated convergence is read-only
A fully converged repeated operation MUST still inspect governed records, artifacts, capability profiles, live provider inventory, visible state, and target receipts, but MUST perform zero provider mutations, file writes, enablement changes, marketplace changes, cleanup, artifact rebuild/publication, receipt writes, or capsule churn.

#### Scenario: Second canonical sync makes no changes
- **WHEN** canonical convergence is executed twice with identical governed desired state and unchanged live targets
- **THEN** the second result is `ReadOnlyConverged`, positive read counters are observed, and every mutation/write counter remains zero

### Requirement: Stale receipt normalization is an explicit mutation
Status MUST only report receipt/live-state disagreement. A mutating sync MAY plan `NormalizeReceipt` only after live verification proves one or more receipt claims unsupported. Normalization MUST remove only unsupported receipt claims, MUST NOT mutate provider state or unrelated receipt claims, MUST report a receipt mutation rather than `ReadOnlyConverged`, and MUST bind the exact prior receipt into controller-owned inverse coverage. Its receipt publication failure MUST leave truth explicit and retryable. The next identical successful sync MUST be read-only.

#### Scenario: Stale receipt alone normalizes without provider cleanup
- **WHEN** a receipt claims a managed plugin absent from live state while unrelated unmanaged native state exists
- **THEN** sync preserves all provider state, writes only the normalized receipt under capsule coverage, and reports the removed unsupported claim

#### Scenario: Status never normalizes
- **WHEN** read-only status observes the same stale receipt
- **THEN** it reports `DRIFTED` and performs zero provider, receipt, or capsule mutation

#### Scenario: Receipt normalization failure remains truthful
- **WHEN** receipt publication fails during normalization
- **THEN** the result is non-success, the prior receipt remains authoritative or exact partial publication is reported, and the controller capsule remains recoverable

#### Scenario: Normalization can be undone
- **WHEN** a successful receipt-only normalization is the last mutation and undo runs against its exact post-state
- **THEN** the provider owner restores the prior receipt without changing native provider state

### Requirement: Multi-home results preserve partial truth and isolation
Multiple explicit targets MUST be processed in canonical order under one operation result while retaining target-local plans, events, receipts, and status. One target's success, failure, capability observation, receipt, or cleanup proof MUST NOT authorize or falsify another. A partial run MUST be non-success and MUST preserve verified successful targets without claiming failed targets advanced or were rolled back.

#### Scenario: Home A verifies and home B fails
- **WHEN** A completes and B fails capability, install, visibility, cleanup, or receipt publication
- **THEN** A's exact verified state remains truthful, B remains unadvanced or reports its exact applied subset, the aggregate is non-success, and no A receipt authorizes B

### Requirement: Mechanical evidence is aggregate and immutable
After target-local outcomes and receipts settle, provider deployment MUST canonically construct one aggregate mechanical-evidence body over immutable inputs and every selected target's final provider-visible verification or failure facts, including release set, projections, adapter protocols, capability profiles, evaluation profile, target identities, verification procedures/results, evidence payload digests, and controller/schema protocols. Evidence MUST exclude applied/skipped transaction history, timestamps, mutation events, and receipt authority so a publication retry after read-only reinspection reproduces the same digest. Target receipts MUST NOT reference this later aggregate digest. Publication MUST use the consumer-owned `MechanicalEvidencePublisher` bound to the sole Template artifact-home adapter. Existing exact evidence MUST converge read-only.

#### Scenario: Complete successful evidence receives an immutable handle
- **WHEN** all complete-test targets settle and canonical evidence publication succeeds
- **THEN** the result returns the verified digest-addressed handle eligible for an acceptance request and no accepted claim

#### Scenario: Partial target truth precedes aggregate evidence
- **WHEN** home A settles successfully and home B later fails
- **THEN** A's receipt binds only target-local request/evaluation/projection/profile/visible identities, no receipt references nonexistent aggregate evidence, and any emitted evidence truthfully includes the stable final verification/failure facts without transaction history

#### Scenario: Evidence publication failure is independent
- **WHEN** target outcomes settle but immutable evidence publication fails
- **THEN** the aggregate result reports publication failure without rewriting provider state, receipts, capsule settlement, acceptance, or channel state, and a retry publishes the same digest from the same final verification facts without provider mutation

### Requirement: Outcomes report every observable phase truthfully
Mutating operations MUST report target-scoped planned, applied, verified, retired, skipped, blocked, and failed events that agree with actual adapter calls and persisted state. They MUST NOT return success after provider-visible, cleanup, receipt, or any selected-target failure.

#### Scenario: Failure after partial application is visible
- **WHEN** a failpoint fires after one or more native actions but before final receipt verification
- **THEN** the outcome reports each applied action, the missing later phases, a failed event, non-success status, unchanged or exact prior receipt truth, and inverse coverage for the applied subset

### Requirement: Status is disjoint, target-scoped, and non-mutating
Status MUST join the governed channel state, artifact and projection availability, capability compatibility, live target inventory, and target receipt to return exactly one primary classification per target: `CONTENT_AHEAD_OF_ACCEPTANCE`, `ACCEPTED_PENDING_CONVERGENCE`, `CONVERGED`, `DRIFTED`, `BLOCKED_COLLISION`, or `INCOMPATIBLE_PROVIDER`. Status MUST NOT repair provider, receipt, channel, Oclif, export, app, or capsule state.

#### Scenario: Oclif drift is irrelevant
- **WHEN** every provider/channel state is exercised while unrelated Oclif registry drift exists
- **THEN** target classifications remain determined solely by lifecycle owners and no Oclif read or repair occurs

### Requirement: Provider homes are exposed as a complete read snapshot
Before the first native mutation at an explicitly selected provider/home pair, the provider deployment owner MUST include `AdmitTargetIdentity` as that target's first typed action in the controller capsule candidate. After capsule begin, the action MUST atomically publish one target-identity sidecar keyed by provider and canonical real home identity, binding prior absence and exact expected post bytes before native mutation. The sidecar MUST grant only native-home exclusion identity; it MUST NOT grant convergence, receipt, selection, or cleanup authority. Canonical aliases MUST deduplicate to one sidecar. Ordinary plugin retirement MUST retain admitted sidecars because it does not decommission a provider home; C3 exposes no general home-decommission/removal transition. Exact undo of the first admitting operation MAY remove only that action-owned sidecar after native state and receipt restore to their prior state. A future general home-conversion feature is a redesign trigger. The complete snapshot MUST enumerate and verify all sidecars, fail closed on any malformed, aliased, unreadable, or partially published entry, and MUST NOT infer homes from receipts or ambient scans.

#### Scenario: First mutation admits target identity
- **WHEN** an explicit canonical provider home has a mutating plan and no sidecar
- **THEN** the capsule admits sidecar creation as the first target action and publication succeeds atomically before native mutation or the target blocks with exact recovery truth

#### Scenario: Failure after first admission is covered
- **WHEN** sidecar admission applies and a failure or crash occurs before the next native action binds its post-state
- **THEN** applied/failed events and cold recovery identify the exact sidecar post-state and the capsule retains inverse coverage

#### Scenario: Read-only observation does not admit a target
- **WHEN** status, planning, or a converged read-only operation names a never-mutated home
- **THEN** it performs no sidecar write and does not make that home part of the persisted complete snapshot

#### Scenario: Retiring all plugins retains provider-home identity
- **WHEN** exact receipt-owned retirement removes the final managed plugin and receipt claim from an admitted home
- **THEN** the target sidecar remains, the home stays in the complete native-home snapshot, and no hidden export conversion occurs

#### Scenario: Undo of first admitting operation restores absence
- **WHEN** the first admitting operation is undone while its exact sidecar post-state, restored provider state, and restored receipt state all verify
- **THEN** provider replay removes only that action-owned sidecar and restores the pre-operation absent identity

#### Scenario: Malformed sidecar fails the complete snapshot
- **WHEN** any admitted target sidecar is malformed, aliased, unreadable, or incomplete
- **THEN** snapshot creation fails closed rather than omitting the target

#### Scenario: Export overlap sees all selected homes
- **WHEN** an export destination aliases any admitted native provider home
- **THEN** the complete native-home snapshot exposes the overlap and export rejects without either owner mutating state

### Requirement: Native state does not depend on a content checkout
Native package staging and provider-visible state MUST derive from immutable artifacts and stable Template runtime roots. No marketplace, provider identity, receipt, package source, or installed state may use a disposable content or implementation worktree as operational authority.

#### Scenario: Worktrees disappear after convergence
- **WHEN** content and implementation worktrees are removed after artifact publication and native convergence
- **THEN** live provider verification, status, and repeated convergence remain correct from installed controller, immutable artifacts, governed records, and target state
