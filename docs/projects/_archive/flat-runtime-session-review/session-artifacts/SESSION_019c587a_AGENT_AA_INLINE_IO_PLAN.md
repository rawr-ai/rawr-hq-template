# SESSION_019c587a — Agent AA Inline I/O Plan

## Objective
Normalize owned walkthrough snippets to default inline `.input/.output` schema usage while preserving existing architecture conventions.

## Scope-Locked Rules
1. Default procedure/contract snippets to inline `.input(std(...))` and `.output(std(...))`.
2. Keep extracted schemas only when truly shared across callsites or large enough to hurt readability inline.
3. When extraction is justified, prefer paired schema objects:
   `const XSchema = { input: ..., output: ... }`, then `.input(std(XSchema.input))` and `.output(std(XSchema.output))`.
4. Keep TypeBox-first modeling, `context.ts` conventions, naming policy, and split semantics unchanged.

## Non-Goals
1. No architecture redesign.
2. No runtime/source edits outside docs.
3. No edits outside owned files.
4. No commit.

## Execution Checklist
- [x] Validate worktree/branch state and ignore unrelated edits.
- [x] Inspect owned E2E snippets for `.input/.output` patterns.
- [x] Normalize `E2E_02` callsites to inline schema form by default.
- [x] Preserve `E2E_01` TypeBox/context/naming/split semantics while adding explicit inline-I/O policy language.
- [x] Update guardrails/checklists in owned E2E docs to encode inline-default + extraction exception.
- [x] Record decisions and verification in scratchpad.

## Completion Criteria
1. Owned snippet callsites use inline `.input/.output` by default.
2. Prose/checklists capture extraction exception and paired-pattern rule.
3. No convention regressions on TypeBox-first, `context.ts`, naming, or split semantics.
