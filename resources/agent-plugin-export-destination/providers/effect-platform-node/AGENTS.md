# Export Destination Effect Platform Node Provider Router

## Purpose

- Realize safe export-destination observation, capture, mutation, and
  restoration on a Node filesystem through Effect Platform.

## Scope

- Applies to
  `resources/agent-plugin-export-destination/providers/effect-platform-node/**`.
- This provider realizes the export-destination resource with Effect Platform
  Node filesystem capabilities.

## Boundaries

- Implement only the parent resource contract and provider-local safety
  mechanics; do not decide export layout, lifecycle policy, or ledger meaning.
- Preserve bounded observation, entry-identity checks, capture-handle
  ownership, and typed failures at this boundary.
- Keep provider-specific filesystem details out of the parent contract.

## Behavior

- The provider protects entry identity across bounded operations, owns its
  capture handles, and converts filesystem outcomes into the parent resource's
  settlement model.

## Concepts

- **Entry identity** detects replacement during a transaction. A
  **provider-owned capture** holds rollback material; **settlement** proves the
  requested mechanical end state or reports why it remains unsettled.

## Flow

- The caller supplies a validated mechanical request; the provider inspects
  the destination, executes the requested capture or mutation transition, and
  returns exact observations or an `ExportDestinationFailure`.

## Interfaces

- Parent-contract requests are the only admitted inputs; Effect Platform Node
  supplies filesystem mechanics; parent-contract observations and
  `ExportDestinationFailure` are the outputs.

## Routing

- [Resource package router](../../AGENTS.md)
- [Provider implementation](index.ts)
- [Provider-neutral contract](../../contract.ts)

## Validation

- Run
  `bunx nx run habitat:lint`
  and
  `bunx nx run provider-agent-plugin-export-destination-effect-platform-node:typecheck`.
- Run
  `bunx nx run provider-agent-plugin-export-destination-effect-platform-node:test`
  when provider behavior changes.
