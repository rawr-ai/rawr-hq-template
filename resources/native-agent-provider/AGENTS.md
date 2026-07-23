# Native Agent Provider Resource Router

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

## Flow

- A host acquires a provider session for an explicit executable and home; the
  consumer probes or observes live state, then may request one supported native
  marketplace or plugin mutation.

## Routing

- [Repository router](../../AGENTS.md)
- [Provider-neutral contract](contract.ts)
- [Codex provider](providers/codex-effect-platform-node/AGENTS.md)
- [Claude provider](providers/claude-effect-platform-node/AGENTS.md)

## Validation

- Run `bunx nx run @rawr/resource-native-agent-provider:lint` and
  `bunx nx run @rawr/resource-native-agent-provider:typecheck`.
- Run `bunx nx run @rawr/resource-native-agent-provider:test` when contract
  behavior changes.
