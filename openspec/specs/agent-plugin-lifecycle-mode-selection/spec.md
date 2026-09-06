# agent-plugin-lifecycle-mode-selection Specification

## Purpose
Define the closed targeted-test, complete-test, and canonical-sync modes,
including each mode's authority, lifetime, mutation, and result boundaries.
## Requirements
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
disposable provider homes beneath one explicit non-root disposable root. The
caller MUST give the live call exclusive use of that root. A later call MAY
reuse it only after the preceding call settles; overlapping calls MUST use
distinct roots. The operation MUST derive the selected release state in memory,
preserve omitted members, and return bounded inline verification facts without
persisting a receipt, identity sidecar, evidence handle, artifact, or channel
claim.

#### Scenario: Targeted test preserves omitted members
- **WHEN** selected members are tested in a disposable home containing another
  managed member
- **THEN** no native retirement or complete-channel claim is produced for the
  omitted member

### Requirement: Complete test mode is set-scoped but non-authorizing

Complete test mode MUST require one explicit immutable Git selection, explicit
provider homes beneath one explicit non-root disposable root. The caller MUST
give the live call exclusive use of that root. A later call MAY reuse it only
after the preceding call settles; overlapping calls MUST use distinct roots.
The operation MUST derive the exact closed set in memory, return bounded inline
verification facts, and MUST NOT persist a receipt, sidecar, custom evidence
artifact, release artifact, accepted outcome, promotion, or channel record.

#### Scenario: Complete test verifies the set
- **WHEN** every selected member and declared provider-visible file verifies
- **THEN** the result reports exact per-target verification facts with no
  accepted, promoted, or canonical state

### Requirement: Canonical sync resolves fixed repository authority

`CanonicalSync` MUST require the fixed `current-main` channel, one explicit
read-only external-content Git locator, and explicit provider homes. It MUST
reject caller-supplied release, set, acceptance, evidence, projection,
promotion, receipt, sidecar, or alternate-channel overrides. Governance is the
sole producer of `CanonicalChannelSelection`. The Habitat agent-plugin topic
MUST project that exact request, and the Habitat app profile
MUST select the content and native-provider capabilities that execute it.

#### Scenario: Canonical authority is resolved rather than overridden

- **WHEN** canonical mode receives `current-main`, an explicit Git locator, and
  explicit homes through `habitat agent plugins sync`
- **THEN** one resolved selection supplies the exact content identity from which
  the Habitat-app-selected content and provider capabilities derive the complete
  set and selected native marketplace content

#### Scenario: Retired authority override rejects

- **WHEN** canonical mode also supplies a release ref, evidence object,
  projection digest, promotion, receipt, or CLI-install identity
- **THEN** parsing rejects before canonical Git or provider access

### Requirement: Channel and target syntax is closed and path-safe
Channel input MUST be an exact enumerated identifier and MUST NOT be interpreted as a path or ref expression. Every provider target MUST pair a supported provider ID with a canonical absolute home. Targets MUST be distinct after canonicalization and sorted deterministically.

#### Scenario: Unknown or path-shaped channel rejects
- **WHEN** a channel is unknown, contains a path separator, traversal, URL, Git ref syntax, or alternate spelling
- **THEN** parsing rejects it without attempting filesystem or Git resolution

#### Scenario: Ambiguous target rejects
- **WHEN** a target has an unsupported provider, relative/noncanonical home, or duplicates another canonical provider-home pair
- **THEN** parsing rejects the entire request before target inspection

### Requirement: Status uses one separate exact request

Read-only `habitat agent plugins status` MUST use `CanonicalStatusRequest`
containing only the fixed channel, explicit Git locator, and selected homes.
`ManagedRetireRequest` and its procedure/command MUST be absent. Status MUST NOT
accept deployment, artifact/evidence override, alternate channel, receipt,
sidecar, destination, or generic path inputs. No `rawr`-qualified command,
alias, or forwarding route may project this request.

#### Scenario: Canonical status remains read-only and exact

- **WHEN** `habitat agent plugins status` receives its exact fields and no
  foreign input
- **THEN** it parses as `CanonicalStatusRequest` and cannot dispatch a mutating
  provider operation

#### Scenario: Retired explicit cleanup is requested

- **WHEN** a caller supplies `habitat agent plugins retire`, a `rawr`-qualified
  status or retire route, the retired procedure, or its request shape
- **THEN** discovery or parsing rejects before provider access
