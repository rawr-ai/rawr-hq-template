# Agent Plugin Export Destination Resource Router

## Scope

- Applies to `resources/agent-plugin-export-destination/**` until a
  provider-local router narrows the scope.
- This resource owns the provider-neutral contract for bounded export
  destination observation, mutation, restoration, and settlement.

## Boundaries

- The contract carries filesystem facts and exact requested mutations only.
  Export layout, ledger meaning, and lifecycle policy belong to the consuming
  semantic owner.
- Provider SDKs and Node filesystem mechanics stay outside `contract.ts`.
- Callers must not construct provider-owned capture handles or reinterpret a
  mechanical receipt as product authority.

## Flow

- A semantic owner selects a destination, paths, bounds, and mutations; a
  concrete provider inspects or captures the destination, applies the request,
  and returns observations or a typed resource failure.

## Routing

- [Repository router](../../AGENTS.md)
- [Provider-neutral contract](contract.ts)
- [Effect Platform Node provider](providers/effect-platform-node/AGENTS.md)

## Validation

- Run `bunx nx run @rawr/resource-agent-plugin-export-destination:lint` and
  `bunx nx run @rawr/resource-agent-plugin-export-destination:typecheck`.
