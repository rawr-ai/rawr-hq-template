# Coordination Stack Restack + Contextual Conflict Resolution Plan (Worktree + Graphite Safe)

## Brief Summary
Your coordination-canvas stack in `RAWR HQ-Template` is partially stale against newer template-core changes, and that is where real merge pressure now lives.  
The critical issue is not random conflicts, but **semantic drift** across plugin topology and command-surface changes introduced on `main` after this stack branched.  
This plan resolves that drift safely via Graphite restack, conflict-by-conflict policy, and a structured multi-agent review pass (up to 3 reviewers) while keeping one implementation owner.

## Confirmed Current State (Grounded)
1. Primary implementation worktree: `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-a-coordination-canvas-v1`
2. Active branch there: `codex/coordination-canvas-v1-server`
3. Stack branches: `codex/coordination-canvas-v1-docs` -> `codex/coordination-canvas-v1-packages` -> `codex/coordination-canvas-v1-server` -> `codex/coordination-canvas-v1-cli` -> `codex/coordination-canvas-v1-web`
4. Graphite marks `codex/coordination-canvas-v1-packages` as `needs restack`.
5. Highest-likelihood conflict surfaces from mainline drift:
- `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-a-coordination-canvas-v1/apps/server/src/rawr.ts`
- `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-a-coordination-canvas-v1/apps/cli/package.json`
- `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-a-coordination-canvas-v1/apps/cli/src/commands/tools/export.ts`
- `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-a-coordination-canvas-v1/package.json`
- `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-a-coordination-canvas-v1/vitest.config.ts`
- `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-a-coordination-canvas-v1/bun.lock`

## Execution Plan

### Phase 0: Documentation Bootstrap (Required First Action)
1. In the implementation worktree, create and populate verbatim:
- `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-a-coordination-canvas-v1/docs/projects/agent-coordination-canvas-v1/RESTACK_RESOLUTION_PLAN.md`
2. Create a separate live scratchpad:
- `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-a-coordination-canvas-v1/docs/projects/agent-coordination-canvas-v1/RESTACK_RESOLUTION_SCRATCHPAD.md`
3. Rule: every decision, conflict choice, and deviation is logged with timestamp in the scratchpad.

### Phase 1: Graphite-Safe Preflight
1. Run only stack-safe sync first:
- `gt --cwd /Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-a-coordination-canvas-v1 sync --no-restack`
2. Verify clean state and branch pointers.
3. Confirm parent chain for all 5 stack branches before mutation.
4. No ad-hoc git rebases/force pushes.

### Phase 2: Restack + Contextual Conflict Resolution
1. Start from `codex/coordination-canvas-v1-packages` and run:
- `gt --cwd /Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-a-coordination-canvas-v1 checkout codex/coordination-canvas-v1-packages`
- `gt --cwd /Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-a-coordination-canvas-v1 restack --upstack`
2. Resolve conflicts with this policy:
- `package.json`: keep mainline workspace split (`plugins/cli/*`, `plugins/agents/*`, `plugins/web/*`) and preserve/add coordination scripts only additively.
- `apps/server/src/rawr.ts`: preserve plugin-root safety and channel split from main; layer coordination + Inngest route wiring on top.
- `apps/cli/src/commands/tools/export.ts`: preserve renamed command surfaces (`plugins web ...`, `plugins scaffold ...`) and append coordination commands without regressing newer entries.
- `apps/cli/package.json`: preserve modern plugin deps/plugins (`@rawr/plugin-plugins`, `@rawr/agent-sync`, updated oclif), then merge coordination deps.
- `vitest.config.ts`: preserve new plugin root paths and add coordination tests without reverting project roots.
- `bun.lock`: never hand-merge; resolve structurally, then regenerate with Bun.
3. After each conflict resolution step, log rationale in scratchpad.

### Phase 3: Lockfile + Verification Gate
1. Regenerate lockfile and workspace graph consistency:
- `bun install`
2. Execute required gates:
- `bun run typecheck`
- `bun run test`
3. Coordination-specific smoke checks:
- UI route `/coordination` loads and editor interactions still work.
- Server serves `/api/inngest`.
- At least one workflow validate/run/status/trace path works from CLI.
- Run timeline/trace metadata remain queryable from API.

### Phase 4: Reviewer Agent Mesh (Up to 3, Review-Only)
All review agents must:
1. Use their own worktree under `/Users/mateicanavra/Documents/.nosync/DEV/worktrees`
2. Branch from top of your stack (`codex/coordination-canvas-v1-web`)
3. Keep their own scratch docs in project docs folder.
4. Operate read-only unless explicitly escalated.

Recommended 3-agent split:
1. Runtime reviewer (`inngest` + `elysia`)
- Verifies Inngest serve/runtime semantics, step durability/idempotency patterns, Elysia integration correctness, trace linkage.
- Scratch doc: `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-a-coordination-canvas-v1/docs/projects/agent-coordination-canvas-v1/agent-r1-runtime-scratch.md`
2. Monorepo/build reviewer (`turborepo`)
- Verifies workspace graph, task graph, test wiring, lockfile integrity, package boundary correctness.
- Scratch doc: `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-a-coordination-canvas-v1/docs/projects/agent-coordination-canvas-v1/agent-r2-mono-scratch.md`
3. Deployment/ops reviewer (`railway`)
- Verifies deploy assumptions, env contracts, healthcheck/port posture, runbook coverage, operational readiness.
- Scratch doc: `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-a-coordination-canvas-v1/docs/projects/agent-coordination-canvas-v1/agent-r3-ops-scratch.md`

### Phase 5: Integrate Review Findings
1. Single implementation owner integrates all accepted findings into the main stack.
2. Any disagreement between reviewers is resolved in scratchpad with explicit decision note.
3. Re-run full verification gate after integration.

### Phase 6: Finalize Stack State
1. Ensure `gt log` shows no `needs restack`.
2. Ensure worktree is clean.
3. Update orchestrator notebook with final decisions and residual risks.
4. Submit stack via Graphite when ready:
- `gt --cwd /Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-a-coordination-canvas-v1 submit --stack --ai`

## Important Public API / Interface / Type Impacts
1. No intent to change external product scope; this is a reconciliation and hardening pass.
2. Must preserve already-agreed coordination APIs and CLI surfaces while merging with new template command-channel conventions.
3. Must preserve `/api/inngest` execution path and coordination run/timeline endpoints.
4. Must keep command-channel policy consistent:
- `rawr plugins ...` for external oclif plugins
- `rawr plugins web ...` for workspace runtime plugins

## Test Cases and Scenarios
1. Restack completes from packages upstack without unresolved conflicts.
2. `bun.lock` regenerates cleanly and reflects both mainline plugin-structure changes and coordination dependencies.
3. `apps/server/src/rawr.ts` retains both plugin-root safety and coordination Inngest wiring.
4. CLI help/export includes current plugin command surfaces plus coordination commands.
5. Full `bun run typecheck` passes.
6. Full `bun run test` passes.
7. UI `/coordination` renders and keyboard-first flow remains functional.
8. Server `/api/inngest` path is reachable in local dev topology.
9. Workflow run produces status/timeline/trace artifacts.
10. Reviewer-agent findings are captured in per-agent scratch docs and resolved explicitly.

## Assumptions and Defaults
1. Work executes in `RAWR HQ-Template`, not `RAWR HQ` (personal repo is read-only reference only).
2. Graphite-first workflow is mandatory; no ad-hoc git history rewriting.
3. One implementation owner; up to 3 review-only agents.
4. Scratch docs are the mandatory communication bus across orchestrator and all agents.
5. If conflict choices threaten command-channel invariants, mainline template conventions win and coordination changes are adapted, not vice versa.
