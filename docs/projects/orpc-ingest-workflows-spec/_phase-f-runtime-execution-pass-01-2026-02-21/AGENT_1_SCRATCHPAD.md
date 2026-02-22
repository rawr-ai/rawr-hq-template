# Agent 1 Scratchpad

## Timestamped Updates
- 2026-02-22T22:23:01: Confirmed branch is `codex/phase-f-f1-runtime-lifecycle-seams`.
- 2026-02-22T22:23:01: Observed pre-existing local edits in F1 runtime files and pass artifacts; treated as in-branch working state and did not revert.
- 2026-02-22T22:23:35: Required skill introspection completed for `typescript`, `orpc`, `architecture`, `decision-logging`, and `graphite`.
- 2026-02-22T22:24:18: Grounded on Phase F/F1 docs:
  - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/docs/projects/orpc-ingest-workflows-spec/PHASE_F_PREP_NOTE.md`
  - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/docs/projects/orpc-ingest-workflows-spec/_phase-e-runtime-execution-pass-01-2026-02-21/E7_PHASE_F_READINESS.md`
  - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/docs/projects/orpc-ingest-workflows-spec/axes/13-distribution-and-instance-lifecycle-model.md`
  - `PHASE_F_EXECUTION_PACKET.md`, `PHASE_F_IMPLEMENTATION_SPEC.md`, `PHASE_F_ACCEPTANCE_GATES.md` sourced from `codex/phase-f-planning-packet` via `git show`.
- 2026-02-22T22:24:31: Reproduced failing test:
  - `bunx vitest run --project server apps/server/test/rawr.test.ts`
  - Failure: alias-root authority stability assertion (`expected [] to include '@rawr/plugin-alias-root'`).
- 2026-02-22T22:24:54: Diagnosed root cause: `resolveAuthorityRepoRoot` in `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/apps/server/src/rawr.ts` referenced `fsSync.realpathSync(...)` without importing `node:fs`, causing fallback to alias path.
- 2026-02-22T22:24:59: Applied minimal F1 fix: added `import fsSync from "node:fs";` in `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/apps/server/src/rawr.ts`.
- 2026-02-22T22:25:01: Re-ran failing target; test passed.
- 2026-02-22T22:25:18: Ran required verification commands; all green.

## Implementation Decisions

### Canonicalize runtime authority root at seam boundaries
- Context: F1 requires deterministic instance/alias lifecycle behavior without route/manifest drift.
- Options: keep `path.resolve` only, or add realpath-based canonical authority with fallback.
- Choice: canonical authority (`realpath` fallback to resolved absolute path) in state and server runtime seam code.
- Rationale: removes alias-path ambiguity and stabilizes authority identity while preserving all existing route families.
- Risk: returned path identity can shift from alias form to canonical form for some call sites.

### Fix alias-root instability with import-only server correction
- Context: F1 regression test failed even though canonicalization helper existed.
- Options: refactor canonicalization flow, change test behavior, or repair missing runtime import.
- Choice: repair missing runtime import (`node:fs`) so existing helper logic executes.
- Rationale: smallest possible change that restores canonical authority seam without topology or contract changes.
- Risk: none beyond normal module import surface; behavior is aligned with intended helper logic.

### Keep F1 free of public contract expansion
- Context: Phase F implementation packet separates runtime seam hardening (F1) from interface hardening (F2).
- Options: add new public fields now, or keep signatures stable and defer schema/interface shifts.
- Choice: keep F1 signature-stable and avoid new public contract fields.
- Rationale: minimizes blast radius and keeps dependency order aligned with packet intent.
- Risk: some observability detail remains deferred to F2+.

## Watchpoints
- Do not alter route-family semantics: `/rpc`, `/api/orpc/*`, `/api/workflows/<capability>/*`, `/api/inngest`.
- Do not introduce command-surface semantics into runtime metadata logic.
- Do not touch scripts or `package.json` in this slice.
