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
  because packaging and provider testing consume the same meanings. This
  module owns staged eligibility, refresh policy, operation DTOs, handlers,
  results, and issues; it does not publish packages, update vendor content, or
  mutate native provider state.
- The module directly consumes a narrowed ready staged-index resource reference
  and owns opening/closing binding policy. Native Git decoding remains in the
  resource provider; no module DTO, reader, or adapter mirrors that boundary.

## Behavior

- The module handles validation and serialization operations for release-input
  records, consumes service-owned clean eligibility and release derivation,
  applies its staged and refresh policies, and rejects repository observations
  that change before final revalidation.

## Concepts

- A **release input** records the exact selected source. An **eligibility
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
  form the caller surface. Clean policy and the narrowed staged resource
  reference supply exact Git facts without acquiring domain authority.

## Routing

- [Agent Plugin Lifecycle service router](../../../../AGENTS.md)
- [Packaging module](../packaging/AGENTS.md)
- [Vendor authoring module](../vendors/AGENTS.md)

## Validation

- Run `bunx nx run @rawr/agent-plugin-lifecycle:typecheck`.
- Run `bunx nx run @rawr/agent-plugin-lifecycle:test` for eligibility,
  release-input codecs and refresh, payload bounds, and repository identity
  behavior.
