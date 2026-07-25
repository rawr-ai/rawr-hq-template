# ChatGPT Corpus Service Router

## Purpose

- Turn exported ChatGPT conversations and supporting source material into a
  validated, navigable corpus workspace.

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

## Behavior

- The service establishes workspace structure, reads and normalizes source
  snapshots, derives corpus graphs and reports, validates them, and
  materializes the admitted artifact set.

## Concepts

- A **workspace template** defines managed structure. A **source snapshot** is
  the bounded input observation; a **corpus artifact bundle** is the validated
  derived representation and operator documentation.

## Flow

- A host binds a workspace store and workspace reference; the workspace and
  source-material modules establish inputs; the corpus-artifacts module builds
  and writes the derived artifact bundle through that port.

## Interfaces

- The oRPC contract exposes workspace, source-material, and artifact
  capabilities; the `WorkspaceStore` port is the sole handoff to underlying
  workspace I/O.

## Routing

- [Repository router](../../AGENTS.md)
- [Public service contract](src/service/contract.ts)
- [Workspace store port](src/orpc/ports/workspace-store.ts)

## Validation

- Run `bunx nx run habitat:lint` and
  `bunx nx run @rawr/chatgpt-corpus:typecheck`.
- Run `bunx nx run @rawr/chatgpt-corpus:test` when corpus behavior changes.
