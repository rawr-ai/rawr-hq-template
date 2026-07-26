# Content Workspace Git Provider Router

## Purpose

- Realize the content-workspace contract with bounded Git subprocess and Node
  filesystem operations.

## Scope

- Applies to
  `resources/content-workspace/providers/git-effect-platform-node/**`.
- This provider realizes the content-workspace contract with Git and Effect
  Platform Node filesystem capabilities.

## Boundaries

- Implement exact repository and filesystem mechanics only; do not decide
  release eligibility, content ownership, or lifecycle policy.
- Preserve caller-supplied bounds, opening and closing identity checks, and
  typed failure reporting around every observation or mutation.
- Decode Git tree serialization here and return only provider-neutral regular
  entry facts; release path branding, portable collision policy, and content
  meaning remain with lifecycle consumers.
- Decode staged-index serialization here and return provider-neutral mode,
  object ID, stage, and path facts. Preserve conflict and nonregular entries
  for the consuming domain to classify.
- Keep Git command and filesystem details out of the parent contract.

## Behavior

- The provider opens a caller-selected local workspace, performs exact object
  or workspace mechanics, rechecks identity around mutation, and reports raw
  results or bounded typed tree and staged-index facts.

## Concepts

- An **opening identity** establishes the repository state admitted to an
  operation; a **closing identity** detects races or replacement; a **bounded
  Git observation** returns facts without policy interpretation.

## Flow

- The caller supplies a validated locator, ref, object identity, or write
  request; the provider performs bounded Git and filesystem operations and
  returns raw observations or `ContentWorkspaceFailure`.

## Interfaces

- Parent-contract requests delimit Git and filesystem work; Effect Platform
  Node executes it; raw observations and `ContentWorkspaceFailure` cross back
  to the semantic owner.

## Routing

- [Resource package router](../../AGENTS.md)
- [Provider implementation](index.ts)
- [Provider-neutral contract](../../contract.ts)

## Validation

- Run `bunx nx run habitat:lint`
  and
  `bunx nx run provider-content-workspace-git-effect-platform-node:typecheck`.
- Run `bunx nx run provider-content-workspace-git-effect-platform-node:test`
  when provider behavior changes.
