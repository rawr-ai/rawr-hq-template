# mixed-plugin-lifecycle-retirement Specification

## Purpose
TBD - created by archiving change retire-mixed-plugin-lifecycle. Update Purpose after archive.
## Requirements
### Requirement: The mixed executable owners are absent
`@rawr/plugin-plugins`, `@rawr/agent-plugin-release`, `services/agent-config-sync`, `packages/agent-config-sync-node`, the five peer services `@rawr/agent-plugin-build|export|packaging|promotion` and `@rawr/agent-provider-deployment`, HQ Ops plugin-catalog/plugin-install/plugin-lifecycle and workspace-plugin-catalog modules, and every active import, package dependency, project, command, router, contract, entity, repository, test, hook, or guard that requires their existence MUST be deleted. Retained C2-C3 behavior MUST live only in the domain modules of `@rawr/agent-plugin-lifecycle`, except controller-owned undo. No renamed aggregate, wrapper, dormant copy, forwarding package, or compatibility facade may replace them.

#### Scenario: Repository inventory has no mixed owner
- **WHEN** source, package manifests, lock data, Nx projects, generated command inventory, tests, hooks, docs, and active guards are scanned semantically
- **THEN** no mixed owner or import is reachable
- **AND** every retained lifecycle behavior maps to exactly one typed procedure and one qualified state boundary inside the lifecycle service, or the separate controller-owned undo application

### Requirement: Legacy commands, flags, and state claims are unreachable
The system MUST reject or omit `rawr agent sync`, root `rawr undo`, every removed `rawr plugins` lifecycle/export/provider/doctor/CLI-install/improve/sweep/converge command, and the legacy agent/scope/source/repair/provider/install/projection/partial/Cowork flag bags. Old environment switches, source registries, persisted enablement, aggregate health, workspace undo, worktree marketplace, and source-path provider claims MUST NOT influence supported behavior.

#### Scenario: No compatibility path survives
- **WHEN** each deleted ID, topic, alias, hidden alias, flag, environment variable, state key, and historical invocation shape is exercised
- **THEN** it is undiscoverable or rejects before every lifecycle and state mutation port
- **AND** no message or documentation directs the operator to a deprecated forwarding route

### Requirement: Distribution and state authorities remain disjoint
Automatic install reconciliation, arbitrary content source registries, direct projection fallback, toolkit provider units, toolkit composition aliases, and synthetic toolkit `tools` distribution ownership MUST be absent. Curated content may be distributed only as an explicit release-set member owned by one agent plugin. Repository, artifact, provider, export, Oclif, controller, app, and undo status MUST remain separate read models and MUST NOT be combined into an aggregate repair authority.

#### Scenario: Equal bytes do not create a second owner
- **WHEN** toolkit-derived and curated-agent paths contain equal guidance bytes or matching names
- **THEN** no toolkit/composition/provider alias becomes a release member or cleanup authority
- **AND** only the explicit curated ownership index determines distribution

### Requirement: Legacy app mounting remains retired without replacement
C5 MUST preserve the absence of `rawr plugins web`, persisted plugin enablement, web plugin scans, mounting orchestration, and app-composition command or state implementations. It MUST NOT add `AppDefinition` editing, runtime compilation, provisioning, process runtime, adapter, harness, or runtime-catalog behavior. Future app/runtime realization belongs only to the dedicated canonical architecture migration.

#### Scenario: Lifecycle cutover does not build an app engine
- **WHEN** the C5 diff and dependency graph are reviewed
- **THEN** no new app/web composition, mounting, realization, or runtime-observation source path or dependency exists
- **AND** qualified agent lifecycle commands operate independently of app composition

