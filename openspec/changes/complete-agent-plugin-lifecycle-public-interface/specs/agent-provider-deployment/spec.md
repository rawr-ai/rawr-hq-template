## RENAMED Requirements

- FROM: `### Requirement: Native replacement is visible before receipt-owned cleanup`
- TO: `### Requirement: Native replacement precedes omitted-member cleanup`
- FROM: `### Requirement: Ownership proof bounds all native retirement`
- TO: `### Requirement: Verified native provenance bounds all retirement`
- FROM: `### Requirement: Native state does not depend on a content checkout`
- TO: `### Requirement: Native state does not depend on mutable checkout bytes`

## MODIFIED Requirements

### Requirement: Live provider truth is read for every operation

Each selected provider home MUST be inventoried through its native adapter on
every status, test, and sync operation. Inventory MUST include native plugin
identity, enablement/configuration, provider-visible skills and hooks required by
the projection, relevant marketplace/source identity, and embedded RAWR
provenance. Native observation MUST win over any prior evidence, cache, or test
record. Canonical status and sync MUST NOT require a receipt or sidecar.

#### Scenario: Recorded and live state disagree
- **WHEN** prior evidence or cache claims convergence but native state is missing,
  changed, disabled, or provenance-mismatched
- **THEN** the target is classified from live truth without unrelated repair

#### Scenario: Manually added native state is observed
- **WHEN** unmanaged native state appears after the last operation
- **THEN** inventory reports and preserves it unless it blocks an exact desired
  identity

### Requirement: Planning is target-scoped and read-only

The deployment service MUST canonicalize explicit provider homes and produce an
independent deterministic plan for each target. Canonical planning MUST use only
the governance-resolved selection, verified release/projection, observed
capabilities, and live native inventory/provenance. It MUST perform no mutation
and MUST NOT read or write receipts, sidecars, evidence, export, undo,
hosted-governance, promotion, Oclif-extension, or app/runtime state.

#### Scenario: Same desired state yields independent plans
- **WHEN** home A is converged and home B lacks one selected plugin
- **THEN** A plans only verification and B plans only its target-local native
  changes

#### Scenario: Ambiguous native provenance blocks cleanup
- **WHEN** an occupied identity lacks exact managed marketplace/source identity
  and verified embedded RAWR provenance
- **THEN** planning preserves it and blocks the conflicting target

### Requirement: Native replacement precedes omitted-member cleanup

Canonical replacement MUST retire a stale same-ID RAWR-managed member through
the provider's native command, verify it absent, install and enable the selected
member through native commands, and verify provider-visible projection before
retiring omitted managed members. Fresh catalog or list metadata MUST NOT
substitute for the native refresh transition. Canonical apply MUST publish no
receipt, sidecar, evidence, export record, or undo state.

#### Scenario: Successful same-ID replacement orders mutations
- **WHEN** canonical convergence replaces a stale managed member
- **THEN** native retirement precedes reinstall and selected visibility precedes
  omitted-member cleanup

#### Scenario: Visibility fails after native install
- **WHEN** native install returns success but selected provider-visible state is
  not verified
- **THEN** cleanup does not run, the result is non-success with the exact applied
  prefix, and retry starts from a fresh native inspection

### Requirement: Verified native provenance bounds all retirement

Canonical retirement MUST affect only live native state whose exact
marketplace/source identity and embedded RAWR provenance prove management in the
same explicit home. Names, paths, byte similarity, another home's record,
export state, or the channel record alone MUST NOT prove installed ownership.
Unmanaged and ambiguous collisions MUST be preserved and block before mutation.

#### Scenario: Proven omitted member retires
- **WHEN** the reviewed complete set omits a live member with exact same-home
  managed identity and provenance
- **THEN** only that member retires after the selected set is visible

#### Scenario: Unmanaged collision is preserved
- **WHEN** a foreign marketplace, standalone skill, or native plugin occupies a
  planned identity
- **THEN** it remains unchanged and the target is `BLOCKED_COLLISION`

### Requirement: Desired-state mode limits convergence authority

Canonical convergence MUST require exactly one valid reviewed current-main
selection and MUST be the only mode that retires omitted managed members.
Targeted and complete tests MUST use explicit disposable homes, MUST preserve
omitted members, and MUST NOT authorize channel selection or canonical
convergence.

#### Scenario: Noncanonical test omits an existing member
- **WHEN** a targeted or complete test excludes a member already in its explicit
  disposable home
- **THEN** the member remains unchanged and no channel claim is made

#### Scenario: Canonical selection is invalid
- **WHEN** canonical deployment lacks a valid selection, verified complete set,
  or exact provider projections
- **THEN** every target is `BLOCKED_SELECTION` before native mutation

### Requirement: Repeated convergence is read-only

A converged repeat MUST re-read its desired selection, derived projection,
capabilities, live native inventory, and provider-visible state. It MUST perform
zero native mutation and MUST NOT publish or update a receipt, sidecar, evidence
artifact, cache, export record, undo state, or projection.

#### Scenario: Second canonical sync makes no changes
- **WHEN** canonical sync repeats with unchanged desired and live state
- **THEN** it returns `ReadOnlyConverged` after positive reads with every
  lifecycle and native mutation counter at zero

### Requirement: Multi-home results preserve partial truth and isolation

Multiple explicit targets MUST be processed in canonical order and reported
independently. Canonical status MUST return terminal classification and issues;
canonical sync MUST add only the exact confirmed native applied prefix,
uncertainty, and terminal verification. One target MUST NOT authorize or
falsify another, and partial success MUST remain non-success without claiming
rollback.

#### Scenario: Home A verifies and home B fails
- **WHEN** A completes and B fails capability, native mutation, visibility, or
  cleanup
- **THEN** A remains truthfully verified and B reports its exact applied prefix
  and uncertainty under a non-success operation result

### Requirement: Outcomes report every observable phase truthfully

Public deployment results MUST report terminal status, exact confirmed native
mutations, uncertainty, bounded issues, and inline verification facts. They
MUST NOT require or expose internal plan steps, action objects,
projection payloads, receipt transitions, or event histories. No operation may
claim rollback or success that live observation did not verify.

#### Scenario: Failure follows partial application
- **WHEN** a native command fails after one or more confirmed mutations
- **THEN** the result reports the exact confirmed prefix and uncertainty, and a
  retry begins by re-reading live state

### Requirement: Status is disjoint, target-scoped, and non-mutating

Canonical status MUST join the reviewed selection, derived release/projection,
capability compatibility, and live native inventory to return exactly one
primary classification per explicit target: `BLOCKED_SELECTION`, `CONVERGED`,
`DRIFTED`, `BLOCKED_COLLISION`, or `INCOMPATIBLE_PROVIDER`. It MUST NOT repair
provider, Oclif, repository, export, app, evidence, cache, or other state.

#### Scenario: External Oclif state drifts
- **WHEN** canonical status runs while unrelated Oclif extension state differs
- **THEN** lifecycle classification remains unchanged and Oclif state is neither
  read nor repaired

#### Scenario: Newer unselected content exists
- **WHEN** Personal main contains content newer than the reviewed selection
- **THEN** status evaluates only the selected release set and infers no pending
  promotion

### Requirement: Native state does not depend on mutable checkout bytes

Provider-native input MUST derive from exact selected Git objects. Canonical
mutation MUST use a provider-native Git marketplace source at the selected
immutable Personal revision, and the provider MUST own its resulting snapshot
inside the explicit native home. A local content workspace remains only a Git
object locator and MUST NOT become package, provider, cache, or next-invocation
identity. Local marketplace paths are test-only and MUST share the bounded
lifetime of their disposable home.

#### Scenario: Mutable worktree differs from selected objects
- **WHEN** worktree bytes differ from the reviewed selected commit and tree
- **THEN** status or sync reads only the exact selected Git objects or returns
  `BLOCKED_SELECTION`
- **AND** it never substitutes mutable worktree bytes or a retained local copy

## REMOVED Requirements

### Requirement: Receipt scope is closed by lifecycle mode
**Reason**: No lifecycle mode needs a persisted receipt or identity sidecar.
**Migration**: Canonical status/sync use live native state; disposable tests
return bounded inline observations that ordinary CI may retain externally.

### Requirement: Stale receipt normalization is an explicit mutation
**Reason**: Canonical behavior cannot depend on receipt normalization, and the
adjacent test implementation does not define lifecycle authority.
**Migration**: Reinspect live native state and report drift without canonical
receipt mutation.

### Requirement: Mechanical evidence is aggregate and immutable
**Reason**: The lifecycle-owned custom evidence store has no independent
product consumer after the corrected distribution and test model.
**Migration**: Return bounded inline verification facts; ordinary CI may retain
the command result externally. No lifecycle evidence identity remains.

### Requirement: Provider homes are exposed as a complete read snapshot
**Reason**: Provider homes are explicit operation inputs. Sidecar snapshots and
home aggregation are not product authority.
**Migration**: Validate each explicit home and inspect it through its native
adapter.

## ADDED Requirements

### Requirement: Canonical handlers consume one resolved selection

Canonical sync and status MUST consume one governance-resolved
`CanonicalChannelSelection`. Provider code MUST NOT parse raw current-main bytes
or own another channel DTO. Provider planning MUST derive and verify the complete
release set and current provider projection from the selected Git objects before
native mutation.

#### Scenario: Selected content cannot be derived exactly
- **WHEN** a selected Git object is absent or tampered, or derived release state
  does not bind the selected repository, commit, tree, and release-input digest
- **THEN** the target is `BLOCKED_SELECTION` with zero native mutation

### Requirement: Persistent active visibility is an operational oracle

The Codex adapter MUST execute the provider-native refresh transition for a stale
same-ID release. Fresh native inventory MUST NOT be represented as evidence that
an already-running Desktop task reloaded its catalog. Approved-home settlement
MUST return that bounded observation for the operator or external settlement
record without writing lifecycle state or adding app/runtime composition.

#### Scenario: Fresh inspection passes but persistent task is stale
- **WHEN** fresh inventory sees selected cognition bytes but the bounded
  persistent Desktop task still exposes the old catalog
- **THEN** active-task settlement remains unproven and no fresh-process result is
  relabeled as that observation
