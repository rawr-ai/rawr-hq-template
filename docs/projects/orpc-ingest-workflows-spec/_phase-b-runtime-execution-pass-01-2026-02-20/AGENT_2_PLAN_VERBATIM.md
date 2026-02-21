# Agent 2 B2 Plan (Verbatim)

1. Confirm repository workflow and guardrails (AGENTS routing, branch/worktree state, Graphite expectations).
2. Introspect required skills (`typescript`, `orpc`, `system-design`, `api-design`, `domain-design`) and milestone workflow prompts (`dev-spec-to-milestone`, `dev-harden-milestone`), capturing constraints that directly affect B2.
3. Read the full Phase B grounding corpus and extract B2-specific acceptance constraints, especially route-family lock semantics and manifest-first authority.
4. Inspect current runtime composition and host wiring to identify app-internal coupling seams that must move into `@rawr/core`.
5. Design and implement a package-owned seam in `packages/core/src/orpc/runtime-router.ts` that composes runtime routing without importing `apps/*` internals.
6. Export the new seam through `packages/core/src/orpc/index.ts` and adjust any package-level typing contracts needed for host consumption.
7. Update host wiring in `apps/server/src/orpc.ts` (and only necessary adjacent files) to consume the package seam while preserving route semantics: `/rpc`, `/api/orpc/*`, `/api/workflows/<capability>/*`, `/api/inngest`.
8. Ensure `rawr.hq.ts` remains manifest-first authority and no legacy metadata is reintroduced.
9. Add or update focused tests for core seam composition and server route mounting behavior; keep scope minimal but sufficient to lock B2 behavior.
10. Run quick impacted tests first, then broader impacted suites; record exact commands and outcomes.
11. Produce final slice report at `AGENT_2_FINAL_B2_IMPLEMENTATION.md` with required sections (Skills Introspected, Evidence Map, Assumptions, Risks, Unresolved Questions).
12. Leave repository in a clean state according to the established Graphite workflow.
