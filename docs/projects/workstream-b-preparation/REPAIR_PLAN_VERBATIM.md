# Workstream B Preparation Repair Plan

## Summary

Actual agents were run this time: six mapper/verifier pairs across setup, session-tools, undo, DevOps, plugin sync, and upstream fallout. The result is clear: the prior prep branch is structurally useful, but it is **not closure-ready** because it lacks auditable reviewer provenance and several lane packets overclaim readiness.

Repair in place on `/Users/mateicanavra/Documents/.nosync/DEV/habitat/rawr-hq-template` branch `codex/workstream-b-preparation`. Keep scope docs-only under `docs/projects/workstream-b-preparation/`; do not perform code migrations or downstream edits.

## Key Repairs

- Add a root `REVIEW_LEDGER.md` using the workstream finding format. Record each actual agent pair, scope, evidence base, findings, DRA disposition, and closure impact.
- Update `WORKSTREAM_RECORD.md`: replace "no companion subagents" and "repair demands: none"; record actual agents, exact commit/Graphite state, verification commands/results, skipped checks, accepted P1/P2/P3 findings, and downgrade closure until repairs are complete.
- Update `NEXT_PACKET.md`: include `AGENTS_SPLIT.md` as a required first read with an explicit note that Workstream B authority supersedes stale DevOps split-model text.

Lane packet repairs:

- `session-tools`: declare facet-only search as a first-class bounded search mode; distinguish package-level downstream proof from unproven CLI behavior; require upstream CLI tests for all facet flags, `--print-facets`, custom Codex payloads, and limit/candidate semantics.
- `undo`: choose the public lifecycle API now: export `expireUndoCapsuleOnUnrelatedCommand` through the narrow `@rawr/agent-config-sync/undo` surface. Pin JSON/human failure behavior, dry-run preservation, and required service/CLI tests.
- `devops`: add concrete Graphite/worktree/noninteractive invariants; choose template-safe defaults (`--converge-after` opt-in, link healing opt-in); require JSON fixture contracts and mocked Graphite/repo/worktree tests.
- `plugin-sync`: add downstream behavior inventory before sunset; require bounded `--source-workspace` dry-run/drift proof; clarify that downstream plugin CLI paths are inventory first, not deletion targets.
- `upstream-fallout`: broaden MFE removal evidence to include `vitest.config.ts`, `services/hq-ops/test/ports-backed-service.test.ts`, and `bun.lock`; require a test-local web plugin fixture, not preserving `mfe-demo`; split coordination cleanup checks from Inngest/runtime preservation checks.

## Verification

After edits, run only docs/prep-safe checks:

- `git status --short --branch`
- `gt ls`
- `find docs/projects/workstream-b-preparation -type f | sort`
- `rg -n "no companion subagents|repair demands: none|See the final response|ready for implementation planning" docs/projects/workstream-b-preparation`
- targeted `rg` checks proving all accepted P1/P2 findings are represented in the ledger and lane packets.

No global plugin sync, link repair, formatters, codegen, or migration tests.

## Acceptance

The repair is complete only when every actual reviewer finding has a disposition, no accepted P1/P2 remains unrepaired, lane readiness claims are truthful, and the final Next Packet can be pasted into a lane-specific implementation session without transcript archaeology.

Skills used: workstream-runner, workstream-review-loops, team-design.
