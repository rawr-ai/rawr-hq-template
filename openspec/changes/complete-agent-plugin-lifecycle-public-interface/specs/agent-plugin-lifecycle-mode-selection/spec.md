## RENAMED Requirements

- FROM: `### Requirement: Status and retirement use separate exact requests`
- TO: `### Requirement: Status uses one separate exact request`

## MODIFIED Requirements

### Requirement: Exactly one lifecycle desired-state mode

The system MUST parse every provider request as exactly `TargetedTest`,
`CompleteTest`, or `CanonicalSync` before Git, provider, Oclif, or
record access. Fields belonging to another mode MUST reject rather than be
ignored. No mode may accept a receipt, target sidecar, evidence handle, capsule,
export destination, promotion, or CLI-install identity.

#### Scenario: Pairwise mixed modes reject without calls
- **WHEN** a request mixes a targeted member selection, an explicit complete
  selection, or the canonical channel
- **THEN** parsing rejects before every observable port call or state mutation

#### Scenario: One legal mode is selected
- **WHEN** a request supplies exactly the required fields for one mode
- **THEN** parsing returns that discriminated request with no optional alternate
  authority

### Requirement: Targeted test mode is member-scoped

Targeted test mode MUST require one explicit immutable Git selection, a
nonempty duplicate-free member selection from that closed input, explicit
disposable provider homes, and an evaluation profile. It MUST derive the
selected release state in memory, preserve omitted members, and return bounded
inline verification facts without persisting a receipt, identity sidecar,
evidence handle, artifact, or channel claim.

#### Scenario: Targeted test preserves omitted members
- **WHEN** selected members are tested in a disposable home containing another
  managed member
- **THEN** no native retirement or complete-channel claim is produced for the
  omitted member

### Requirement: Complete test mode is set-scoped but non-authorizing

Complete test mode MUST require one explicit immutable Git selection, explicit
disposable provider homes, and an evaluation profile. It MUST derive the exact
closed set in memory, return bounded inline verification facts, and MUST NOT
persist a receipt, sidecar, custom evidence artifact, release artifact,
accepted outcome, promotion, or channel record.

#### Scenario: Complete test verifies the set
- **WHEN** every selected member and provider-visible projection verifies
- **THEN** the result reports exact per-target verification facts with no
  accepted, promoted, or canonical state

### Requirement: Canonical sync resolves fixed repository authority

`CanonicalSync` MUST require the fixed `current-main` channel, one explicit
read-only content Git locator, and explicit provider homes. It MUST reject
caller-supplied release, set, acceptance, evidence, projection, promotion,
receipt, sidecar, or alternate-channel overrides. Governance is the sole
producer of `CanonicalChannelSelection`.

#### Scenario: Canonical authority is resolved rather than overridden
- **WHEN** canonical mode receives `current-main`, an explicit Git locator, and
  explicit homes
- **THEN** one resolved selection supplies the exact content identity and
  evaluation profile from which the installed Template CLI derives the complete
  set and current provider projections

#### Scenario: Retired authority override rejects
- **WHEN** canonical mode also supplies a release ref, evidence object,
  projection digest, promotion, receipt, or CLI-install identity
- **THEN** parsing rejects before canonical Git or provider access

### Requirement: Status uses one separate exact request

Read-only status MUST use `CanonicalStatusRequest` containing only the fixed
channel, explicit Git locator, and selected homes. `ManagedRetireRequest` and
its procedure/command MUST be absent. Status MUST NOT accept deployment,
artifact/evidence override, alternate channel, receipt, sidecar, destination,
or generic path inputs.

#### Scenario: Canonical status remains read-only and exact
- **WHEN** status receives its exact fields and no foreign input
- **THEN** it parses as `CanonicalStatusRequest` and cannot dispatch a mutating
  provider operation

#### Scenario: Retired explicit cleanup is requested
- **WHEN** a caller supplies `rawr agent plugins retire`, its procedure, or its
  request shape
- **THEN** discovery or parsing rejects before provider access
