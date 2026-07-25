# ChatGPT Corpus Workspace Module Router

## Purpose

- Establish the canonical managed workspace in which source exports and
  derived corpus artifacts can coexist predictably.

## Scope

- Applies to workspace-template and initialization behavior in this module
  directory.

## Boundaries

- Workspace owns scaffold identity and managed entries, not source parsing,
  corpus interpretation, or research orchestration.
- Filesystem mechanics remain behind the host-supplied workspace store.

## Behavior

- The module describes the canonical template and idempotently initializes its
  directories and managed files while distinguishing created from existing
  entries.

## Concepts

- A **workspace template** declares managed structure. A **workspace
  reference** identifies the bound root; a **managed file** is scaffold-owned
  content whose expected role is stable across initialization.

## Flow

- A caller requests the template or initialization; the module resolves the
  bound workspace, ensures the declared structure through the store, and
  returns exact created and existing observations.

## Interfaces

- `describeTemplate` exposes the declarative scaffold.
  `initialize` uses the workspace-store port and returns a bounded workspace
  result.

## Routing

- [ChatGPT Corpus service router](../../../../AGENTS.md)
- [Source-material snapshot module](../source-materials/AGENTS.md)

## Validation

- Run `bunx nx run @rawr/chatgpt-corpus:typecheck`.
- Run `bunx nx run @rawr/chatgpt-corpus:test` for template identity,
  initialization, and empty-workspace behavior.
