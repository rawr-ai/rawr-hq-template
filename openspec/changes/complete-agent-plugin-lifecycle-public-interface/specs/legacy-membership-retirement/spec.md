## MODIFIED Requirements

### Requirement: Legacy web membership commands are structurally absent (B04, B30)

The installed Template Oclif CLI MUST NOT expose `rawr plugins web`,
`rawr plugins scaffold`, or any former child command, alias, forwarder, help row,
tool entry, or active documentation route. No replacement curated-agent,
app-composition, web-mounting, or aggregate source-scaffolding behavior may enter
through this retirement. Bare `rawr plugins` belongs only to
`@oclif/plugin-plugins`; curated lifecycle belongs only below
`rawr agent plugins`.

#### Scenario: Former mixed commands cannot resolve
- **WHEN** installed Oclif discovery, command IDs, aliases, help, and metadata are
  enumerated
- **THEN** every former web/scaffold command and compatibility route is absent

### Requirement: Repository state cannot own runtime membership (B05, B30, I08, I15)

Repository membership MUST NOT be produced or consumed from the retired
repo-state fields by any active command, service, API, UI, server bootstrap,
test helper, package export, or architecture inventory. Existing stale state is
inert and MUST NOT be read, migrated, repaired, synchronized, rewritten, or
deleted by a supported operation.

#### Scenario: Stale membership state has no effect
- **WHEN** stale repository state lists enabled plugin identities
- **THEN** supported CLI, server, web, and authoring operations behave as if it
  were absent and its filesystem mutation counters remain zero

#### Scenario: Retired state procedure is absent
- **WHEN** the composed RPC router and generated OpenAPI document are inspected
- **THEN** the retired runtime-state procedure/path is absent while representative
  surviving procedures remain callable

### Requirement: Retirement preserves adjacent authorities without entering them (B05, I08)

Legacy retirement MUST NOT install or manage external Oclif extensions, derive
or reconcile agent content, mutate provider homes, write package outputs, select
or install a RAWR CLI version, author Personal channel records, or alter
protected-lane candidate bytes. Existing unrelated server/RPC/OpenAPI/Inngest
behavior MAY be regression evidence only and cannot become a new composition or
lifecycle owner.

#### Scenario: Adjacent mutation ports remain zero
- **WHEN** legacy membership paths are absent and surviving host regressions run
- **THEN** Oclif, CLI installation, release derivation, provider, package-output,
  Personal-record, and protected-lane mutation counters remain zero
- **AND** no missing app/runtime capability is repaired through a fallback
