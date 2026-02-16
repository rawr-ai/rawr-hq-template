# Pure Package End-to-End Convergence Plan (oRPC-First)

## Orchestration Plan (Executed First)
1. Consolidate active agents by axis before new edits.
2. Compact only relevant agents (`C`, `D`, `E`) and stop using dual-approach agents (`A`, `B`) for new work.
3. Set one canonical source of truth for forward edits:  
`/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_PACKAGE_APPROACH_A_PURE_DOMAIN_E2E.md`
4. Run one-step-at-a-time loop:
5. Step brief to one implementation agent.
6. Agent updates canonical doc end-to-end for that step (not just local section edits).
7. Steward consistency check against locked decisions and contradiction checklist.
8. Optional `/compact` between steps only when context bloat appears.
9. Delete clearly superseded non-canonical artifacts once foundational step is locked, not during active drafting.
10. Keep only current-session working scratch and evidence docs still informing decisions.

## Summary
We will converge the canonical “pure package, end-to-end” architecture to these locked defaults:
1. Domain packages are mandatory oRPC producers: one internal router + in-process client + pure service modules.
2. API boundary is boundary-owned by default; reuse internal contract/implementation only when overlap is high and simple.
3. Workflows are Inngest-ingress runtime, with an auto-generated workflow trigger router under `/api/workflows/...`.
4. Workflow trigger procedures are internal-by-default, with explicit per-procedure promotion to external.
5. `rawr.hq.ts` remains central composition now; auto-discovery is deferred as a planned later cutover.
6. Canonical doc is updated forward-only each step; old historical docs are not retrofitted.

## Important API/Interface/Type Changes to Capture in Canonical Doc
1. Domain package policy contract:
2. `packages/<capability>/src/router.ts` (single exported internal router per package).
3. `packages/<capability>/src/client.ts` (in-process client wrapper).
4. `packages/<capability>/src/services/*` remains pure TS logic (service-module-first).
5. API plugin boundary contract policy:
6. Boundary plugin owns `contract.boundary.ts` + `router.ts` + external client shape.
7. Reuse path allowed only when mostly 1:1 and non-convoluted.
8. Workflow trigger surface contract:
9. Trigger path naming standard: `/api/workflows/<capability>/...`.
10. Inngest ingress remains separate and locked: `/api/inngest`.
11. Per-procedure visibility metadata:
12. `visibility: "internal" | "external"` (default `"internal"`).
13. Capability composition shape in `rawr.hq.ts`:
14. Capability groups merge API routers + workflow trigger routers without plugin-to-plugin imports.
15. Deferred discovery note:
16. Explicit “central now, discovery later” decision with cutover trigger and non-goal statement for this phase.

## Step-by-Step Sequence (Least-Churn Ordering)

### Step 1: Lock Semantics and Terminology Spine
1. Rewrite canonical doc intro to define three distinct surfaces:
2. Domain internal package surface.
3. External boundary API surface.
4. Inngest execution ingress surface.
5. Explicitly define `/api/workflows` vs `/api/inngest`.
6. Remove ambiguous “events API vs workflows API” wording.
7. Gate: no section in doc conflates trigger API with Inngest ingress.

### Step 2: Enforce Domain Package Mandatory oRPC Policy
1. Add hard rule: every domain package must ship one internal oRPC router and one in-process client.
2. Lock topology: exactly one exported internal router per domain package.
3. Keep service-module-first default; operations split only by threshold.
4. Clarify package router is transport-neutral (no host mounting semantics).
5. Gate: all package examples show pure services + one router + one client consistently.

### Step 3: Reframe API Boundary Ownership Policy
1. Rewrite API section using your boundary-owned guidance as canonical rule.
2. Preserve two paths:
3. Path A: reuse internal contract/impl when high 1:1 overlap and simple.
4. Path B: boundary-specific contract/router calling domain package internally.
5. Add anti-pattern guardrail: no extension hell, no tangled multi-layer inheritance.
6. Gate: each path has “when to use” and “when not to use” criteria.

### Step 4: Define Workflow Model and Exposure Defaults
1. Keep workflows ingest-first for execution model.
2. Add default requirement: workflow plugins also generate a workflow trigger router.
3. Trigger router default visibility: internal-by-default with explicit per-procedure promotion.
4. Add concrete internal/external usage matrix:
5. Internal callers (trusted/server/operator flows).
6. External callers (promoted procedures only).
7. Clarify composition with Inngest-native patterns for workflow-to-workflow orchestration.
8. Gate: no plugin-to-plugin import path introduced; all calls flow via composed surfaces.

### Step 5: Capability Manifest and Router Merge in `rawr.hq.ts`
1. Keep central manual composition now.
2. Define capability grouping fields and merge behavior for:
3. API boundary routers.
4. Workflow trigger routers.
5. Inngest functions.
6. Add deferred decision note for discovery-later model (plugin-local manifests + auto-compose).
7. Gate: doc states central now as active policy and discovery as deferred cutover only.

### Step 6: Regrow Full End-to-End Example and Scaled n>1 Shape
1. Rewrite file trees and code snippets so every section reflects Steps 1–5.
2. Ensure no stale contradictory examples remain (especially older route naming or optional package oRPC language).
3. Include one coherent capability walkthrough from package to API/workflow to manifest composition.
4. Gate: reader can follow one path end-to-end without interpretation gaps.

### Step 7: Contradiction Sweep and Policy Matrix
1. Add “policy matrix” table mapping each concern to owner/layer:
2. Domain package, API plugin, workflows plugin, host app, composition manifest.
3. Add explicit contradiction removals list (“what was removed/replaced”).
4. Gate: no duplicate or conflicting policy statements remain in canonical doc.

### Step 8: Targeted Cleanup of Superseded Non-Canonical Artifacts
1. Delete clearly superseded “other approach / compare-only” artifacts:
2. `SESSION_019c587a_PACKAGE_APPROACH_B_BOUNDARY_OR_RUNTIME_CENTRIC_E2E.md`
3. `SESSION_019c587a_PACKAGE_APPROACHES_COMPARE_CONTRAST_SCRATCH.md`
4. `SESSION_019c587a_PACKAGE_APPROACHES_MEDIATOR_SCRATCHPAD.md`
5. `SESSION_019c587a_AGENT_A_PLAN_VERBATIM.md`
6. `SESSION_019c587a_AGENT_A_SCRATCHPAD.md`
7. `SESSION_019c587a_AGENT_B_PLAN_VERBATIM.md`
8. `SESSION_019c587a_AGENT_B_SCRATCHPAD.md`
9. `SESSION_019c587a_COUNTER_ARGUMENT_AGENT_PLAN_VERBATIM.md`
10. `SESSION_019c587a_COUNTER_ARGUMENT_AGENT_SCRATCHPAD.md`
11. `SESSION_019c587a_COUNTER_ARGUMENT_REVIEW_AGENT_PACKET.md`
12. Keep current-session active evidence docs informing final rationale.
13. Gate: session folder contains one canonical architecture narrative plus active evidence only.

## Test Cases and Scenarios (Doc Acceptance Checks)
1. Domain package example shows one internal router and one in-process client, with pure service modules.
2. API boundary example shows boundary-owned contract/router default and simple reuse exception path.
3. Workflow trigger example uses `/api/workflows/<capability>/...` and separates `/api/inngest` ingress clearly.
4. Visibility model is explicit: internal default, per-procedure external promotion.
5. Capability merge in `rawr.hq.ts` shows API + workflow router composition without plugin-to-plugin imports.
6. n>1 scaled structure preserves one-router-per-domain-package and one-router-per-API-plugin invariants.
7. No stale references remain to rejected boundary-centric approach artifacts.
8. Canonical doc reads end-to-end consistently after each step.

## Assumptions and Defaults
1. Canonical doc for forward updates is the pure package E2E doc at the path above.
2. Workstream is architecture-doc convergence first; implementation code changes come after this convergence pass.
3. `rawr.hq.ts` central composition is active now; auto-discovery is intentionally deferred.
4. Workflow trigger surface naming is `/api/workflows`.
5. Workflow trigger visibility default is internal, with explicit promotion controls.
6. Cleanup decisions are made by steward judgment: remove superseded non-canonical bulk; preserve active evidence.
7. Old historical docs are not retrofitted; forward-only canonical updates apply.

Skills used: `architecture`, `orpc`.
