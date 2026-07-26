# Versioned Content Git Provider Router

## Purpose

- Realize exact remote versioned-content observation with ordinary Git and
  Effect Platform Node filesystem capabilities.

## Scope

- Applies to
  `resources/versioned-content/providers/git-effect-platform-node/**`.
- This provider realizes the versioned-content contract through temporary bare
  Git repositories.

## Boundaries

- Implement remote acquisition, bounded Git reads, ancestry queries, failure
  translation, interruption, and cleanup mechanics only.
- Do not decide vendor identity, update admission, payload equivalence,
  authoring policy, provider selection, or runtime lifetime.
- Keep Git process and temporary filesystem details out of the parent
  contract.

## Behavior

- The provider acquires one temporary bare repository, fetches the selected
  full ref, performs the requested exact operation, and removes the owned
  repository on success, failure, or interruption.

## Concepts

- A **private Git root** is provider-owned temporary acquisition state. An
  **exact fetched tree** binds the selected ref to its commit, tree, object
  format, regular entries, and optional blob bytes.

## Flow

- A caller submits one parent-contract request; the provider validates its
  mechanical bounds, acquires and uses Git state, finalizes cleanup, and
  returns exact facts or `VersionedContentFailure`.

## Interfaces

- Parent-contract requests delimit Git work; Effect Platform Node supplies
  filesystem mechanics; parent-contract facts and failures cross back to the
  caller.

## Routing

- [Resource package router](../../AGENTS.md)
- [Provider implementation](index.ts)
- [Provider-neutral contract](../../contract.ts)

## Validation

- Run `bunx nx run habitat:lint` and
  `bunx nx run provider-versioned-content-git-effect-platform-node:typecheck`.
- Run
  `bunx nx run provider-versioned-content-git-effect-platform-node:test`
  when provider behavior changes.

