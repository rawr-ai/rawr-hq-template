# Fix Pass Orchestrator Scratch

## Session Setup
- Date: 2026-02-12
- Repo: `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template`
- Worktree: `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-a-coordination-design-data-v1`
- Current branch at kickoff: `codex/coordination-fixpass-v1-docs`

## Doc-First Gate
- [x] Canonical plan created.
- [x] Canonical findings created.
- [x] Orchestrator scratch created.
- [x] Per-agent plan docs created.
- [x] Per-agent scratch docs created.

## Coordination Cadence
1. D1 + DF in parallel.
2. Orchestrator integration checkpoint.
3. BR implementation + reconciliation.
4. QA gate and final cutover/purge verification.

## Decision Log
- 2026-02-12T23:00:00Z: Fix stack created on top of existing coordination stack to avoid rebasing active merge flow.
- 2026-02-12T23:00:00Z: Docs are the first implementation artifact per user instruction.

## Integration Notes
- Pending: D1 and DF synchronized findings after initial implementation passes.
- Pending: BR reconciliation notes.
- Pending: QA gate results.

## Agent Integration Log
- 2026-02-12T23:08:00Z: Spawned D1 and DF reviewers with scoped context + skill packets.
  - D1 context/skills:
    - `apps/web/src/ui/App.tsx`
    - `apps/web/src/ui/coordination/components/**/*`
    - `apps/web/src/ui/coordination/styles/index.css`
    - `apps/web/tailwind.config.cjs`
    - `ui-design`, `web-design-guidelines`, `vercel-react-best-practices`
  - DF context/skills:
    - `apps/web/src/ui/coordination/hooks/useWorkflow.ts`
    - `apps/web/src/ui/coordination/hooks/useRunStatus.ts`
    - `apps/web/src/ui/coordination/adapters/api-client.ts`
    - `apps/server/src/coordination.ts`
    - `packages/coordination/src/http.ts`
    - `elysia`, `inngest`
- 2026-02-12T23:11:00Z: DF findings integrated.
  - Enforce save-before-run in `useWorkflow`.
  - Remove implicit assumption that editor state is persisted.
  - Keep structured envelope error paths explicit during save+run chain.
  - Improve polling durability by avoiding arbitrary short polling exhaustion.
- 2026-02-12T23:14:00Z: D1 findings integrated.
  - Current shell still over-wraps canvas surface and diverges from design composition.
  - Side panel/status composition lacks design-density structure (panel stack + tokenized chips).
  - Coordination view still over-relies on bespoke `.coordination__*` classes instead of Tailwind/tokenized primitives.
  - Route-level composition should use design shell boundaries directly and keep WorkflowKit inside that structure.
