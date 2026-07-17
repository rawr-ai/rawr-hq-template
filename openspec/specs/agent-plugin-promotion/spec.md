# agent-plugin-promotion Specification

## Purpose
TBD - created by archiving change establish-agent-plugin-native-convergence. Update Purpose after archive.
## Requirements
### Requirement: Mechanical evidence cannot authorize acceptance
Provider deployment MUST own and canonically emit bounded immutable mechanical evidence that binds the release set or targeted members, every evaluated provider projection, adapter protocol and capability profile, the evaluation profile, controller release/protocol identity, evidence schema protocol, every canonical provider-target identity, and the exact verification command/procedure identifiers, outcomes, and evidence payload digests. Promotion MUST consume only a verified immutable evidence observation/handle through its consumer-owned reader port. Test, content, deployment, promotion-generation, and director actors MUST NOT issue an accepted result.

#### Scenario: Successful test remains mechanical
- **WHEN** every selected provider target passes its mechanical evaluation
- **THEN** the emitted record is evidence for an acceptance request and carries no accepted or channel-authorizing claim

#### Scenario: Self-issued acceptance rejects
- **WHEN** an ordinary worker, test application, deployment adapter, promotion generator, or director presents schema-valid bytes claiming `accepted`
- **THEN** governed acceptance validation rejects the claim before promotion, channel resolution, or provider mutation

### Requirement: Acceptance request and evidence are digest-bound and bounded
`AcceptanceRequest` MUST bind one complete immutable release set, every required provider projection, adapter protocol and capability profile, complete mechanical evidence handles/digests, an evaluation profile, and the required fresh-agent target. `AcceptanceEvidence` MUST bind that request digest, outcome, issuer identity, issuer protocol `independent-agent-plugin-acceptance/v1`, issuer schema protocol, bounded clean-context issuer task identity, issuance time, issuer implementation identity, and repository policy identity. Duplicate, missing, extra, oversized, or noncanonical bindings MUST reject.

#### Scenario: Complete canonical evidence validates structurally
- **WHEN** request and evidence contain one canonically ordered exact binding for every required projection, profile, and evidence payload within protocol bounds
- **THEN** their canonical digests verify without consulting mutable provider state

#### Scenario: Altered evidence binding rejects
- **WHEN** any release-set, projection, capability, evaluation, issuer, target, or evidence digest changes
- **THEN** the request or evidence fails canonical validation

### Requirement: Governed acceptance requires repository authority
An accepted outcome MUST use issuer protocol `independent-agent-plugin-acceptance/v1`, reside at the request-selected protected acceptance path, and be observed at an exact clean Git commit/tree/blob governed by lifecycle policy that names the issuer and human repository approver. A separate repository-governance approval observation MUST bind the exact repository identity, canonical ref, commit, tree, acceptance path/blob, approving human identity, approval decision, and hosted Graphite/GitHub approval record. The approving identity MUST equal the policy-named human authority. JSON validity, filesystem location, a policy that merely names the right person, or caller assertion alone MUST NOT authorize acceptance.

#### Scenario: Governed accepted evidence is admitted
- **WHEN** exact Git objects prove the policy, requested acceptance blob, issuer identity, and transitive digest bindings and a hosted approval observation from the policy-named human binds that exact repository/ref/commit/tree/blob
- **THEN** the validator returns a governed accepted observation for that exact release set only

#### Scenario: Correct policy name without approval blocks
- **WHEN** policy names the correct human authority but no approval observation binds the exact landed acceptance blob
- **THEN** validation returns `BLOCKED_ACCEPTANCE_AUTHORITY`

#### Scenario: Approval for another object blocks
- **WHEN** an approval observation names the right human but binds another ref, commit, tree, path, blob, or outcome
- **THEN** validation returns `BLOCKED_ACCEPTANCE_AUTHORITY`

#### Scenario: Missing authority blocks
- **WHEN** the independent issuer or exact policy-authority approval observation is absent, external, stale, wrong-object, or unavailable
- **THEN** validation returns `BLOCKED_ACCEPTANCE_AUTHORITY` before acceptance, promotion, canonical resolution, or deployment

### Requirement: Promotion proves release-input equivalence without rebuilding
Promotion MUST compare the accepted source commit/tree release-input identity with the landed canonical-main commit/tree by reading the exact canonical tracked release-input blob through its own explicit read-only Git verifier and decoding it with the pure release domain. It MUST NOT import or invoke the build service. Equivalent release inputs MUST produce an attestation that preserves the original accepted release and projection provenance. Promotion MUST NOT publish, rebuild, rerender, replace, or relabel an artifact.

#### Scenario: Squash-equivalent landing attests
- **WHEN** Graphite or GitHub rewrites commit identity but the landed release-input identity is exactly equivalent to the accepted source
- **THEN** promotion emits a digest-bound attestation linking both Git identities to the unchanged accepted release set and projections

#### Scenario: Changed release input blocks
- **WHEN** one admitted release-input byte, mode, path, member, ownership claim, or policy input differs after landing
- **THEN** promotion rejects and invokes no artifact publication, projection renderer, record writer, or provider port

### Requirement: Current-main resolution is fixed, transitive, and read-only
The canonical resolver MUST read only the fixed `current-main` record and its exact governed policy, acceptance, promotion, release-set, projection, and capability dependencies from an explicit Git locator. It MUST distinguish content ahead of acceptance, accepted pending convergence, current convergence eligibility, stale records, dirty/wrong/unreachable repositories, and lifecycle-record-only commits without using a feature worktree as desired state.

#### Scenario: Lifecycle-record-only promotion commit resolves
- **WHEN** a clean landed commit changes only the governed promotion/channel records and its attestation binds equivalent previously accepted release inputs
- **THEN** `current-main` resolves to `ACCEPTED_PENDING_CONVERGENCE` without a skip or provider-state precondition

#### Scenario: Stale or forged current-main blocks
- **WHEN** a channel dependency is stale, missing, forged outside the governed tree, points at content-ahead main, or is not reachable under current policy
- **THEN** the resolver returns the exact non-authorizing classification and performs no repair or mutation

### Requirement: Promotion and status never mutate
Acceptance validation, promotion verification, canonical resolution, and repository-level status MUST be read-only. They MUST NOT write lifecycle records, artifacts, receipts, provider state, Oclif state, app composition, capsule state, or source bytes.

#### Scenario: Read-only ports are enforced
- **WHEN** each success and failure path is executed with mutation-port traps
- **THEN** only bounded Git, record, and artifact verification reads occur

