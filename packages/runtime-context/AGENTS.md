# Runtime Context Router (`@rawr/runtime-context`)

## Purpose

- Define the shared type vocabulary for host support and request context after
  runtime capabilities have been selected.

## Scope

- Applies to shared runtime support types in `packages/runtime-context/**`.

## Boundaries

- Owns the generic `deps`, `scope`, `config`, `invocation`, and initial
  `provided` lane contracts used after host binding.
- Must not own application declarations, resource construction, operation
  policy, executable assembly, or compatibility aliases for domain context.
- `deps` contains ready host capabilities. The package does not select their
  providers, acquire them, or prescribe a domain-specific dependency set.

## Behavior

- Runtime context types carry ready support and request facts into service
  middleware. Middleware enriches `provided`; modules curate the smallest
  handler vocabulary required by their operations.

## Concepts

- **Deps** are ready capabilities, **scope** selects their operating boundary,
  **config** carries externally chosen behavior, **invocation** owns request
  facts, and **provided** is the downstream enrichment lane.

## Flow

- A host projects ready support into the four input lanes and starts each
  request with an empty `provided` lane.
- Service middleware enriches the request; module composition narrows its
  vocabulary; operation handlers consume that curated context.

## Interfaces

- Hosts instantiate the generic contracts. Services specialize them locally;
  no domain context type is exported from this package.

## Routing

- [Packages router](../AGENTS.md)
- [HQ SDK](../hq-sdk/AGENTS.md)

## Validation

- `bunx nx run habitat:lint`
- `bunx nx run @rawr/runtime-context:typecheck`
- `bunx nx run @rawr/runtime-context:test`
- `bunx nx run @rawr/runtime-context:build`
