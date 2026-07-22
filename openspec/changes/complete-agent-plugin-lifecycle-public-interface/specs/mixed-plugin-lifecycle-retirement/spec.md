## MODIFIED Requirements

### Requirement: The mixed executable owners are absent

The repository MUST contain none of `@rawr/plugin-plugins`,
`@rawr/agent-plugin-release`, the former mixed sync service/package, the five
peer lifecycle services, HQ Ops plugin-lifecycle and workspace-plugin-catalog
modules, or an active import, dependency, project, command, router, contract,
repository, test, hook, or guard that requires them. Retained behavior MUST live
only in the five bounded modules of `@rawr/agent-plugin-lifecycle` or in the
separately owned `create` source-authoring command. No renamed aggregate,
controller application, wrapper, dormant copy, forwarding package, or
compatibility facade may replace them.

#### Scenario: Repository inventory has no mixed owner
- **WHEN** source, manifests, Nx projects, generated commands, tests, hooks,
  docs, and active guards are scanned semantically
- **THEN** no mixed owner or import is reachable
- **AND** every retained lifecycle behavior maps to one typed procedure and its
  qualified Git, provider, vendor, or explicit package-output boundary

### Requirement: Legacy commands, flags, and state claims are unreachable

The system MUST reject or omit `rawr agent sync`, root `rawr undo`, every
removed `rawr plugins` lifecycle/export/provider/doctor/CLI-install/improve/
sweep/converge command, and the legacy flag bags. Old environment switches,
source registries, persisted enablement, aggregate health, workspace undo,
worktree marketplace, controller identity, artifact handles, and source-path
provider claims MUST NOT influence supported behavior.

#### Scenario: No compatibility path survives
- **WHEN** a deleted command, alias, flag, environment variable, state key, or
  historical invocation shape is exercised
- **THEN** it is undiscoverable or rejects before every lifecycle and native
  mutation port
- **AND** no operator guidance directs users to a forwarding route

### Requirement: Distribution and state authorities remain disjoint

The system MUST keep desired content, installed provider state, package output,
and external Oclif extension state disjoint. Automatic source-registry
reconciliation, direct projection fallback, toolkit provider units, composition
aliases, and synthetic toolkit distribution ownership MUST be absent. Reviewed Personal Git records select desired curated
content; one derived ownership index assigns each skill to one member; explicit
native provider homes own installed truth; explicit package outputs own only
their bytes; Oclif owns external CLI extension state. These views MUST NOT be
combined into an aggregate repair authority or persisted through a parallel
lifecycle store.

#### Scenario: Equal bytes do not create a second owner
- **WHEN** toolkit-derived and curated-agent paths contain equal guidance bytes
  or matching names
- **THEN** no toolkit, composition, or provider alias becomes a release member
  or cleanup authority
- **AND** only the closed derived ownership index determines distribution

### Requirement: Legacy app mounting remains retired without replacement

The change MUST preserve the absence of `rawr plugins web`, persisted app-plugin
enablement, web-plugin scans, mounting orchestration, and app-composition command
or state implementations. It MUST NOT add `AppDefinition` editing, runtime
compilation, provisioning, process runtime, adapter, harness, or runtime-catalog
behavior. Future app/runtime realization belongs only to the dedicated canonical
architecture migration.

#### Scenario: Lifecycle cutover does not build an app engine
- **WHEN** the implementation and dependency graph are reviewed
- **THEN** no new app/web composition, mounting, realization, or runtime
  observation path exists
- **AND** agent lifecycle commands operate independently of app composition
