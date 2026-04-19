# Orchestrator Scratchpad — V5 Enforcement Spec

## Objective

Produce a standalone supporting document that translates `PROPOSAL-V5.md` into a canonical enforcement spec: the exact Nx, lint, structural-check, and test mechanisms required to make the V5 structure mechanically enforceable and straightforward to migrate toward.

## Anchors

- `chatgpt-design-host-shell-architecture/work/docs/canonical/RAWR_App_Boot_Spec/*`
- `chatgpt-design-host-shell-architecture/work/docs/canonical/RAWR_Future_Architecture_V2.md`
- `.context/research/structural-migration-guardrails-2026-03-21/proposals/STRUCTURAL-MIGRATION-GUARDRAILS-PROPOSAL-DECISIVE.md`
- `.context/research/structural-migration-proposal-2026-03-20/proposals/PROPOSAL-V5.md`

## Prior team loaded

- `.context/research/structural-migration-guardrails-2026-03-21/orchestrator/scratchpad.md`
- `.context/research/structural-migration-guardrails-2026-03-21/team/v1-nx-guardrails/agent-a-boundaries-eslint.md`
- `.context/research/structural-migration-guardrails-2026-03-21/team/v1-nx-guardrails/agent-b-graph-extensibility.md`
- `.context/research/structural-migration-guardrails-2026-03-21/team/v1-nx-guardrails/agent-c-task-orchestration.md`
- `.context/research/structural-migration-guardrails-2026-03-21/team/v1-nx-guardrails/agent-d-repo-mapping.md`

## New team lanes

- canonical ontology lead
- Nx enforcement lead
- lint / tests / structural-gates lead
- V5 crosswalk lead

## Synthesis notes

- Canon and V5 are aligned enough to make the enforcement shell decisive now.
- The support doc must not preserve transitional filesystem names as target-state nouns.
- The control plane is Nx OSS first: tags, module boundaries, project-owned `structural` targets, graph-derived inventory, and `nx sync:check`.
- Non-Nx layers remain required as oracle layers:
  - manifest purity
  - entrypoint thinness
  - host-composition correctness
  - route-family separation
  - ingress/auth seams
  - evidence durability
- `apps/server/src/rawr.ts` remains the concrete blind spot to remove, not a tolerated exception.

## Deliverables

- `deliverables/V5-ENFORCEMENT-SPEC.md`
- `artifacts/enforcement-matrix.md`
- `artifacts/v5-to-enforcement-crosswalk.md`
- `artifacts/unresolved-only.md`
- supporting team memos and ledgers in this sprint folder
