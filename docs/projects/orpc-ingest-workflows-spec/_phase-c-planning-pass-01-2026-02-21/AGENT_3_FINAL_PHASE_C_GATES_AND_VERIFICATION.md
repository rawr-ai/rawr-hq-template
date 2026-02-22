# Agent 3 Final: Phase C Gates and Verification

Date: 2026-02-21  
Owner: P3 (Phase C verification/gates planning)

## Completion Summary
1. Defined a Phase C gate architecture with strict quick/full cadence, hard-fail conformance posture, and explicit anti-drift enforcement.
2. Mapped mandatory assertions and adversarial checks for C1 (cross-instance storage locks), C2 (telemetry/diagnostics), and C3 (distribution + instance lifecycle/productization).
3. Specified exact command-contract updates (new `phase-c:*` scripts and required command chains) that preserve locked route/caller/manifest invariants while extending verification depth.
4. Preserved forward-only execution and mandatory review/fix + structural closure loops before phase exit.

## Phase C Gate Architecture

### Gate Posture (Non-Negotiable)
1. Forward-only execution, no rollback program.
2. Critical conformance checks hard-fail.
3. Drift detection is required in every quick and full run, not only happy-path correctness.

### Cadence Contract
1. Quick cadence:
- Run on every commit in active C1/C2/C3 slice branch.
- Run on every fix commit after review findings.
2. Full cadence:
- Run at candidate-complete for each slice.
- Run before independent review.
- Run after each blocking/high fix set.
- Run at phase exit.

### Global Gate Layers
1. Drift-core layer (always-on): route-family invariants, caller/auth boundaries, manifest-first composition, metadata/import boundaries.
2. Slice-specific layer: C1/C2/C3 required assertions + adversarial checks.
3. Closure layer: independent review gate, structural/taste gate, docs/cleanup gate, readiness gate.

## Mandatory Assertions

### C1: Cross-Instance Storage-Lock Redesign
1. Single-active-lock invariant per scoped workflow/resource across instances.
2. Lease/expiry semantics deterministic under contention; stale takeover is explicit and auditable.
3. No route-family drift (`/rpc`, `/api/orpc/*`, `/api/workflows/<capability>/*`, `/api/inngest`).
4. No singleton-global regression in runtime lifecycle behavior.
5. Caller-mode restrictions remain unchanged while lock internals evolve.

### C2: Telemetry and Diagnostics Expansion
1. Telemetry for critical lock lifecycle events is mandatory (acquire conflict, timeout/expiry, takeover, release, failed verification).
2. Correlation/request identity propagation remains intact across boundary and runtime planes.
3. Observability contract checks are hard-fail (no optional gate semantics for C2).
4. Telemetry expansion must not alter caller/auth/route semantics.

### C3: Distribution UX/Productization + Instance Lifecycle
1. Default distribution posture remains instance-kit/no-fork-repeatability.
2. Lifecycle behavior derives from manifest + `rawr.kind` + `rawr.capability` only.
3. Legacy metadata keys remain forbidden in active surfaces.
4. Alias/instance seam enforcement remains mandatory; no singleton-global assumptions introduced.
5. Package/import direction constraints remain intact.

## Adversarial Checks (Required)
1. C1 contention race: two instances attempt same lock acquisition concurrently; exactly one succeeds.
2. C1 replay/freshness: stale release/heartbeat/update attempts are rejected.
3. C1 boundary spoof resistance: forged first-party/service heuristics cannot bypass route/caller controls.
4. C2 telemetry omission attack: required event missing during critical transition fails gate.
5. C2 malformed correlation inputs: invalid/missing request metadata cannot silently degrade diagnostics.
6. C3 cross-instance bleed: action in instance A does not mutate instance B state.
7. C3 metadata regression probe: any reintroduced legacy key hard-fails.

## Review/Fix Closure Gates
1. Independent review gate (after first full-green per slice and on integrated packet).
2. Blocking/high findings must be fixed before progression.
3. After each blocking/high fix set:
- rerun impacted quick suites,
- rerun impacted full suites,
- rerun independent review on touched scope.
4. Structural/taste gate (mandatory, no architecture drift) after review closure.
5. Phase exit requires: C1-C3 accepted in order, review closure complete, structural closure complete, docs/cleanup complete, final full exit gates green.

## Exact Command Contract Updates (C1-C3)

### New scripts to add to `package.json`
```json
{
  "phase-c:gate:drift-core": "bun run phase-a:gate:metadata-contract && bun run phase-a:gate:import-boundary && bun run phase-a:gate:host-composition-guard && bun run phase-a:gate:route-negative-assertions && bun run phase-a:gate:harness-matrix && bun run phase-a:gate:manifest-smoke-completion && bun run phase-a:gate:legacy-metadata-hard-delete-static-guard",

  "phase-c:gate:c1-storage-lock-static": "bun scripts/phase-c/verify-storage-lock-contract.mjs",
  "phase-c:gate:c1-storage-lock-runtime": "bunx vitest run --project coordination packages/coordination/test/storage-lock-cross-instance.test.ts && bunx vitest run --project state packages/state/test/storage-lock-state-machine.test.ts && bunx vitest run --project server apps/server/test/storage-lock-route-guard.test.ts",
  "phase-c:c1:quick": "bun run phase-c:gate:drift-core && bun run phase-c:gate:c1-storage-lock-static && bun run phase-c:gate:c1-storage-lock-runtime",
  "phase-c:c1:full": "bun run phase-c:c1:quick && bunx vitest run --project server apps/server/test/rawr.test.ts",

  "phase-c:gate:c2-telemetry-contract": "bun scripts/phase-c/verify-telemetry-contract.mjs",
  "phase-c:gate:c2-telemetry-runtime": "bunx vitest run --project coordination-observability packages/coordination-observability/test/storage-lock-telemetry.test.ts && bunx vitest run --project server apps/server/test/ingress-signature-observability.test.ts",
  "phase-c:c2:quick": "bun run phase-c:gate:drift-core && bun run phase-c:gate:c2-telemetry-contract && bun run phase-c:gate:c2-telemetry-runtime",
  "phase-c:c2:full": "bun run phase-c:c2:quick && bun run phase-a:gate:observability-contract",

  "phase-c:gate:c3-distribution-contract": "bun scripts/phase-c/verify-distribution-instance-lifecycle.mjs",
  "phase-c:gate:c3-distribution-runtime": "bunx vitest run --project hq packages/hq/test/instance-alias-isolation.test.ts && bunx vitest run --project plugin-plugins plugins/cli/plugins/test/distribution-alias-lifecycle.test.ts",
  "phase-c:c3:quick": "bun run phase-c:gate:drift-core && bun run phase-c:gate:c3-distribution-contract && bun run phase-c:gate:c3-distribution-runtime",
  "phase-c:c3:full": "bun run phase-c:c3:quick && bun run phase-a:gate:legacy-metadata-hard-delete-static-guard",

  "phase-c:gates:full": "bun run phase-c:c1:full && bun run phase-c:c2:full && bun run phase-c:c3:full",
  "phase-c:gates:exit": "bun run phase-c:gates:full && bun run phase-a:gates:exit"
}
```

### Contract semantics
1. Any missing required test/scaffold file is a hard failure.
2. `phase-c:gate:drift-core` is mandatory in every C1/C2/C3 quick run to prevent silent boundary drift.
3. C2 telemetry is explicitly mandatory (no optional/non-blocking path).
4. `phase-c:gates:exit` is the final green signal for Phase C runtime completion.

## Skills Introspected
1. `/Users/mateicanavra/.codex-rawr/skills/solution-design/SKILL.md`
2. `/Users/mateicanavra/.codex-rawr/skills/system-design/SKILL.md`
3. `/Users/mateicanavra/.codex-rawr/skills/domain-design/SKILL.md`
4. `/Users/mateicanavra/.codex-rawr/skills/api-design/SKILL.md`
5. `/Users/mateicanavra/.codex-rawr/skills/typescript/SKILL.md`
6. `/Users/mateicanavra/.codex-rawr/skills/orpc/SKILL.md`
7. `/Users/mateicanavra/.codex-rawr/skills/inngest/SKILL.md`
8. `/Users/mateicanavra/.codex-rawr/skills/docs-architecture/SKILL.md`

## Evidence Map (Absolute Paths + Line Anchors)
1. Phase packet authority and required Phase C readiness references:  
`/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-planning-packet/docs/projects/orpc-ingest-workflows-spec/README.md:29`  
`/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-planning-packet/docs/projects/orpc-ingest-workflows-spec/README.md:42`
2. Forward-only posture + adversarial verification + review/fix closure expectations:  
`/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-planning-packet/docs/projects/orpc-ingest-workflows-spec/PHASE_EXECUTION_WORKFLOW.md:15`  
`/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-planning-packet/docs/projects/orpc-ingest-workflows-spec/PHASE_EXECUTION_WORKFLOW.md:42`  
`/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-planning-packet/docs/projects/orpc-ingest-workflows-spec/PHASE_EXECUTION_WORKFLOW.md:48`  
`/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-planning-packet/docs/projects/orpc-ingest-workflows-spec/PHASE_EXECUTION_WORKFLOW.md:84`
3. Phase C is ready and C1-C3 ordering is explicit:  
`/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-planning-packet/docs/projects/orpc-ingest-workflows-spec/_phase-b-runtime-execution-pass-01-2026-02-20/B6_PHASE_C_READINESS.md:4`  
`/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-planning-packet/docs/projects/orpc-ingest-workflows-spec/_phase-b-runtime-execution-pass-01-2026-02-20/B6_PHASE_C_READINESS.md:30`
4. Locked route/caller/manifest/metadata invariants to guard against drift:  
`/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-planning-packet/docs/projects/orpc-ingest-workflows-spec/ARCHITECTURE.md:34`  
`/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-planning-packet/docs/projects/orpc-ingest-workflows-spec/ARCHITECTURE.md:37`  
`/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-planning-packet/docs/projects/orpc-ingest-workflows-spec/ARCHITECTURE.md:65`  
`/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-planning-packet/docs/projects/orpc-ingest-workflows-spec/ARCHITECTURE.md:97`  
`/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-planning-packet/docs/projects/orpc-ingest-workflows-spec/ARCHITECTURE.md:247`
5. D-013/D-014/D-015/D-016 lock posture and remaining open/non-blocking decisions (D-009/D-010):  
`/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-planning-packet/docs/projects/orpc-ingest-workflows-spec/DECISIONS.md:87`  
`/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-planning-packet/docs/projects/orpc-ingest-workflows-spec/DECISIONS.md:128`  
`/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-planning-packet/docs/projects/orpc-ingest-workflows-spec/DECISIONS.md:148`  
`/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-planning-packet/docs/projects/orpc-ingest-workflows-spec/DECISIONS.md:190`  
`/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-planning-packet/docs/projects/orpc-ingest-workflows-spec/DECISIONS.md:203`
6. Existing quick/full cadence and mandatory review/structural closure model from Phase B:  
`/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-planning-packet/docs/projects/orpc-ingest-workflows-spec/PHASE_B_ACCEPTANCE_GATES.md:7`  
`/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-planning-packet/docs/projects/orpc-ingest-workflows-spec/PHASE_B_ACCEPTANCE_GATES.md:10`  
`/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-planning-packet/docs/projects/orpc-ingest-workflows-spec/PHASE_B_ACCEPTANCE_GATES.md:82`  
`/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-planning-packet/docs/projects/orpc-ingest-workflows-spec/PHASE_B_ACCEPTANCE_GATES.md:90`  
`/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-planning-packet/docs/projects/orpc-ingest-workflows-spec/PHASE_B_ACCEPTANCE_GATES.md:100`
7. Current gate command baseline and optional telemetry weakness:  
`/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-planning-packet/package.json:31`  
`/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-planning-packet/package.json:41`  
`/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-planning-packet/package.json:44`
8. Gate scaffold hard-fail behavior and telemetry optional behavior in current script:  
`/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-planning-packet/scripts/phase-a/verify-gate-scaffold.mjs:40`  
`/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-planning-packet/scripts/phase-a/verify-gate-scaffold.mjs:255`  
`/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-planning-packet/scripts/phase-a/verify-gate-scaffold.mjs:264`  
`/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-planning-packet/scripts/phase-a/verify-gate-scaffold.mjs:279`
9. Harness-matrix enforcement of suite coverage + negative assertions + `/rpc/workflows` negative case:  
`/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-planning-packet/scripts/phase-a/verify-harness-matrix.mjs:14`  
`/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-planning-packet/scripts/phase-a/verify-harness-matrix.mjs:24`  
`/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-planning-packet/scripts/phase-a/verify-harness-matrix.mjs:104`  
`/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-planning-packet/scripts/phase-a/verify-harness-matrix.mjs:144`  
`/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-planning-packet/scripts/phase-a/verify-harness-matrix.mjs:217`
10. Manifest smoke completion-mode checks enforce manifest seams and no `/rpc/workflows` leakage:  
`/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-planning-packet/scripts/phase-a/manifest-smoke.mjs:98`  
`/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-planning-packet/scripts/phase-a/manifest-smoke.mjs:132`  
`/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-planning-packet/scripts/phase-a/manifest-smoke.mjs:146`
11. Route matrix tests encode required suites/negative keys and explicit boundary assertions:  
`/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-planning-packet/apps/server/test/route-boundary-matrix.test.ts:14`  
`/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-planning-packet/apps/server/test/route-boundary-matrix.test.ts:24`  
`/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-planning-packet/apps/server/test/route-boundary-matrix.test.ts:204`  
`/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-planning-packet/apps/server/test/route-boundary-matrix.test.ts:243`  
`/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-planning-packet/apps/server/test/route-boundary-matrix.test.ts:345`
12. Existing adversarial tests (spoofed auth, ingress signatures, mount order) available for carry-forward:  
`/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-planning-packet/apps/server/test/rawr.test.ts:62`  
`/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-planning-packet/apps/server/test/rawr.test.ts:70`  
`/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-planning-packet/apps/server/test/rawr.test.ts:105`  
`/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-planning-packet/apps/server/test/rawr.test.ts:146`

## Assumptions
1. The provided Phase B runtime path was stale; the active planning worktree contains the authoritative equivalent corpus and gate surfaces.
2. C1-C3 runtime implementation will add the referenced Phase C test files/scripts; until then, new gate scripts are expected to fail (by design) if invoked.
3. Existing Phase A gates remain the minimum drift-core substrate and are intentionally reused rather than duplicated.
4. No locked route/caller/manifest invariants will be reopened in Phase C slices.

## Risks
1. If Phase C adds behavior without first adding corresponding hard-fail checks, drift can ship behind green happy-path tests.
2. Keeping telemetry optional would undercut C2 objectives and hide observability regressions.
3. New slice tests may become brittle if they validate string snapshots instead of structural/runtime behavior.
4. Cross-instance lock behavior can pass unit tests yet fail under concurrency if adversarial race tests are omitted.
5. Distribution lifecycle changes can accidentally reintroduce singleton assumptions unless alias/instance isolation tests are mandatory in C3 quick runs.

## Unresolved Questions
1. Should D-009 (middleware dedupe marker tightening) be promoted from non-blocking to locked during C2, or remain guidance-only for this phase?
2. Should D-010 (Inngest finished-hook strictness) become an explicit hard-fail policy gate in C2, or stay non-blocking?
3. What is the final naming/location convention for new `scripts/phase-c/*.mjs` gate verifiers relative to existing `scripts/phase-a/*` lineage?
4. Do we require per-slice `phase-c:<slice>:quick` pre-push hooks, or keep enforcement at CI + review gates only?
