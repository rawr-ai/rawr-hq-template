# External CLI Extension Boundary Specification

## Purpose

Define the native Oclif boundary for genuine external CLI extensions without
sharing authority with curated agent-plugin lifecycle.

## Requirements

### Requirement: Oclif owns external extension lifecycle

The `rawr plugins` command surface MUST be supplied directly by
`@oclif/plugin-plugins` through ordinary Oclif core-plugin composition. The
private Template application MUST NOT provide local wrappers, another registry,
guarded command delegates, candidate staging, a runtime import sandbox, or
direct writes to Oclif user state.

#### Scenario: Disposable extension round trip

- **WHEN** an external fixture is installed, listed, invoked, and removed with
  explicit disposable `HOME`, XDG data/config/cache, and npm cache/config inputs
- **THEN** official Oclif commands own every extension-state mutation
- **AND** lifecycle services and provider adapters record zero calls

#### Scenario: Native recovery is requested

- **WHEN** an operator invokes Oclif's documented native removal or reset path
  for a missing or broken extension entry
- **THEN** the application delegates to native behavior without reading a
  private release store or source checkout
- **AND** an unsupported corruption mode may surface Oclif's native failure but
  MUST NOT activate an application-owned recovery bootstrap

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
