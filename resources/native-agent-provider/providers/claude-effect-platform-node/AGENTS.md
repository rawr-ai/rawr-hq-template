# Claude Native Agent Provider Router

## Scope

- Applies to
  `resources/native-agent-provider/providers/claude-effect-platform-node/**`.
- This provider realizes the native-agent-provider contract through Claude's
  native plugin commands.

## Boundaries

- Treat Claude inventory as live provider state; do not synthesize desired
  lifecycle state or persist a competing provider record.
- Own Claude command arguments, protocol decoding, capability probes, and
  serialized native mutations only.
- Report canonical provider observations and typed failures through the parent
  contract.

## Flow

- The caller acquires a session for an explicit Claude executable and home;
  the provider probes or reads native inventory and delegates requested
  marketplace or plugin changes to Claude.

## Routing

- [Resource package router](../../AGENTS.md)
- [Claude provider implementation](index.ts)
- [Provider-neutral contract](../../contract.ts)

## Validation

- Run
  `bunx nx run provider-native-agent-provider-claude-effect-platform-node:lint`
  and
  `bunx nx run provider-native-agent-provider-claude-effect-platform-node:typecheck`.
- Run
  `bunx nx run provider-native-agent-provider-claude-effect-platform-node:test`
  when provider behavior changes.
