# SESSION_019c587a — Agent M (Option B) Router-First Plan

## Mission
Evaluate whether **router-first** should be the default authoring model for package/API/workflow surfaces in the current architecture, while preserving the locked split posture and avoiding policy regressions.

## Decision Frame
Primary decision to return:
1. Keep current default.
2. Adjust default (deliberate hybrid).
3. Switch default to router-first globally.

## Hard Constraints
- Read required local inputs before conclusions.
- Use web research against official sources (oRPC, Inngest, Elysia, TypeBox where relevant).
- Anchor to posture spec and split harness policy.
- No silent regressions against locked MUST/MUST NOT posture rules.
- Only write assigned Agent M artifacts.

## Required Inputs
- `docs/projects/flat-runtime-session-review/SESSION_019c587a_ORPC_INNGEST_WORKFLOWS_POSTURE_SPEC.md`
- `docs/projects/flat-runtime-session-review/SESSION_019c587a_AGENT_I_SPLIT_HARDEN_RECOMMENDATION.md`
- `docs/projects/flat-runtime-session-review/SESSION_019c587a_AGENT_J_COLLAPSE_UNIFY_RECOMMENDATION.md`
- `docs/projects/flat-runtime-session-review/SESSION_019c587a_AGENT_K_INTERNAL_CALLING_PACKAGING_RECOMMENDATION.md`
- `docs/projects/flat-runtime-session-review/SESSION_019c587a_AGENT_H_DX_SIMPLIFICATION_REVIEW.md`
- `apps/server/src/orpc.ts`
- `apps/server/src/rawr.ts`
- `packages/core/src/orpc/hq-router.ts`
- `packages/coordination-inngest/src/adapter.ts`

## Mandatory Skill Introspection
- `~/.codex-rawr/skills/orpc/SKILL.md`
- `~/.codex-rawr/skills/inngest/SKILL.md`
- `~/.codex-rawr/skills/elysia/SKILL.md`
- `~/.codex-rawr/skills/typebox/SKILL.md`
- `~/.codex-rawr/skills/typescript/SKILL.md`
- `~/.codex-rawr/skills/architecture/SKILL.md`
- `~/.codex-rawr/skills/web-search/SKILL.md`

## Evaluation Questions
1. Pure/internal packages: does router-first reduce overhead without losing contract clarity?
2. API plugins: does operation-first/router-first improve ergonomics while preserving policies?
3. Workflows: is router-first clearer for trigger APIs and workflow wrappers?
4. Where contract-first still makes sense under a router-first-leaning model.
5. Canonical definitions in this repo: contract-first vs router-first vs deliberate hybrid.
6. Whether auto-composition remains coherent if leaf modules favor router-first.

## Method
1. Build posture guardrails from locked spec and split recommendations (I/J/K/H).
2. Inspect live wiring in `orpc.ts`, `rawr.ts`, `hq-router.ts`, and Inngest adapter.
3. Collect official upstream evidence:
   - oRPC contract-first, router-first, router-to-contract, OpenAPI, server-side invocation.
   - Inngest serve, createFunction, step.run/invoke, durable endpoints.
   - Elysia lifecycle/mount (for boundary hosting semantics).
   - TypeBox JSON Schema-first context (as needed).
4. Score router-first applicability by layer:
   - Package internals
   - API plugin boundaries
   - Workflow trigger boundaries
   - Workflow durable execution
   - Composition/autowiring
5. Produce recommendation with explicit non-regression statement and counterargument.

## Quality Gates
- Every non-obvious claim has local or official source support.
- Recommendation explicitly checks each locked posture rule for compatibility.
- If proposing change, authoring-model delta is concrete and bounded.
- Official links included in final recommendation.

## Deliverables
- Plan: `SESSION_019c587a_AGENT_M_ROUTER_FIRST_PLAN.md`
- Scratchpad: `SESSION_019c587a_AGENT_M_ROUTER_FIRST_SCRATCHPAD.md`
- Final: `SESSION_019c587a_AGENT_M_ROUTER_FIRST_RECOMMENDATION.md`

## Progress Log
- [x] Required local inputs reviewed.
- [x] Mandatory skill files introspected.
- [x] Official web research executed (native web + attempted Firecrawl).
- [x] Router-first vs contract-first tradeoff analysis completed by layer.
- [x] Plan written.
- [x] Scratchpad written.
- [x] Final recommendation written.
