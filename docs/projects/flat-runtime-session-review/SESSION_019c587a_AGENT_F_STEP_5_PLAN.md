# SESSION_019c587a - Agent F Step 5 Plan

## Objective (Step 5 Only)
Lock capability manifest and central merge behavior in `rawr.hq.ts`, with central manual composition active now and discovery explicitly deferred to cutover-only future work.

## In Scope
1. Keep central manual composition as active policy now.
2. Define capability grouping fields for:
   - API boundary routers/contracts,
   - workflow trigger routers/contracts,
   - Inngest functions.
3. Define merge behavior in `rawr.hq.ts` for:
   - oRPC contract/router merge,
   - Inngest function merge.
4. Add explicit deferred discovery note (plugin-local manifests + auto-compose) as later cutover model only.

## Out of Scope
1. Step 6+ policy/workflow changes.
2. Rewrites to domain/API/workflow semantics outside composition policy.
3. Code implementation changes.

## Planned Edits
1. Expand `Composition Policy (rawr.hq.ts)` with explicit capability manifest field contract.
2. Add explicit merge-behavior bullets for API routers, workflow trigger routers, and Inngest functions.
3. Tighten deferred discovery wording so it is clearly cutover-only and not active in current phase.
4. Keep existing examples and composition code shape, only clarifying policy language.

## Step 5 Gate
Canonical doc clearly states central-now manual composition as active policy and discovery-later as deferred cutover-only model, with explicit capability grouping + merge behavior definitions.
