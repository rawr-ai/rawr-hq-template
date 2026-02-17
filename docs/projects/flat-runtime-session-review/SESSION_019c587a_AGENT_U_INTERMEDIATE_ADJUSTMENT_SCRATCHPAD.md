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

## Follow-up Adjustment Pass (A/B/C)

### Requested Adjustments Applied
1. Context placement normalization (`context.ts`):
- Added explicit `context.ts` placement in canonical file tree for package, API plugin, and workflows plugin.
- Updated snippets to show shared context contracts in `context.ts` files.
- Removed convenience embedding of context type definitions inside `router.ts` snippets.

2. Readable schema helper alias:
- Normalized schema helper imports to:
  `import { typeBoxStandardSchema as std } from "@rawr/orpc-standards";`
- Updated all shown contract/procedure schema calls to use `std(...)`.
- Updated guardrail prose to reference `std(Type.*)` while preserving the original helper identity.

3. Mini tree at top of each 4.x subsection:
- Added local orientation file-tree snippets at the start of:
  - `4.1` internal package
  - `4.2` API plugin
  - `4.3` workflows plugin
  - `4.4` composition (`rawr.hq.ts`)
  - `4.5` host mounting

### Rationale
- Explicit `context.ts` snippets make context ownership discoverable and reusable across operations, routers, and internal clients.
- The `std` alias improves snippet readability and reduces visual noise without changing TypeBox-first architecture or helper semantics.
- Per-subsection mini trees reduce navigation overhead for long E2E walkthroughs and keep snippet scope anchored in the full layout.

### Verification Checklist
- [x] Shared context contracts are modeled in explicit `context.ts` snippets (package/API/workflows).
- [x] Router snippets consume context types from `context.ts` rather than defining them inline.
- [x] Schema helper usage is consistently `std(...)` in shown contracts/procedures.
- [x] Mini tree snippets appear at the top of every `4.x` subsection.
- [x] `/api/workflows/*` and `/api/inngest` split semantics remain explicit and unchanged.
- [x] TypeBox-first modeling and overall architecture remain unchanged.
- [x] Docs-only edits applied; no runtime source code modified.
