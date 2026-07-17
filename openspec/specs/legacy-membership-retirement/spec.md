# legacy-membership-retirement Specification

## Purpose
TBD - created by archiving change normalize-app-composition-authoring. Update Purpose after archive.
## Requirements
### Requirement: Legacy web membership commands are structurally absent (B04, B30)

The Template controller MUST NOT expose `rawr plugins web`, `rawr plugins scaffold`, or any former child command, alias, hidden alias, forwarder, help row, tool-registry entry, or active documentation route for those command families. C4's command-surface claim is limited to retiring those web-membership and scaffold families without adding replacement curated-agent, app-composition, web-mounting, or source-scaffolding behavior. The inherited mixed sync aggregate and root undo remain migration evidence in C4; C5 owns the semantic cutover that makes bare `rawr plugins` external-only and moves curated lifecycle under `rawr agent plugins`.

#### Scenario: Former mixed commands cannot resolve

- **WHEN** official command discovery, direct command-ID resolution, aliases, help, and active command metadata are enumerated
- **THEN** every former web and scaffold command is absent
- **AND** no compatibility forwarder or renamed mixed owner can reach its implementation
- **AND** no C4 acceptance claim treats the inherited aggregate as already cut over

### Requirement: Repository state cannot own runtime membership (B05, B30, I08, I15)

No active command, service, API, UI, browser client, server bootstrap, test helper, package export, or architecture inventory MAY produce or consume `.rawr/state/state.json`, `plugins.enabled`, `RepoState`/`repoState`, `enabledPluginIds`, or `state.getRuntimeState` as plugin or projection membership. The repo-state membership service, state API/plugin/client, and state-driven mounts UI MUST be deleted rather than wrapped or renamed.

Existing stale state MUST be inert. A supported operation MUST NOT read, import, migrate, repair, synchronize, rewrite, or delete it as part of a compatibility path.

#### Scenario: Stale membership state has no effect

- **WHEN** a stale `.rawr/state/state.json` lists enabled plugin identities
- **THEN** supported controller, server, web, and authoring operations behave identically to the state file being absent
- **AND** read/write/delete traps for that file remain zero

#### Scenario: Retired state procedure is absent

- **WHEN** the composed RPC router and generated OpenAPI document are inspected
- **THEN** the retired runtime-state procedure and path are absent
- **AND** representative surviving procedures remain callable through the unchanged host boundary

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

Legacy retirement MUST NOT install or manage external Oclif extensions, create or deploy agent releases, mutate provider homes or receipts, write export ledgers, select controller releases, author personal lifecycle records, or alter protected-lane candidate bytes. Existing unrelated server/RPC/OpenAPI/Inngest behavior MAY be exercised as regression evidence only and MUST NOT become a new C4 composition or lifecycle owner.

#### Scenario: Adjacent mutation ports remain zero

- **WHEN** legacy membership paths are absent and surviving host regressions are exercised with adjacent authorities instrumented
- **THEN** external Oclif, controller, release, artifact, provider, promotion, export, personal-record, and protected-lane mutation counters remain zero
- **AND** no missing app/runtime capability is repaired through a C4 fallback

