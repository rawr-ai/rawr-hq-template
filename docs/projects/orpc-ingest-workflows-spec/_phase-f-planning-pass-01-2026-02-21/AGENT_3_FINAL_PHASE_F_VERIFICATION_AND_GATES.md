# AGENT 3 Final — Phase F Verification and Gates

## Proposed Gate Naming Convention
1. Atomic verifiers: `phase-f:gate:<concern>`.
2. Slice aggregators: `phase-f:fN:quick` and `phase-f:fN:full`.
3. Phase aggregates: `phase-f:gates:full`, `phase-f:gates:closure`, `phase-f:gates:exit`.
4. No gate may depend on ephemeral planning/runtime scratch artifacts.

## Deterministic Gate Chain Proposal
1. `phase-f:gate:drift-core`
2. `phase-f:f1:quick` / `phase-f:f1:full`
3. `phase-f:f2:quick` / `phase-f:f2:full`
4. `phase-f:f3:quick` / `phase-f:f3:full`
5. `phase-f:gate:f4-assess`
6. `phase-f:gate:f4-disposition`
7. `phase-f:gate:f5-review-closure`
8. `phase-f:gate:f5a-structural-closure`
9. `phase-f:gate:f6-cleanup-manifest`
10. `phase-f:gate:f6-cleanup-integrity`
11. `phase-f:gate:f7-readiness`
12. `phase-f:gates:full`
13. `phase-f:gates:closure`
14. `phase-f:gates:exit`

## Cadence Contract
1. Quick run on every implementation commit.
2. Full run at end of each slice and after blocking/high fixes.
3. Run full before independent review and before phase exit.
4. Run full + closure gates again after cleanup edits.

## Mandatory Assertions
1. Runtime identity invariant unchanged.
2. Route-family boundaries unchanged.
3. Manifest authority unchanged.
4. Dedupe and finished-hook policies remain structural + runtime verified.
5. F4 disposition always present with explicit `triggered|deferred` state.
6. Trigger evidence artifact required when triggered.
7. Cleanup cannot remove closure-critical artifacts consumed by gates.

## Durable Evidence Strategy
1. Gate scripts read code + durable runtime pass artifacts only.
2. Phase F closure artifacts remain authoritative for disposition and readiness.
3. Agent scratchpads are non-authoritative and must not be gate inputs.

## Skills Introspected
1. `/Users/mateicanavra/.codex-rawr/skills/architecture/SKILL.md`
2. `/Users/mateicanavra/.codex-rawr/skills/typescript/SKILL.md`
3. `/Users/mateicanavra/.codex-rawr/skills/orpc/SKILL.md`
4. `/Users/mateicanavra/.codex-rawr/skills/docs-architecture/SKILL.md`
5. `/Users/mateicanavra/.codex-rawr/skills/graphite/SKILL.md`
6. `/Users/mateicanavra/.codex-rawr/skills/decision-logging/SKILL.md`

## Evidence Map
1. `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/docs/projects/orpc-ingest-workflows-spec/PHASE_EXECUTION_WORKFLOW.md:36`
2. `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/docs/projects/orpc-ingest-workflows-spec/PHASE_EXECUTION_WORKFLOW.md:48`
3. `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/docs/projects/orpc-ingest-workflows-spec/PHASE_EXECUTION_WORKFLOW.md:61`
4. `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/docs/projects/orpc-ingest-workflows-spec/PHASE_B_ACCEPTANCE_GATES.md:6`
5. `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/docs/projects/orpc-ingest-workflows-spec/PHASE_D_ACCEPTANCE_GATES.md:19`
6. `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/docs/projects/orpc-ingest-workflows-spec/PHASE_D_ACCEPTANCE_GATES.md:82`
7. `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/docs/projects/orpc-ingest-workflows-spec/PHASE_E_ACCEPTANCE_GATES.md:34`
8. `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/docs/projects/orpc-ingest-workflows-spec/_phase-e-runtime-execution-pass-01-2026-02-21/E4_DISPOSITION.md:3`
9. `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/docs/projects/orpc-ingest-workflows-spec/_phase-e-runtime-execution-pass-01-2026-02-21/E6_CLEANUP_MANIFEST.md:16`
10. `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/scripts/phase-e/verify-e3-evidence-integrity.mjs:39`
11. `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/scripts/phase-d/verify-d4-disposition.mjs:35`

## Assumptions
1. Phase F introduces `scripts/phase-f/*` verifiers.
2. Existing test targets remain valid for drift-core and adversarial checks.

## Risks
1. Gate-chain complexity may hide failures if naming/drift checks are not strict.
2. Cleanup edits can silently break closure unless post-cleanup integrity gate is mandatory.

## Unresolved Questions
1. Which exact decision IDs are in F4 scope besides D-004.
2. Whether closure gates should be CI-enforced or runbook-enforced only.
