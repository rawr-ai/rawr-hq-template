# SESSION_019c587a — Agent AA Inline I/O Scratchpad

## Pass Summary
Applied an inline-I/O normalization pass to owned docs:
1. `docs/projects/flat-runtime-session-review/orpc-ingest-spec-packet/examples/E2E_01_BASIC_PACKAGE_PLUS_API_BOUNDARY.md`
2. `docs/projects/flat-runtime-session-review/orpc-ingest-spec-packet/examples/E2E_02_API_PLUS_WORKFLOWS_COMPOSED_CAPABILITY.md`
3. `docs/projects/flat-runtime-session-review/SESSION_019c587a_AGENT_AA_INLINE_IO_PLAN.md`
4. `docs/projects/flat-runtime-session-review/SESSION_019c587a_AGENT_AA_INLINE_IO_SCRATCHPAD.md`

No runtime code was changed.

## Decisions Applied

### 1) Inline `.input/.output` as default snippet style
1. `E2E_02` procedure and contract snippets were normalized from wrapped multi-line calls to direct inline callsites:
   - `.input(std(Type.Object(...)))`
   - `.output(std(Type.Object(...)))` or `.output(std(Type.Union([...])))`
2. `E2E_01` already followed inline-default callsite style, so no structural snippet rewrites were needed there.

### 2) Extraction exception encoded (shared/large only)
1. Added explicit rationale/guardrail/checklist language in both E2E docs:
   - keep inline by default,
   - extract only when shared or very large,
   - use paired extraction pattern when practical:
     `const XSchema = { input, output }` +
     `.input(std(XSchema.input))` +
     `.output(std(XSchema.output))`.
2. No extracted I/O schema constants were introduced in this pass because current snippets did not require shared/large extraction.

### 3) Convention stability preserved
1. TypeBox-first strategy and `std` alias usage remained intact.
2. `context.ts` placement conventions remained unchanged.
3. Naming conventions (`invoicing`) remained unchanged.
4. Split semantics (`/api/workflows/*` vs `/api/inngest`) remained unchanged.

## Verification Checklist
- [x] Inline `.input/.output` default is explicit in prose/checklists.
- [x] `E2E_02` wrapped schema callsites were normalized to inline defaults.
- [x] Extraction exception and paired-schema pattern are documented in both E2E docs.
- [x] No domain ownership drift was introduced for procedure/contract I/O schemas.
- [x] No changes were made outside owned files.
- [x] No commit performed.
