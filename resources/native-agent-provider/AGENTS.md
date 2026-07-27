# Native Agent Provider Resource Router

## Purpose

- Provide one neutral session boundary for observing and changing native
  Codex and Claude plugin state.

## Scope

- Applies to `resources/native-agent-provider/**` until a provider-local router
  narrows the scope.
- This resource owns the provider-neutral session contract for probing native
  agent tools, observing marketplaces and plugins, reading installed plugin
  files, and invoking native mutations.

## Boundaries

- Native provider inventory is installed-state truth. The contract must report
  it without inferring curated release or channel authority.
- Lifecycle policy and desired-set calculation belong to the consuming
  service; this resource exposes capabilities and performs explicit native
  operations only.
- Provider CLI syntax, protocol decoding, and home-specific mechanics stay in
  concrete providers.

## Behavior

- A session probes provider capabilities, reports live marketplace and plugin
  inventory, reads selected installed content, and performs only explicitly
  requested native mutations.

## Concepts

- A **native provider session** binds one ordinary provider command to one
  explicit home. **Inventory** is live installed-state truth; **marketplaces**
  and **plugins** are provider entities, not curated release records.

## Flow

- A host acquires a provider session for an explicit home; the concrete
  provider resolves its ordinary command from the process environment. The
  consumer observes live state, then may request one supported native
  marketplace or plugin mutation.

## Interfaces

- Hosts acquire sessions from concrete providers; lifecycle services issue
  neutral observations and mutations through the contract; canonical facts
  and typed failures return across the same boundary.

## Routing

- [Repository router](../../AGENTS.md)
- [Provider-neutral contract](contract.ts)
- [Codex provider](providers/codex-effect-platform-node/AGENTS.md)
- [Claude provider](providers/claude-effect-platform-node/AGENTS.md)

## Validation

- Run `bunx nx run habitat:lint` and
  `bunx nx run @rawr/resource-native-agent-provider:typecheck`.
- Run `bunx nx run @rawr/resource-native-agent-provider:test` when contract
  behavior changes.
