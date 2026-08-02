# ChatGPT Corpus CLI Plugin Router

## Purpose

- Let operators initialize and consolidate a ChatGPT corpus workspace through
  stable Oclif commands backed by the corpus service.

## Scope

- Applies to `plugins/cli/commands/chatgpt-corpus/**`; inherit the
  [plugin package router](../../../AGENTS.md).
- This package owns the Oclif projection for initializing and consolidating a
  ChatGPT corpus workspace.

## Boundaries

- Commands own arguments, flags, CLI result envelopes, and human-readable
  output. Corpus policy and result semantics remain in
  `@habitat-ai/rawr-chatgpt-corpus`.
- `src/lib/client.ts` binds the public corpus client to the package-local
  filesystem workspace-store adapter and observability adapters. Keep
  filesystem realization behind the declared workspace-store port; do not
  import corpus service implementation paths.
- `src/lib/projection.ts` may translate service results into stable CLI paths
  and summaries. It must not recreate service validation or corpus policy.
- This command plugin does not own agent-plugin release, provider, or channel
  state.

## Behavior

- The plugin converts workspace-oriented CLI input into a bound corpus
  operation and projects the returned corpus summary for machines or people
  without reinterpreting it.

## Concepts

- A **corpus workspace** is the selected source and artifact root. A
  **workspace-store adapter** supplies filesystem mechanics; a **CLI
  projection** turns service results into stable paths and summaries.

## Flow

- Oclif parses a workspace path, the binding supplies the workspace-store
  adapter, the corpus client performs `workspace.initialize` or
  `corpusArtifacts.materialize`, and the command projects the result for JSON
  or human output.

## Interfaces

- Oclif arguments and flags face the operator; the public corpus client and
  workspace-store port face the service; JSON and human renderings are the
  outward command result interfaces.

## Routing

- [Plugin package boundaries](../../../AGENTS.md)
- [Command surface and local usage](README.md)
- [Behavior test](test/plugin-chatgpt-corpus.test.ts)

## Validation

- Run `bunx nx run habitat:lint`.
- Run `bunx nx run @habitat-ai/rawr-plugin-chatgpt-corpus:typecheck`.
- Run `bunx nx run @habitat-ai/rawr-plugin-chatgpt-corpus:test`.
- Run `bunx nx run @habitat-ai/rawr-plugin-chatgpt-corpus:manifest` when command discovery
  or Oclif metadata changes.
