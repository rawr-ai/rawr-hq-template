# SESSION_019c587a — Agent U Intermediate Adjustment Scratchpad

## Scope
- Target walkthrough only: `docs/projects/flat-runtime-session-review/orpc-ingest-spec-packet/examples/E2E_02_API_PLUS_WORKFLOWS_COMPOSED_CAPABILITY.md`
- Docs-only adjustment pass (no runtime source edits)

## Policy Adjustments Applied
1. Concise domain/directory naming:
- Normalized long package/plugin directory naming from `invoice-processing` style to concise `invoicing` style.
- Updated file tree, import paths, plugin paths, and route examples to stay aligned with concise naming.

2. Domain file naming in `domain/` folders:
- Removed repeated domain-prefix style from domain filenames in examples.
- Canonical tree and snippets now use concise domain files: `domain/run.ts` and `domain/status.ts`.

3. TypeBox-first domain modeling with same-file static exports:
- Reworked domain modeling examples to define schemas in domain files using TypeBox.
- Added `Static<typeof ...>` exports from those same files (`status.ts`, `run.ts`).
- Updated service snippet to consume those domain exports directly.

4. Split-surface posture preserved:
- Kept `/api/workflows/*` vs `/api/inngest` split explicit and unchanged in semantics.
- Retained explicit host mount examples and sequence walkthrough coverage for both surfaces.

## Concrete Doc-Level Changes
- Mermaid topology labels now reflect concise capability naming (`invoicing`) and matching event/function names.
- Canonical file tree updated to concise package/plugin names and concise domain filenames.
- Section 4.1 rewritten to show TypeBox-first domain files plus static type exports in-file.
- Workflow event/function naming aligned to concise domain naming (`invoicing.reconciliation*`).
- Wiring steps, runtime sequence, and checklist updated for naming/modeling consistency.

## Completion Checklist
- [x] Updated tree paths to concise `invoicing` naming where unambiguous.
- [x] Removed repeated domain-prefix filename patterns in `domain/` examples.
- [x] Converted domain modeling examples to TypeBox-first with same-file static exports.
- [x] Kept `/api/workflows` vs `/api/inngest` split explicit and semantically unchanged.
- [x] Updated prose, tree, snippets, and walkthrough flow text consistently.
- [x] Applied docs-only changes.
