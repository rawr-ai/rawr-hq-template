# Claude Native Agent Provider Router

## Purpose

- Translate the neutral native-agent-provider session into Claude's installed
  plugin command surface.

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

## Behavior

- The provider probes a selected Claude executable and home, decodes its
  marketplace and plugin inventory, serializes requested mutations, and
  reports the observed native result.

## Concepts

- A **Claude home** scopes native state. A **capability probe** determines
  supported commands; a **serialized mutation** prevents overlapping native
  marketplace or plugin changes.

## Flow

- The caller acquires a session for an explicit Claude executable and home;
  the provider probes or reads native inventory and delegates requested
  marketplace or plugin changes to Claude.

## Interfaces

- Neutral session operations enter from the parent contract; Claude argv and
  protocol output form the provider boundary; canonical observations and typed
  failures return to callers.

## Routing

- [Resource package router](../../AGENTS.md)
- [Claude provider implementation](index.ts)
- [Provider-neutral contract](../../contract.ts)

## Validation

- Run
  `bunx nx run habitat:lint`
  and
  `bunx nx run provider-native-agent-provider-claude-effect-platform-node:typecheck`.
- Run
  `bunx nx run provider-native-agent-provider-claude-effect-platform-node:test`
  when provider behavior changes.
