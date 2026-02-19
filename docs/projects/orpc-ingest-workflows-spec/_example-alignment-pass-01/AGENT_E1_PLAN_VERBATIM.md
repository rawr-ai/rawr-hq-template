# AGENT E1 Plan (Verbatim)

## Agent Scope
- Agent: `E1`
- Owned example: `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/orpc-ingest-workflows-spec/examples/e2e-01-basic-package-api.md`
- Allowed artifact path: `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/orpc-ingest-workflows-spec/_example-alignment-pass-01/`

## Mission Lock
Realign E2E-01 to canonical policy with no policy drift, preserve concrete package+API detail, remove workflow/runtime leakage from the baseline walkthrough, and add explicit conformance anchors.

## Hard Constraints
1. Edit only the owned example plus E1 pass artifacts.
2. No runtime code changes.
3. No policy drift from `ARCHITECTURE.md`, `DECISIONS.md`, and `axes/*`.
4. Draft-first: reasoning artifacts before editing owned example.

## Mandatory Grounding Completed
1. Skills loaded and applied:
   - `information-design`
   - `orpc`
   - `architecture`
   - `typescript`
   - `inngest`
   - `docs-architecture`
   - `decision-logging`
   - `system-design` (literal skill as required)
   - `api-design` (literal skill as required)
   - `typebox` (literal skill as required)
2. Full corpus read:
   - `README.md`
   - `ARCHITECTURE.md`
   - `DECISIONS.md`
   - `CANONICAL_EXPANSION_NAV.md`
   - `IMPLEMENTATION_ADJACENT_DOC_UPDATES_SPEC.md`
   - all files under `axes/`
   - all four files under `examples/`

## Execution Plan
1. Write E1 artifacts first:
   - `AGENT_E1_PLAN_VERBATIM.md` (this file)
   - `AGENT_E1_SCRATCHPAD.md` (conformance reasoning + preservation ledger + self-check)
2. Rewrite owned example around a strict minimal baseline:
   - package domain/service/procedures/internal client
   - plugin-owned API contract + operations + router
   - explicit host boundary mounts for `/rpc` and `/api/orpc/*`
   - no workflow trigger/runtime implementation snippets
3. Keep useful specificity while removing leakage:
   - retain concrete TypeBox/oRPC snippets where baseline-relevant
   - remove or replace workflow/runtime snippets that imply baseline coupling
4. Add required section:
   - `Conformance Anchors` mapping each major segment to canonical policy docs.
5. Run final self-check against four passes before completion summary.

## Expected Output Shape
- One corrected baseline example doc with:
  - clear scope boundary (`API + package only`)
  - explicit non-goal statement for workflow/runtime paths
  - concrete path and code-level detail
  - conformance anchor table

## Decision-Logging Note
Any interpretation choice that could shift policy semantics is recorded in E1 scratchpad before edit execution.
