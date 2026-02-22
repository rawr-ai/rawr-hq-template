# Agent 1 Final: F1 Runtime Lifecycle Seams

## Outcome
1. Fixed the failing alias-root authority stability test in `apps/server/test/rawr.test.ts` with a minimal runtime import correction.
2. Preserved F1 intent: canonical repo authority seam for state/runtime remains intact and executable.
3. Kept locked invariants unchanged: route families, manifest composition authority, and runtime identity policy.

## Failing Test Diagnosis and Fix
1. Reproduced failure with `bunx vitest run --project server apps/server/test/rawr.test.ts`.
2. Failure signature: `expected [] to include '@rawr/plugin-alias-root'` in alias-root stability assertion.
3. Root cause: `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/apps/server/src/rawr.ts` used `fsSync.realpathSync(...)` in authority-root resolution without importing `node:fs`; the `ReferenceError` was caught, forcing fallback to non-canonical alias path.
4. Fix: add `import fsSync from "node:fs";` so canonical authority resolution actually executes.

## F1 Intent Preservation
1. Canonical authority seam is still implemented in state and server runtime layers and is now effective at server registration time.
2. No architecture pivot introduced.
3. Route-family/channel/manifest invariants remain unchanged.

## Skills Introspected
1. `/Users/mateicanavra/.codex-rawr/skills/typescript/SKILL.md`
2. `/Users/mateicanavra/.codex-rawr/skills/orpc/SKILL.md`
3. `/Users/mateicanavra/.codex-rawr/skills/architecture/SKILL.md`
4. `/Users/mateicanavra/.codex-rawr/skills/decision-logging/SKILL.md`
5. `/Users/mateicanavra/.codex-rawr/skills/graphite/SKILL.md`

## Evidence Map
1. `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/apps/server/src/rawr.ts:1` (runtime import fix enabling canonicalization code path).
2. `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/apps/server/src/rawr.ts:180` (authority-root canonicalization helper).
3. `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/apps/server/src/rawr.ts:190` (single authority root captured at route registration).
4. `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/apps/server/src/rawr.ts:225` (runtime adapter receives canonical authority root).
5. `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/packages/state/src/repo-state.ts:31` (state authority-root canonicalization helper).
6. `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/packages/state/src/repo-state.ts:254` (state reads use canonical authority root).
7. `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/packages/state/src/repo-state.ts:264` (state mutations/locks use canonical authority root).
8. `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/packages/state/test/repo-state.concurrent.test.ts:157` (alias/canonical seam regression test).
9. `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/apps/server/test/rawr.test.ts:189` (alias-root runtime stability regression test).
10. `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/docs/projects/orpc-ingest-workflows-spec/axes/13-distribution-and-instance-lifecycle-model.md:33` (alias/instance seam required by policy).

## Assumptions
1. F1 scope includes repairing regressions that prevent the canonical authority seam from functioning as designed.
2. Existing state-layer canonicalization changes on this branch are the intended F1 implementation baseline.

## Risks
1. Call sites that compared alias strings instead of authority paths may observe canonicalized path identity.
2. If future edits remove the `node:fs` import again, server authority canonicalization can silently degrade via fallback.

## Unresolved Questions
1. Should F2 add explicit telemetry fields that expose both requested repo root and canonical authority root for easier seam debugging?

## Verification Commands and Outcomes
1. `bunx vitest run --project state packages/state/test/repo-state.concurrent.test.ts` -> pass (`1` file, `5` tests).
2. `bunx vitest run --project server apps/server/test/rawr.test.ts` -> pass (`1` file, `15` tests).
3. `bunx vitest run --project server apps/server/test/route-boundary-matrix.test.ts` -> pass (`1` file, `6` tests).
4. `bun run phase-c:gate:c1-storage-lock-runtime` -> pass (coordination storage-lock test `1/1`, state concurrency `5/5`, server storage-lock route guard `1/1`).
