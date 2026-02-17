# SESSION_019c587a — Agent T Basic Adjustment Scratchpad

## Scope Lock
1. Adjust only the Basic E2E walkthrough doc.
2. No runtime source edits.
3. Ignore unrelated worktree edits by other contributors.

## Input Policy Adjustments
1. Domain file naming: inside `domain/`, do not repeat domain prefix in filenames.
2. TypeBox-first in domain type files: schema is source of truth and static type comes from `Static<typeof Schema>`.
3. Naming brevity: avoid overly long capability/directory names when a concise name stays clear.

## Before/After Decision Log

### Capability naming brevity
1. Before: `packages/invoice-processing/src/*`, `plugins/api/invoice-processing-api/src/*`.
2. After: `packages/invoicing/src/*`, `plugins/api/invoicing/src/*`.
3. Why: `invoicing` is shorter but still explicit, and keeps boundary/package split semantics intact.

### Domain filename policy
1. Before: `domain/invoice-status.ts`, `domain/invoice.ts`.
2. After: `domain/status.ts`, `domain/run.ts`.
3. Why: the `domain/` folder already scopes capability context, so repeating `invoice-` in filenames is redundant.

### TypeBox-first domain source of truth
1. Before: TS-only domain shapes (`InvoiceStatus`, `InvoiceRun`) defined without co-located TypeBox schemas.
2. After:
   - `StatusSchema` + `type Status = Static<typeof StatusSchema>` in `domain/status.ts`.
   - `RunSchema` + `type Run = Static<typeof RunSchema>` in `domain/run.ts`.
3. Why: schema and static type now stay aligned from a single artifact, reducing hand-written type drift.

### Consistency propagation in examples
1. `service/lifecycle.ts` now imports `Run` from `../domain/run`.
2. `procedures/get-status.ts` now reuses `StatusSchema` for the output `status` field.
3. File tree, import paths, composition route references, and policy checklist language were updated to match the above decisions.

## Structure and Intent Preservation Check
1. Preserved existing tutorial section structure (Sections 1-9 unchanged in layout).
2. Preserved split semantics clarity (`/api/workflows/...` remains caller-trigger namespace; `/api/inngest` remains runtime ingress).
3. Preserved technical intent: explicit boundary mapping, transport-neutral internal package, and host/composition glue visibility.

## Edited Files
1. `docs/projects/flat-runtime-session-review/orpc-ingest-spec-packet/examples/E2E_01_BASIC_PACKAGE_PLUS_API_BOUNDARY.md`
2. `docs/projects/flat-runtime-session-review/SESSION_019c587a_AGENT_T_BASIC_ADJUSTMENT_SCRATCHPAD.md`

---

## Adjustment Pass 2 (Context + std alias + 4.x mini-structure snippets)

### A) Context placement to explicit `context.ts`
1. Before:
   - Internal package context type (`InvoiceProcedureContext`) was declared in `packages/invoicing/src/router.ts`.
   - API boundary context type (`InvoiceApiContext`) was declared in `plugins/api/invoicing/src/router.ts`.
   - Procedures/operations imported context types from router snippets.
2. After:
   - Added `packages/invoicing/src/context.ts` with shared procedure context contract.
   - Added `plugins/api/invoicing/src/context.ts` with shared boundary context contract.
   - Updated snippets so procedures/client and operations/router import from `context.ts`.
   - Removed convenience-only context type declarations from both router snippets.
3. Why:
   - Context contracts are shared across multiple files, so explicit `context.ts` improves placement clarity and avoids router-centric type coupling.

### B) Standard schema helper alias (`std`)
1. Before:
   - Snippets imported `typeBoxStandardSchema` directly and called `.input(typeBoxStandardSchema(...))` / `.output(typeBoxStandardSchema(...))`.
2. After:
   - Snippets now use canonical alias:
     - `import { typeBoxStandardSchema as std } from "@rawr/orpc-standards";`
     - `.input(std(...))` / `.output(std(...))`
   - Applied across internal procedures and boundary contract snippets.
3. Why:
   - Shorter callsites improve readability while preserving explicit schema intent.

### C) 4.x subsection mini file-structure snippets
1. Before:
   - Subsections 4.1–4.4 started directly with code blocks.
2. After:
   - Added small file-structure snippets at the top of each subsection:
     - 4.1: `packages/orpc-standards/src/*`
     - 4.2: `packages/invoicing/src/*` (including `context.ts`)
     - 4.3: `plugins/api/invoicing/src/*` (including `context.ts`)
     - 4.4: `rawr.hq.ts` + host mounting files under `apps/server/src/*`
3. Why:
   - Gives immediate local orientation before code details, reducing ambiguity about where each snippet belongs in the larger tree.

### Consistency updates tied to this pass
1. Canonical file tree updated to include both new `context.ts` files.
2. Wiring steps updated to mention `context.ts` in internal and boundary layering.
3. Policy checklist expanded to assert explicit context-contract placement outside router convenience declarations.
