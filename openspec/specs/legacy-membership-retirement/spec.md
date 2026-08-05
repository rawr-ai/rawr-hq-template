# legacy-membership-retirement Specification

## Purpose
Retire legacy web membership, scaffolding commands, and repository-owned runtime
membership without introducing replacement app-composition authority.
## Requirements
### Requirement: Legacy web membership commands are structurally absent (B04, B30)

The private Template Oclif application MUST NOT expose `rawr plugins web`,
`rawr plugins scaffold`, or any former child command, alias, forwarder, help row,
tool entry, or active documentation route. No replacement curated-agent,
app-composition, web-mounting, or aggregate source-scaffolding behavior may enter
through this retirement. Bare `rawr plugins` belongs only to
`@oclif/plugin-plugins`; curated lifecycle belongs only below
`rawr agent plugins`.

#### Scenario: Former mixed commands cannot resolve
- **WHEN** Nx-built Oclif discovery, command IDs, aliases, help, and metadata are
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

### Requirement: Workspace discovery cannot recreate membership (B05, B30)

Server and web startup MUST NOT scan workspace packages, filter package inventories, derive a directory, package path, URL, or module route from a plugin identity, perform a variable-path import, or serve `/rawr/plugins/web/*` to infer or realize membership. The state-backed mount page and legacy module-serving route MUST be absent. No fallback MAY reintroduce an unselected, discovered, or stale member.

#### Scenario: Package presence does not imply a mount

- **WHEN** an otherwise valid web-capable package is present in the workspace
- **THEN** no C4-owned scan, filter, route, loader, or mount operation observes or mounts it
- **AND** no repo-state or ID-derived fallback is attempted

### Requirement: Retirement does not create a replacement runtime authority (B05, B30)

C4 MUST NOT expose app composition show/select/unselect/check, app-projection generation, an AppDefinition source editor, a parallel composition registry, a composition snapshot/domain, app role materialization, web mount orchestration/readiness, live composition observation, or runtime composition status.

Future app composition and runtime realization MUST remain deferred to the canonical architecture-migration chain `defineApp(...) -> SDK derivation -> compiler -> process runtime -> adapters -> harness -> RuntimeCatalog`, entered through `startApp(...)`, as specified by `docs/projects/rawr-final-architecture-migration/resources/spec/RAWR_Canonical_Architecture_Spec.md` and `docs/projects/rawr-final-architecture-migration/resources/spec/RAWR_Effect_Runtime_Realization_System_Canonical_Spec.md`. C4 MUST NOT partially implement or compatibility-wrap that chain.

#### Scenario: Semantic absence includes the superseded mini-runtime

- **WHEN** active commands, modules, package exports, endpoints, status schemas, tests, and architecture inventories are scanned
- **THEN** no C4 composition editor, app-projection creator, snapshot/role runtime, mount-readiness path, composition observation, or runtime-status owner remains
- **AND** the canonical architecture documents are referenced only as the deferred owner boundary

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
