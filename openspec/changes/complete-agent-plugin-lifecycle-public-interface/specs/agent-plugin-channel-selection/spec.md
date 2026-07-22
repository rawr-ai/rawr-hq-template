## ADDED Requirements

### Requirement: Current-main is one reviewed canonical selector

The fixed `.rawr/agent-plugin-lifecycle/channels/current-main.json` path MUST
contain exactly one canonical envelope with these fields and no others:
`schemaVersion: 2`, `currentMainDigest: cm2_<sha256>`, and `body`. The body MUST
contain exactly:

- `schemaVersion: 2`
- `channel: "current-main"`
- `contentAuthority`
- `sourceRepositoryIdentity`
- `sourceCommit`
- `sourceTree`
- `releaseInputDigest` for fixed `.rawr/release-input.json`
- `evaluationProfile`

The digest preimage MUST be the UTF-8 newline-terminated canonical JSON bytes of
the body. The envelope MUST itself use newline-terminated canonical JSON and
MUST reject above 2,097,152 bytes. Unknown fields, noncanonical bytes, and an
incorrect digest MUST reject.

Repository review and Git history MUST own human selection. The record MUST NOT
contain or require an approver, issuer task, acceptance request/evidence, hosted
approval replay, promotion attestation, receipt, sidecar, controller root,
artifact path, canonical ref, or machine-local repository path.

No path under `plugins/agents/.lifecycle/**` is a record alias, migration
source, or fallback. Such paths remain ordinary undeclared children of the
closed curated plugin root.

#### Scenario: Semantically identical bodies encode once
- **WHEN** two valid bodies differ only in object insertion order
- **THEN** encode returns identical canonical body/envelope bytes, byte length,
  protocol `agent-plugin-current-main@v2`, and `cm2_` digest

#### Scenario: Template-derived state is supplied
- **WHEN** a record contains a release-set digest, provider projection, renderer
  protocol, adapter protocol, capability profile, package location, or installed
  CLI identity
- **THEN** canonical decoding rejects before channel resolution

#### Scenario: Only a legacy plugin-root record exists
- **WHEN** canonical main contains a valid-looking current-main envelope only
  under `plugins/agents/.lifecycle/**`
- **THEN** resolution returns `STALE_RECORD` without reading it as an alias or
  falling back from the fixed `.rawr` path, and repository closure continues to
  reject the undeclared plugin-root child

### Requirement: Current-main resolution binds observed Git authority

Resolution MUST accept one explicit content locator containing an absolute
workspace path and expected stable repository identity. It MUST observe the
compiled canonical ref `refs/heads/main`, read the fixed record from immutable
Git objects, require `body.sourceRepositoryIdentity` to equal the locator's
stable identity, and verify the selected source commit is reachable from
observed main with the exact source tree and fixed release-input digest. The
record MUST bind these observations but MUST NOT choose repository identity,
path, or canonical ref.

Governance MUST return exactly one resolved `CanonicalChannelSelection` value
containing only the selected content authority, repository identity, source
commit, source tree, release-input digest, evaluation profile, and current-main
digest. Provider handlers MUST consume that value without parsing raw record
bytes. Governance verifies Git/record identity. Provider planning separately
MUST derive the selected complete set, provider projections, renderer and
adapter protocols, and capability predicates from the exact selected Git
objects under the installed Template CLI. Those derived values MUST NOT require
another Personal record or review. Provider planning MUST require the derived
content authority, repository identity, source commit, source tree, and
release-input digest to equal the selector before native mutation. No local
artifact lookup participates.

#### Scenario: Reviewed record resolves the selected set
- **WHEN** observed canonical main contains an exact v2 record whose stable
  repository identity matches the explicit locator and whose selected source
  commit/tree/release input verify
- **THEN** resolution returns `CURRENT_ELIGIBLE` with the exact selected content
  identity and evaluation profile without release derivation or provider access

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
`validate-envelope` with `bytes`, and one `current-main-selection` request with
`locator`. Fields from one family MUST NOT appear in another, and pure codec
  operations MUST NOT call, read, or write any Git, provider, output,
or lifecycle port. The pure codec itself takes no dependency argument.

#### Scenario: Mixed current-main request is supplied
- **WHEN** a request combines body, bytes, locator, an unknown action, or a
  retired v1/promotion field
- **THEN** TypeBox validation rejects before any router handler or port call

### Requirement: Retired promotion authority is unreachable

The installed CLI MUST omit v1 current-main parsing, acceptance
validation, promotion attestation, hosted-governance binding, and
`attest-promotion` from service contracts, public exports, clients, CLI
discovery, manifest, and command tree. Managed export, qualified `undo`, capsule
state, provider inverse-action discriminators, and replay registration MUST be
absent. No alias, fallback,
or compatibility decoder may restore retired governance reachability.

#### Scenario: Retired ceremony or command is invoked
- **WHEN** a caller supplies a v1 record, policy/request/evidence/promotion
  object, hosted-governance executable, retired procedure, or retired command ID
- **THEN** parsing or discovery rejects before Git, release derivation, or
  provider access
