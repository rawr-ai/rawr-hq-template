# ORPC Repo-Wide Orchestrator Scratch

## Session Metadata

- Date: 2026-02-12
- Branch intent: top-of-stack Graphite branch working state
- Scope: research and migration scoping only

## Notes

- Keep this file as running integration notes across all agent lanes.
- Capture cross-lane conflicts, unresolved decisions, and synthesis checkpoints.

## Checkpoints

- [x] Branch/worktree baseline verified
- [x] Lane agents launched
- [x] All lane scratch pads returned
- [x] Integrated scope doc drafted
- [ ] Final quality pass complete

## Open Decisions

1. Include `/rawr/state` in wave-1 ORPC migration or defer to wave-2.
2. Keep ORPC contract in `packages/coordination` initially vs create a dedicated package now.
3. OpenAPI exposure policy in wave-1 (internal-only vs first-class published contract).

## Cross-Lane Risks

1. Validation and error-shape drift during bridge period between manual routes and ORPC procedures.
2. Elysia request body handling/regression if ORPC handlers are mounted without careful transport tests.
3. Queue/runtime regression risk if ORPC cutover accidentally bypasses existing Inngest adapter invariants.

## Lane Output Index

1. Network/server: `docs/projects/agent-coordination-canvas-v1/agent-orpc-network-server-scratch.md`
2. Testing: `docs/projects/agent-coordination-canvas-v1/agent-orpc-testing-scratch.md`
3. Frontend/canvas: `docs/projects/agent-coordination-canvas-v1/agent-orpc-frontend-canvas-scratch.md`
4. Inngest: `docs/projects/agent-coordination-canvas-v1/agent-orpc-inngest-scratch.md`
5. Plugin/domain: `docs/projects/agent-coordination-canvas-v1/agent-orpc-plugin-domain-scratch.md`
6. Monorepo architecture: `docs/projects/agent-coordination-canvas-v1/agent-orpc-monorepo-architecture-scratch.md`

## Integrated Deliverable

1. `docs/projects/agent-coordination-canvas-v1/ORPC_REPO_WIDE_MIGRATION_SCOPE.md`
