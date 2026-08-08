# Agent Plugin Releases Module Router

## Purpose

- Establish whether clean or staged content can form an agent-plugin release
  and maintain the canonical release-input record used for that decision.

## Scope

- Applies to release eligibility, release-input record, refresh, and repository
  checks in this module directory.

## Boundaries

- Personal's reviewed record owns desired membership and exact Git objects own
  selected bytes. The service model owns release derivation shared with
  Packaging; Providers owns its provider-specific selected-content resolution.
- The service model owns clean-content eligibility and declared-tree policy
  because packaging and provider testing consume the same meanings. It also
  owns the cross-module release diagnostic schema, construction policy, and
  canonical ordering used by release codecs and ownership validation. This
  module owns staged eligibility, refresh policy, operation DTOs, handlers,
  results, and operation-specific issues; it does not publish packages, update
  vendor content, or mutate native provider state.
- The module curates one ready content-workspace resource from inherited
  service dependencies. Operation handlers directly sequence clean and staged
  observations, while the service model classifies only the cross-module clean
  facts. Native Git decoding remains in the resource provider; no module DTO,
  reader, or adapter mirrors that boundary.

## Behavior

- The module handles validation and serialization operations for release-input
  records, authors resource sequencing in its oRPC operations, consumes pure
  clean classification and release derivation, applies staged and refresh
  policy, and rejects repository observations that change before final
  revalidation.

## Concepts

- A **release input** declares members, ownership, provenance, locks, and
  quality policy. Exact Git objects close the selected bytes. An **eligibility
  binding** pins clean Git content; a **staged binding** pins an index
  observation; a shared **release derivation** identifies a targeted release or
  complete set.

## Flow

- A caller selects clean or staged evaluation; the handler invokes the ready
  workspace resource, translates its typed failures, applies shared derivation
  and module policy, revalidates identity, and returns eligibility or
  structured issues.

## Interfaces

- `check`, `releaseInputRecord`, `refreshReleaseInput`, and `checkRepository`
  form the caller surface. One ready content-workspace resource supplies Git
  facts; service and module policy classify those facts without acquiring
  resource authority.

## Routing

- [Agent Plugin Lifecycle service router](../../../../AGENTS.md)
- [Packaging module](../packaging/AGENTS.md)
- [Vendor authoring module](../vendors/AGENTS.md)

## Validation

- Run `bunx nx run @habitat-ai/agent-plugin-lifecycle-service:typecheck`.
- Run `bunx nx run @habitat-ai/agent-plugin-lifecycle-service:test` for eligibility,
  release-input codecs and refresh, payload bounds, and repository identity
  behavior.
