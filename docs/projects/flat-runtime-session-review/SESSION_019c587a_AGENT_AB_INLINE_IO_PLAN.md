# SESSION_019c587a — Agent AB Inline I/O Plan

## Objective
Normalize heavy walkthrough examples to inline `.input/.output` schemas by default, while preserving locked schema ownership and context ownership rules.

## Scope
1. `docs/projects/flat-runtime-session-review/orpc-ingest-spec-packet/examples/E2E_03_MICROFRONTEND_API_WORKFLOW_INTEGRATION.md`
2. `docs/projects/flat-runtime-session-review/orpc-ingest-spec-packet/examples/E2E_04_CONTEXT_AND_MIDDLEWARE_REAL_WORLD.md`
3. `docs/projects/flat-runtime-session-review/SESSION_019c587a_AGENT_AB_INLINE_IO_PLAN.md`
4. `docs/projects/flat-runtime-session-review/SESSION_019c587a_AGENT_AB_INLINE_IO_SCRATCHPAD.md`

## Guardrails
1. Inline route/procedure I/O schemas by default.
2. Keep extracted schemas only when truly shared or large.
3. If extraction is required, prefer `{ input, output }` paired schema objects.
4. Do not move domain concepts out of domain ownership boundaries.
5. Preserve context/request metadata ownership boundaries.
6. Keep `E2E_04` source-backed rationale and unresolved notes intact.
7. Do not edit unrelated files and do not commit.

## Execution Checklist
- [x] Verify worktree state and avoid touching unrelated edits.
- [x] Locate target files and confirm two AB tracker files were absent in this worktree.
- [x] Create AB tracker plan/scratchpad files at owned paths.
- [x] Normalize `E2E_03` workflow contract example to inline `.input/.output`.
- [x] Normalize `E2E_04` procedure and boundary contract examples to inline `.input/.output`.
- [x] Preserve domain schema ownership and context ownership examples.
- [x] Keep `E2E_04` rationale and unresolved sections unchanged.
- [x] Verify diff remains limited to owned files.

## Completion Criteria
1. Heavy examples use inline `.input/.output` by default for route/procedure I/O.
2. Domain schemas remain domain-owned and context metadata remains context-owned.
3. `E2E_04` sections 8 and 9 content is preserved.
4. Working changes are confined to owned files only.
