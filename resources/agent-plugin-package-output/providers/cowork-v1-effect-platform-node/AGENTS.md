# Cowork V1 Package Output Provider Router

## Scope

- Applies to
  `resources/agent-plugin-package-output/providers/cowork-v1-effect-platform-node/**`.
- This provider realizes Cowork v1 archive encoding and package-output
  publication with Effect Platform Node.

## Boundaries

- Implement the parent resource contract without selecting plugin contents,
  release policy, destination meaning, or channel state.
- Keep ZIP encoding, temporary output, replacement checks, cleanup, and final
  verification inside this provider.
- Expose failures and publication outcomes through the parent contract rather
  than provider-specific exceptions.

## Flow

- The caller supplies selected entries or bytes; the provider encodes the
  deterministic archive or publishes the output; it verifies the filesystem
  outcome and returns the contract result.

## Routing

- [Resource package router](../../AGENTS.md)
- [Provider implementation](index.ts)
- [Provider-neutral contract](../../contract.ts)

## Validation

- Run
  `bunx nx run habitat:lint`
  and
  `bunx nx run provider-agent-plugin-package-output-cowork-v1-effect-platform-node:typecheck`.
- Run
  `bunx nx run provider-agent-plugin-package-output-cowork-v1-effect-platform-node:test`
  when provider behavior changes.
