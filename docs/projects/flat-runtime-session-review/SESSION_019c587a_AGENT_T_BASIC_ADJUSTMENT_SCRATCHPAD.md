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
2. After: `packages/invoicing/src/*`, `plugins/api/invoicing-api/src/*`.
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
