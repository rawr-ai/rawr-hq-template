# Habitat Catalog Service Router

## Purpose

- Resolve local Habitat authority and check admitted rule applications.

## Scope

- Applies to `services/catalog/**`.
- This service owns Habitat blueprint and instance admission semantics.

## Boundaries

- Consumers cross only through the public client. The service does not select
  providers, mount a runtime, or expose a composite CLI.
- The host supplies ready provider-neutral evaluation and source-inventory
  resources. The service owns application selection, rule meaning, and
  aggregate outcomes.
- The service enumerates exact authority paths from its bound workspace. Callers
  provide no repository visibility or authority classification input.
- A present version 2 registry contributes closed compatibility rules to the
  same check operation. Compatibility facts remain distinct from version 3
  instance applications and create no second runtime.

## Behavior

- The catalog module resolves closed version 3 local authority and reports all
  bounded admission failures as a rejected result.
- `catalog.check` executes selected Grit `check` and native Habitat structure
  applications from both admitted authority generations. Version 2 Grit rules
  retain exact-path subject coverage; unsupported modes refuse instead of
  skipping. Selected Grit applications whose final ordered prepared subjects
  are identical share one provider batch while retaining per-application
  reports; distinct subject sets and native structure evaluation stay
  separate.

## Concepts

- A **blueprint** defines reusable rules and instance vocabulary. An
  **instance** binds that vocabulary to one repository owner. An
  **application** is one resolved instance/rule pair.

## Flow

- Ready filesystem, path, rule-evaluation, and source-inventory capabilities
  descend through service context. The catalog module curates them, grouped
  handlers sequence observation, and pure module policy owns admission,
  selection, and result decisions.

## Interfaces

- `src/client.ts` is the sole public caller face. The private catalog contract
  exposes `resolve` and `check`.

## Routing

- [[../AGENTS|Service packages router]]
- [[src/service/modules/catalog/AGENTS|Catalog module router]]

## Validation

- Run `bunx nx run @habitat-ai/catalog-service:typecheck`, `:test`, and `:build`.
