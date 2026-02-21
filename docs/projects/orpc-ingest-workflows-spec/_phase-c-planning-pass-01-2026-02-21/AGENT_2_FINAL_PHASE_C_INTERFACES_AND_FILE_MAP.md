# AGENT 2 Final: Phase C Interfaces/Types + File-Level Map

## Scope + Drift Guard
This map is implementer-facing for Phase C slices `C1` to `C4`, plus `C5` review-input contract.

Locked constraints preserved in this plan:
1. No runtime semantics from legacy metadata.
2. No route-family drift (`/rpc`, `/api/orpc/*`, `/api/workflows/<capability>/*`, `/api/inngest`).
3. Minimal/additive interface change posture wherever possible.

Path note: the requested Phase B runtime worktree path is absent locally; grounding evidence was taken from equivalent files in `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-planning-packet`.

## Slice Delta Map

### C1: Cross-Instance Storage-Lock Redesign

#### Contract/type delta (minimal, additive)
1. Keep persisted `RepoState` wire shape unchanged (`version`, `plugins.enabled`, optional `plugins.disabled`, `plugins.lastUpdatedAt`) to avoid boundary API drift.
2. Add additive internal state-write contract in `@rawr/state`:
   - `RepoStateMutationOptions` (timeout/stale-lock/backoff knobs).
   - `RepoStateMutationResult` (post-write state + lock diagnostics for tests/doctoring).
   - `mutateRepoStateAtomically(...)` (single-writer helper used by `enablePlugin`/`disablePlugin`).
3. Keep `enablePlugin(repoRoot, pluginId)` and `disablePlugin(repoRoot, pluginId)` signatures unchanged for existing CLI/runtime callers.

#### Boundary impacts
1. `plugins web enable/disable/enable all` keep current call signatures and behavior contract, but gain lock-safe persistence under contention.
2. Runtime state readers (`getRepoState` in server/runtime router) remain unchanged.
3. Install-state authority semantics remain unchanged: workspace-local default, global-owner fallback explicit-only.

#### File-level blueprint (runtime implementation worktree targets)
1. `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-runtime-implementation/packages/state/src/repo-state.ts`
2. `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-runtime-implementation/packages/state/src/index.ts`
3. `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-runtime-implementation/packages/state/src/types.ts`
4. `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-runtime-implementation/packages/state/src/orpc/contract.ts` (schema-stability assertion only; no shape drift)
5. `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-runtime-implementation/packages/hq/src/install/state.ts` (no-default-behavior drift guard around canonical workspace source)
6. `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-runtime-implementation/plugins/cli/plugins/src/lib/install-state.ts` (re-export continuity only if new additive types are surfaced)

#### Test mapping
1. Add new contention tests: `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-runtime-implementation/packages/state/test/repo-state.concurrent.test.ts`.
2. Extend authority regression coverage:
   - `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-runtime-implementation/packages/hq/test/install-state.test.ts`
   - `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-runtime-implementation/plugins/cli/plugins/test/install-state.test.ts`
3. Command-level smoke (existing behavior, now lock-safe):
   - `plugins/cli/plugins/src/commands/plugins/web/enable.ts`
   - `plugins/cli/plugins/src/commands/plugins/web/disable.ts`
   - `plugins/cli/plugins/src/commands/plugins/web/enable/all.ts`

### C2: Telemetry/Diagnostics Expansion

#### Contract/type delta (minimal, additive)
1. Upgrade telemetry from optional scaffold to required gate contract.
2. Add additive typed exports in observability helper surface to stabilize callsites and tests:
   - exported `CreateDeskEventInput`
   - exported `TraceLinkOptions`
3. Keep route/caller contracts unchanged; telemetry changes stay in event/link payload and gate assertions.

#### Boundary impacts
1. `@rawr/coordination-inngest` and runtime-router continue consuming `createDeskEvent` + `defaultTraceLinks`; additive typing only.
2. Gate pipeline changes from optional telemetry no-op to mandatory failure on missing telemetry contract assertions.
3. No `/rpc` vs `/api/*` transport behavior changes.

#### File-level blueprint (runtime implementation worktree targets)
1. `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-runtime-implementation/packages/coordination-observability/src/events.ts`
2. `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-runtime-implementation/packages/coordination-observability/test/observability.test.ts`
3. `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-runtime-implementation/packages/coordination-inngest/src/adapter.ts` (only if telemetry helper input shape gains additive fields)
4. `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-runtime-implementation/packages/core/src/orpc/runtime-router.ts` (same conditional)
5. `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-runtime-implementation/scripts/phase-a/verify-gate-scaffold.mjs`
6. `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-runtime-implementation/apps/server/test/phase-a-gates.test.ts`
7. `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-runtime-implementation/package.json`

#### Test mapping
1. Strengthen observability unit assertions in `packages/coordination-observability/test/observability.test.ts`.
2. Harden server gate scaffold assertions in `apps/server/test/phase-a-gates.test.ts`.
3. Ensure gate chain includes required telemetry contract in `package.json` scripts (`phase-a:gates:*`).

### C3: Distribution/Lifecycle Mechanics (D-016 deferred mechanics)

#### Contract/type delta (minimal, additive)
1. Keep existing default authority contract: local workspace root by default; global owner path only when explicitly enabled.
2. Expand doctor payload additively (no removals) to make alias/instance seam explicit in diagnostics:
   - owner-file path status
   - owner-resolved workspace path and realpath match status
3. Keep command surfaces as command surfaces only (`rawr plugins ...`, `rawr plugins web ...`), not runtime metadata semantics.

#### Boundary impacts
1. `rawr doctor global --json` remains machine-readable and backward-compatible (`recommendedMode: "bun-symlink"` retained).
2. Activation/install scripts remain deterministic and instance-aware through owner-file + symlink checks.
3. No changes to route-family or runtime ingress semantics.

#### File-level blueprint (runtime implementation worktree targets)
1. `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-runtime-implementation/scripts/dev/install-global-rawr.sh`
2. `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-runtime-implementation/scripts/dev/activate-global-rawr.sh`
3. `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-runtime-implementation/apps/cli/src/commands/doctor/global.ts`
4. `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-runtime-implementation/apps/cli/test/doctor-global.test.ts`
5. `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-runtime-implementation/packages/hq/src/install/state.ts` (if C3 aligns owner diagnostics with install-state reporting)

#### Test mapping
1. Extend JSON contract assertions in `apps/cli/test/doctor-global.test.ts` for additive owner/instance diagnostics.
2. Add script-level integration checks for install/activate scripts (new test file under app/script test harness as available).
3. Re-run install-state tests to ensure owner-fallback semantics remain explicit-only.

### C4: Conditional Decision Tightening (D-009 / D-010)

#### Contract/type delta
1. Default path: no interface/type changes (C4 skipped).
2. Triggered path only:
   - If C1-C3 introduce heavy middleware dedupe ambiguity, tighten D-009 from guidance to explicit required contract.
   - If C2 introduces finished-hook side effects, tighten D-010 to explicit idempotent/non-critical contract.

#### Boundary impacts
1. Only affects middleware/lifecycle guardrails when trigger criteria are met.
2. Must remain additive to locked D-005..D-016 route/ownership/caller contracts.

#### File-level blueprint (triggered-only targets)
1. `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-runtime-implementation/docs/projects/orpc-ingest-workflows-spec/DECISIONS.md`
2. `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-runtime-implementation/packages/core/src/orpc/runtime-router.ts` (if dedupe marker contract is codified)
3. `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-runtime-implementation/packages/coordination-inngest/src/adapter.ts` (if finished-hook guardrails become explicit runtime contract)
4. Matching tests in server/runtime suites for whichever guardrail is tightened.

#### Test mapping
1. Add explicit trigger tests only if C4 executes.
2. If C4 does not execute, record defer disposition in C7 readiness artifact.

## C5 Inputs (Review + Fix Closure Input Contract)
C5 reviewer package should require these exact inputs from C1-C4 completion:
1. Interface/type delta manifest by slice (additive/breaking classification + public/exported symbol list).
2. File diff manifest by slice (target path, owner, reason, linked test).
3. Gate evidence bundle:
   - `phase-a:gates:completion`
   - `phase-a:gates:exit`
   - any new C2/C3 gate commands
4. Route-family non-drift evidence (negative assertions unchanged and passing).
5. Legacy metadata non-regression evidence (no reintroduction of forbidden keys in active runtime/tooling/scaffold metadata).
6. Trigger disposition record for C4 (executed vs deferred + rationale).

## Skills Introspected
1. `/Users/mateicanavra/.codex-rawr/skills/solution-design/SKILL.md`
2. `/Users/mateicanavra/.codex-rawr/skills/system-design/SKILL.md`
3. `/Users/mateicanavra/.codex-rawr/skills/domain-design/SKILL.md`
4. `/Users/mateicanavra/.codex-rawr/skills/api-design/SKILL.md`
5. `/Users/mateicanavra/.codex-rawr/skills/typescript/SKILL.md`
6. `/Users/mateicanavra/.codex-rawr/skills/orpc/SKILL.md`
7. `/Users/mateicanavra/.codex-rawr/skills/inngest/SKILL.md`

## Evidence Map
1. Locked route/caller/metadata invariants: `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-planning-packet/docs/projects/orpc-ingest-workflows-spec/ARCHITECTURE.md:36`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-planning-packet/docs/projects/orpc-ingest-workflows-spec/ARCHITECTURE.md:66`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-planning-packet/docs/projects/orpc-ingest-workflows-spec/ARCHITECTURE.md:97`.
2. Legacy metadata hard-delete lock + downstream gate obligations: `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-planning-packet/docs/projects/orpc-ingest-workflows-spec/DECISIONS.md:87`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-planning-packet/docs/projects/orpc-ingest-workflows-spec/DECISIONS.md:95`.
3. D-009/D-010 open status (C4 conditional basis): `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-planning-packet/docs/projects/orpc-ingest-workflows-spec/DECISIONS.md:190`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-planning-packet/docs/projects/orpc-ingest-workflows-spec/DECISIONS.md:202`.
4. C-slice order and priorities: `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-planning-packet/docs/projects/orpc-ingest-workflows-spec/_phase-b-runtime-execution-pass-01-2026-02-20/B6_PHASE_C_READINESS.md:31`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-planning-packet/docs/projects/orpc-ingest-workflows-spec/_phase-b-runtime-execution-pass-01-2026-02-20/B6_PHASE_C_READINESS.md:38`.
5. C5 review-input requirement and stageing model: `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-planning-packet/docs/projects/orpc-ingest-workflows-spec/_phase-c-planning-pass-01-2026-02-21/ORCHESTRATOR_PLAN_VERBATIM.md:169`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-planning-packet/docs/projects/orpc-ingest-workflows-spec/_phase-c-planning-pass-01-2026-02-21/ORCHESTRATOR_PLAN_VERBATIM.md:171`.
6. C1 primary target set and acceptance intent: `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-planning-packet/docs/projects/orpc-ingest-workflows-spec/_phase-c-planning-pass-01-2026-02-21/ORCHESTRATOR_PLAN_VERBATIM.md:123`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-planning-packet/docs/projects/orpc-ingest-workflows-spec/_phase-c-planning-pass-01-2026-02-21/ORCHESTRATOR_PLAN_VERBATIM.md:131`.
7. C2 primary target set and acceptance intent: `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-planning-packet/docs/projects/orpc-ingest-workflows-spec/_phase-c-planning-pass-01-2026-02-21/ORCHESTRATOR_PLAN_VERBATIM.md:136`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-planning-packet/docs/projects/orpc-ingest-workflows-spec/_phase-c-planning-pass-01-2026-02-21/ORCHESTRATOR_PLAN_VERBATIM.md:143`.
8. C3 primary target set and acceptance intent: `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-planning-packet/docs/projects/orpc-ingest-workflows-spec/_phase-c-planning-pass-01-2026-02-21/ORCHESTRATOR_PLAN_VERBATIM.md:148`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-planning-packet/docs/projects/orpc-ingest-workflows-spec/_phase-c-planning-pass-01-2026-02-21/ORCHESTRATOR_PLAN_VERBATIM.md:156`.
9. C4 conditional trigger criteria: `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-planning-packet/docs/projects/orpc-ingest-workflows-spec/_phase-c-planning-pass-01-2026-02-21/ORCHESTRATOR_PLAN_VERBATIM.md:160`.
10. Current repo-state read-modify-write (no lock): `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-planning-packet/packages/state/src/repo-state.ts:16`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-planning-packet/packages/state/src/repo-state.ts:29`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-planning-packet/packages/state/src/repo-state.ts:35`.
11. Current RepoState contract + exported state surface: `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-planning-packet/packages/state/src/types.ts:1`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-planning-packet/packages/state/src/index.ts:1`.
12. State route schema depends on current RepoState shape: `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-planning-packet/packages/state/src/orpc/contract.ts:8`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-planning-packet/packages/state/src/orpc/contract.ts:25`.
13. Repo-state callsites in plugin runtime commands: `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-planning-packet/plugins/cli/plugins/src/commands/plugins/web/enable.ts:4`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-planning-packet/plugins/cli/plugins/src/commands/plugins/web/disable.ts:3`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-planning-packet/plugins/cli/plugins/src/commands/plugins/web/status.ts:2`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-planning-packet/plugins/cli/plugins/src/commands/plugins/web/enable/all.ts:7`.
14. Install-state canonical workspace source semantics: `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-planning-packet/packages/hq/src/install/state.ts:120`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-planning-packet/packages/hq/src/install/state.ts:127`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-planning-packet/packages/hq/src/install/state.ts:229`.
15. Install-state report/type surface + plugin re-export boundary: `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-planning-packet/packages/hq/src/install/state.ts:49`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-planning-packet/plugins/cli/plugins/src/lib/install-state.ts:1`.
16. Install-state regression coverage (hq + plugin): `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-planning-packet/packages/hq/test/install-state.test.ts:80`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-planning-packet/plugins/cli/plugins/test/install-state.test.ts:80`.
17. Current telemetry event/link helper contract: `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-planning-packet/packages/coordination-observability/src/events.ts:8`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-planning-packet/packages/coordination-observability/src/events.ts:30`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-planning-packet/packages/coordination-observability/src/events.ts:54`.
18. Observability helper callsites in durable/runtime flow: `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-planning-packet/packages/coordination-inngest/src/adapter.ts:123`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-planning-packet/packages/coordination-inngest/src/adapter.ts:157`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-planning-packet/packages/core/src/orpc/runtime-router.ts:154`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-planning-packet/packages/core/src/orpc/runtime-router.ts:202`.
19. Telemetry gate currently optional scaffold/no-op: `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-planning-packet/scripts/phase-a/verify-gate-scaffold.mjs:255`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-planning-packet/package.json:41`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-planning-packet/package.json:42`.
20. Existing observability gate fixture coverage: `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-planning-packet/apps/server/test/phase-a-gates.test.ts:159`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-planning-packet/packages/coordination-observability/test/observability.test.ts:4`.
21. Distribution lifecycle and no-singleton/alias seam policy lock: `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-planning-packet/docs/projects/orpc-ingest-workflows-spec/axes/13-distribution-and-instance-lifecycle-model.md:31`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-planning-packet/docs/projects/orpc-ingest-workflows-spec/axes/13-distribution-and-instance-lifecycle-model.md:33`.
22. Global install/activation and doctor interfaces: `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-planning-packet/scripts/dev/install-global-rawr.sh:11`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-planning-packet/scripts/dev/activate-global-rawr.sh:5`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-planning-packet/apps/cli/src/commands/doctor/global.ts:8`, `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-planning-packet/apps/cli/test/doctor-global.test.ts:6`.

## Assumptions
1. The Phase C implementation worktree path (`/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-c-runtime-implementation`) will exist at execution time; this map targets that path namespace for edits.
2. C1 lock redesign is expected to be internal to `@rawr/state` and does not require persisted `RepoState` shape changes.
3. C2 telemetry expansion is allowed to tighten gates and add additive helper typing without changing route-family or publication boundaries.
4. C3 mechanics are expected to remain tooling/doctor/script scope, not runtime-routing scope.
5. C4 remains skip-by-default unless C1-C3 materially trigger D-009/D-010 tightening conditions.

## Risks
1. Introducing persisted-state shape changes in C1 would ripple into ORPC state schemas and multiple callers; avoid unless explicitly authorized.
2. Hardening telemetry gates in C2 can fail CI immediately if assertions are under-specified; add tests and gate updates atomically.
3. C3 doctor payload expansion can break strict downstream JSON consumers if fields are renamed or removed; additive-only is required.
4. Duplicate install-state logic exists in both package and plugin layers; partial edits risk contract skew.
5. If C4 is triggered late, decision + runtime changes may collide with C5 review window and expand closure scope.

## Unresolved Questions
1. Should C1 expose lock diagnostics in public `@rawr/state` exports, or keep diagnostics internal/test-only to minimize API surface growth?
2. For C2, is telemetry expansion limited to gate hardening + helper typing, or should `DeskRunEventV1`/`RunStatusV1` gain additive telemetry fields in Phase C?
3. For C3, should owner/instance diagnostics also be surfaced through `assessInstallState` report shape, or remain confined to `doctor global` output?
4. C4 trigger threshold: what exact measurable condition escalates D-009/D-010 from open guidance to locked policy during this phase?
