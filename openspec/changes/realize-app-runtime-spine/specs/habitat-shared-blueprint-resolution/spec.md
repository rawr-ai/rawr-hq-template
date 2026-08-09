## ADDED Requirements

### Requirement: Successor definition versions are complete exact identities

Each blueprint version SHALL be a complete, independently resolvable
definition. Version 1 SHALL remain at the blueprint root. A canonical decimal
successor version `N >= 2` SHALL live at `versions/N/blueprint.toml`, declare
the same blueprint id and exact version `N`, and own every runner asset it
references beneath that version closure. Selection SHALL activate exactly the
requested id and version. A successor SHALL NOT inherit, traverse to, fall
back to, or rewrite assets from another version.

The admitted `service@2` and `resource@2` definitions SHALL preserve their
respective version-1 structure and semantic law while owning version-qualified
rule identities and narrower declared `rootPatterns`. This equality is an exact
property of those two admitted successors, not a promise that arbitrary future
versions are semantic equivalents.

#### Scenario: Existing and successor selections coexist

- **WHEN** a package contains both version 1 and a canonical successor for one blueprint id
- **THEN** a version-1 instance resolves only the version-1 closure
- **AND** a successor instance resolves only the exact successor closure
- **AND** selecting the successor emits no version-1 application for that instance
- **AND** both definitions retain their own applications, provenance, and cache inputs

#### Scenario: A successor locator disagrees with its definition

- **WHEN** a successor directory is noncanonical or its manifest id/version disagrees with its locator
- **THEN** catalog resolution rejects the complete definition before application emission

#### Scenario: A successor asset is missing

- **WHEN** a selected successor references an asset absent from its own version closure
- **THEN** catalog resolution rejects the successor rather than borrowing the version-1 asset

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

### Requirement: Resource failure law is package-owned

The released `resource@1` and `resource@2` blueprints SHALL reject explicit
unqualified global `Error` and same-source `Error` subclasses in production
resource/provider Effect failure channels, while admitting contract-owned or
provider-owned tagged failures and native Effect catch construction.

#### Scenario: Untyped failure channel is rejected

- **WHEN** a resource or provider declares global `Error` or a same-source
  `Error` subclass in an explicit Effect failure channel
- **THEN** the exact selected resource failure application reports the source as nonconforming

#### Scenario: Typed resource failure is admitted

- **WHEN** a resource contract owns a tagged failure and a provider translates
  vendor failure into that type
- **THEN** the exact selected resource failure application reports no finding for that declaration
