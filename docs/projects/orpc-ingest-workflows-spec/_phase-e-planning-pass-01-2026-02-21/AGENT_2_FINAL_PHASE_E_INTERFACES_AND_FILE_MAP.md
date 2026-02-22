# Agent 2 Final: Phase E Interfaces and File Map

## Interface Deltas (Planned)
1. E1: strengthen dedupe marker contract for heavy middleware checks; keep route topology unchanged.
2. E2: tighten finished-hook guardrail typing/runtime behavior for explicit idempotent/non-critical semantics.
3. E3: add durable evidence integrity verifier to ensure cleanup-safe phase closure.
4. E4: decision-register updates based on evidence outcomes.

## File-Level Map

### E1
1. `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-e-runtime-implementation/apps/server/src/workflows/context.ts`
2. `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-e-runtime-implementation/apps/server/src/orpc.ts`
3. `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-e-runtime-implementation/apps/server/test/middleware-dedupe.test.ts`
4. `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-e-runtime-implementation/scripts/phase-e/verify-e1-dedupe-policy.mjs`

### E2
1. `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-e-runtime-implementation/packages/coordination-inngest/src/adapter.ts`
2. `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-e-runtime-implementation/packages/coordination/src/types.ts`
3. `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-e-runtime-implementation/packages/coordination-inngest/test/inngest-finished-hook-guardrails.test.ts`
4. `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-e-runtime-implementation/scripts/phase-e/verify-e2-finished-hook-policy.mjs`

### E3
1. `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-e-runtime-implementation/scripts/phase-e/_verify-utils.mjs`
2. `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-e-runtime-implementation/scripts/phase-e/verify-e3-evidence-integrity.mjs`
3. `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-e-runtime-implementation/package.json`

### E4
1. `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-e-runtime-implementation/docs/projects/orpc-ingest-workflows-spec/DECISIONS.md`
2. `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-e-runtime-implementation/docs/projects/orpc-ingest-workflows-spec/axes/04-context-propagation.md`
3. `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-e-runtime-implementation/docs/projects/orpc-ingest-workflows-spec/axes/05-errors-observability.md`
4. `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-e-runtime-implementation/docs/projects/orpc-ingest-workflows-spec/axes/06-middleware.md`
5. `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-e-runtime-implementation/docs/projects/orpc-ingest-workflows-spec/_phase-e-runtime-execution-pass-01-2026-02-21/E4_DISPOSITION.md`
6. `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-e-runtime-implementation/docs/projects/orpc-ingest-workflows-spec/_phase-e-runtime-execution-pass-01-2026-02-21/E4_TRIGGER_EVIDENCE.md` (conditional)

## Skills Introspected
- `/Users/mateicanavra/.codex-rawr/skills/solution-design/SKILL.md`
- `/Users/mateicanavra/.codex-rawr/skills/system-design/SKILL.md`
- `/Users/mateicanavra/.codex-rawr/skills/domain-design/SKILL.md`
- `/Users/mateicanavra/.codex-rawr/skills/api-design/SKILL.md`
- `/Users/mateicanavra/.codex-rawr/skills/typescript/SKILL.md`
- `/Users/mateicanavra/.codex-rawr/skills/orpc/SKILL.md`
- `/Users/mateicanavra/.codex-rawr/skills/inngest/SKILL.md`

## Evidence Map
1. `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-d-runtime-implementation/apps/server/src/workflows/context.ts:1`
2. `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-d-runtime-implementation/apps/server/src/orpc.ts:1`
3. `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-d-runtime-implementation/packages/coordination-inngest/src/adapter.ts:1`
4. `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-d-runtime-implementation/scripts/phase-d/verify-d4-disposition.mjs:1`

## Assumptions
1. Phase E scripts can be added under `scripts/phase-e` without policy conflicts.

## Risks
1. Evidence gates may accidentally couple to pass-local scratch files.

## Unresolved Questions
1. Exact policy text for locked vs deferred D-009/D-010 in E4.
