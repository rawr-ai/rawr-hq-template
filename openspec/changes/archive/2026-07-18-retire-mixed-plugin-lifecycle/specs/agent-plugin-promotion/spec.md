## ADDED Requirements

### Requirement: Governance has one read-only qualified promotion procedure
`rawr agent plugins attest-promotion` MUST invoke one lifecycle `governance` validate-and-attest procedure that resolves exact Git objects and repository-governance approval through injected read-only production adapters. The command MUST NOT sequence validation and attestation, accept approval JSON or caller authority assertions, write lifecycle records, or call releases, providers, exports, packaging, Oclif, app-composition, or capsule mutation ports.

#### Scenario: Missing exact hosted approval blocks read-only
- **WHEN** the landed ref and governed records are valid but exact hosted approval by the policy-named human is missing, stale, unavailable, or bound to another object
- **THEN** the command returns `BLOCKED_ACCEPTANCE_AUTHORITY`
- **AND** no attestation is claimed and every mutation port records zero calls
