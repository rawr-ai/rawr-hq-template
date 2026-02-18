# SESSION_019c587a — Agent H DX Simplification Plan

## Scope Lock

Primary review target:

- `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_PACKAGE_APPROACH_A_PURE_DOMAIN_E2E.md`

Evidence anchors (read-only):

- `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/apps/server/src/orpc.ts`
- `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/packages/core/src/orpc/hq-router.ts`
- `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/packages/coordination/src/orpc/schemas.ts`
- `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/packages/state/src/orpc/contract.ts`

## Verbatim Review Plan

1. Introspect required skills (`typebox`, `orpc`, `elysia`, `inngest`, `typescript`, `architecture`) and log actionable constraints in scratchpad.
2. Read canonical proposal end-to-end and map all manual wiring / repeated composition patterns.
3. Cross-check each suspected complexity hotspot against evidence anchors and record traceable line references.
4. Build a duplication/manual-wiring cost map and test whether generalized adapters/factories can safely replace repetition.
5. Draft prioritized simplification proposals with explicit trade-offs, risk notes, and keep-as-is alternatives.
6. Produce final review doc with execution ordering (`do now` vs `later`) and explicit unchanged items.

## Guardrails

- No code changes outside review docs.
- Keep claims evidence-linked.
- Favor coherent, implementable simplification over stylistic churn.
