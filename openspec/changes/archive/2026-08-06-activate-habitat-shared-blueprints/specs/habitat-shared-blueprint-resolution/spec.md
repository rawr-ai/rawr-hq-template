## ADDED Requirements

### Requirement: Selected package members are exact blueprint authority
The Habitat catalog SHALL admit the ordered unique blueprint members declared
by the selected policy pack, SHALL resolve every member and runner asset inside
that package root, and SHALL reject a missing, escaping, mismatched, duplicate,
or malformed member.

#### Scenario: Package member resolves
- **WHEN** the selected SDK manifest names an admitted blueprint file whose id,
  version, and runner assets match the member declaration
- **THEN** the catalog resolves that blueprint with exact policy-pack
  provenance

#### Scenario: Package member is invalid
- **WHEN** a member path escapes the selected package, does not name a regular
  file, conflicts with another member, or disagrees with the parsed definition
- **THEN** catalog resolution rejects the complete request without falling back
  to repository policy

### Requirement: Repositories own instances without copying shared law
A repository SHALL select package-owned blueprints only through local
`habitat.toml` instances. Habitat initialization SHALL NOT copy shared
blueprint definitions or runner assets into the repository.

#### Scenario: Installed consumer selects package blueprint
- **WHEN** a clean consumer installs the fixed Habitat SDK/CLI release and adds
  a valid instance manifest for a packaged blueprint
- **THEN** resolve, check, and inferred Nx application targets use the packaged
  definition without a local blueprint copy

#### Scenario: Repeated initialization is inert
- **WHEN** an already initialized consumer repeats the Habitat initializer
- **THEN** its repository policy and integration files remain byte-identical

### Requirement: Selected blueprints bind source topology to project
Each selected blueprint SHALL expose only its required `project` anchor root.
Every source-specific native structure scope SHALL bind that root and SHALL
carry its exact `src/**` path in the blueprint-owned `relativePath`. Instance
manifests SHALL NOT supply an independent `source` root.

#### Scenario: Source topology resolves from project
- **WHEN** an admitted instance binds `project` and its selected blueprint
  evaluates a source-specific structure scope
- **THEN** the scope resolves its blueprint-owned `src/**` path below project
  without a caller-authored source binding

#### Scenario: Instance attempts source redirection
- **WHEN** an instance manifest supplies a `source` root
- **THEN** catalog resolution rejects it as an unknown root role

### Requirement: Conflicting definition copies fail closed
An exact checked-in copy of a selected package definition SHALL be
non-authoritative and resolve with package provenance. A local definition with
the same id and version but different admitted content SHALL reject catalog
resolution.

#### Scenario: Producer source equals packaged definition
- **WHEN** Template contains the exact source definition used to build a
  selected package member
- **THEN** the catalog reports one package-owned definition and one set of
  applications

#### Scenario: Local definition conflicts with package
- **WHEN** a repository declares different admitted content at a selected
  package member's id and version
- **THEN** catalog resolution rejects the conflicting identity

### Requirement: Package assets preserve provenance through execution
Resolved definitions, applications, and runner assets SHALL distinguish local
repository provenance from selected policy-pack provenance. Package assets
SHALL execute from their resolved package path and SHALL NOT be projected as
workspace file inputs.

#### Scenario: Nx hashes package authority
- **WHEN** Nx projects an application backed by a package-owned runner asset
- **THEN** the target hashes the exact Habitat CLI/SDK dependency closure and
  does not add the package asset as a workspace path

#### Scenario: Local overlay remains local
- **WHEN** a repository-owned compatibility rule resolves beside package
  applications
- **THEN** its manifests, runner assets, and subjects remain repository inputs
  with local provenance

### Requirement: Resource failure law is package-owned
The released `resource@1` blueprint SHALL reject explicit unqualified global
`Error` and same-source `Error` subclasses in production resource/provider
Effect failure channels, while admitting contract-owned or provider-owned
tagged failures and native Effect catch construction.

#### Scenario: Untyped failure channel is rejected
- **WHEN** a resource or provider declares global `Error` or a same-source
  `Error` subclass in an explicit Effect failure channel
- **THEN** the resource failure application reports the source as nonconforming

#### Scenario: Typed resource failure is admitted
- **WHEN** a resource contract owns a tagged failure and a provider translates
  vendor failure into that type
- **THEN** the resource failure application reports no finding for that
  declaration

### Requirement: Public release is one fixed Habitat pair
The activation capability SHALL ship through the existing fixed
`@habitat-ai/sdk` and `@habitat-ai/cli` release group as one ordinary minor
release. No additional public workspace package SHALL be required by a
consumer.

#### Scenario: Registry-installed product works
- **WHEN** a disposable Nx consumer installs the released CLI and its exact SDK
  dependency from npm
- **THEN** package resolution, checking, target inference, initialization, and
  repeated initialization pass without a repository checkout or private
  implementation package

#### Scenario: Candidate source remains inactive
- **WHEN** the SDK ships a blueprint authoring directory that is absent from
  `habitat-pack.json`
- **THEN** catalog resolution does not admit or expose that blueprint as
  selectable package authority
