# Agent A Plan (Verbatim)

## Mission
Defend and pressure-test Approach A: packages are pure domain logic/service modules with no embedded runtime/event/timeful orchestration model, while runtime plugins compose and call package capabilities.

## Non-Negotiable Constraints
- Work only in this worktree: `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal`.
- Do not touch/revert unrelated edits.
- Produce all required artifacts:
  - `docs/projects/flat-runtime-session-review/SESSION_019c587a_AGENT_A_PLAN_VERBATIM.md`
  - `docs/projects/flat-runtime-session-review/SESSION_019c587a_AGENT_A_SCRATCHPAD.md`
  - `docs/projects/flat-runtime-session-review/SESSION_019c587a_PACKAGE_APPROACH_A_PURE_DOMAIN_E2E.md`
- Log `Observed` vs `Inferred` claims distinctly.

## Execution Plan
1. Initialize scratchpad and log repository/worktree baseline.
2. Perform required upfront introspection by reading mandated skills:
   - `orpc`, `inngest`, `elysia`, `typescript`, `plugin-architecture`, `rawr-hq-orientation`, `architecture`.
3. Read process guardrails and capture applicable constraints:
   - `AGENTS.md`, `docs/process/GRAPHITE.md`, `docs/process/RUNBOOKS.md`.
4. Ingest required evidence sources:
   - Session transcript and current proposal/spec docs.
   - Today-state code references (`rawr.ts`, `orpc.ts`, `hq-router.ts`).
5. Build end-to-end architecture proposal for Approach A with concrete file tree:
   - Contract placement, implementation placement, client placement.
   - API Variant A1 (mount/re-export package router).
   - API Variant A2 (extend package router for boundary behavior).
   - Workflow integration via runtime plugins without importing runtime concepts into package domain.
   - Composition in `rawr.hq.ts` and host mounting path.
6. Add pressure test:
   - What gets simpler vs harder table.
   - Migration path from current state to Approach A.
   - Risks, mitigations, and decision checkpoints.
7. Ensure explicit `Observed` vs `Inferred` labeling throughout final doc.
8. Self-check artifact completeness and leave clear handoff note for upcoming cross-critique phase against Agent B.

## Definition of Done
- Final doc is complete, concrete, and references required evidence.
- Includes both API variants (A1/A2), runtime workflow integration constraints, composition path, migration, and tradeoffs.
- Scratchpad contains continuous logs including required introspection and guardrail notes.
