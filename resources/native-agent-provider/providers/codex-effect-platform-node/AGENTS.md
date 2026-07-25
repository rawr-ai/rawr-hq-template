# Codex Native Agent Provider Router

## Purpose

- Translate the neutral native-agent-provider session into Codex's installed
  plugin command surface.

## Scope

- Applies to
  `resources/native-agent-provider/providers/codex-effect-platform-node/**`.
- This provider realizes the native-agent-provider contract through Codex's
  native plugin commands.

## Boundaries

- Treat Codex inventory as live provider state; do not synthesize desired
  lifecycle state or persist a competing provider record.
- Own Codex command arguments, protocol decoding, capability probes, and
  serialized native mutations only.
- Report canonical provider observations and typed failures through the parent
  contract.

## Behavior

- The provider probes a selected Codex executable and home, decodes live
  marketplace and plugin state, serializes requested mutations, and returns
  the native observation.

## Concepts

- A **Codex home** scopes installed state. A **protocol decoder** converts
  native command output to canonical facts; a **mutation queue** preserves
  native operation ordering.

## Flow

- The caller acquires a session for an explicit Codex executable and home; the
  provider probes or reads native inventory and delegates requested
  marketplace or plugin changes to Codex.

## Interfaces

- Parent-session operations are the provider input; Codex commands and
  protocol output are the native interface; normalized observations and typed
  failures are the contract output.

## Routing

- [Resource package router](../../AGENTS.md)
- [Codex provider implementation](index.ts)
- [Provider-neutral contract](../../contract.ts)

## Validation

- Run
  `bunx nx run habitat:lint`
  and
  `bunx nx run provider-native-agent-provider-codex-effect-platform-node:typecheck`.
- Run
  `bunx nx run provider-native-agent-provider-codex-effect-platform-node:test`
  when provider behavior changes.
