# Runtime Spine Diagnostic Work Plan

Status: completed after local verification.
Branch: `codex/runtime-spine-diagnostic-report`.

## Objective

Produce a living diagnostic report that shows which runtime realization spine components are verified, partially verified, or unverified before migration. The report must stay tied to the final runtime realization spec, the stale-but-useful Phase 2 migration plan, and the current Lab V2 evidence.

This pass also removes or downgrades theatrical tests: tests that only prove a third-party library does not expose an API outside its contract, or that re-test vendor primitives without exercising a RAWR-owned integration layer.

## Evidence Sources

- Authoritative runtime spec: `docs/projects/rawr-final-architecture-migration/resources/spec/RAWR_Effect_Runtime_Realization_System_Canonical_Spec.md`
- Directional migration plan: `docs/projects/rawr-final-architecture-migration/resources/quarantine/RAWR_Architecture_Migration_Plan.md`
- Lab evidence: `tools/runtime-realization-type-env/evidence/proof-manifest.json`
- Lab tests and fixtures under `tools/runtime-realization-type-env/test` and `tools/runtime-realization-type-env/fixtures`
- Nx project truth from `bunx nx show project runtime-realization-type-env --json`
- Narsil/code-intel is evidence discovery only, not architecture authority.

## Phases

1. Grounding and branch setup.
   - Confirm Graphite stack state.
   - Create `codex/runtime-spine-diagnostic-report`.
   - Persist this plan.

2. Parallel read-only audit.
   - Spec spine cartographer: required runtime spine components and proof criteria.
   - Migration cartographer: Phase 2/Plateau 2 validation expectations, marking stale language.
   - Lab evidence auditor: manifest entries mapped to real gates/tests.
   - Test-theater auditor: remove/downgrade/keep recommendations.
   - Default judgement reviewers own conclusions; explorer agents are retrieval only.

3. Evidence cleanup.
   - Remove the oRPC `.effect(...)` negative assertion.
   - Remove no-op vendor environment checks unless tied to RAWR handoff.
   - Remove direct raw Effect primitive demos unless they go through RAWR-owned wrappers.
   - Update manifest and vendor notes so no removed test is counted as proof.

4. Diagnostic report.
   - Add `runtime-spine-verification-diagnostic.md`.
   - Include colored Mermaid spine map.
   - Include component matrix with green/yellow/red status.
   - Include test-theater audit ledger.
   - Include next validation moves: resolve now, container experiment, migration-only.

5. Verification and handoff.
   - Run `bunx nx run runtime-realization-type-env:gate`.
   - Run `bun run runtime-realization:type-env`.
   - Run `git diff --check`, `git status --short --branch`, and `gt status --short`.
   - Commit with `docs(runtime): add runtime spine verification diagnostic`.
   - Submit stack with `gt submit --stack --ai`.

## Acceptance

- Every load-bearing runtime spine component needed for migration has a status.
- Report distinguishes type proof, vendor-shape proof, simulation proof, xfail/todo, and migration-only gaps.
- The suspected gaps are explicit: durable Inngest scheduling, oRPC-native checks, external vendor integrations, and actual production runtime paths.
- Production `apps/*`, `packages/*`, `services/*`, and `plugins/*` remain untouched.
