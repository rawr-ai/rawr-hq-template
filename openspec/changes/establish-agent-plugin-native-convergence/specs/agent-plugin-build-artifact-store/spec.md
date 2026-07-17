## ADDED Requirements

### Requirement: Mechanical evidence uses the sole immutable artifact home
The build/artifact owner MUST expose a narrow opaque mechanical-evidence publication/read adapter below the existing stable Template digest-addressed artifact home. Provider deployment MUST supply canonical evidence bytes through its consumer-owned publisher port; the artifact owner MUST NOT generate, interpret, accept, promote, or deploy the evidence.

#### Scenario: Provider evidence publishes by digest
- **WHEN** provider deployment supplies bounded canonical evidence bytes and their verified digest
- **THEN** the artifact adapter publishes them immutably under that exact digest and returns an explicit evidence handle

### Requirement: Evidence publication is no-replace and exact
Mechanical-evidence publication MUST use atomic no-replace semantics, verify an existing exact winner as converged, reject a conflicting/tampered winner, and never truncate or replace live artifact state. Reading MUST reverify exact bytes and digest.

#### Scenario: Existing exact evidence is read-only
- **WHEN** identical canonical evidence already exists at its digest handle
- **THEN** publication returns converged after verification with zero writes or metadata churn

#### Scenario: Missing or tampered accepted evidence blocks
- **WHEN** governed acceptance references evidence that is missing, altered, or digest-mismatched
- **THEN** promotion and canonical deployment block without rebuilding, regenerating, or repairing evidence

### Requirement: Evidence publication failure does not rewrite target truth
Evidence publication occurs only after provider test target outcomes and receipts are truthfully settled. A publication failure MUST be reported independently and MUST NOT roll back, advance, or rewrite any target receipt, provider state, capsule, acceptance, or channel record. A retry MUST publish the same canonical digest from the same final verification facts without encoding transaction history or repeating provider mutation.

#### Scenario: Partial targets remain truthful when publication fails
- **WHEN** target A verifies, target B fails, and evidence publication also fails
- **THEN** A and B retain their exact target-local outcomes and receipts, the aggregate result reports both failures, and no receipt references a nonexistent aggregate evidence handle

### Requirement: Governed evidence handles participate in retention
Evidence handles referenced by an acceptance request, accepted outcome, promotion attestation, or active channel record MUST be eligible for the existing transitive retention/pin model and MUST NOT be collected while referenced.

#### Scenario: Active accepted evidence is retained
- **WHEN** the fixed channel transitively references an accepted mechanical-evidence handle
- **THEN** artifact retention preserves the evidence bytes together with the referenced release and set artifacts
