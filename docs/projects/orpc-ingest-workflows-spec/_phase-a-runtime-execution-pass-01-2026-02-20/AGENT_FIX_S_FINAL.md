# AGENT_FIX_S Final Report

## Scope
Implemented fixes for A7 findings 1,2,3,4 in owned scope:
- `/rpc` caller boundary enforcement.
- `/rpc` unlabeled-request default-deny enforcement.
- deterministic invalid-signature ingress rejection before dispatch.
- manifest-owned composition seams consumed by host.
- strengthened negative route assertions and manifest completion gate checks.

## Skills Introspected
- `/Users/mateicanavra/.codex-rawr/skills/typescript/SKILL.md`
- `/Users/mateicanavra/.codex-rawr/skills/orpc/SKILL.md`
- `/Users/mateicanavra/.codex-rawr/skills/inngest/SKILL.md`
- `/Users/mateicanavra/.codex-rawr/skills/system-design/SKILL.md`
- `/Users/mateicanavra/.codex-rawr/skills/api-design/SKILL.md`

## Evidence Map

### A) `/rpc` first-party/internal-only external denial
- Added `/rpc` caller-surface allow/deny policy and explicit 403 guard.
- Follow-up blocker closure: unlabeled requests are now denied by default (no caller surface => deny):
  - `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-a-runtime-implementation/apps/server/src/orpc.ts#L45`
  - `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-a-runtime-implementation/apps/server/src/orpc.ts#L92`
  - `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-a-runtime-implementation/apps/server/src/orpc.ts#L360`
  - `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-a-runtime-implementation/apps/server/src/orpc.ts#L374`

### B) Deterministic `/api/inngest` invalid-signature rejection pre-dispatch
- Replaced presence-only checks with cryptographic signature validation (HMAC SHA-256 + timestamp freshness) and constant-time compare:
  - `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-a-runtime-implementation/apps/server/src/rawr.ts#L20`
  - `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-a-runtime-implementation/apps/server/src/rawr.ts#L51`
  - `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-a-runtime-implementation/apps/server/src/rawr.ts#L109`
- Guard now rejects before `inngestHandler` dispatch:
  - `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-a-runtime-implementation/apps/server/src/rawr.ts#L227`

### C) Manifest-authority composition seam alignment (A4 intent)
- `rawr.hq.ts` now declares manifest-owned composition seams:
  - `orpc.router`
  - `workflows.triggerRouter`
  - `inngest.bundleFactory`
  - `inngest.serveHandlerFactory`
  - `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-a-runtime-implementation/rawr.hq.ts#L12`
- Host now consumes manifest seams instead of ad-hoc local composition calls:
  - `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-a-runtime-implementation/apps/server/src/rawr.ts#L217`
  - `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-a-runtime-implementation/apps/server/src/rawr.ts#L225`
  - `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-a-runtime-implementation/apps/server/src/rawr.ts#L258`
- `registerOrpcRoutes` accepts manifest-provided router seam:
  - `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-a-runtime-implementation/apps/server/src/orpc.ts#L49`
  - `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-a-runtime-implementation/apps/server/src/orpc.ts#L344`

### D) Route-negative assertion hardening
- External `/rpc` case is now explicit POST with valid RPC payload and exact `403`:
  - `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-a-runtime-implementation/apps/server/test/route-boundary-matrix.test.ts#L157`
- Added explicit unlabeled external-style RPC POST deny assertion (`403`):
  - `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-a-runtime-implementation/apps/server/test/route-boundary-matrix.test.ts#L173`
- Added ingress invalid-signature negative assertion in matrix:
  - `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-a-runtime-implementation/apps/server/test/route-boundary-matrix.test.ts#L206`
- Matrix metadata assertion now requires exact external `/rpc` deny status:
  - `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-a-runtime-implementation/apps/server/test/route-boundary-matrix.test.ts#L292`
- Added host-level invalid-signature test:
  - `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-a-runtime-implementation/apps/server/test/rawr.test.ts#L65`
- Preserved first-party/internal RPC-positive tests via explicit first-party caller surface header:
  - `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-a-runtime-implementation/apps/server/test/rawr.test.ts#L15`
  - `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-a-runtime-implementation/apps/server/test/rawr.test.ts#L127`

### E) Manifest smoke completion gate strengthened for seam ownership
- Completion checks now assert manifest seam declaration + host seam consumption + no ad-hoc composition calls:
  - `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-a-runtime-implementation/scripts/phase-a/manifest-smoke.mjs#L36`
  - `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-a-runtime-implementation/scripts/phase-a/manifest-smoke.mjs#L54`
  - `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-a-runtime-implementation/scripts/phase-a/manifest-smoke.mjs#L68`

## Commands / Results
1. `bunx vitest run --project server apps/server/test/route-boundary-matrix.test.ts apps/server/test/rawr.test.ts`
- First run: failed due root-manifest import resolution (`@rawr/coordination-inngest` unresolved in `rawr.hq.ts`).
- After import-path correction: pass (`17/17`).
- Follow-up strict-default-deny update:
  - initial run failed because internal RPC tests were unlabeled (`403`), then fixed by explicit first-party caller surface in `rawr.test.ts`.
  - rerun passed (`17/17`).

2. `bun run phase-a:gate:manifest-smoke-completion`
- pass.

3. `bun run phase-a:gate:route-negative-assertions`
- pass.

4. `bun run phase-a:gate:harness-matrix`
- pass.

5. Targeted deterministic-denial verification:
- `bunx vitest run --project server apps/server/test/route-boundary-matrix.test.ts apps/server/test/rawr.test.ts --testNamePattern='executes HTTP route boundary cases|host-composition-guard: rejects invalid ingress signatures before runtime dispatch'`
- pass.

## Assumptions
- Phase A wants deterministic external-deny semantics for explicitly external caller contexts on `/rpc` (via caller-surface signal) with exact forbidden status.
- Ingress signature canonicalization for this slice is body-string + timestamp HMAC SHA-256 using `INNGEST_SIGNING_KEY` (and optional fallback key), consistent with current SDK behavior.
- Manifest-authority closure for this phase can be satisfied via manifest-owned composition seams consumed by host runtime, without introducing generated artifact pipelines.

## Risks
- `/rpc` now requires explicit allowed caller-surface labeling; internal callers that do not set caller surface will be denied until they are updated.
- Manifest currently composes both `orpc.router` and `workflows.triggerRouter` from the same base router factory; capability-specialized split routers may be needed in later slices.
- Signature freshness window is fixed at 5 minutes; if clock-skew policy changes, this verifier needs synchronized adjustment.

## Unresolved Questions
1. Should `/rpc` keep header-based first-party trust as the long-term mechanism, or move to session/service-auth-derived caller classification?
2. Should ingress verifier support configurable skew window and explicit future-timestamp rejection policy?
3. Should `rawr.hq.ts` eventually consume generated capability routers instead of root-local composition references when plugin generation is introduced?
