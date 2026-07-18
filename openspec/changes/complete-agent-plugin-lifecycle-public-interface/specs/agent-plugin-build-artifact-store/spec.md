## RENAMED Requirements

- FROM: `### Requirement: Governed evidence handles participate in retention`
- TO: `### Requirement: Mechanical evidence remains explicit test proof`

## MODIFIED Requirements

### Requirement: Evidence publication is no-replace and exact
Mechanical-evidence publication MUST use atomic no-replace semantics, verify an
existing exact winner as converged, reject a conflicting/tampered winner, and
never truncate or replace live artifact state. Reading MUST reverify exact bytes
and digest. Mechanical evidence MUST NOT gate canonical deployment.

#### Scenario: Existing exact evidence is read-only
- **WHEN** identical canonical test evidence already exists at its digest handle
- **THEN** publication returns converged after verification with zero writes or
  metadata churn

#### Scenario: Missing or tampered test evidence stays non-authorizing
- **WHEN** a complete-test proof handle is missing, altered, or digest-mismatched
- **THEN** the test proof reports missing/mismatch without rebuilding or repair,
  and canonical channel/deployment authority is unchanged

### Requirement: Mechanical evidence remains explicit test proof
Mechanical-evidence handles MUST remain explicit complete-test/operational proof
only. They MAY be retained when explicitly pinned by their artifact owner but
MUST NOT be referenced transitively by current-main, select a release set,
authorize provider convergence/retirement, or become a channel-retention root.

#### Scenario: Current-main is evaluated
- **WHEN** the artifact owner inspects retention pins for the selected release
  set
- **THEN** it preserves the selected release/set graph without requiring or
  inferring a mechanical-evidence handle
