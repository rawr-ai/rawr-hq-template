# Agent B Scratchpad — Graph, Sync, and Extensibility

## Core finding
- Official Nx docs do not describe a built-in "bootgraph verification" feature by that name.
- The documented OSS path is:
  - project graph
  - tags and metadata
  - sync generators
  - `nx sync:check`
  - optional custom project-graph plugin
- The documented Enterprise path adds:
  - `@nx/conformance`
  - `@nx/owners`

## OSS capabilities that matter
- `nx graph` and exported graph JSON for structural truth
- project `tags`, `metadata`, and `implicitDependencies`
- sync generators and `nx sync:check`
- local generators for normalization and scaffold control
- project-graph plugins via `createNodesV2` and `createDependencies`

## Migration relevance
- If Tap manifest or bootgraph edges are not visible in TypeScript imports, Nx still offers an official extension path:
  - model those edges in the project graph
  - materialize or validate graph-derived artifacts with sync generators
  - fail CI with `nx sync:check` when they drift

## Enterprise-only additions
- `@nx/conformance`
  - graph-wide, language-agnostic rules
  - built-in `enforce-project-boundaries`
  - `ensure-owners`
  - supports `evaluated` vs `enforced` rollout states
- `@nx/owners`
  - ownership metadata compiled into CODEOWNERS through sync

## Practical recommendation
- Treat graph plugins and sync generators as phase-2 controls, not day-1 mandatory work.
- Start with import-boundary enforcement and task orchestration first.
- Reach for graph extensibility only when the migration needs to verify structure that imports cannot represent.

## Useful docs
- https://nx.dev/docs/extending-nx/project-graph-plugins
- https://nx.dev/docs/concepts/sync-generators
- https://nx.dev/docs/extending-nx/create-sync-generator
- https://nx.dev/docs/reference/nx-json#sync
- https://nx.dev/docs/reference/conformance/overview
- https://nx.dev/docs/reference/owners/overview
