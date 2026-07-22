## REMOVED Requirements

### Requirement: External-only Oclif state (B03, I08)
**Reason**: Local RAWR projections around official Oclif plugin commands create a
second extension manager.
**Migration**: Enable `@oclif/plugin-plugins` directly as an Oclif core plugin.

### Requirement: Pre-load reserved-surface guard (B03)
**Reason**: The custom static-inspection and quarantine layer reimplements Oclif
extension loading for an adversarial local-code model outside scope.
**Migration**: Rely on Oclif's native plugin manifest, command collision, and
loading behavior; keep RAWR first-party commands in core plugins.

### Requirement: Recovery-safe core dispatch (B03)
**Reason**: The bespoke recovery bootstrap exists only because Oclif-provided
loading was disabled and reconstructed.
**Migration**: Use ordinary Oclif startup and native plugin recovery commands.

### Requirement: Guarded native external mutation (B03)
**Reason**: RAWR MUST NOT wrap, sandbox, or reproduce Oclif's registry writer,
package staging, update algorithm, or runtime module loader.
**Migration**: Invoke the official `@oclif/plugin-plugins` command classes through
normal Oclif dispatch.

### Requirement: Hermetic recovery survives source deletion (B02, B03, B32)
**Reason**: Source independence is supplied by the installed CLI package, not a
controller-root-only subprocess and private release store.
**Migration**: Verify ordinary plugin recovery from the conventionally installed
CLI after the source checkout is unavailable.

### Requirement: Lifecycle paths cannot mutate Oclif authority (B01, I01, I08)
**Reason**: The boundary remains valid but its controller-specific mechanism is
removed.
**Migration**: Enforce command-plugin/service dependency separation through
Habitat and verify observable command dispatch.

### Requirement: Bare plugins is exactly the external extension surface
**Reason**: The command-surface rule remains valid but is now owned directly by
direct Oclif composition rather than a Template projection.
**Migration**: Keep `rawr plugins` under `@oclif/plugin-plugins` and curated
lifecycle only under `rawr agent plugins`.

## ADDED Requirements

### Requirement: Oclif owns external extension lifecycle

The `rawr plugins` command surface MUST be supplied directly by
`@oclif/plugin-plugins` through ordinary Oclif core-plugin composition. RAWR
MUST NOT provide local wrappers, another registry, guarded command delegates,
candidate staging, a runtime import sandbox, or direct writes to Oclif user
state.

#### Scenario: Disposable extension round trip
- **WHEN** an external fixture is installed, listed, invoked, and removed with
  explicit disposable `HOME`, XDG data/config/cache, and npm cache/config inputs
- **THEN** official Oclif commands own every extension-state mutation
- **AND** RAWR lifecycle services and provider adapters record zero calls

#### Scenario: Native recovery is requested
- **WHEN** an operator invokes Oclif's documented native removal or reset path
  for a missing or broken extension entry
- **THEN** RAWR delegates to native behavior without reading a controller store
  or source checkout
- **AND** an unsupported corruption mode may surface Oclif's native failure but
  MUST NOT activate a RAWR recovery bootstrap

### Requirement: External and curated plugin channels are disjoint

`rawr plugins` MUST manage only external Oclif extensions.
`rawr agent plugins` MUST manage only curated provider-native agent plugins
through the lifecycle service. Neither command family may import the other's
state writer or forward to the other family.

#### Scenario: Command channels are enumerated
- **WHEN** Oclif command, topic, alias, and help discovery are inspected
- **THEN** external extension mechanics appear only under `rawr plugins`
- **AND** curated lifecycle commands appear only under `rawr agent plugins`

#### Scenario: Curated sync executes
- **WHEN** a valid `rawr agent plugins sync` request is dispatched
- **THEN** Oclif external extension state remains unread and unchanged
