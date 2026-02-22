# Agent 1 Plan Verbatim (F1 Runtime Lifecycle Seams)

## Role
I1 execution scope for F1 runtime lifecycle seam hardening on `codex/phase-f-f1-runtime-lifecycle-seams`.

## Grounding
1. `/Users/mateicanavra/.codex-rawr/skills/typescript/SKILL.md`
2. `/Users/mateicanavra/.codex-rawr/skills/orpc/SKILL.md`
3. `/Users/mateicanavra/.codex-rawr/skills/architecture/SKILL.md`
4. `/Users/mateicanavra/.codex-rawr/skills/decision-logging/SKILL.md`
5. `/Users/mateicanavra/.codex-rawr/skills/graphite/SKILL.md`
6. `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/docs/projects/orpc-ingest-workflows-spec/axes/13-distribution-and-instance-lifecycle-model.md`
7. `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/packages/state/src/repo-state.ts`
8. `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/packages/state/test/repo-state.concurrent.test.ts`
9. `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/apps/server/src/rawr.ts`
10. `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/apps/server/test/rawr.test.ts`
11. Phase F packet docs sourced from `codex/phase-f-planning-packet` via `git show`:
- `docs/projects/orpc-ingest-workflows-spec/PHASE_F_EXECUTION_PACKET.md`
- `docs/projects/orpc-ingest-workflows-spec/PHASE_F_IMPLEMENTATION_SPEC.md`
- `docs/projects/orpc-ingest-workflows-spec/PHASE_F_ACCEPTANCE_GATES.md`

## Scope Lock
1. Runtime lifecycle seam hardening only (`F1`).
2. Preserve route-family invariants and manifest composition authority.
3. No edits to scripts or `package.json`.
4. Docs changes limited to required runtime pass artifacts in this folder.

## Plan
1. Canonicalize repo state authority in `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/packages/state/src/repo-state.ts` (realpath fallback) and keep mutation/read behavior deterministic across alias/canonical roots.
2. Add alias/canonical seam tests in `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/packages/state/test/repo-state.concurrent.test.ts`.
3. Canonicalize server runtime authority root in `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/apps/server/src/rawr.ts` and apply that authority root consistently to plugin lookup and runtime/context dependencies.
4. Add runtime seam regression coverage in `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/apps/server/test/rawr.test.ts` for alias lifecycle stability.
5. Diagnose and fix the failing alias-root authority stability assertion in `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/apps/server/test/rawr.test.ts` with minimal code movement.
6. Run the required F1 verification commands before handoff:
   - `bunx vitest run --project state packages/state/test/repo-state.concurrent.test.ts`
   - `bunx vitest run --project server apps/server/test/rawr.test.ts`
   - `bunx vitest run --project server apps/server/test/route-boundary-matrix.test.ts`
   - `bun run phase-c:gate:c1-storage-lock-runtime`

## Expected Files
1. `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/packages/state/src/repo-state.ts`
2. `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/packages/state/test/repo-state.concurrent.test.ts`
3. `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/apps/server/src/rawr.ts`
4. `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/apps/server/test/rawr.test.ts`
