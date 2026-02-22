# ORPC + Inngest Autonomy Architecture Assessment (Stacked Branch, Separate Worktree)

## Summary
This plan runs a full multi-agent architecture assessment on top of the current top Graphite branch (`codex-pure-package-e2e-convergence-orchestration`, commit `a26a94aa1d6c434afe4493927f6ea3b798ccbb0b`) in a new stacked child branch and isolated worktree.  
It evaluates both:
1. The spec packet at `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/docs/projects/orpc-ingest-workflows-spec/*`
2. Existing non-overlapping runtime code in `apps/*`, `packages/*`, `plugins/*` (especially metadata/control-plane, plugin lifecycle, state/security, ORPC routes, and Inngest runtime wiring)

The output will be decision-ready, with explicit answers to:
1. Is this the right solution shape?
2. What is simpler?
3. What is more robust?
4. What is likely to fail first?

## Baseline Facts Locked Before Execution
1. Top stack branch is `codex-pure-package-e2e-convergence-orchestration` and is ahead of origin by 7 commits.
2. That branch’s changes are docs-only (`docs/*`, `.scratch/*`, `AGENTS_SPLIT.md`), with no runtime code edits.
3. Runtime today already has ORPC + Inngest in production paths:
   - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/apps/server/src/orpc.ts`
   - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/apps/server/src/rawr.ts`
   - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/packages/coordination-inngest/src/adapter.ts`
4. Current plugin metadata/runtime tooling still depends on `templateRole/channel/publishTier`:
   - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/packages/hq/src/workspace/plugins.ts`
   - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/plugins/cli/plugins/src/lib/workspace-plugins.ts`
5. The packet target model requires `rawr.kind + rawr.capability` and removes legacy metadata from runtime semantics:
   - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/orpc-ingest-workflows-spec/DECISIONS.md`
   - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/orpc-ingest-workflows-spec/axes/10-legacy-metadata-and-lifecycle-simplification.md`

## Branch + Worktree Execution Contract
1. Parent branch: `codex-pure-package-e2e-convergence-orchestration`
2. Child branch: `codex/orpc-inngest-autonomy-assessment`
3. Child worktree: `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment`
4. Branch creation command:
   - `git -C /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template worktree add -b codex/orpc-inngest-autonomy-assessment /Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment codex-pure-package-e2e-convergence-orchestration`
5. Graphite safety:
   - `gt sync --no-restack` only
   - no global restacks
6. Clean-state guarantee:
   - all produced artifacts committed on child branch
   - no dirty worktree left behind

## Artifact Root and Required Files
All artifacts will be created under:
`/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/docs/projects/orpc-ingest-workflows-spec/_autonomy-assessment-pass-01-2026-02-20`

Required orchestrator files:
1. `ORCHESTRATOR_PLAN_VERBATIM.md`
2. `ORCHESTRATOR_SCRATCHPAD.md`
3. `INTEGRATED_ASSESSMENT.md`
4. `RISK_REGISTER.yaml`
5. `GAP_REGISTER.yaml`
6. `ALTERNATIVES_COMPARISON.md`
7. `EXECUTIVE_SUMMARY.md`

## Team Topology (6 Specialists + Orchestrator)
| Agent | Objective | Required Skill Introspection | Required Output Files |
|---|---|---|---|
| Agent A | Spec packet structure and decision integrity (D-005…D-015) | `solution-design`, `system-design`, `domain-design`, `api-design`, `orpc`, `inngest` | `AGENT_A_PLAN_VERBATIM.md`, `AGENT_A_SCRATCHPAD.md`, `AGENT_A_FINAL_SPEC_PACKET_ANALYSIS.md` |
| Agent B | Runtime reality map and non-overlapping code inventory | `solution-design`, `system-design`, `domain-design`, `typescript`, `orpc`, `inngest` | `AGENT_B_PLAN_VERBATIM.md`, `AGENT_B_SCRATCHPAD.md`, `AGENT_B_FINAL_RUNTIME_DELTA_MAP.md` |
| Agent C | API design and context design quality (contracts, transport, errors, caller model) | `solution-design`, `system-design`, `domain-design`, `api-design`, `typescript`, `orpc` | `AGENT_C_PLAN_VERBATIM.md`, `AGENT_C_SCRATCHPAD.md`, `AGENT_C_FINAL_API_CONTEXT_ASSESSMENT.md` |
| Agent D | Domain boundaries and ownership authority model | `solution-design`, `system-design`, `domain-design`, `team-design` | `AGENT_D_PLAN_VERBATIM.md`, `AGENT_D_SCRATCHPAD.md`, `AGENT_D_FINAL_DOMAIN_AUTHORITY_ASSESSMENT.md` |
| Agent E | System dynamics, failure modes, resilience and “what gets us” map | `solution-design`, `system-design`, `domain-design`, `inngest` | `AGENT_E_PLAN_VERBATIM.md`, `AGENT_E_SCRATCHPAD.md`, `AGENT_E_FINAL_SYSTEM_RISK_ANALYSIS.md` |
| Agent F | Alternatives: right shape vs simpler vs more robust (greenfield + incremental) | `solution-design`, `system-design`, `domain-design`, `api-design`, `team-design`, `typescript` | `AGENT_F_PLAN_VERBATIM.md`, `AGENT_F_SCRATCHPAD.md`, `AGENT_F_FINAL_ALTERNATIVES_AND_RECOMMENDATION.md` |

## Mandatory Agent Protocol
For every agent, in this strict order:
1. Write research plan immediately and verbatim to `AGENT_<X>_PLAN_VERBATIM.md`.
2. Create and continuously append `AGENT_<X>_SCRATCHPAD.md` with timestamped notes and evidence.
3. Produce a final document for assigned objective.
4. Include a “Skills Introspected” section listing exact skill files read.
5. Include an “Evidence Map” section with absolute file references and line anchors.
6. Include “Assumptions”, “Risks”, and “Unresolved Questions”.

## Orchestrator Protocol
1. Immediately after plan acceptance, write this plan verbatim to `ORCHESTRATOR_PLAN_VERBATIM.md`.
2. Maintain `ORCHESTRATOR_SCRATCHPAD.md` with integration notes, contradictions, and arbitration decisions.
3. Enforce a single evidence schema across all agent docs:
   - `claim`
   - `proposal_source`
   - `runtime_source`
   - `alignment_status` (`aligned`/`divergent`/`non-overlap`)
   - `impact`
   - `confidence`
4. Resolve cross-agent contradictions and record final decision in `INTEGRATED_ASSESSMENT.md`.

## Analysis Framework (Decision-Complete)
All final docs must score findings across these axes:
1. Solution Design: framing quality, stakeholder fit, reversibility, search topology, migration viability.
2. System Design: boundary choices, coupling, feedback loops, failure cascades, observability quality.
3. Domain Design: bounded contexts, ownership single-authority test, overlap ambiguity, import direction integrity.
4. API Design: consumer model correctness, route/transport semantics, error contracts, publication boundaries, evolvability.
5. TypeScript/Context Design: runtime-vs-type-time honesty, context envelope structure, boundary parsing rigor, inferred API usability.
6. Team Design for autonomy: agent topology, context distribution model, accountability and control-plane feasibility.

## Test Cases and Scenarios
The assessment will be validated against concrete scenarios:
1. Route semantics scenario:
   - verify packet route model (`/rpc`, `/api/orpc/*`, `/api/workflows/<capability>/*`, `/api/inngest`) against current tests in `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/apps/server/test/*`.
2. Metadata migration scenario:
   - verify D-013 target against current plugin parsing/enforcement code in `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/packages/hq/src/workspace/plugins.ts` and `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/plugins/cli/plugins/src/lib/workspace-plugins.ts`.
3. Context propagation scenario:
   - compare packet context model vs current runtime adapter/context usage in `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/apps/server/src/coordination.ts` and `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/packages/coordination-inngest/src/adapter.ts`.
4. Autonomous extension scenario:
   - validate whether new capability/plugins can be added without human intervention under current control-plane/state/security flows.
5. Blast-radius scenario:
   - estimate migration impact to docs/runbooks/lifecycle workflows per D-015 contract in `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/orpc-ingest-workflows-spec/IMPLEMENTATION_ADJACENT_DOC_UPDATES_SPEC.md`.

## Final Deliverable Shape
`EXECUTIVE_SUMMARY.md` and final handoff message will contain:
1. “Right shape?” answer with explicit yes/no/conditional judgment.
2. Simplest viable path (minimum-change trajectory).
3. Most robust path (higher-cost, lower-regret trajectory).
4. Top risk register (“what might get us”) with severity and trigger signals.
5. Recommendation with phased adoption strategy:
   - Phase 0: no-regret moves
   - Phase 1: compatibility bridge
   - Phase 2: target-state cutover
   - Phase 3: governance hardening

## Public APIs / Interfaces / Types
1. This exploration branch is analysis-only and introduces no runtime API/type changes.
2. Deliverables will include a proposed (not implemented) API/interface delta table covering:
   - route topology deltas
   - manifest contract candidates (`rawr.hq.ts`)
   - metadata contract deltas (`rawr.kind`, `rawr.capability`, legacy field retirement)
   - caller transport contract changes

## Assumptions and Defaults
1. “ingest” in your prompt is interpreted as “Inngest” (I-N-N-G-E-S-T).
2. We analyze from the latest local top branch state (including commits ahead of origin).
3. Work remains docs/analysis only unless you explicitly switch to implementation.
4. No `gt submit`/merge is performed unless requested.
5. All work ends in a clean git state (committed artifacts, no dirty tree).

## Skills Applied in This Plan
`exploration-sandbox`, `solution-design`, `system-design`, `domain-design`, `api-design`, `team-design`, `typescript`, plus process grounding from `graphite`, `git-worktrees`, `orpc`, and `inngest`.
