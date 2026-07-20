## RENAMED Requirements

- FROM: `### Requirement: Status and retirement use separate exact requests`
- TO: `### Requirement: Status uses one separate exact request`

## MODIFIED Requirements

### Requirement: Canonical sync resolves fixed repository authority
`CanonicalSync` MUST require the fixed `current-main` channel, one explicit
read-only content Git locator, and one or more explicit provider targets. It
MUST reject caller-supplied release, set, acceptance, evidence, projection,
promotion, receipt, or alternate-channel overrides. The governance resolver is
the sole producer of `CanonicalChannelSelection`; no acceptance or promotion
fact remains in canonical authority.

#### Scenario: Canonical authority is resolved rather than overridden
- **WHEN** canonical mode is parsed with `current-main`, an explicit Git locator,
  and explicit homes
- **THEN** one resolved selection supplies the release set and exact
  Claude/Codex projection bindings

#### Scenario: Retired authority override rejects
- **WHEN** canonical mode also supplies a release ref, acceptance path, evidence
  object, projection digest, promotion attestation, or receipt object
- **THEN** parsing rejects before reading canonical Git or a provider target

### Requirement: Status uses one separate exact request
Read-only status MUST use `CanonicalStatusRequest` containing only the fixed
channel, explicit Git locator, and selected targets. Receipt-owned
`ManagedRetireRequest` and its public procedure/command MUST be absent. Status
MUST NOT be represented as a fourth deployment mode or accept release, set,
acceptance, evidence, projection, promotion, channel override, receipt, or
generic path inputs.

#### Scenario: Canonical status remains read-only and exact
- **WHEN** status receives its fixed channel, Git locator, and selected targets
  with no foreign field
- **THEN** it parses as `CanonicalStatusRequest` and cannot dispatch a mutating
  provider operation

#### Scenario: Retired explicit provider cleanup is requested
- **WHEN** a caller supplies `rawr agent plugins retire`, a managed-retire
  procedure, or its request shape
- **THEN** discovery or parsing rejects before every provider, receipt, sidecar,
  or undo call

#### Scenario: Cross-operation fields reject
- **WHEN** status receives a deployment selector, artifact/evidence override,
  alternate channel, receipt object, destination, or filesystem path
- **THEN** parsing rejects before every observable port call
