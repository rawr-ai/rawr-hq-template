# Phase A Acceptance Gates (Forward-Only)

## Gate Sequence
1. `metadata-contract`
2. `import-boundary`
3. `manifest-smoke-baseline` (A0 only)
4. `host-composition-guard`
5. `route-negative-assertions`
6. `harness-matrix`
7. `observability-contract`
8. `manifest-smoke-completion` (Phase A exit)

## Gate Definitions

### `metadata-contract`
- Purpose: hard-fail runtime drift from D-013.
- Pass/fail:
  1. Runtime decision keys include `rawr.kind` + `rawr.capability`.
  2. No runtime branching on `templateRole`, `channel`, `publishTier`, `published`.

### `import-boundary`
- Purpose: enforce D-014 dependency direction.
- Pass/fail:
  1. Package code/tests do not import plugin runtime modules.
  2. Shared helpers remain package-first.

### `manifest-smoke-baseline` (A0 only)
- Purpose: ensure manifest authority is the composition spine.
- Pass/fail:
  1. Host runtime consumes manifest-owned route/runtime surfaces.
  2. Required route families may be marked `pending_by_contract` for baseline measurement only.
  3. Every pending family records an owner + target slice + unblock condition.

### `manifest-smoke-completion` (Phase A exit)
- Purpose: enforce fixed Phase A decision that capability workflow routes ship now.
- Pass/fail:
  1. Host runtime consumes manifest-owned route/runtime surfaces.
  2. All four route families are present and mounted: `/rpc`, `/api/orpc/*`, `/api/workflows/<capability>/*`, `/api/inngest`.
  3. `pending_by_contract` is not allowed.

### `host-composition-guard`
- Purpose: enforce bootstrap/mount/control ordering and ingress guard.
- Pass/fail:
  1. Mount order assertion: `/api/inngest` -> `/api/workflows/*` -> `/rpc` + `/api/orpc/*`.
  2. Request-scoped context factories are invoked.
  3. Signed ingress verification is asserted in tests.

### `route-negative-assertions`
- Purpose: enforce caller/runtime route separation.
- Pass/fail:
  1. First-party/external callers cannot use `/api/inngest`.
  2. External callers cannot use `/rpc`.
  3. Runtime-ingress suite does not claim caller-boundary guarantees.
  4. In-process suites assert no default local-HTTP self-call.

### `harness-matrix`
- Purpose: enforce D-015 required suite coverage.
- Required suite IDs:
  1. `suite:web:first-party-rpc`
  2. `suite:web:published-openapi`
  3. `suite:cli:in-process`
  4. `suite:api:boundary`
  5. `suite:workflow:trigger-status`
  6. `suite:runtime:ingress`
  7. `suite:cross-surface:metadata-import-boundary`
- Pass/fail:
  1. Missing suite IDs fail CI.

### `observability-contract`
- Purpose: ensure forward progress is diagnosable.
- Pass/fail:
  1. Correlation fields propagate through trigger -> runtime -> status/timeline.
  2. Explicit counters/events exist for enqueue/status/timeline/ingress failures.
  3. Route policy violations emit structured diagnostics.

## D-016 Seam Gate Requirements
1. Alias/instance seam assertions are mandatory in lifecycle/distribution-relevant suites.
2. No-singleton-global negative assertions are mandatory.
3. Hard bridge expiry check: compatibility shims must be removed by 2026-03-06.

## Seven-Day Zero-Read Measurement Contract
1. Metric/event name: `phase_a.legacy_metadata_runtime_read`.
2. Data source: JSONL event artifact produced by required Phase A CI suites at `artifacts/phase-a/legacy-metadata-events.ndjson`.
3. Check expression:
```sh
jq -s --arg start "$WINDOW_START_UTC" --arg end "$WINDOW_END_UTC" '
  map(select(.event == "phase_a.legacy_metadata_runtime_read" and .ts >= $start and .ts < $end))
  | length == 0
' artifacts/phase-a/legacy-metadata-events.ndjson
```
4. Window semantics: rolling 7 full UTC calendar days; evaluate at the end of each UTC day with `WINDOW_END_UTC` on a day boundary and `WINDOW_START_UTC = WINDOW_END_UTC - 7 days`.
5. Owning verifier: `Verification & Gates Owner` (`@rawr-verification-gates`).

## Required CI Outcome for Phase A Completion
1. All gates above green on required branch checks.
2. No gate in warning-only mode after Slice A1.
3. `manifest-smoke-completion` is green with no pending route family.
4. Seven-day zero-read contract passes for `phase_a.legacy_metadata_runtime_read`.
