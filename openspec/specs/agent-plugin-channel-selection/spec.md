# agent-plugin-channel-selection Specification

## Purpose
Define the one reviewed Marketplace Git record that selects canonical curated
agent-plugin content without introducing another release or provider-state
authority.
## Requirements
### Requirement: Current-main is one reviewed canonical selector

One direct canonical JSON record MUST exist at the fixed
`.habitat/agent-plugin-lifecycle/channels/current-main.json` path with exactly:

- `schemaVersion: 3`
- `channel: "current-main"`
- `contentAuthority`
- `sourceRepositoryIdentity`
- `sourceRepositoryUrl`
- `sourceRef`, as one fully qualified immutable tag ref
- `contentCommit`
- `contentTree`
- `releaseInputDigest` for fixed `.habitat/release-input.json`

The record MUST use its unique UTF-8 newline-terminated canonical JSON encoding
and MUST reject above 2,097,152 bytes. `sourceRepositoryUrl` MUST be the
canonical HTTPS Git URL derived from `sourceRepositoryIdentity`. Unknown
fields, noncanonical bytes, and invalid or inconsistent Git identities MUST
reject. No record-local digest or envelope may make a second identity for the
selection; Git review and the selected commit/tree/release-input identities
already bind it.

Repository review and Git history MUST own human selection. The record MUST NOT
contain or require an approver, issuer task, acceptance request/evidence, hosted
approval replay, promotion attestation, receipt, sidecar, controller root,
artifact path, canonical ref, or machine-local repository path.

No path under `plugins/agents/.lifecycle/**` is a record alias, authority
source, or fallback. Such paths remain ordinary undeclared children of the
closed curated plugin root.

#### Scenario: Semantically identical records encode once

- **WHEN** two valid records differ only in object insertion order
- **THEN** encode returns identical canonical record bytes, byte length, and
  protocol `agent-plugin-current-main@v3`

#### Scenario: Non-selector state is supplied

- **WHEN** a record contains a release-set digest, provider projection, renderer
  protocol, adapter protocol, capability profile, package location, or installed
  CLI identity
- **THEN** canonical decoding rejects before channel resolution

#### Scenario: Only a plugin-root record exists

- **WHEN** canonical main contains a valid-looking current-main record only
  under `plugins/agents/.lifecycle/**`
- **THEN** resolution returns `STALE_RECORD` without reading it as an alias or
  falling back from the fixed `.habitat` path, and repository closure continues
  to reject the undeclared plugin-root child

### Requirement: Current-main resolution binds observed Git authority

Resolution MUST accept one explicit external-content locator containing an
absolute workspace path and expected stable repository identity. It MUST
observe the compiled canonical ref `refs/heads/main`, read the fixed record from
immutable Git objects, require `body.sourceRepositoryIdentity` to equal the
locator's stable identity, and verify the selected source commit is reachable
from observed main with the exact source tree and fixed release-input digest.
The record MUST bind these observations but MUST NOT choose repository identity,
path, or canonical ref.

Governance MUST return exactly one resolved `CanonicalChannelSelection` value
containing only the direct v3 record fields. Provider handlers MUST consume
that value without parsing raw record bytes. Governance verifies Git/record
identity. Through `@habitat-ai/plugin-agent-plugins` and the Habitat
application profile, app-selected provider handling separately MUST derive the
selected complete set, native Marketplace source, declared provider-visible
files, and operation-required native capabilities from the exact selected Git
objects. Those derived values MUST NOT require another external-content record
or review.
Provider planning MUST require the derived content authority, repository
identity, source commit, source tree, and release-input digest to equal the
selector before native mutation. No local artifact lookup participates.

#### Scenario: Reviewed record resolves the selected set

- **WHEN** observed canonical main contains an exact v3 record whose stable
  repository identity matches the explicit locator and whose selected tag,
  content commit/tree, and release input verify
- **THEN** resolution returns `CURRENT_ELIGIBLE` with the exact direct selection
  without release derivation or provider access

#### Scenario: Record tries to choose repository authority

- **WHEN** its repository identity differs from the locator, its source commit
  is unreachable from observed main, or its source tree/release input fails
  exact verification
- **THEN** resolution rejects before release derivation or provider access

#### Scenario: Newer unselected content lands

- **WHEN** the selected source remains reachable and exact but canonical main
  later contains another release input that no reviewed record selects
- **THEN** the existing current-main selection remains valid and no newer set
  is inferred

### Requirement: Current-main requests are closed and owner-local

The governance module MUST expose exactly two closed request families: one
`current-main-record` request discriminated as `encode-body` with `body` or
`validate-record` with `bytes`, and one `current-main-selection` request with
`locator`. Fields from one family MUST NOT appear in another, and pure codec
  operations MUST NOT call, read, or write any Git, provider, output,
or lifecycle port. The pure codec itself takes no dependency argument.

#### Scenario: Mixed current-main request is supplied
- **WHEN** a request combines body, bytes, locator, an unknown action, or a
  retired v1/promotion field
- **THEN** TypeBox validation rejects before any router handler or port call

### Requirement: Retired promotion authority is unreachable

`@habitat-ai/agent-plugin-lifecycle-service` and its governance module MUST
omit v1 current-main parsing, acceptance validation, promotion attestation,
hosted-governance binding, and every corresponding procedure from contracts,
routers, service model, public client, and exports.

The private `@habitat-ai/plugin-agent-plugins` topic, application-selected
source-bundle membership, and installed `@habitat-ai/cli` Oclif manifest MUST
omit `habitat agent plugins attest-promotion`, its command ID, and every alias,
fallback, forwarding route, help entry, and `rawr`-qualified route. Managed
export, qualified `undo`, capsule state, provider inverse-action
discriminators, replay registration, and compatibility decoders MUST be absent.

#### Scenario: Retired governance input is supplied

- **WHEN** a caller supplies a v1 record, policy/request/evidence/promotion
  object, hosted-governance executable, or retired procedure
- **THEN** service parsing rejects before Git, release derivation, or provider
  access

#### Scenario: Retired command route is discovered

- **WHEN** command, topic, source-bundle, alias, help, and manifest discovery are
  enumerated
- **THEN** no promotion command ID, `rawr`-qualified route, alias, fallback, or
  forwarding route is discoverable
