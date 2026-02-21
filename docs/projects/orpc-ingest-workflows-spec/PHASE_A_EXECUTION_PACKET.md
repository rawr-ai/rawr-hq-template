# Phase A Execution Packet

## Start Here (Single Entrypoint)
This is the only execution packet for Phase A.

Execute strictly in this order:
1. `A0` -> `A1` -> `A2` -> `A3` -> `A4` -> `A5` -> `A6` -> `A7` -> `A8` -> `A9`
2. Do not start a slice until all dependency slices are green.
3. Forward-only posture: remediate failing slices in place; do not run rollback tracks.
4. `A7` is a mandatory full review + fix closure before docs/cleanup.
5. `A8` is the mandatory docs/cleanup closeout for landed Phase A.
6. `A9` is a mandatory post-land realignment pass for Phase B+ planning readiness.

## Phase A Objective
Converge runtime behavior to locked D-013, D-015, and D-016 seam-now policy with implementation-ready slices tied to real code paths.

## Locked Decisions (No Re-open Inside Phase A)
1. `/api/workflows/<capability>/*` ships in Phase A as an additive caller-facing route family.
2. `/api/inngest` remains runtime-ingress-only and must stay caller-forbidden.
3. Ingress signature verification is host-enforced before runtime dispatch.
4. Runtime metadata behavior is keyed only by `rawr.kind`, `rawr.capability`, and manifest registration.
5. `templateRole`, `channel`, `publishTier`, and `published` are forbidden legacy keys and must be removed from non-archival runtime/tooling/scaffold metadata surfaces in Phase A.
6. Plugin metadata interpretation is centralized in one shared parser contract used by both workspace discovery paths.
7. Harness and negative-route gates are hard-fail by end of `A1` (baseline wiring in `A0` is allowed).
8. Legacy-metadata hard deletion is enforced as a blocking gate and must be complete by `A6`.

## Ownership Semantics (Explicit)
`Owner` means the accountable role for decision and merge-complete outcome of a slice, not an advisory stakeholder.

| Role | Handle | Backup | Accountability |
| --- | --- | --- | --- |
| Runtime/Host Composition Owner | `@rawr-runtime-host` | `@rawr-platform-duty` | Host wiring, context seam, ingress guard, route-family mounts |
| Plugin Lifecycle Owner | `@rawr-plugin-lifecycle` | `@rawr-architecture-duty` | Metadata contract, discovery roots, shared parser adoption |
| Verification & Gates Owner | `@rawr-verification-gates` | `@rawr-release-duty` | CI gates, negative-route assertions, harness completeness |
| Distribution/Lifecycle Contract Owner | `@rawr-distribution-lifecycle` | `@rawr-runtime-host` | Alias/instance seam assertions and legacy metadata hard-delete closure |
| Review Closure Owner | `@rawr-review-closure` | `@rawr-verification-gates` | TypeScript + ORPC review closure, finding triage, and fix-loop completion |
| Docs & Cleanup Owner | `@rawr-docs-maintainer` | `@rawr-release-duty` | Canonical docs/runbook updates and scratch/review artifact cleanup |
| Phase Sequencing Owner | `@rawr-phase-sequencing` | `@rawr-architecture-duty` | Post-Phase-A readjustment and next-phase (Phase B+) hardening |

## Slice Plan (Decision-Complete)

### A0 - Baseline Gate Scaffold
- Owner: `Verification & Gates Owner`
- Depends on: none
- Implement:
  1. Wire gate jobs: `metadata-contract`, `import-boundary`, `manifest-smoke-baseline`, `host-composition-guard`, `route-negative-assertions`, `harness-matrix`, `observability-contract`.
  2. Wire deterministic static guard check command for forbidden legacy metadata keys across non-archival runtime/tooling/scaffold metadata surfaces (targeted pattern scan + tests).
- Primary paths:
  - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/package.json`
  - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/turbo.json`
  - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/apps/server/test`
- Acceptance:
  1. All gate jobs execute in CI.
  2. Static guard check command is runnable in CI.

### A1 - Metadata Runtime Contract Shift (D-013)
- Owner: `Plugin Lifecycle Owner`
- Depends on: `A0`
- Implement:
  1. Create shared parser contract module at `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/packages/hq/src/workspace/plugin-manifest-contract.ts`.
  2. Move runtime-key interpretation to shared parser and consume it from:
     - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/packages/hq/src/workspace/plugins.ts`
     - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/plugins/cli/plugins/src/lib/workspace-plugins.ts`
  3. Remove legacy key parsing/typing/output (`templateRole`, `channel`, `publishTier`, `published`) from active metadata contract paths and hard-fail if these keys are present.
  4. Replace legacy `templateRole`/`channel`-driven lifecycle selection with explicit rules keyed by `rawr.kind`, `rawr.capability`, discovery root, and manifest-owned exports; Channel A/Channel B remain command surfaces only and MUST NOT be encoded as runtime metadata semantics.
- Acceptance:
  1. `metadata-contract` fails on any active legacy key declaration, runtime use, or missing required `rawr.capability` in active plugin manifests.
  2. Both discovery implementations import the shared parser contract.
  3. No duplicate runtime metadata parser remains.

### A2 - Plugin Discovery Surface Expansion
- Owner: `Plugin Lifecycle Owner`
- Depends on: `A1`
- Implement:
  1. Expand discovery roots to include `plugins/api/*` and `plugins/workflows/*` in both workspace discovery paths.
  2. Preserve current behavior for existing roots (`plugins/cli/*`, `plugins/agents/*`, `plugins/web/*`).
- Primary paths:
  - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/packages/hq/src/workspace/plugins.ts`
  - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/plugins/cli/plugins/src/lib/workspace-plugins.ts`
- Acceptance:
  1. Tests include fixtures for API/workflow roots.
  2. Existing root behavior remains unchanged.

### A3 - Host Context Seam + Ingress Hardening
- Owner: `Runtime/Host Composition Owner`
- Depends on: `A0`
- Implement:
  1. Replace static process-level ORPC context with request-scoped context factory in `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/apps/server/src/orpc.ts`.
  2. Add explicit workflow boundary context factory module at `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/apps/server/src/workflows/context.ts`.
  3. Add ingress verification guard before runtime dispatch in `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/apps/server/src/rawr.ts`.
  4. Enforce mount order contract in host composition: `/api/inngest` -> `/api/workflows/*` -> `/rpc` + `/api/orpc/*`.
- Acceptance:
  1. `host-composition-guard` confirms mount order and request-scoped context usage.
  2. Unsigned ingress request tests fail as expected.

### A4 - Additive `/api/workflows/<capability>/*` Family
- Owner: `Runtime/Host Composition Owner`
- Depends on: `A2`, `A3`
- Implement:
  1. Add manifest authority file `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/rawr.hq.ts` as runtime composition source.
  2. Add workflow trigger contract/router composition in core ORPC layer under capability namespaces.
  3. Mount `/api/workflows/*` using manifest-owned trigger router (capability-first paths).
  4. Keep `/rpc` first-party/internal and `/api/orpc/*` published boundary behavior unchanged.
- Primary paths:
  - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/rawr.hq.ts`
  - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/apps/server/src/rawr.ts`
  - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/apps/server/src/orpc.ts`
  - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/packages/core/src/orpc`
- Acceptance:
  1. `manifest-smoke-completion` passes with all four families mounted: `/rpc`, `/api/orpc/*`, `/api/workflows/<capability>/*`, `/api/inngest`.
  2. No `/rpc/workflows` dedicated mount is introduced.
  3. Caller-path access to `/api/inngest` remains forbidden.

### A5 - D-015 Harness Matrix + Negative Assertions
- Owner: `Verification & Gates Owner`
- Depends on: `A3`, `A4`
- Implement:
  1. Add required suite IDs and enforce presence:
     - `suite:web:first-party-rpc`
     - `suite:web:published-openapi`
     - `suite:cli:in-process`
     - `suite:api:boundary`
     - `suite:workflow:trigger-status`
     - `suite:runtime:ingress`
     - `suite:cross-surface:metadata-import-boundary`
  2. Add mandatory negative-route assertions:
     - first-party and external callers reject `/api/inngest`
     - external callers reject `/rpc`
     - runtime-ingress suites do not assert caller-boundary semantics
     - in-process suites do not default to local HTTP self-calls
- Primary test paths:
  - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/apps/server/test/orpc-handlers.test.ts`
  - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/apps/server/test/orpc-openapi.test.ts`
  - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/apps/server/test/rawr.test.ts`
  - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/apps/server/test/route-boundary-matrix.test.ts`
- Acceptance:
  1. `harness-matrix` fails if any required suite ID is missing.
  2. `route-negative-assertions` is fully green.

### A6 - D-016 Seam Assertions + Legacy Metadata Hard-Delete Closure
- Owner: `Distribution/Lifecycle Contract Owner`
- Depends on: `A1`, `A5`
- Implement:
  1. Add alias/instance seam assertions in lifecycle-relevant tests.
  2. Add no-singleton-global negative assertions for runtime composition assumptions.
  3. Remove all remaining legacy metadata key handling from active parser/runtime/tooling paths (`templateRole`, `channel`, `publishTier`, `published`).
  4. Make instance-local workspace root the default lifecycle authority in canonical-root resolution paths; any global-owner fallback must be explicit and test-guarded.
- Primary paths:
  - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/apps/server/test`
  - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/packages/hq/src/workspace/plugins.ts`
  - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/plugins/cli/plugins/src/lib/workspace-plugins.ts`
  - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/packages/hq/src/install/state.ts`
  - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/plugins/cli/plugins/src/lib/install-state.ts`
  - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/plugins/cli/plugins/src/commands/plugins/web/enable.ts`
  - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/plugins/cli/plugins/src/commands/plugins/web/enable/all.ts`
  - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/plugins/cli/plugins/src/commands/plugins/cli/install/all.ts`
  - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/plugins/cli/plugins/src/commands/plugins/scaffold/web-plugin.ts`
- Acceptance:
  1. `metadata-contract` gate is green.
  2. Static legacy-metadata hard-delete guard check (pattern scan + tests) is green.
  3. Alias/instance and no-singleton assertions are green.
  4. No non-archival runtime/tooling/scaffold metadata surface declares or reads forbidden legacy keys.
  5. Canonical-root resolution assertions prove instance-local lifecycle isolation (no implicit singleton-global owner behavior).

### A7 - Full Review Pass (TypeScript + ORPC) + Fix Closure
- Owner: `Review Closure Owner`
- Depends on: `A6`
- Implement:
  1. Run a full review of all Phase A implementation changes from both TypeScript and ORPC design perspectives.
  2. Review agents are mandatory and must be grounded before review:
     - Introspect `/Users/mateicanavra/.codex-rawr/skills/typescript/SKILL.md`
     - Introspect `/Users/mateicanavra/.codex-rawr/skills/orpc/SKILL.md`
     - Read original packet sources and execution docs at minimum:
       - `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/docs/projects/orpc-ingest-workflows-spec/README.md`
       - `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/docs/projects/orpc-ingest-workflows-spec/ARCHITECTURE.md`
       - `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/docs/projects/orpc-ingest-workflows-spec/DECISIONS.md`
       - `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/docs/projects/orpc-ingest-workflows-spec/PHASE_A_EXECUTION_PACKET.md`
       - `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/docs/projects/orpc-ingest-workflows-spec/PHASE_A_IMPLEMENTATION_SPEC.md`
  3. Require review artifacts from each review agent:
     - review plan document
     - review scratchpad
     - severity-ranked review report with file/line evidence
  4. Fix findings discovered in review (dispatch fix agents or re-dispatch implementation agents).
  5. If reusing agents after large-topic switches, send `/compact` before assigning the new review/fix task.
  6. Re-run impacted gate/test suites after fixes.
- Acceptance:
  1. Review reports are complete, evidence-mapped, and severity-ranked.
  2. All blocking/high findings are fixed.
  3. Any deferred medium findings are explicitly accepted with owner, rationale, and target slice.
  4. Re-review of fixed areas is green.

### A8 - Guaranteed Docs + Cleanup Slice
- Owner: `Docs & Cleanup Owner`
- Depends on: `A7`
- Implement:
  1. Update canonical docs/runbooks impacted by Phase A implementation.
  2. Clean up no-longer-needed Phase A scratch/review artifacts once Phase A implementation is merged/landed:
     - archive if record value remains
     - delete if superseded/no longer useful
  3. Keep canonical packet docs, decisions, and runbooks as source of truth.
  4. Publish a short cleanup manifest listing archived/deleted paths.
- Acceptance:
  1. Canonical docs and relevant runbooks reflect Phase A landed reality.
  2. Scratch/review clutter for Phase A is removed or archived with explicit rationale.
  3. Cleanup manifest exists and is reviewer-readable.

### A9 - Post-Land Readjustment/Realignment (Phase B+ Prep)
- Owner: `Phase Sequencing Owner`
- Depends on: `A8`
- Implement:
  1. Run a look-ahead across remaining packet docs (`axes/*`, `DECISIONS.md`, `ARCHITECTURE.md`) for next-phase execution readiness.
  2. Tighten/harden remaining phase sequencing where Phase A outcomes changed assumptions.
  3. Update deferred register and decision notes only where needed to make Phase B planning decision-complete.
  4. Produce a concise “Phase B readiness” output with blockers (if any) and recommended first slices.
- Acceptance:
  1. Remaining spec is reconciled against landed Phase A behavior.
  2. Open questions are classified as blocking vs non-blocking for Phase B.
  3. Phase B kickoff recommendation is explicit (`ready` or `not-ready`) with reasons.

## Gate Contract (Concrete)
Required gates:
1. `metadata-contract`
2. `import-boundary`
3. `manifest-smoke-baseline` (`A0` only)
4. `host-composition-guard`
5. `route-negative-assertions`
6. `harness-matrix`
7. `observability-contract`
8. `manifest-smoke-completion` (Phase A exit)

Deterministic static guard check (completion/exit):
```sh
bun scripts/phase-a/check-forbidden-legacy-metadata-keys.mjs \
  /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/packages/hq/src/workspace/plugins.ts \
  /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/plugins/cli/plugins/src/lib/workspace-plugins.ts \
  /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/packages/hq/src/install/state.ts \
  /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/plugins/cli/plugins/src/lib/install-state.ts \
  /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/plugins/cli/plugins/src/commands/plugins/web/enable.ts \
  /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/plugins/cli/plugins/src/commands/plugins/web/enable/all.ts \
  /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/plugins/cli/plugins/src/commands/plugins/cli/install/all.ts \
  /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/plugins/cli/plugins/src/commands/plugins/scaffold/web-plugin.ts \
  /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/plugins/*/*/package.json \
  && bunx vitest run --project hq --project plugin-plugins --testNamePattern='forbidden legacy metadata keys'
```

Telemetry note (optional, non-blocking):
- Diagnostic telemetry for migration visibility is allowed but must not gate Phase A completion.

## Closure Checks (A7-A9)
1. `review-closure` (`A7`): full TypeScript + ORPC review artifacts complete, findings dispositioned, fixes merged, and targeted reruns green.
2. `docs-sync-cleanup` (`A8`): canonical docs/runbooks updated and cleanup manifest complete.
3. `phase-sequence-readjustment` (`A9`): remaining packet reconciled and Phase B kickoff posture explicit.

## Phase A Landing Criteria
1. All slices `A0`..`A8` complete in dependency order.
2. All required gates are green with no warning-only mode.
3. `manifest-smoke-completion` is green with zero pending families.
4. `metadata-contract` gate is green.
5. Static legacy-metadata hard-delete guard check (pattern scan + tests) is green.
6. Legacy metadata key handling and declarations are removed from non-archival runtime/tooling/scaffold metadata surfaces in `A6`.
7. No runtime behavior branches on legacy metadata fields.
8. Lifecycle command semantics are keyed by `rawr.kind` + `rawr.capability` + manifest/discovery rules (not `templateRole`/`channel` semantics).
9. `/api/workflows/<capability>/*` is active and route-policy-correct.
10. `A7` review findings are closed or explicitly accepted with owner/rationale.
11. `A8` canonical docs/runbooks and cleanup manifest are complete.

## Post-Landing Realignment Criteria
1. `A9` is complete and Phase B kickoff posture is explicit (`ready` or `not-ready`).
2. Any required Phase B preconditions are documented with owners and target order.

## Deferred Register (Centralized, Concise)
| Defer ID | Deferred Item | Why Deferred | Unblock Trigger | Target Phase | Owner |
| --- | --- | --- | --- | --- | --- |
| `DR-001` | D-016 UX/packaging product features | Not required for seam-now safety | Phase A completion + hard-delete conformance closure | Phase D | `@rawr-distribution-lifecycle` |
| `DR-002` | Cross-instance storage-backed lock redesign | Not required for Phase A contract convergence | Evidence of cross-instance duplication risk after `A6` | Phase C | `@rawr-runtime-host` |
| `DR-003` | Expanded telemetry beyond required gate diagnostics | Keep Phase A narrow and execution-focused | Post-Phase-A observability backlog intake | Phase C | `@rawr-verification-gates` |
| `DR-004` | Broad non-convergence refactors | Would dilute Phase A delivery focus | New scoped milestone approval after Phase A | Phase B | `@rawr-plugin-lifecycle` |
