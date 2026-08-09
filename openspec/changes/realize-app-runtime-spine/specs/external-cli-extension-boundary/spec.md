## MODIFIED Requirements

### Requirement: Oclif owns external extension lifecycle

The `habitat plugins` command surface MUST be distributed by
`@habitat-ai/cli` and supplied directly by `@oclif/plugin-plugins` through
ordinary Oclif core-plugin composition. The public CLI owns that vendor
dependency, configuration, manifest composition, and installed
extension-management behavior. The Habitat application, loader, and native
Oclif runtime consume the composed vendor surface. Neither boundary may provide
local wrappers, another registry, guarded command delegates, candidate staging,
a runtime import sandbox, or direct writes to Oclif user state.

The canonical native command IDs MUST be exactly `plugins`,
`plugins:inspect`, `plugins:install`, `plugins:link`, `plugins:reset`,
`plugins:uninstall`, and `plugins:update`. Vendor-native `plugins:add`,
`plugins:remove`, and `plugins:unlink` MAY remain aliases but MUST NOT be
reported as additional canonical command owners.

#### Scenario: Installed native extension lifecycle is complete

- **WHEN** the installed `@habitat-ai/cli` artifact is exercised with explicit
  disposable `HOME`, XDG data/config/cache, and npm cache/config inputs
- **THEN** root `habitat plugins` listing plus native `install`, `link`,
  `inspect`, `update`, `reset`, and `uninstall` routes operate on a prebuilt
  external extension through `@oclif/plugin-plugins`
- **AND** the linked or installed command is invokable exactly while present
  and becomes undiscoverable in a new process after uninstall
- **AND** lifecycle services and provider adapters record zero calls

#### Scenario: Installed extension receipt is closed

- **WHEN** the native lifecycle round trip completes
- **THEN** its acceptance receipt records the installed Habitat CLI artifact,
  the exact external fixture package, canonical command IDs, aliases,
  isolated state roots, and terminal native outcomes
- **AND** no source workspace, Nx project, release member, direct Oclif-state
  write, or third Habitat package participates

#### Scenario: Native recovery is requested

- **WHEN** an operator invokes Oclif's documented native removal or reset path
  for a missing or broken extension entry
- **THEN** `@habitat-ai/cli` delegates to native behavior without reading a
  private release store or source checkout
- **AND** an unsupported corruption mode may surface Oclif's native failure but
  MUST NOT activate an application-owned recovery bootstrap

### Requirement: External and curated plugin channels are disjoint

`habitat plugins` MUST manage only external Oclif extensions through the native
vendor mechanics mounted by the Habitat application/loader boundary. `habitat
agent plugins` MUST manage only curated provider-native agent plugins through
the Habitat agent-plugin topic and lifecycle service. Neither command family
may import the other's state writer or forward to the other family.

#### Scenario: Command channels are enumerated

- **WHEN** Oclif command, topic, alias, and help discovery are inspected
- **THEN** external extension mechanics appear only under `habitat plugins`
- **AND** curated lifecycle commands appear only under
  `habitat agent plugins`

#### Scenario: Curated sync executes

- **WHEN** a valid `habitat agent plugins sync` request is dispatched
- **THEN** Oclif external extension state remains unread and unchanged
