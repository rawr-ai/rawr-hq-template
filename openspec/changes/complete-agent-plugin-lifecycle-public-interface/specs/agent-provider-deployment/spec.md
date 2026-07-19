## RENAMED Requirements

- FROM: `### Requirement: Native replacement is visible before receipt-owned cleanup`
- TO: `### Requirement: Canonical replacement precedes omitted-member cleanup`
- FROM: `### Requirement: Stale receipt normalization is an explicit mutation`
- TO: `### Requirement: Noncanonical stale receipt normalization is an explicit mutation`
- FROM: `### Requirement: Provider homes are exposed as a complete read snapshot`
- TO: `### Requirement: Noncanonical provider homes are exposed as a complete read snapshot`

## MODIFIED Requirements

### Requirement: Live provider truth is read for every operation
Each selected provider home MUST be inventoried through its native adapter on
every plan, status, test, and sync operation. Inventory MUST include
native plugin identity, enablement and configuration, visible skills and hooks
required by the projection, relevant marketplace/source identity, and embedded
RAWR artifact provenance. Targeted and complete-test modes also observe their
target receipts. Canonical sync and status MUST NOT require a receipt or target
sidecar to observe, adopt, preserve, replace, or retire managed native state.

#### Scenario: Recorded and live state disagree
- **WHEN** any prior record claims convergence but native plugins, skills,
  hooks, enablement, provenance, or bytes are missing or altered
- **THEN** live truth wins and the target is classified drifted or blocked
  without unrelated repair

#### Scenario: Manually added native state is observed
- **WHEN** unmanaged native state appears after the last operation
- **THEN** inventory reports it and planning preserves it unless it blocks an
  exact planned identity

### Requirement: Receipt scope is closed by lifecycle mode
Every target receipt MUST retain exactly one of the landed closed scope variants
with no optional or combined fields. `TargetedTestScope` and
`CompleteTestScope` are the complete receipt union and keep their existing
mode-local authority. The retired canonical-accepted variant and its
acceptance/promotion digests MUST fail closed at receipt decoding. Canonical
sync and status MUST NOT read, create, normalize, or write any target receipt,
and no receipt may authorize canonical selection, ownership, convergence, or
omitted-member retirement.

#### Scenario: Test receipts cannot claim canonical authority
- **WHEN** a targeted or complete-test receipt contains channel, canonical
  retirement, or canonical convergence fields
- **THEN** receipt validation rejects before planning or mutation

#### Scenario: Retired canonical receipt is decoded
- **WHEN** receipt decoding encounters the retired canonical-accepted scope or
  its acceptance/promotion fields
- **THEN** decoding rejects it as invalid and exposes no compatibility value

### Requirement: Planning is target-scoped and read-only
The deployment service MUST canonicalize selected homes and create a
deterministic independent plan per provider-home target. Targeted and
complete-test planning retains its existing projection, capability, inventory,
and receipt inputs. Every provider mode MUST avoid controller capsule ports.
Canonical planning MUST use only the resolved
`CanonicalChannelSelection`, verified immutable release/projection, observed
capabilities, and live native inventory/provenance. It MUST NOT call, read, or
write receipt, target-sidecar, evidence, hosted-governance, or promotion
ports and MUST perform no mutation. Canonical handlers MUST express this as a
required narrow static dependency view rather than an optional context bag.

#### Scenario: Same desired state yields independent plans
- **WHEN** home A is converged and home B is missing one selected plugin
- **THEN** A plans read-only verification while B plans only its target-local
  native changes

#### Scenario: Ambiguous native provenance blocks canonical cleanup
- **WHEN** an occupied identity lacks exact `rawr-hq` marketplace identity and
  verified embedded artifact provenance
- **THEN** canonical planning preserves it and blocks the conflicting target

#### Scenario: Marketplace alone cannot prove ownership
- **WHEN** native state uses the exact `rawr-hq` marketplace but embedded RAWR
  artifact provenance is missing, invalid, or mismatched
- **THEN** canonical planning returns `BLOCKED_COLLISION` with zero native
  mutation

#### Scenario: Embedded provenance alone cannot prove ownership
- **WHEN** native state carries valid-looking embedded RAWR provenance under a
  foreign marketplace identity
- **THEN** canonical planning returns `BLOCKED_COLLISION` with zero native
  mutation

### Requirement: Canonical replacement precedes omitted-member cleanup
When canonical desired state replaces a same-ID managed member, apply MUST
retire the exact native member proven by `rawr-hq` marketplace identity and
verified embedded RAWR artifact provenance, verify membership plus
enablement/configuration residue absent, install and enable the selected member
through native commands, and verify the selected provider-visible projection.
Fresh catalog or plugin-list metadata MUST NOT substitute for the native
remove/add refresh transition. Omitted managed members MUST retire only after
the selected replacement set is visible. Canonical apply MUST publish no
receipt, sidecar, evidence, or undo capsule.

#### Scenario: Successful canonical replacement orders mutations
- **WHEN** canonical convergence replaces managed prior state
- **THEN** the changed same-ID member is natively retired before reinstall,
  selected visibility precedes omitted-member cleanup, and final native
  inventory equals the selected set

#### Scenario: Catalog metadata cannot masquerade as a refresh
- **WHEN** a marketplace advertises changed bytes for an enabled identity but
  the old native installation or configuration remains
- **THEN** the target is not converged and apply performs the typed native
  remove/add transition

#### Scenario: Visibility failure preserves the exact applied prefix
- **WHEN** native install returns success but selected provider-visible state
  cannot be verified
- **THEN** cleanup does not run, the result is non-success, and retry starts by
  re-reading live state without claiming rollback

### Requirement: Ownership proof bounds all native retirement
Targeted and complete-test mutation MUST retain the existing same-target receipt
ownership law. Canonical omitted-member retirement MUST affect only native state
with both exact `rawr-hq` marketplace identity and verified embedded RAWR
artifact provenance in that home. Names, paths, byte similarity,
another home's receipt, an export ledger, a channel record alone, or legacy
receipt/sidecar bytes MUST NOT prove canonical ownership. Unmanaged and
ambiguous collisions MUST be preserved and block.

Canonical convergence MAY retire one exact selected-owner provider
configuration slot without artifact provenance only when live native inventory
proves that the owner-qualified selector is configured but has no installed
package. This exception authorizes only the provider's native configuration
remove/uninstall command; it MUST NOT classify, delete, or claim package bytes,
receipts, sidecars, or other provider state. Residue for a selected member MUST
retire before that member is installed or enabled. Residue for an omitted
member MUST retire only after selected visibility. An installed exposure or an
exposure owned by another provider source remains preserved and blocks when it
collides.

#### Scenario: Proven canonical member retires
- **WHEN** the reviewed complete set omits a native member whose marketplace and
  embedded provenance prove RAWR management in that same home
- **THEN** only that exact member retires after the selected set is visible

#### Scenario: Exact selected-owner configuration residue retires
- **WHEN** an owner-qualified native selector remains configured but exact live
  inventory proves that no package is installed for that selector
- **THEN** canonical convergence removes only that configuration exposure,
  verifies the exact selector absent, and preserves replacement-before-omission
  ordering

#### Scenario: Unmanaged collision is preserved
- **WHEN** an unmanaged marketplace, standalone skill, or native plugin occupies
  a planned identity
- **THEN** it is preserved, the target is `BLOCKED_COLLISION`, and no fallback
  or automatic adoption occurs

### Requirement: Desired-state mode limits convergence authority
Targeted tests MUST mutate only selected release members in explicit test homes
and MUST NOT retire omitted members or claim channel convergence. Complete tests
MAY evaluate the full candidate set in explicit test homes, MUST preserve every
omitted member, and MUST NOT authorize absent-member retirement, acceptance, or
canonical state. Canonical convergence MUST use exactly one valid reviewed
current-main v2 selector and is the only mode that may retire omitted
provenance-managed members.

#### Scenario: Targeted and complete-test omission is non-retiring
- **WHEN** either test mode omits an existing member
- **THEN** the member remains untouched and no canonical/channel claim is made

#### Scenario: Canonical selection is invalid
- **WHEN** canonical deployment lacks a valid current-main v2 record, selected
  complete-set artifact, or exact Codex and Claude projection bindings
- **THEN** every requested target is `BLOCKED_SELECTION` before native mutation

### Requirement: Repeated convergence is read-only
A fully converged repeated operation MUST still inspect its desired-state
authority, immutable artifact/projection, capability profile, live native
inventory, visible state, and mode-owned provenance. Targeted and complete-test
modes retain their receipt reads. Canonical sync/status MUST perform zero native
mutation and MUST NOT call or write receipt, sidecar, evidence, hosted, or
promotion ports. Every provider mode MUST leave controller capsule ports cold.
No repeated mode may rebuild or republish artifacts.

#### Scenario: Second canonical sync makes no changes
- **WHEN** canonical convergence executes twice with identical selected state
  and unchanged live targets
- **THEN** the second result is `ReadOnlyConverged`, positive read counters are
  observed, managed inventory is identical, and every lifecycle/native mutation
  counter is zero

### Requirement: Noncanonical stale receipt normalization is an explicit mutation
Targeted and complete-test status MUST only report their receipt/live-state
disagreement. A mutating targeted or complete-test operation MAY retain the
existing bounded receipt-normalization transition, reporting its exact applied
prefix and retrying from live observation without inverse coverage.
Canonical sync/status MUST NOT inspect, normalize, remove, or publish a receipt,
and legacy receipt bytes MUST NOT alter canonical planning or status.

#### Scenario: Canonical operation encounters stale receipt bytes
- **WHEN** native state is valid for the selected current-main projection but a
  stale legacy receipt also exists
- **THEN** canonical status is derived from native truth and canonical sync
  performs no receipt or capsule mutation

### Requirement: Multi-home results preserve partial truth and isolation
Multiple explicit targets MUST be processed in canonical order under one
operation result. Targeted and complete-test modes retain their target-local
plans, phase events, inventory, status, and receipt results. Canonical status
returns only terminal classification and issues; canonical sync adds only its
exact native applied prefix and terminal verification result. Canonical results
MUST NOT contain or infer receipts, persisted inventory, or a replacement event
graph. One target's success, failure, capability/provenance observation, or
cleanup proof MUST NOT authorize or falsify another. A partial run MUST be
non-success and MUST preserve verified successful targets without claiming
failed targets advanced or were rolled back.

#### Scenario: Home A verifies and home B fails
- **WHEN** A completes and B fails capability, native install, visibility, or
  cleanup
- **THEN** A's exact verified state remains truthful, B reports its exact
  applied prefix, and the aggregate is non-success

### Requirement: Mechanical evidence is aggregate and immutable
Complete-test evidence MUST retain its existing bounded immutable proof over
its candidate inputs and final provider-visible facts. It MUST exclude channel
authority and MUST NOT authorize current-main, canonical ownership, canonical
cleanup, or native state. Canonical sync/status MUST neither require nor publish
mechanical evidence.

#### Scenario: Complete test emits mechanical proof
- **WHEN** all complete-test targets settle and evidence publication succeeds
- **THEN** the result exposes deterministic proof with no accepted, channel,
  ownership, or canonical-cleanup claim

### Requirement: Outcomes report every observable phase truthfully
Targeted and complete-test mutations MUST retain target-scoped planned,
applied, verified, retired, skipped, blocked, and failed events that agree with
actual adapter calls and mode-owned persisted state. Canonical sync MUST report
its target status, exact applied native prefix, terminal verification, and
issues without recreating that event envelope. No mode may return success after
a provider-visible, cleanup, receipt (when applicable), or selected-target
failure, or claim rollback that was not observed.

#### Scenario: Failure after partial application is visible
- **WHEN** a failpoint fires after one or more native actions
- **THEN** the outcome reports each applied action, the missing later phases,
  and non-success; retry begins by re-reading live state

#### Scenario: Omitted-member retirement fails after selected visibility
- **WHEN** the selected set is verified visible and native retirement of an
  omitted provenance-managed member fails after one applied cleanup action
- **THEN** the outcome reports that exact applied prefix without rollback, and a
  retry re-reads native state and converges from what actually happened

### Requirement: Status is disjoint, target-scoped, and non-mutating
Canonical status MUST join the reviewed current-main selector, artifact and
projection availability, capability compatibility, live native inventory, and
embedded provenance to return exactly one primary classification per target:
`BLOCKED_SELECTION`, `CONVERGED`, `DRIFTED`, `BLOCKED_COLLISION`, or
`INCOMPATIBLE_PROVIDER`. It MUST NOT repair provider, receipt, channel, Oclif,
export, app, sidecar, evidence, or capsule state. Noncanonical status retains
its existing mode-owned classifications and receipt observations.

#### Scenario: Oclif drift is irrelevant
- **WHEN** provider/channel state is observed while unrelated Oclif registry
  drift exists
- **THEN** target classifications remain determined solely by lifecycle owners
  and no Oclif read or repair occurs

#### Scenario: Newer unselected content exists
- **WHEN** canonical personal main contains content newer than the exact
  reviewed selector
- **THEN** status evaluates only the selected release set and does not infer a
  content-ahead or pending-promotion state

### Requirement: Noncanonical provider homes are exposed as a complete read snapshot
Targeted and complete-test modes MUST retain the existing target-identity
sidecar admission, snapshot, and alias law. Provider operations no longer use
capsule inverse coverage. Canonical sync and
status MUST NOT enumerate, create, update, delete, or infer target identity from
those sidecars. Canonical homes are explicit operation inputs and native state
is their provider truth.

#### Scenario: Canonical target has no sidecar
- **WHEN** canonical sync selects an explicit home with valid managed native
  state and no target-identity sidecar
- **THEN** planning adopts native truth and no sidecar admission is planned

### Requirement: Native state does not depend on a content checkout
Native package staging and provider-visible state MUST derive from immutable
artifacts and stable Template runtime roots. No marketplace, provider identity,
package source, installed state, or mode-owned receipt may use a disposable
content or implementation worktree as operational authority.

#### Scenario: Worktrees disappear after convergence
- **WHEN** content and implementation worktrees are removed after artifact
  publication and native convergence
- **THEN** live provider verification, status, and repeated convergence remain
  correct from the installed controller, immutable artifacts, reviewed channel,
  and native target state

## ADDED Requirements

### Requirement: Canonical handlers consume one resolved selection
Canonical sync and status MUST consume one governance-resolved
`CanonicalChannelSelection`; provider code MUST NOT parse current-main bytes or
own another channel DTO. Governance verifies Git and record identity. Provider
planning MUST verify selected artifact and re-rendered projection bytes before
native mutation. The complete-set artifact's embedded content authority,
repository identity, source commit, source tree, and release-input digest MUST
equal the selection exactly.

#### Scenario: Artifact or projection does not match the selector
- **WHEN** the selected artifact is missing/tampered or a re-rendered projection
  differs from its exact binding, or any embedded source identity differs
- **THEN** the target is `BLOCKED_SELECTION` and every native mutation counter
  remains zero

### Requirement: Persistent active visibility is an operational oracle
The Codex adapter MUST execute and verify the native remove/add refresh
transition for stale same-ID releases. Fresh app-server inventory MUST NOT be
claimed as proof that an already-running Desktop task reloaded its catalog.
Approved-home settlement MUST record one bounded persistent-task observation
separately, and C6 MUST NOT add app/runtime composition machinery to manufacture
that proof.

#### Scenario: Fresh inspection passes but persistent task is stale
- **WHEN** fresh native inventory sees the selected cognition release but the
  bounded persistent Desktop task still exposes the old catalog
- **THEN** settlement remains unproven until the native refresh boundary is
  observed in that task; no fresh-process result is relabeled as active proof

### Requirement: Export-owned roots block every provider mode
Every provider plan/status operation MUST require its explicit canonical home to
already exist as a directory, then read only the fixed
`.rawr-agent-plugin-owner.json` slot at that home before native execution. Any
entry or unreadable result at the slot MUST be `BLOCKED_COLLISION`; absence
permits ordinary provider planning. The native resource MUST recheck slot
absence immediately before each native command. A missing home MUST block and
the provider lifecycle MUST NOT create it. Provider code MUST NOT parse or
import the export marker codec, read an export ledger, scan export destinations,
aggregate native homes, or infer ownership from path shape.

#### Scenario: Export owns a provider home candidate
- **WHEN** a provider request selects a home whose fixed marker slot is occupied
- **THEN** the target is `BLOCKED_COLLISION` before native mutation and no
  provider receipt, sidecar, or capsule changes

#### Scenario: Provider state exists first
- **WHEN** an explicit existing unmarked root is selected as a provider home
- **THEN** provider convergence and a repeated read-only invocation succeed,
  later export admission blocks at its own boundary, and provider state remains
  the sole root owner

#### Scenario: Missing home is not prepared
- **WHEN** a provider request selects an absent explicit home
- **THEN** the operation blocks without creating the home or invoking a native
  command

#### Scenario: Marker slot becomes occupied at the native edge
- **WHEN** planning observes an absent marker slot but the native resource
  recheck observes any entry or unreadable result before command execution
- **THEN** that native invocation does not start and reports a
  `BLOCKED_COLLISION` issue; capability or observation remains blocked, while a
  mutation bridge that may already have invoked an earlier native command
  remains uncertain rather than falsely reporting a zero-mutation target

#### Scenario: Provider cannot enter an unmarked publication window
- **WHEN** an authorized export claim transitions an absent destination while a
  provider observes the same path
- **THEN** the provider can observe only a missing home or the occupied marker
  and cannot enter native mutation through an export-created unmarked root

#### Scenario: Later provider operations honor a completed export claim
- **WHEN** an export claim has published its exact marker and a provider request
  later selects that root
- **THEN** the provider observes the occupied marker slot and cannot enter
  native mutation
