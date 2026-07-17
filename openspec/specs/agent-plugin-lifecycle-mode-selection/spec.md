# agent-plugin-lifecycle-mode-selection Specification

## Purpose
TBD - created by archiving change establish-agent-plugin-native-convergence. Update Purpose after archive.
## Requirements
### Requirement: Exactly one lifecycle desired-state mode
The system MUST parse every provider-test or convergence request into `ProviderDeploymentRequest = TargetedTest | CompleteTest | CanonicalSync` before invoking any Git, artifact, provider, receipt, capsule, export, Oclif, or record port. Fields belonging to another mode MUST reject rather than be ignored.

#### Scenario: Pairwise mixed modes reject without calls
- **WHEN** any pairwise combination of targeted release refs, a complete-set ref, a canonical channel, acceptance override, or promotion override is supplied
- **THEN** parsing rejects before every observable port call or state mutation

#### Scenario: One legal mode is selected
- **WHEN** a request supplies exactly the required fields for one mode and no foreign fields
- **THEN** parsing returns the corresponding discriminated mode with no optional alternate authority

### Requirement: Targeted test mode is member-scoped
Targeted test mode MUST require one or more explicit immutable release artifact refs, one or more explicit provider targets, and an evaluation profile. It MUST NOT claim complete-set convergence, authorize channel state, or retire an omitted member.

#### Scenario: Targeted test preserves omitted members
- **WHEN** selected release members are tested in a provider home that contains another managed member
- **THEN** the plan contains no retirement or complete-channel claim for the omitted member

### Requirement: Complete test mode is set-scoped but non-authorizing
Complete test mode MUST require exactly one complete release-set artifact ref, one or more explicit provider targets, and an evaluation profile. It MAY emit complete mechanical evidence, but MUST NOT author an accepted outcome, promotion attestation, or channel record.

#### Scenario: Complete test emits evidence only
- **WHEN** every member and provider-visible projection verifies in all selected test targets
- **THEN** the result contains digest-bound mechanical evidence and no accepted or promoted lifecycle state

### Requirement: Canonical sync resolves fixed repository authority
`CanonicalSync` MUST require the fixed policy-enumerated `current-main` channel, an explicit read-only content/record Git locator, and one or more explicit provider targets. It MUST reject caller-supplied release, set, acceptance, projection, promotion, or receipt overrides.

#### Scenario: Canonical authority is resolved rather than overridden
- **WHEN** canonical mode is parsed with `current-main`, an explicit Git locator, and explicit homes
- **THEN** the release set, acceptance, projections, and promotion facts are obtainable only through the governed channel resolver

#### Scenario: Canonical override rejects
- **WHEN** canonical mode also supplies a release ref, acceptance path, evidence object, projection digest, or promotion attestation
- **THEN** parsing rejects before reading the canonical repository or a provider target

### Requirement: Status and retirement use separate exact requests
Read-only status MUST use `CanonicalStatusRequest` containing only the fixed channel, explicit Git locator, and selected targets. Explicit retirement MUST use `ManagedRetireRequest` containing one curated plugin ID and one or more explicit selected targets. Neither request MUST be represented as a fourth deployment mode or accept release, set, acceptance, projection, promotion, channel-override, receipt, or generic path inputs.

#### Scenario: Canonical status remains read-only and exact
- **WHEN** status receives its fixed channel, Git locator, and selected targets with no foreign field
- **THEN** it parses as `CanonicalStatusRequest` and cannot be dispatched to a mutating deployment operation

#### Scenario: Managed retire is owner-scoped
- **WHEN** retirement receives a curated plugin ID and one or more canonical provider targets
- **THEN** it parses as `ManagedRetireRequest` whose application must obtain ownership independently from every target's live receipt and preserve per-target partial truth

#### Scenario: Cross-operation fields reject
- **WHEN** status or retire receives a deployment selector, artifact/evidence override, alternate channel, receipt object, destination, or filesystem path
- **THEN** parsing rejects before every observable port call

### Requirement: Channel and target syntax is closed and path-safe
Channel input MUST be an exact enumerated identifier and MUST NOT be interpreted as a path or ref expression. Every provider target MUST pair a supported provider ID with a canonical absolute home. Targets MUST be distinct after canonicalization and sorted deterministically.

#### Scenario: Unknown or path-shaped channel rejects
- **WHEN** a channel is unknown, contains a path separator, traversal, URL, Git ref syntax, or alternate spelling
- **THEN** parsing rejects it without attempting filesystem or Git resolution

#### Scenario: Ambiguous target rejects
- **WHEN** a target has an unsupported provider, relative/noncanonical home, or duplicates another canonical provider-home pair
- **THEN** parsing rejects the entire request before target inspection

