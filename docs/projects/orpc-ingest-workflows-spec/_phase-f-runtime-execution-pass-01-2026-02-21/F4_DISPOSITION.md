# F4 Disposition (D-004)

state: deferred

## Summary
F4 is deferred for this runtime pass. `bun run phase-f:gate:f4-assess` wrote `F4_TRIGGER_SCAN_RESULT.json` with `triggered: false`, and all three D-004 trigger counters are below threshold.

## Trigger Matrix Summary
| Criterion | Threshold | Observed | Result | Evidence |
| --- | --- | --- | --- | --- |
| `capabilitySurfaceCount` | `>= 3` | `1` | not triggered | `F4_TRIGGER_SCAN_RESULT.json` reports `capabilitySurfaceIds: ["coordination"]`, so multi-capability recurrence is not present. |
| `duplicatedBoilerplateClusterCount` | `>= 2` | `0` | not triggered | `F4_TRIGGER_SCAN_RESULT.json` reports `duplicatedBoilerplateClusterCount: 0`; repeated clusters detected in one capability do not satisfy the distinct-surface threshold. |
| `correctnessSignalCount` | `>= 1` | `0` | not triggered | `F4_TRIGGER_SCAN_RESULT.json` reports `correctnessSignalCount: 0`; no threshold-qualified anti-drift correctness signal is present. |
| Composite trigger rule | all three criteria true | false | not triggered | `triggerRule` remains unsatisfied, so D-004 closure transition is blocked in this pass. |

## Decision Register Impact
- D-004 remains `locked` in `docs/projects/orpc-ingest-workflows-spec/DECISIONS.md`.
- No D-004 `locked -> closed` transition language is applied in this F4 slice.
- `DECISIONS.md` is intentionally unchanged for this deferred posture.

## Carry-Forward Watchpoints
1. Re-run `bun run phase-f:gate:f4-assess` after any expansion of workflow capability surfaces in `rawr.hq.ts`; only escalate when `capabilitySurfaceCount >= 3`.
2. Re-run `bun run phase-f:gate:f4-assess` after edits to `packages/core/src/orpc/runtime-router.ts` that can duplicate validation/not-found/error boilerplate across capabilities; only escalate when `duplicatedBoilerplateClusterCount >= 2`.
3. Re-run `bun run phase-f:gate:f4-assess` after drift-test hard-fail additions tied to duplicated boilerplate behavior; only escalate when `correctnessSignalCount >= 1`.
4. Transition F4 to triggered posture only when all three thresholds are simultaneously met in `F4_TRIGGER_SCAN_RESULT.json`; at that point publish `F4_TRIGGER_EVIDENCE.md`, apply explicit D-004 `locked -> closed` transition language in `DECISIONS.md`, and rerun touched-slice full gates.
5. Until that trigger condition is met, D-004 stays locked with no partial, provisional, or implicit closure wording.

## Gate References
- `bun run phase-f:gate:f4-assess`
- `bun run phase-f:gate:f4-disposition`
- `docs/projects/orpc-ingest-workflows-spec/_phase-f-runtime-execution-pass-01-2026-02-21/F4_TRIGGER_SCAN_RESULT.json`
