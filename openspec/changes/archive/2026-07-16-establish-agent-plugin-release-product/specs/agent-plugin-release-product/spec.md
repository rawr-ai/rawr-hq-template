## ADDED Requirements

### Requirement: Canonical provider-neutral release identity
The system MUST define closed versioned `AgentPluginRelease` and release-input schemas whose parsers reject unknown fields and path-unsafe values and whose canonical serialization is independent of checkout path, filesystem traversal order, map insertion order, file mtime, and other ambient process state. Digests MUST be computed over digest-free canonical payload values and MUST be carried in a separate validated envelope so identity is non-circular. The release-input digest MUST cover every admitted byte and declaration that can affect payload or membership, including manifests, selected content, vendored inputs, locks, aliases, and declarative quality policy, while excluding lifecycle records that authorize already-built bytes. An `AgentPluginRelease` MUST bind content authority, source repository identity, source commit and tree, release-input digest, curated plugin ID and aliases, canonical payload manifest and digest, vendor and curation provenance, schema and builder protocol versions, and artifact digest.

#### Scenario: Equivalent inputs have one identity
- **WHEN** equivalent release inputs are read from different absolute checkout paths with permuted traversal and declaration order and different mtimes
- **THEN** canonical serialization produces identical release-input, payload, and artifact digests
- **AND** neither checkout path nor ambient process state appears in release identity

#### Scenario: Every admitted payload input affects identity
- **WHEN** one admitted content byte, manifest field, vendor binding, lock, alias, or declarative quality input changes
- **THEN** the release-input digest changes and the resulting release cannot retain the prior artifact digest

#### Scenario: Authorization records do not rewrite built identity
- **WHEN** only acceptance, promotion, channel, or other lifecycle authorization records change
- **THEN** canonical release-input and release payload digests remain unchanged
- **AND** the authorization record cannot substitute bytes or mint another release identity

#### Scenario: Unknown and unsafe schema values fail closed
- **WHEN** a release input, release, or envelope contains an unknown field, an absolute payload path, path traversal, a malformed branded identity, or a self-referential digest claim
- **THEN** parsing rejects before canonical bytes or a trusted digest are returned
- **AND** no omitted or unsafe value can hide outside release identity

### Requirement: Digest graph has exact non-circular preimages
The release protocol MUST define these distinct opaque digest brands and exact canonical preimages:

- `ReleaseInputDigest` hashes the digest-free canonical curated release-input body, excluding Git commit/tree provenance and lifecycle authorization records;
- `PayloadDigest` hashes the digest-free ordered payload entries including relative path, normalized mode, and exact bytes;
- `ReleaseDigest` hashes the digest-free release body containing source provenance, `ReleaseInputDigest`, curated identity and aliases, payload manifest and `PayloadDigest`, vendor/curation bindings, and schema/builder protocols;
- `ArtifactDigest` hashes the digest-free artifact body containing the release body, `ReleaseDigest`, artifact protocol, canonical storage manifest, and every exact payload entry;
- `ReleaseSetDigest` hashes the digest-free set body containing its authority/provenance, release-input identity, completeness witness, ownership index, and each ordered member's `ReleaseDigest` and `ArtifactDigest`.

`AgentPluginRelease` MUST be the validated envelope carrying its release body, `ReleaseDigest`, and `ArtifactDigest`; each digest is verified by reconstructing only its declared digest-free preimage. The digest brands MUST NOT be assignable, comparable as authority, or accepted by one another's parser even if their encoded strings happen to match. No envelope digest field may enter its own direct or transitive preimage.

Artifact requests MUST be the closed union `ReleaseArtifactRef | CompleteSetArtifactRef`. A `ReleaseArtifactRef` MUST bind one `ReleaseDigest` and its `ArtifactDigest`. A `CompleteSetArtifactRef` MUST bind one `ReleaseSetDigest`; its verified set envelope supplies the canonical ordered members, and the reader MUST verify every member's `ReleaseDigest` and `ArtifactDigest` before returning the complete immutable snapshot. `ReleaseSetDigest` directly addresses the canonical set envelope bytes; there is no implicit generic or caller-invented set artifact digest.

#### Scenario: Digest brands cannot be substituted
- **WHEN** a valid payload, release-input, release, artifact, or release-set digest is supplied in another digest domain
- **THEN** parsing or type-negative compilation rejects it before lookup, construction, or publication
- **AND** a string cast or coincidentally equal encoding cannot change the declared preimage domain

#### Scenario: Artifact digest covers exact stored release bytes
- **WHEN** any release-body field, release digest, artifact protocol field, manifest entry, relative path, normalized mode, or payload byte changes
- **THEN** `ArtifactDigest` changes while remaining non-circular
- **AND** artifact verification reconstructs that exact digest-free body rather than trusting the envelope claim

#### Scenario: Complete-set reference verifies the full closed graph
- **WHEN** a complete-set artifact reference is read
- **THEN** the reader verifies the `ReleaseSetDigest` envelope, exact ordered membership, and every bound member release and artifact digest before returning any complete snapshot
- **AND** a missing, extra, reordered, tampered, or mismatched member blocks the entire read without a partial or targeted fallback

### Requirement: Closed-world release-set identity
The system MUST define a closed versioned `AgentPluginReleaseSet` as the only complete desired-state artifact. It MUST bind one content authority, source repository, source commit and tree, release-input digest, canonical ordered member plugin IDs plus release and artifact digests, complete skill and distribution ownership index, schema and builder protocol versions, and set digest. Construction MUST require a canonical completeness witness listing every expected member and ownership declaration from the same verified release input; the supplied releases MUST equal that expected membership exactly. Every member MUST share the set's authority, commit, tree, and release-input identity. Protocol v1 MUST reject before aggregate payload allocation when declared decoded payload bytes exceed 64 MiB for any member or across the complete set. A selected release or targeted subset MUST NOT claim complete membership, channel convergence, or authority to retire omitted members.

#### Scenario: Complete build emits one closed set
- **WHEN** a complete build receives valid releases from one content authority, commit, tree, and release-input digest
- **THEN** it emits one canonically ordered release set whose ownership index covers every member, skill, alias, provider-facing identity, and declared export path
- **AND** the set digest changes when membership or any member digest changes

#### Scenario: Mixed source authority is rejected
- **WHEN** proposed set members differ in content authority, repository identity, source commit, source tree, or release-input digest
- **THEN** set construction rejects before a release-set artifact is emitted
- **AND** path or byte equality does not reconcile the conflicting identities

#### Scenario: Omitted expected member rejects complete construction
- **WHEN** a complete-build plan omits one expected member from the verified release-input completeness witness or supplies an undeclared extra member
- **THEN** release-set construction rejects before a release-set or member artifact is published and names the missing or extra identity deterministically
- **AND** the caller cannot relabel the remaining targeted releases as a complete set

#### Scenario: Targeted selection has no omission authority
- **WHEN** one release or a proper subset of a complete set is selected for a targeted operation
- **THEN** the selection remains explicitly targeted and cannot be serialized or reported as a complete release set
- **AND** omitted members receive no retirement or convergence meaning

### Requirement: Complete and unique distribution ownership
Release and release-set construction MUST reject duplicate curated plugin IDs, skill identities, ambiguous aliases, provider-facing IDs, destination claims, missing declared owners, toolkit packages, toolkit `agent-pack` content, and composition aliases before artifact publication. The rejection MUST report every conflicting claimant deterministically. Name, path, byte equality, traversal order, or a fallback owner MUST NOT resolve a conflict.

#### Scenario: Conflicting ownership fails as one deterministic result
- **WHEN** input contains duplicate plugin IDs, duplicate skills, aliases with multiple owners, conflicting provider IDs or destination paths, and an undeclared skill owner
- **THEN** construction rejects before durable artifacts with a canonically ordered conflict report naming every claimant and conflict class
- **AND** permuting input order produces the same report

#### Scenario: Toolkit and composition units cannot become releases
- **WHEN** a CLI toolkit, toolkit-derived `agent-pack`, or composition alias is presented as a provider-facing release member
- **THEN** release construction rejects that unit before artifact publication
- **AND** useful byte-identical guidance receives no implicit second distribution owner

### Requirement: Pure release authority boundary
Release schemas, canonicalizers, ownership validation, and digest functions MUST be pure Template-owned logic. They MUST NOT discover Git state, read a provider home, mutate a destination, inspect or mutate Oclif state, select app composition, issue lifecycle acceptance, or import executable code from a personal content repository. A separate build application MUST accept a personal repository and checkout path only as an explicit versioned data locator; it MUST NOT become controller, release, artifact, channel, provider, destination, or skill identity.

#### Scenario: Personal checkout is data rather than executable authority
- **WHEN** release construction is given already-verified canonical inputs from a personal content workspace containing misleading Template-like runtime files
- **THEN** only the verified versioned data enters the pure release functions
- **AND** no executable module, validator implementation, adapter, renderer, or command is loaded from that workspace

#### Scenario: Source removal leaves release identity usable
- **WHEN** a release and release set have been constructed and their source checkout is moved or removed
- **THEN** their schemas, manifests, digests, and ownership index remain fully verifiable from immutable artifact data
- **AND** no repository ancestry or tree-equivalence mechanism is consulted

### Requirement: C2 release applications remain inert
C2 release, check, build, export, package, and undo application contracts MUST remain internal typed Template interfaces. C2 MUST NOT add a discoverable command file, controller-manifest entry, runtime scan, alias, aggregate projection, or compatibility fallback for those applications. They become operator-reachable only through the later qualified `rawr agent plugins` command cutover.

#### Scenario: Controller command inventory is unchanged by C2
- **WHEN** the controller manifest and command discovery are inspected after C2 release-product installation
- **THEN** no new agent-plugin lifecycle command or alias is discoverable
- **AND** the internal applications can be tested without altering controller, Oclif, provider, destination, or personal repository authority
