# ORPC Repo-Wide Migration Research Plan (Canonical)

## Goal

Define the complete scoped change set required to replace manual API wiring with oRPC across RAWR HQ-Template, with explicit integration patterns for Elysia, Inngest, and micro frontends (including React Flow surfaces).

## Scope Mode

- This document is research + migration scoping only.
- No production refactor implementation in this phase.
- Output is a complete architecture and execution scope document for a follow-up implementation phase.

## Execution Plan (Verbatim Canonical Plan)

1. Confirm working-state baseline and constraints:
   - Work from the top-most branch in the active Graphite stack.
   - Verify repo routing/contracts (`AGENTS.md`, `AGENTS_SPLIT.md`, nested AGENTS docs).
   - Capture current package/app/plugin boundaries and ownership expectations.
2. Establish orchestration artifacts before research execution:
   - Maintain one orchestrator scratch pad.
   - Maintain one scratch pad per spawned research agent.
   - Keep all artifacts in `docs/projects/agent-coordination-canvas-v1/`.
3. Launch parallel research agents (max six) with explicit lanes:
   - Lane A: network/server integration and current manual API surfaces.
   - Lane B: testing harnesses and no-network procedure testing strategy.
   - Lane C: frontend/micro-frontend integration, React Flow data consumption, and client ergonomics.
   - Lane D: Inngest integration path and runtime contract boundaries.
   - Lane E: packages/plugins/domain boundaries and CLI wrapper implications.
   - Lane F: monorepo architecture, router-first vs contract-first decision, and docs/runbook impacts.
4. Require each lane to provide:
   - Current-state audit with precise file pointers.
   - Target-state oRPC shape for that lane.
   - Migration slices (prepare -> cutover -> cleanup) with deletion targets.
   - Risks, decision points, and test/doc updates needed.
5. Integrate findings into one comprehensive scoped architecture doc:
   - Current state vs target state separation.
   - Architecture decision on contract-first vs router-first and why.
   - Cross-system lifecycle for new web plugin creation:
     `Inngest <-> oRPC <-> Elysia <-> frontend (React Flow/Next-like host)`.
   - Repo-wide file-level scope of changes.
   - Testing matrix (unit/procedure/no-network/network/integration/e2e).
   - Documentation and skill updates required.
   - Canonical runbook additions/changes.
6. Validate migration scope quality:
   - Check for missing subsystems and hidden manual API surfaces.
   - Ensure every temporary bridge has a deletion target.
   - Ensure scope supports agent-friendly explicitness and future plugin volume scaling.
7. Deliver final integrated scope document + short implementation kickoff notes:
   - Final scoped doc path and summary.
   - Open decisions requiring explicit acceptance before implementation.

## Deliverables

- Canonical integrated scope document for repo-wide oRPC migration.
- Lane scratch pads with source-backed findings.
- A short implementation kickoff checklist for the next phase.
