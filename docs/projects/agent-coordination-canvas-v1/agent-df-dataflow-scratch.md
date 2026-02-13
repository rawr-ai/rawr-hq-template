# Agent DF Scratch - Data Flow and Runtime Contracts

## Ownership
- Axis: Data flow from system runtime to coordination UI.
- Priority: API contract hardening, error envelope standardization, idempotency, lifecycle fidelity.

## Required Context
1. Worktree: `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-a-coordination-design-data-v1`
2. Runtime files:
- `apps/server/src/rawr.ts`
- `apps/server/src/coordination.ts`
- `packages/coordination/src/types.ts`
- `packages/coordination/src/storage.ts`
- `packages/coordination/src/validation.ts`
- `packages/coordination-inngest/src/adapter.ts`
- `apps/cli/src/lib/coordination-api.ts`
- `apps/cli/src/commands/workflow/coord/*.ts`

## Required Skills
- `elysia`: `/Users/mateicanavra/.codex-rawr/skills/elysia/SKILL.md`
- `inngest`: `/Users/mateicanavra/.codex-rawr/skills/inngest/SKILL.md`

## Introspection Tasks
1. Introspect current endpoint payloads and all error responses.
2. Introspect run lifecycle transitions (`queued`, `running`, `completed`, `failed`).
3. Introspect idempotency behavior on duplicate `runId`.
4. Introspect storage durability and lock semantics.
5. Introspect CLI assumptions that parse server responses.

## Deliverables Back to Orchestrator
1. File-referenced findings and concrete change list.
2. Proposed typed `http.ts` contracts for `@rawr/coordination`.
3. Explicit migration notes for CLI compatibility.
4. Test additions/updates required for runtime hardening.

## Notes Log
- 2026-02-12T22:00:00Z: Scratchpad created before runtime edits.
- 2026-02-12T22:15:00Z: Introspection complete.
  - Current coordination endpoints already cover workflows, validate, run, status, and timeline.
  - Runtime lifecycle is strongly typed (`CoordinationWorkflowV1`, `RunStatusV1`, `DeskRunEventV1`) and routed through `queueCoordinationRunWithInngest` + `processCoordinationRunEvent`.
  - Idempotency protections exist (`runQueueLocks`, runId reuse checks), and timeline append ordering is guarded by per-run lock in storage.
  - Gaps for hardening phase:
    1) Response envelopes are inconsistent and not fully structured.
    2) CLI expects JSON payloads but currently trusts raw response bodies.
    3) Error fields should be normalized to `{ code, message, retriable, details }` for both CLI and UI.
  - Recommended implementation in runtime branch:
    1) Add `packages/coordination/src/http.ts` with shared response/error types.
    2) Update `apps/server/src/coordination.ts` to use typed success/failure envelopes consistently.
    3) Update `apps/cli/src/lib/coordination-api.ts` and `workflow/coord/*` commands to parse structured errors.
