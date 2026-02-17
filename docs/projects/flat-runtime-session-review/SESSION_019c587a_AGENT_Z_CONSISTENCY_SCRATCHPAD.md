# SESSION_019c587a — Agent Z Consistency Scratchpad

## Pass Summary
Performed a doc-only consistency normalization pass across:
1. `E2E_01_BASIC_PACKAGE_PLUS_API_BOUNDARY.md`
2. `E2E_02_API_PLUS_WORKFLOWS_COMPOSED_CAPABILITY.md`
3. `E2E_03_MICROFRONTEND_API_WORKFLOW_INTEGRATION.md`
4. `E2E_04_CONTEXT_AND_MIDDLEWARE_REAL_WORLD.md`

No re-architecture changes were introduced.

## Changes Applied

### E2E_01
1. Added explicit `/api/workflows` mention to top mount-path coordinates for split-semantics clarity.
2. Normalized capability-level naming to `invoicing` in shared context/client/router/API-surface snippets.
3. Kept domain intent intact (`invoiceId`, invoice-specific operations) while removing capability naming drift.

### E2E_02
1. Normalized capability-level naming to `invoicing` across package/API/workflow context, client, router, and composed surface snippets.
2. Standardized internal client field usage to `context.invoicing.*` across API/workflow operations and explanatory sections.
3. Preserved workflow/API composition flow and durable execution intent.

### E2E_03
1. Added package-level `context.ts` to canonical tree and key snippet set.
2. Clarified that `context.ts` contracts are explicit across package/workflow/host boundaries.
3. Expanded policy checklist to explicitly include:
   - TypeBox + static type co-location,
   - `context.ts` placement,
   - `typeBoxStandardSchema as std` alias usage,
   - concise `invoicing` naming + non-redundant domain filenames,
   - split `/api/workflows/*` vs `/api/inngest` semantics.

### E2E_04
1. Refocused domain snippet to domain-only concepts (`ReconciliationScope`, `ReconciliationState`, `ReconciliationStatus`) and removed procedure-IO ownership.
2. Moved preflight/mark input-output schemas into package procedure snippets and boundary contract snippets.
3. Added context-layer rationale note that request metadata ownership belongs in `context.ts`.

## Priority Correction — Procedure IO Ownership (Before/After)

### E2E_03 (before -> after)
1. Before: `packages/invoicing/src/domain/reconciliation.ts` owned trigger input/output schemas.
2. After: trigger route input/output schemas moved into `packages/invoicing/src/workflows/contract.ts`; domain now owns only reconciliation state/invariants.
3. Before: `RunIdParamsSchema` lived in domain.
4. After: path param schema moved to contract-local `RunPathParamsSchema`.

### E2E_04 (before -> after)
1. Before: `packages/invoicing/src/domain/reconciliation.ts` owned `TriggerReconciliation*` and `MarkReconciliationResultInput` schemas (procedure/boundary IO).
2. After: preflight and mark-result IO schemas are defined beside procedures/contracts where they are used.
3. Before: domain owned request-facing IO shape around `requestId`.
4. After: request metadata ownership is explicit in `InvoicingRequest` within `context.ts`, with a rationale note in snippet comments.

## Convention Verification Checklist
- [x] `context.ts` placement is explicit where shared context contracts are demonstrated.
- [x] TypeBox-first + static types same file is explicit in domain snippets.
- [x] `typeBoxStandardSchema as std` alias usage is consistent where adapter is consumed.
- [x] Capability naming is normalized to concise `invoicing` usage in cross-layer symbols.
- [x] Split semantics clarity is explicit for `/api/workflows/*` vs `/api/inngest`.
- [x] Procedure/boundary route I/O schemas are owned by procedures/contracts, not domain modules.
- [x] Request metadata ownership is context-layer-first in examples that carry request metadata.

## Escalations (Cannot Be Resolved Locally in This Pass)

### Z-ESC-01: Live runtime route reality vs canonical split walkthroughs
The walkthroughs document canonical `/api/workflows/*` + `/api/inngest` separation, but current live branch behavior is still partially centered on `/rpc`/`/api/orpc` coordination paths for some workflow actions. This is an implementation convergence item, not a doc-only consistency fix.

### Z-ESC-02: Workflow contract ownership placement remains multi-pattern
`E2E_03` demonstrates package-owned workflow contract artifact + plugin re-export, while other examples still show plugin-local contract ownership patterns. This contradiction is broader than locked consistency axes and requires explicit architecture-policy decision rather than local wording-only normalization.

## Boundaries Respected
1. Edited only owned files.
2. Left unrelated working-tree edits untouched.
3. Did not commit.
