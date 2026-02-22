# Agent Q1 Final TypeScript/API Review

Date: 2026-02-21
Reviewer: Quality Agent Q1 (TypeScript/API/SDK-design)
Branch: `codex/phase-a-a6-hard-delete`
Worktree: `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-a-runtime-implementation`

## Scope and Method
- Grounding docs read:
  - `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/docs/projects/orpc-ingest-workflows-spec/README.md`
  - `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/docs/projects/orpc-ingest-workflows-spec/ARCHITECTURE.md`
  - `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/docs/projects/orpc-ingest-workflows-spec/DECISIONS.md`
  - `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/docs/projects/orpc-ingest-workflows-spec/PHASE_A_EXECUTION_PACKET.md`
  - `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/docs/projects/orpc-ingest-workflows-spec/PHASE_A_IMPLEMENTATION_SPEC.md`
- Required implementation files reviewed:
  - `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-a-runtime-implementation/apps/server/src/orpc.ts`
  - `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-a-runtime-implementation/apps/server/src/rawr.ts`
  - `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-a-runtime-implementation/apps/server/src/workflows/context.ts`
  - `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-a-runtime-implementation/rawr.hq.ts`
  - `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-a-runtime-implementation/packages/hq/src/workspace/plugin-manifest-contract.ts`
  - `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-a-runtime-implementation/packages/hq/src/workspace/plugins.ts`
  - `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-a-runtime-implementation/plugins/cli/plugins/src/lib/workspace-plugins.ts`
- Targeted verification run:
  - `bunx vitest run apps/server/test/orpc-handlers.test.ts apps/server/test/orpc-openapi.test.ts apps/server/test/rawr.test.ts apps/server/test/route-boundary-matrix.test.ts packages/hq/test/plugin-manifest-contract.test.ts plugins/cli/plugins/test/workspace-plugins-discovery.test.ts`
  - Result: 5 files pass; `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-a-runtime-implementation/apps/server/test/orpc-handlers.test.ts` fails 2 tests due RPC caller-surface gate mismatch.

## No-op Check
- No-op is **not** appropriate. There are meaningful seam and contract-shape refactors needed for robust continuation into later phases.

## Severity-Ranked Findings

### 1. HIGH: Workflow boundary seam is structurally collapsed into the general ORPC router
- Evidence:
  - `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-a-runtime-implementation/rawr.hq.ts:9`
  - `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-a-runtime-implementation/rawr.hq.ts:10`
  - `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-a-runtime-implementation/rawr.hq.ts:22`
  - `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-a-runtime-implementation/apps/server/src/rawr.ts:225`
  - Spec lock requiring plugin-owned workflow/API boundaries: `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/docs/projects/orpc-ingest-workflows-spec/ARCHITECTURE.md:35`
  - Same lock in decisions register: `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/docs/projects/orpc-ingest-workflows-spec/DECISIONS.md:25`
- Why it matters:
  - `workflows.triggerRouter` is currently just another `createOrpcRouter()` instance. That keeps phase velocity, but weakens the intended ownership seam and makes later workflow-specific policy/auth/schema evolution harder.
- Recommendation:
  - Payoff: Clear ORPC/API vs workflow contract boundaries, easier future plugin ownership migration, lower accidental coupling.
  - Risk: Medium; requires moving router composition seam and updating tests/manifest smoke expectations.
  - Scope: Medium.
  - Timing: **Phase A now** (A7 fix closure), because this is a foundational seam.
- File-level proposal with anchors:
  - Replace workflow router construction in `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-a-runtime-implementation/rawr.hq.ts:10` with a dedicated workflow trigger router factory.
  - Keep `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-a-runtime-implementation/rawr.hq.ts:9` for `/rpc` + `/api/orpc/*` only.
  - Keep host mount callsite in `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-a-runtime-implementation/apps/server/src/rawr.ts:225`, but feed it dedicated workflow boundary router input.

### 2. HIGH: `/rpc` access policy relies on caller self-attestation via header
- Evidence:
  - Header policy constants: `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-a-runtime-implementation/apps/server/src/orpc.ts:45`
  - Header allow/deny lists: `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-a-runtime-implementation/apps/server/src/orpc.ts:46`
  - Gate logic: `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-a-runtime-implementation/apps/server/src/orpc.ts:92`
  - Enforcement at route mounts: `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-a-runtime-implementation/apps/server/src/orpc.ts:359`
  - Spec auth expectation for first-party/internal boundary: `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/docs/projects/orpc-ingest-workflows-spec/ARCHITECTURE.md:54`
- Why it matters:
  - This is policy-by-untrusted-header. It enforces route intent in tests, but is not a robust boundary control seam for production evolution.
- Recommendation:
  - Payoff: Stronger API boundary contract and clearer future auth integration point.
  - Risk: Medium; may require wiring request principal/session context into ORPC registration.
  - Scope: Medium.
  - Timing: **Phase A now** for seam shape, even if auth implementation remains simple.
- File-level proposal with anchors:
  - Replace `isRpcRequestAllowed` decision source at `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-a-runtime-implementation/apps/server/src/orpc.ts:92` with an injected `rpcAccessPolicy(request, context)` option.
  - Add policy wiring in `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-a-runtime-implementation/apps/server/src/rawr.ts:258` to keep host-owned control-plane semantics.
  - Keep header support only as a test/dev fallback path, not sole trust basis.

### 3. MEDIUM: Boundary contract is inconsistent across test surfaces
- Evidence:
  - Outdated expectation allowing unlabeled RPC call: `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-a-runtime-implementation/apps/server/test/orpc-handlers.test.ts:24`
  - Failing assertion expecting 200: `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-a-runtime-implementation/apps/server/test/orpc-handlers.test.ts:28`
  - Matrix suite explicitly denying unlabeled/external RPC: `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-a-runtime-implementation/apps/server/test/route-boundary-matrix.test.ts:179`
- Why it matters:
  - Two tests define different API contracts for the same surface. That creates drift pressure and weakens A5/A7 gate signal quality.
- Recommendation:
  - Payoff: Single source of truth for caller-mode behavior and stronger regression signal.
  - Risk: Low.
  - Scope: Small.
  - Timing: **Phase A now**.
- File-level proposal with anchors:
  - Update RPC requests in `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-a-runtime-implementation/apps/server/test/orpc-handlers.test.ts:22` and `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-a-runtime-implementation/apps/server/test/orpc-handlers.test.ts:41` to use first-party caller headers.
  - Optionally centralize first-party header fixture from `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-a-runtime-implementation/apps/server/test/rawr.test.ts:15` into shared test helper.

### 4. MEDIUM: Workspace discovery implementation remains duplicated across package and CLI surfaces
- Evidence:
  - HQ discovery implementation: `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-a-runtime-implementation/packages/hq/src/workspace/plugins.ts:44`
  - CLI discovery implementation: `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-a-runtime-implementation/plugins/cli/plugins/src/lib/workspace-plugins.ts:48`
  - Both now share parser only: `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-a-runtime-implementation/packages/hq/src/workspace/plugin-manifest-contract.ts:81`
- Why it matters:
  - The duplicate traversal/root-resolution logic is effectively forked code. Future root/category or lifecycle changes can drift despite shared parser contract.
- Recommendation:
  - Payoff: Lower drift risk and simpler future metadata/discovery changes.
  - Risk: Low to medium (module ownership and import-path cleanups).
  - Scope: Medium.
  - Timing: **Defer to Phase B** unless A7 already touches discovery logic.
- File-level proposal with anchors:
  - Promote `findWorkspaceRoot` and `listWorkspacePlugins` in `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-a-runtime-implementation/packages/hq/src/workspace/plugins.ts:44` and `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-a-runtime-implementation/packages/hq/src/workspace/plugins.ts:107` as canonical.
  - Replace duplicated internals in `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-a-runtime-implementation/plugins/cli/plugins/src/lib/workspace-plugins.ts:48` with thin wrappers to HQ exports.

### 5. LOW: Workflow capability routing uses first-match prefix logic without explicit specificity ordering
- Evidence:
  - Capability map creation: `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-a-runtime-implementation/apps/server/src/rawr.ts:23`
  - First-match resolve loop: `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-a-runtime-implementation/apps/server/src/rawr.ts:138`
- Why it matters:
  - Overlapping prefixes (for example `/coord` and `/coordination`) could resolve to the wrong capability depending on object iteration order.
- Recommendation:
  - Payoff: Deterministic capability routing under growth.
  - Risk: Low.
  - Scope: Small.
  - Timing: **Defer** unless additional capabilities are added in current stack.
- File-level proposal with anchors:
  - Sort entries by descending prefix length when building `WORKFLOW_CAPABILITY_PATHS` at `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-a-runtime-implementation/apps/server/src/rawr.ts:23`.
  - Add overlap detection assertion in test/gate path rooted at `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-a-runtime-implementation/apps/server/test/route-boundary-matrix.test.ts:279`.

## Skills Introspected
- `/Users/mateicanavra/.codex-rawr/skills/typescript/SKILL.md`
- `/Users/mateicanavra/.codex-rawr/skills/api-design/SKILL.md`
- `/Users/mateicanavra/.codex-rawr/skills/orpc/SKILL.md`
- `/Users/mateicanavra/.codex-rawr/skills/solution-design/SKILL.md`
- `/Users/mateicanavra/.codex-rawr/skills/system-design/SKILL.md`

## Evidence Map
| Finding | Policy Evidence | Implementation Evidence | Verification Evidence |
| --- | --- | --- | --- |
| F1 collapsed workflow seam | `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/docs/projects/orpc-ingest-workflows-spec/ARCHITECTURE.md:35` | `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-a-runtime-implementation/rawr.hq.ts:9` | `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-a-runtime-implementation/apps/server/test/rawr.test.ts:108` |
| F2 header-trust RPC gating | `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/docs/projects/orpc-ingest-workflows-spec/ARCHITECTURE.md:54` | `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-a-runtime-implementation/apps/server/src/orpc.ts:92` | `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-a-runtime-implementation/apps/server/test/route-boundary-matrix.test.ts:179` |
| F3 test contract drift | `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/docs/projects/orpc-ingest-workflows-spec/PHASE_A_IMPLEMENTATION_SPEC.md:347` | `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-a-runtime-implementation/apps/server/test/orpc-handlers.test.ts:28` | Failing run in this pass (`orpc-handlers.test.ts`) |
| F4 discovery duplication | `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/docs/projects/orpc-ingest-workflows-spec/PHASE_A_EXECUTION_PACKET.md:23` | `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-a-runtime-implementation/packages/hq/src/workspace/plugins.ts:44` | `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-a-runtime-implementation/apps/server/test/route-boundary-matrix.test.ts:257` |
| F5 prefix ambiguity | `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-orpc-inngest-autonomy-assessment/docs/projects/orpc-ingest-workflows-spec/PHASE_A_IMPLEMENTATION_SPEC.md:304` | `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-a-runtime-implementation/apps/server/src/rawr.ts:138` | No failing test yet (latent risk) |

## Assumptions
- Phase A remains allowed to adjust seam shape while preserving locked decisions D-013/D-015/D-016.
- Current caller-surface header behavior is intended as a temporary policy gate, not final security architecture.
- Plugin-owned workflow/API contract migration is still expected and not intentionally abandoned.

## Risks
- If F1 is deferred too long, Phase B+ work will likely add behavior to the wrong layer and increase migration cost.
- If F2 remains header-trust only, `/rpc` policy can be bypassed in deployments where route-level network segregation is weak.
- If F3 remains unresolved, gate signal quality degrades and regressions can land under contradictory tests.
- If F4 remains duplicated, discovery behavior may drift between CLI and HQ package in later metadata/lifecycle changes.

## Unresolved Questions
1. Is `/api/workflows/<capability>/*` intended to expose only trigger/status operations now, or a broader mirrored subset of coordination procedures in Phase A?
2. Should `/rpc` authorization be enforced by host auth/session context in Phase A, or is a transport-level policy shim explicitly accepted until a later slice?
3. Is plugin-owned workflow/API contract movement expected in A7 fixes, or explicitly deferred to a named Phase B slice?
