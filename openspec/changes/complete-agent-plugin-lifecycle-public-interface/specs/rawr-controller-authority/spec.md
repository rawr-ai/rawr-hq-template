## ADDED Requirements

### Requirement: Equivalent controller builds emit canonical official manifests

Generated Oclif manifest objects MUST recursively order object keys by a
locale-independent code-unit order while preserving array order. Validation,
release metadata, and emitted JSON MUST consume that same canonical object.

#### Scenario: Discovery insertion order differs
- **WHEN** two equivalent Oclif discoveries produce objects with different key
  insertion order
- **THEN** emitted manifest bytes and the resulting controller digest are equal
  while semantic array order is unchanged

#### Scenario: Same clean source builds twice
- **WHEN** the same exact clean Template commit is built into two fresh
  non-repository controller roots
- **THEN** controller digests and normalized release file bytes/modes are equal
  without comparing paths, inode identity, or mtimes
