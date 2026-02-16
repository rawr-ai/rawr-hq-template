# SESSION_019c587a - Agent F Step 5 Scratchpad

## Scope
- Owner: Agent F (Step 5 only)
- Canonical target: `SESSION_019c587a_PACKAGE_APPROACH_A_PURE_DOMAIN_E2E.md`
- Step 5 goal: define central-now capability manifest/merge model in `rawr.hq.ts` with discovery deferred.

## Step A - Skill Re-Introspection Notes (Completed Before Edits)

### Required skills
- `orpc`:
  - Keep API boundary and workflow trigger routers as explicit composed router surfaces.
  - Maintain contract/router composition clarity in central manifest assembly.
- `inngest`:
  - Inngest functions are execution assets that must be centrally merged/composed for serve registration.
  - Maintain separation between execution surface (`/api/inngest`) and trigger/API surfaces.
- `elysia`:
  - Host route registration is composition-layer behavior; plugin/package layers provide mergeable artifacts.
  - Keep central composition semantics explicit for predictable host mounting.
- `architecture`:
  - Lock central-now policy as active state; isolate discovery-later as explicitly deferred decision.
  - Define capability grouping contract and merge behavior to avoid ambiguous assembly models.

### Additional relevant skills used
- `graphite`:
  - Graphite-first process acknowledged; no commit actions in this step.
- `docs-architecture`:
  - Keep policy text focused, canonical, and limited to Step 5 composition concerns.

## Step 5 Intent
1. Keep central manual composition in `rawr.hq.ts` as active policy now.
2. Define capability grouping fields and merge behavior for:
   - API boundary routers,
   - workflow trigger routers,
   - Inngest functions.
3. Keep discovery-later model explicitly deferred (plugin-local manifests + auto-compose).
4. Clarify deferred discovery is a cutover-only future decision, not active behavior now.

## Progress Log
- 2026-02-16 17:55:04 EST: Completed Step 5 skill re-introspection and logged composition-policy intent before Step 5 edits.
- 2026-02-16 17:55:35 EST: Wrote Step 5 plan doc and completed pre-edit check-in; ready for focused Step 5 composition-policy edits.
- 2026-02-16 17:56:23 EST: Applied Step 5 canonical composition-policy updates and verified central-now/deferred-cutover wording.

## End Output (Step 5)

### Exact edits
- Updated `Composition Policy (rawr.hq.ts)` to explicitly define active capability manifest fields:
  - `capabilityId`,
  - `api: { contract, router }`,
  - `workflows: { triggerContract, triggerRouter, functions }`.
- Added explicit active merge behavior in `rawr.hq.ts`:
  - `orpc.contract` merges boundary API contract + workflow trigger contract per capability namespace.
  - `orpc.router` merges boundary API router + workflow trigger router per capability namespace.
  - `inngest.functions` merges all capability workflow function arrays into one composed execution registration list.
- Tightened deferred discovery wording:
  - changed deferred discovery section to `Deferred for later cutover phase only`.
  - kept explicit non-goal: no discovery-driven assembly replacing explicit `rawr.hq.ts` registration in current phase.
- Added explicit active-mode note under `rawr.hq.ts Capability Composition (Central Now)`:
  - manual capability registration and explicit merge assembly is active now,
  - no discovery-driven auto-compose in current phase.
- Updated acceptance check #8 to explicitly state discovery is deferred as cutover-only.

### Why Step 5 gate passes
- Canonical doc now clearly states central manual composition is active policy now.
- Capability grouping fields and merge behavior are explicitly defined for:
  - API boundary routers/contracts,
  - workflow trigger routers/contracts,
  - Inngest functions.
- Discovery model is explicitly marked deferred for cutover-only future phase, with current-phase non-goal preserved.

### Follow-ons deferred
- No Step 6+ discovery implementation work or auto-compose activation was introduced.
- No changes were made to workflow/API/domain policy areas beyond composition-policy clarity needed for Step 5.
- No implementation/code changes were made; this remains documentation convergence work.
