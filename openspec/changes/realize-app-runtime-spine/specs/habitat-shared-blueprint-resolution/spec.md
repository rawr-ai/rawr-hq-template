## MODIFIED Requirements

### Requirement: Conflicting definition copies fail closed

An exact checked-in copy of a selected package definition SHALL be
non-authoritative and resolve with package provenance. A local definition with
the same id and version but different admitted content SHALL reject catalog
resolution.

#### Scenario: Producer source equals packaged definition

- **WHEN** the Habitat repository contains the exact source definition used to
  build a selected package member
- **THEN** the catalog reports one package-owned definition and one set of
  applications

#### Scenario: Local definition conflicts with package

- **WHEN** a repository declares different admitted content at a selected
  package member's id and version
- **THEN** catalog resolution rejects the conflicting identity
