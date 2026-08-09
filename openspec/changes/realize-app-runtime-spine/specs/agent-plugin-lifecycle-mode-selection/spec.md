## MODIFIED Requirements

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
