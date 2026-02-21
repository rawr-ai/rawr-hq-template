# AGENT 4 REVIEW REPORT

## Review Metadata
- Reviewer: Agent 4 (B4 independent review)
- Branch: `codex/phase-b-b4-review-closure`
- Worktree: `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-b-runtime-implementation`
- Scope: Landed Phase B slices `B0..B3` (TypeScript + oRPC perspectives)
- Code edits: none (per instruction)

## Disposition
`not_ready`

Rationale: one unresolved high-severity auth hardening gap remains in B0; `/rpc` authorization can be satisfied from spoofable request headers/cookie signals.

## Findings (Severity Ranked)

### HIGH-01: `/rpc` caller classification still trusts spoofable request evidence
- Anchors:
  - `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-b-runtime-implementation/apps/server/src/auth/rpc-auth.ts:77`
  - `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-b-runtime-implementation/apps/server/src/auth/rpc-auth.ts:83`
  - `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-b-runtime-implementation/apps/server/src/auth/rpc-auth.ts:158`
  - `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-b-runtime-implementation/apps/server/src/auth/rpc-auth.ts:185`
  - `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-b-runtime-implementation/apps/server/src/orpc.ts:94`
- Why it matters:
  - `first-party`/`internal` allow-paths are derived from client-controlled headers and cookie/authorization heuristics (`x-rawr-session-auth`, `x-rawr-service-auth`, `cookie`, `authorization`, `user-agent`) instead of server-verified auth context.
  - This preserves a spoof vector: a caller can send `x-rawr-caller-surface: first-party` plus synthetic auth evidence and receive `200` on `/rpc` routes.
  - This violates the intended hardening goal of moving away from header-only trust to host/session/service-derived classification.
- Concrete fix recommendation:
  1. Move `/rpc` auth classification to server-owned evidence only (trusted middleware/context output), not raw request headers/cookie presence.
  2. Remove heuristic trust signals (`hasSessionCookie`, `hasServiceAuthorization`, `hasCliUserAgent`) from allow decisions.
  3. Pass a verified `rpcAuth` object from host context into the classifier and require explicit verified booleans.
  4. Add regression tests that assert forged first-party/internal headers do **not** authorize `/rpc`.

### MEDIUM-01: B3 acceptance contract drift for adapter-shim anti-regression checks
- Anchors:
  - `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-b-runtime-implementation/docs/projects/orpc-ingest-workflows-spec/PHASE_B_EXECUTION_PACKET.md:110`
  - `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-b-runtime-implementation/docs/projects/orpc-ingest-workflows-spec/PHASE_B_ACCEPTANCE_GATES.md:71`
  - `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-b-runtime-implementation/package.json:42`
- Why it matters:
  - B3 spec/gate docs require dedicated adapter-shim tests at `packages/hq/test/adapter-shim-ownership.test.ts` and `plugins/cli/plugins/test/adapter-shim-ownership.test.ts`, but these files are absent and the scripted gate chain does not execute them.
  - This creates acceptance ambiguity: documented B3 outcomes can appear complete while one declared anti-regression mechanism is missing.
- Concrete fix recommendation:
  1. Either add the two adapter-shim ownership tests and wire them into `phase-a:gates:exit`,
  2. Or explicitly update B3 docs/gates to the currently implemented structural checks as the canonical replacement, then re-baseline acceptance language.

## Skills Introspected
- `/Users/mateicanavra/.codex-rawr/skills/typescript/SKILL.md`
- `/Users/mateicanavra/.codex-rawr/skills/orpc/SKILL.md`
- `/Users/mateicanavra/.codex-rawr/skills/solution-design/SKILL.md`
- `/Users/mateicanavra/.codex-rawr/skills/system-design/SKILL.md`
- `/Users/mateicanavra/.codex-rawr/skills/api-design/SKILL.md`
- `/Users/mateicanavra/.codex-rawr/prompts/dev-spec-to-milestone.md`
- `/Users/mateicanavra/.codex-rawr/prompts/dev-harden-milestone.md`

## Evidence Map
- Grounding corpus read:
  - `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-b-runtime-implementation/docs/projects/orpc-ingest-workflows-spec/README.md`
  - `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-b-runtime-implementation/docs/projects/orpc-ingest-workflows-spec/ARCHITECTURE.md`
  - `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-b-runtime-implementation/docs/projects/orpc-ingest-workflows-spec/DECISIONS.md`
  - `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-b-runtime-implementation/docs/projects/orpc-ingest-workflows-spec/PHASE_B_EXECUTION_PACKET.md`
  - `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-b-runtime-implementation/docs/projects/orpc-ingest-workflows-spec/PHASE_B_IMPLEMENTATION_SPEC.md`
  - `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-codex-phase-b-runtime-implementation/docs/projects/orpc-ingest-workflows-spec/PHASE_B_ACCEPTANCE_GATES.md`
- Commit scope reviewed:
  - `f3e62ee` (B0)
  - `c1fd24d` (B1)
  - `285e6e4` (B2)
  - `7f0ff4c` (B3)
- Executed validation (green before interruption):
  - `bunx vitest run --project server apps/server/test/rpc-auth-source.test.ts apps/server/test/orpc-handlers.test.ts apps/server/test/rawr.test.ts apps/server/test/route-boundary-matrix.test.ts`
  - `bunx vitest run --project core packages/core/test/workflow-trigger-contract-drift.test.ts packages/core/test/runtime-router.test.ts`
  - `bun scripts/phase-a/manifest-smoke.mjs --mode=completion`
  - `bun scripts/phase-a/verify-harness-matrix.mjs`
- Full `bun run phase-a:gates:completion` began and passed multiple sub-gates, but the run was interrupted by user stop before final completion.

## Assumptions
- `/rpc` is reachable from boundary callers unless explicitly denied by server-side auth policy.
- `x-rawr-*` caller/auth headers are client-settable unless upstream infrastructure strips/re-writes them.
- B4 review bar requires hardening correctness over preserving legacy permissiveness.

## Risks
- If HIGH-01 remains unresolved, `/rpc` boundary may be exposed to caller-class spoofing and policy bypass.
- If MEDIUM-01 remains unresolved, B3 acceptance evidence remains partially non-verifiable against its own declared artifacts.

## Unresolved Questions
1. Is there an upstream trusted auth middleware/proxy that strips client-supplied `x-rawr-*` headers before app code sees requests?
2. Should `/rpc` trust be bound to an explicit server-only auth context contract (recommended), and if so where is that canonical contract owned?
3. Should B3 adapter-shim checks remain required as separate tests, or be formally superseded by AST/script guards?

## Approval Recommendation
`not_ready`
