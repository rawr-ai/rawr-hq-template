# Telemetry Source Retirement

Informative source accounting, September 15, 2026. The owner authorized further
retirement without reviving obsolete Habitat wiring. This retires an old review
topology, not the still-unfinished observability capability. It does not admit an
SDK repair plan or bypass historical-frame recovery.

## Completed Reduction

**The 35 obsolete telemetry PRs are closed without merging. Their 35 local and
35 remote branch refs are retired. One historical source reference remains,
including the eight unchanged staged files.**

The [exact operation receipt](resources/research/telemetry-retirement-2026-09-15.json)
records every retired head and PR, source fingerprints, and readback. At that
checkpoint there were 28 local refs, 26 remote refs and 12 open PRs, including
the new documentation PR. Its later merge/drain is separate from these 35 source
retirements. Six worktrees and 13 stashes remain, with no held worktree removed.

## Decision And Execution Gate

Keep one historical source reference and its existing staged work; close the 35
obsolete PRs as superseded/consolidated, then retire their redundant branch refs.
Do not replay, restack, or merge their old application wiring. Preserve the May
architecture/toolbox references and all other held capability groups unchanged.

The complete main-ready salvage is a [backend reuse recipe](backend-reuse.md),
not a new executable harness. There is no standalone infrastructure tool in the
old source: lifecycle/query code and obsolete application fixtures are mixed.
Its staged files remain incomplete source evidence, not a supported command.

The execution verified source history, staged index and working-file hashes,
exact local/remote heads, Graphite descendants, PR identities, protection and
worktree occupancy. `gt rename` and `gt untrack` disconnected only the source
reference; `gt delete --close` retired verified childless ancestors. Each PR
received an explanatory accounting link. One atomic, expected-SHA-leased remote
deletion followed closure and dependency rechecks. No source was restacked.

## Why The Work Paused

The owner's hypothesis is substantially supported, with an important limit.
The evidence demonstrates replacement of the old substrate owners, not that one
particular persistent runtime bug caused every pause.

- The August 6 telemetry design intentionally integrated the then-existing
  HQ/server/Oclif entrypoints. Backend receipt tasks 6.1-6.6 remained unchecked.
- [PR 882](https://github.com/rawr-ai/rawr-hq-template/pull/882), `7457505fc`,
  identified selection, acquisition, mounting and shutdown reconstructed inside
  entrypoints and ordered replacement of the old application owners.
- [PR 883](https://github.com/rawr-ai/rawr-hq-template/pull/883), `a2c1178f8`,
  explicitly treated telemetry host integrations as behavior inputs for new
  runtime-owner acceptance, not branches to merge. It also protected another
  writer's staged receipt work pending handoff.
- [PR 885](https://github.com/rawr-ai/rawr-hq-template/pull/885) changed adoption
  ownership to fresh Habitat destinations. Backend implementation was already
  outside the generic runtime prerequisite; this PR did not newly remove it.
- The later August 11 runtime stop had a separately documented immediate cause:
  task 6.3f required authorization for a corrected external Fluree server. The
  [September assessment](resources/research/habitat-recovery-assessment.md)
  also recorded cold-pipeline defects, but that does not date those defects as
  the original telemetry stopping cause.

The present owner authorization permits consolidation. It is not a reason to
discard the previously protected staged source; this pass preserves it exactly.

## Coherent Source Units

| Old PRs | Disposition | What Remains Important |
|---|---|---|
| 844, 846 | Reference-only design intent | Original scope, event guarantees, backend acceptance, and separate PostHog/Langfuse dispositions. |
| 845, 847-852 | Technical foundation adopted in PR 926; older vendor tuple and bootstrap superseded | Event-scope contract/types/tests remain unfulfilled design evidence, not APIs to restore. |
| 853-854, 857-862 | Old HQ/example/source-law wiring superseded; lifecycle/correlation re-authored in PRs 1018/1019 | Detailed technical-log and metric outcome/dimension cases remain qualification inputs. |
| 855-856, 863-864, 871-872 | Semantic-event integration deferred to D-5 | Native oRPC, Inngest and Oclif finalized-event behavior is not equivalent to native spans. |
| 865-870, 873-876 | Lifecycle re-authored in PRs 1018/1019/1024; old host composition superseded | Event finalization and the distinction between bounded waiting and actual cancellation remain relevant. |
| 877-878 | Singleton retirement adopted in PR 926 | Differences are router/receipt-only; no unadopted executable capability. |
| Local receipt tip | One reference-only holding with incomplete staged source | Backend lifecycle/query techniques, schemas, assertions and old fixtures stay together for provenance. |

This covers all 35 submitted steps and the local receipt tip. A group's adopted
portion does not imply every old assertion is satisfied by current main.

In particular, preserve the evidence for first-terminal-outcome behavior,
idempotent finish, inert late enrichment, disabled absence, matched/unmatched/
batched operation cardinality, native attempt identity, observer non-interference,
and CLI success/failure/cancellation classification. Historical
`beginNativeOperation` and `NativeOperationTelemetryScope` express an old API
placement, not a decision to restore that API after repairs.

## Source Preservation

The holding is `archive/native-telemetry-pre-repair`, at unchanged
`0519fe11cfd8c75a72bd761d980077f23fed194a`, in the existing
`wt-template-native-platform-telemetry` worktree. It is reference-only and
deliberately untracked by Graphite after consolidation, so ordinary stack
restacking cannot revive it. The directory is not renamed or removed.

Its history contains 33 of the 35 submitted heads. The two exceptions are:

- `f95c92071`: compared with tip-contained `1890e696e`, differs only in
  `packages/core/AGENTS.md`, which the held history corrected to remove core
  telemetry ownership.
- `de9e99c1d`: compared with `0519fe11c`, adds the same router difference and
  one tasks.md receipt/hash difference.

Neither contains a unique executable, type, test, or configuration change.
Current main's [PR 926](https://github.com/rawr-ai/rawr-hq-template/pull/926),
`6fbe3b252`, independently removes the core telemetry export, implementation and
tests and states that core owns no telemetry. Exact submitted hashes remain in
the source accounting record.

All eight staged `tools/native-platform-telemetry-receipt` source files remain
in place, with the index and file contents unchanged. Ignored `.rawr/` runtime
logs, reports, snapshots and SQLite/WAL/SHM files are not copied, committed or
deleted. Dependencies, caches and generated manifests are not salvage material.
No whole-worktree archive or new backup scheme is created.

## What Is Still Deferred

These are related layers, not mutually exclusive alternatives:

1. **Backend readiness:** start an isolated collector/database and verify its
   endpoints and tables. This can be checked independently of Habitat.
2. **Persisted producer proof:** emit identified observations through the current
   producer, then query the corresponding database rows. HTTP success alone is
   insufficient. This remains D-5 work, not completed by a readiness check.
3. **Semantic-event qualification:** establish which finalized operation events
   Habitat should produce, then prove outcomes, cardinality, identity,
   non-interference and shutdown. Revisit this through the recovered frame and
   repaired native boundaries, not the old wrappers.
4. **External-export policy:** qualify secret-bearing native exceptions against
   deliberate provider-owned sanitization before enabling external export.

The existing current-runtime Inngest dev-server fixture is already separate
infrastructure. The old staged Inngest fixture only constructs execution
requests and invokes an old handler; it is not an Inngest server installation,
durability/replay qualification, or an additional infrastructure asset to land.

## Other Holdings

The May-authored `agent-af-authority-freeze-execution-frame` and
`codex/spec-toolbox-reference` branches remain unchanged as owner-requested
historical comparison points. Their value is independent of whether their old
implementation prescriptions are current.

Session Metrics and other Rawr product transfers remain held for destination
comparison and actual dependency qualification. This pass neither declares
them ready to transfer nor imposes a blanket requirement that every future
Habitat capability be complete first. Fluree and temporal inquiry are unchanged.

## Verification Boundary

The retained receipt model's one negative test passes: empty backend results
must fail. That is useful evidence, not a successful end-to-end receipt.
The independent backend-readiness probe also passed and restored its owned
infrastructure state; see the [bounded recipe and receipt](backend-reuse.md).
The uncached repository check passed all 147 tasks before publication. Final
source/PR/ref checks confirmed the reduction and preserved unrelated holdings.
The [D-5 handoff](../habitat-runtime-realignment/deferred-capabilities.md#d-5-full-observability)
continues to own the unfinished capability. No SDK or vendor dependency changes
are part of this retirement.
