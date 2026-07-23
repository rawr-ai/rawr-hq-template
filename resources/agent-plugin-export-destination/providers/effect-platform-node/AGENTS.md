# Export Destination Effect Platform Node Provider Router

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

## Flow

- The caller supplies a validated mechanical request; the provider inspects
  the destination, executes the requested capture or mutation transition, and
  returns exact observations or an `ExportDestinationFailure`.

## Routing

- [Resource package router](../../AGENTS.md)
- [Provider implementation](index.ts)
- [Provider-neutral contract](../../contract.ts)

## Validation

- Run
  `bunx nx run provider-agent-plugin-export-destination-effect-platform-node:lint`
  and
  `bunx nx run provider-agent-plugin-export-destination-effect-platform-node:typecheck`.
- Run
  `bunx nx run provider-agent-plugin-export-destination-effect-platform-node:test`
  when provider behavior changes.
