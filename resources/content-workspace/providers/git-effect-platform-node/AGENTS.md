# Content Workspace Git Provider Router

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
- Keep Git command and filesystem details out of the parent contract.

## Flow

- The caller supplies a validated locator, ref, object identity, or write
  request; the provider performs bounded Git and filesystem operations and
  returns raw observations or `ContentWorkspaceFailure`.

## Routing

- [Resource package router](../../AGENTS.md)
- [Provider implementation](index.ts)
- [Provider-neutral contract](../../contract.ts)

## Validation

- Run `bunx nx run provider-content-workspace-git-effect-platform-node:lint`
  and
  `bunx nx run provider-content-workspace-git-effect-platform-node:typecheck`.
- Run `bunx nx run provider-content-workspace-git-effect-platform-node:test`
  when provider behavior changes.
