# ChatGPT Corpus CLI Plugin Router

## Scope

- Applies to `plugins/cli/commands/chatgpt-corpus/**`; inherit the
  [plugin package router](../../../AGENTS.md).
- This package owns the Oclif projection for initializing and consolidating a
  ChatGPT corpus workspace.

## Boundaries

- Commands own arguments, flags, CLI result envelopes, and human-readable
  output. Corpus policy and result semantics remain in
  `@rawr/chatgpt-corpus`.
- `src/lib/client.ts` binds the public corpus client to the package-local
  filesystem workspace-store adapter and observability adapters. Keep
  filesystem realization behind the declared workspace-store port; do not
  import corpus service implementation paths.
- `src/lib/projection.ts` may translate service results into stable CLI paths
  and summaries. It must not recreate service validation or corpus policy.
- This command plugin does not own agent-plugin release, provider, or channel
  state.

## Flow

- Oclif parses a workspace path, the binding supplies the workspace-store
  adapter, the corpus client performs `workspace.initialize` or
  `corpusArtifacts.materialize`, and the command projects the result for JSON
  or human output.

## Routing

- [Plugin package boundaries](../../../AGENTS.md)
- [Command surface and local usage](README.md)
- [Behavior test](test/plugin-chatgpt-corpus.test.ts)

## Validation

- Run `bunx nx run @rawr/plugin-chatgpt-corpus:lint`.
- Run `bunx nx run @rawr/plugin-chatgpt-corpus:typecheck`.
- Run `bunx nx run @rawr/plugin-chatgpt-corpus:test`.
- Run `bunx nx run @rawr/plugin-chatgpt-corpus:manifest` when command discovery
  or Oclif metadata changes.
