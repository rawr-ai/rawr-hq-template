## REMOVED Requirements

### Requirement: Mechanical evidence cannot authorize acceptance
**Reason**: Repository review of one current-main v2 record is the selection authority; an independent acceptance system is disproportionate.
**Migration**: Mechanical test output remains CI/operational proof and cannot enter channel authority.

### Requirement: Acceptance request and evidence are digest-bound and bounded
**Reason**: The request/evidence chain duplicates release, projection, and Git identities without improving this non-adversarial selection boundary.
**Migration**: Bind source, release set, projections, and evaluation profile once in `agent-plugin-current-main@v2`.

### Requirement: Governed acceptance requires repository authority
**Reason**: Hosted approval replay and independent issuer identity duplicate the repository review that lands the channel record.
**Migration**: Required CI and human Git review govern the record-only current-main change.

### Requirement: Promotion proves release-input equivalence without rebuilding
**Reason**: Current-main directly names the exact landed source commit/tree and release-input digest; a promotion attestation is another identity layer.
**Migration**: Build/test exact landed content, then land a record selecting its immutable set.

### Requirement: Current-main resolution is fixed, transitive, and read-only
**Reason**: The v1 transitive policy, request, evidence, and promotion chain is replaced by one direct selector.
**Migration**: Use the `agent-plugin-channel-selection` v2 resolution requirement.

### Requirement: Promotion and status never mutate
**Reason**: Promotion is removed; its read-only channel concern moves to direct v2 selection.
**Migration**: Current-main v2 codec/resolution remains read-only and provider status remains non-mutating.

### Requirement: Governance has one read-only qualified promotion procedure
**Reason**: `attest-promotion` preserves the retired ceremony and creates a second route to channel authority.
**Migration**: Use `rawr agent plugins check --mode current-main-record|current-main-selection`; no alias or fallback is provided.
