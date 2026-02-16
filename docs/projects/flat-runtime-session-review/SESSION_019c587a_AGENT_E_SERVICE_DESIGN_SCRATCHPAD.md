# SESSION_019c587a Agent E Service Design Scratchpad

Date: 2026-02-16
Status: In progress

## Observed Evidence
1. Approach A explicitly claims package purity as domain/service modules.
- `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_PACKAGE_APPROACH_A_PURE_DOMAIN_E2E.md:4`

2. Scaled layout currently defaults to `services/operations/*.operation.ts` and plugin `operations/*.operation.ts` per action.
- `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_PACKAGE_APPROACH_A_PURE_DOMAIN_E2E.md:108`
- `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_PACKAGE_APPROACH_A_PURE_DOMAIN_E2E.md:126`
- `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_PACKAGE_APPROACH_A_PURE_DOMAIN_E2E.md:196`

3. Growth rules currently prescribe one-file-per-function and one-file-per-operation patterns.
- `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_PACKAGE_APPROACH_A_PURE_DOMAIN_E2E.md:213`

4. Approach A places an oRPC `implement()` router materialization (`internal.surface.ts`) inside package space.
- `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_PACKAGE_APPROACH_A_PURE_DOMAIN_E2E.md:358`
- `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_PACKAGE_APPROACH_A_PURE_DOMAIN_E2E.md:361`

5. The same document also states runtime orchestration glue belongs in boundary plugins.
- `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_PACKAGE_APPROACH_A_PURE_DOMAIN_E2E.md:230`

6. Current codebase already keeps oRPC transport mounting in app host (`registerOrpcRoutes`) and contract composition in `packages/core`.
- `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/apps/server/src/orpc.ts:310`
- `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/packages/core/src/orpc/hq-router.ts:1`

## Inferred Hypotheses
1. The current proposal over-corrects router/contract fragmentation by prescribing operation-level file splitting too aggressively.
2. Package-owned `internal.surface.ts` mixes contract definition with server adapter concerns, weakening the “pure domain package” claim.
3. A capability-cohesive module approach (grouped command/query/reconcile modules) likely improves readability and change locality while preserving one contract/router per plugin.

## Candidate Recommendations (Draft)
- Keep: one contract + one router per API plugin, boundary contracts at plugin edge, app-host transport mounts.
- Change: replace hard one-file-per-operation rule with split heuristics and cohesive module grouping default.
- Change: move oRPC `implement()` materialization out of package contract layer into plugin/app adapter layer.
- Remove: blanket rule that every operation must live in its own file regardless of complexity.

## Open Validation Points
1. Confirm whether package-internal contract should remain oRPC-shaped or be converted to plain TS service port for stricter purity.
2. Confirm whether A1 should remain a recommended default or be constrained to low-divergence internal surfaces only.
