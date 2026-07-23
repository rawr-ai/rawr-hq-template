# ChatGPT Corpus Service Router

## Scope

- Applies to `services/chatgpt-corpus/**`.
- This oRPC service owns workspace scaffolding, source-material snapshots, and
  the construction and materialization of ChatGPT corpus artifacts.

## Boundaries

- Consumers cross through declared package exports; module contracts, routers,
  and helpers remain package-owned.
- The service owns corpus interpretation and artifact layout. A host-supplied
  `WorkspaceStore` owns the underlying workspace I/O mechanics.
- Do not move provider filesystem behavior or unrelated research orchestration
  into this service.

## Flow

- A host binds a workspace store and workspace reference; the workspace and
  source-material modules establish inputs; the corpus-artifacts module builds
  and writes the derived artifact bundle through that port.

## Routing

- [Repository router](../../AGENTS.md)
- [Public service contract](src/service/contract.ts)
- [Workspace store port](src/orpc/ports/workspace-store.ts)

## Validation

- Run `bunx nx run @rawr/chatgpt-corpus:lint` and
  `bunx nx run @rawr/chatgpt-corpus:typecheck`.
- Run `bunx nx run @rawr/chatgpt-corpus:test` when corpus behavior changes.
