# Cleanup And Capability Lineage

Informative checkpoint, September 15, 2026. This is the current cleanup outcome
and a capability-level reading of the retained work, not a new SDK repair plan.
The earlier [repository census](repository-state.md) remains historical evidence.

## The Useful Picture

**The remote branch count fell from 685 to 60. The remaining local work is not
63 unfinished features: most refs are tiny steps inside a few older efforts.**

The current recovery branch remains directly above synchronized main. Neither
the old stacks nor their unfinished work are prerequisites for continuing the
frame recovery. No old implementation was merged to make the graph look clean.

Open the [visual lineage map](resources/research/recovery-timeline.html) for the
dated view. It uses milestones rather than Gantt durations: dates show recorded
activity and acceptance, not continuous work or the moment a track was abandoned.

| What To Think About | Retained Local Refs | Meaning Today |
|---|---:|---|
| Current SDK/frame recovery | 1 | Active, clean, local documentation branch above main. |
| Telemetry | 36 | Technical foundation adopted; old wiring superseded; product-event and persisted-backend qualification unfinished. |
| Knowledge infrastructure | 10 | Original Fluree/workstream 6, September research 2, temporal inquiry 2. Intentional deferred capabilities and new research, not disposable leftovers. |
| Rawr product transfers | 13 | Session Metrics 10, research design 3. Compare retained behavior with the current downstream product before retiring sources. |
| Historical framing/specification references | 2 | May-authored material potentially relevant to frame discovery, not merely obsolete August branches. |

These 62 non-trunk refs plus main make 63 local branches. The groups are a
reading aid, not a rewritten stack topology. Graphite still has ten independent
roots below main; research has two roots locally, and metrics has an old stack
plus a separate transfer freeze. The 46 open PRs remain unchanged.

## What Was Actually Removed

### Merged Remote Refs

Removed 625 remote branches, about 91% of the prior total. Every deletion met
all of these conditions:

- The live remote head exactly matched the merged revision of a PR from this
  same repository, not a similarly named fork PR.
- That PR's merge commit was reachable from current main. A PR merged into
  an unlanded side branch would not have qualified.
- The ref was not main, protected, a configured Graphite trunk, a long-lived
  release/support name, an open PR head/base, a live local branch, a local
  upstream alias, a live Graphite parent, or a Graphite base ref.
- Fresh checks preceded each bounded atomic deletion batch. Expected-SHA
  leases rejected changed refs. After every batch, remote readback verified
  deletion and the unchanged non-target refs.

Seven batches completed with no failed or uncertain deletion. Main, tags,
open PRs, local source, and unrelated refs were not deleted or rewritten.
The [retirement receipt](resources/research/remote-retirement-2026-09-15.json)
and [exact deleted-ref proof table](resources/research/remote-retirement-2026-09-15.tsv)
record the operation. A new PR opening against an unchanged branch cannot be
transactionally excluded by Git leases; the operation used fresh checks and
short intervals rather than claiming that stronger guarantee.

The 60 remaining remote refs are main, 46 open-PR heads, nine closed-unmerged
PR refs, three Graphite base refs, and one branch whose current SHA differs
from its merged PR's head. None meets the same no-decision deletion test.

### Superseded Local WIP

Removed `agent-root-task63-proof-wip` through Graphite. Its exact source was
`15863c7f50f96e0051f0c696d50422e4f9add6d3`, authored August 11 at 08:09 EDT.
This was not an exact duplicate or a directly merged commit:

- [PR 995](https://github.com/rawr-ai/rawr-hq-template/pull/995), accepted the
  same day at 11:04, completed that task-6.3 proof scope. Its test file retained
  all 13 WIP test names and added five tests; name correspondence is not a claim
  of assertion-by-assertion equivalence.
- [PR 996](https://github.com/rawr-ai/rawr-hq-template/pull/996), accepted at
  11:45, explicitly sealed the proof: 18 focused tests, 17,100 assertions,
  independent review and required checks.
- The later removal of three related test names is accounted for by the
  accepted admission simplification in
  [PR 1008](https://github.com/rawr-ai/rawr-hq-template/pull/1008), not unexplained
  test loss.

That is accepted supersession evidence. The branch had no child, worktree,
remote counterpart, or PR. Removing it reduced local refs from 64 to 63 and
Graphite roots from eleven to ten. No other local branch or worktree was
retired in this pass. The earlier fully main-contained semantic-ledger ref
and disposable test worktree were removed in the preceding census pass.

## Telemetry: The Capability Was Broader Than The Release

The owner reaffirmed on September 15 that telemetry is a core Habitat
capability. Deferred delivery must not be read as optional product importance.

| Date, EDT | Recorded Change | What It Means |
|---|---|---|
| Aug 6 | Original telemetry initiative, PRs 844-878 | Intended process ownership, native correlation, one finalized EVLog event per native operation, bounded shutdown, and query-backed ClickHouse evidence. |
| Aug 6 | Resource/provider and older HQ/server/async/CLI implementation | Source tasks for backend receipt and final landing remained incomplete. A large stack existed, not a completed acceptance story. |
| Aug 7 | [PR 885](https://github.com/rawr-ai/rawr-hq-template/pull/885) | Moved adoption to fresh Habitat-owned destinations; backend implementation remained outside the generic runtime prerequisite. |
| Aug 9 | [PR 926](https://github.com/rawr-ai/rawr-hq-template/pull/926) | Technical resource/provider and singleton retirement landed semantically. The old stack was not wholesale merged. |
| Sept 5-6 | [PR 1018](https://github.com/rawr-ai/rawr-hq-template/pull/1018), [PR 1019](https://github.com/rawr-ai/rawr-hq-template/pull/1019), [PR 1024](https://github.com/rawr-ai/rawr-hq-template/pull/1024) | Current native host lifecycle, OTLP transport and correlation were qualified against the newer runtime. |
| Sept 5-6 | PRs 1025-1028, release and closure | Full observability was explicitly carried into D-5 while the narrower runtime release completed. |
| Sept 15 inspection | Eight staged receipt files, 1,015 added lines | Reusable unfinished backend-proof work remains. Its authoring date is unknown; September 15 is the observation date. |

**Already adopted:** the technical telemetry resource/provider, singleton
retirement, native transport correlation, and qualified lifecycle behavior.

**Superseded implementation:** old HQ/example/CLI composition and older
vendor-specific host wiring. Merging those old branches back would be the
wrong way to recover the capability.

**Still owed:** queryable HyperDX/ClickHouse persistence proof, deliberate
native-exception sanitization before external export, and qualified semantic
event behavior through the existing Logs pipeline. The original event promises,
including cardinality and retry-attempt identity, need explicit disposition;
the newer phrase "evaluate EVLog" cannot silently erase them.

The staged receipt implementation includes digest-pinned ClickStack lifecycle,
native fixtures, decoded SQL rows, and assertions. It still references older
machinery such as `apps/cli/bin/run.js doctor`, so it is evidence and reusable
work, not a runnable current-runtime acceptance result. PostHog implementation
was separately scoped and Langfuse optional; neither is implicitly delivered.

The sources establish an explicit scope split and remaining obligations. They
do not establish why the original execution stopped. See the live
[D-5 handoff](../habitat-runtime-realignment/deferred-capabilities.md#d-5-full-observability),
[backend reuse record](../habitat-runtime-realignment/IMPLEMENTATION.md#backend-receipt-reuse),
and historical [source accounting](../../../openspec/changes/archive/2026-09-06-realize-app-runtime-spine/stack-cut-sheet.md).

## Dates And Graphs Can Mislead

Graphite is the primary authority for the intended stack relationships and
submitted versions. `gt upgrade --no-interactive` confirmed 1.8.6 was current;
`gt log --all`, stack-scoped logs, `gt info`, and `gt sync --no-restack` were
used to inspect and refresh the actual state. Git supplies commit objects,
authorship dates, working changes, and reachability; it is supporting evidence,
not a replacement model for the Graphite stack.

Three examples explain why the raw counts or graph can look worse than reality:

1. **An intended parent need not be the current Git base.** The metrics service
   was restacked while a CLI descendant retained older history. Graphite's
   `needs restack` is useful here, but does not authorize replaying the held work.
2. **A rewritten commit date is not a new initiative date.** The authority-freeze
   and toolbox material was authored May 7-18, then rewritten August 6. Its
   unique framing material should remain available for investigation.
3. **A published parent can differ from the current local relationship.**
   Research PR 769 still targets the reframe branch on GitHub, while `gt info`
   reports main as its local parent and flags local submission differences.
   Do not interpret this as a fresh approved main-based implementation queue.

Similarly, exact patch matching can demonstrate duplication but not complete
semantic adoption. The Session Metrics freeze is not byte-identical to its old
lineage or current main, and the old lineage contains additional guidance. That
requires a destination comparison, not a mechanical delete.

## What I Recommend Next

**Stop treating branch count as the work queue.** Keep one active recovery
track and use the four held capability groups above as the map.

The next useful reduction is a bounded source-to-current-destination comparison,
not more global cleanup. Telemetry should be first because its product intent is
clear and its source slices can be separated into adopted, superseded, and
still owed. Then do Session Metrics against current Rawr. Retire the old PR
steps only when every relevant slice has an accepted disposition; do not
reactivate obsolete code to satisfy an old stack.

The remaining six worktrees were retained deliberately. Two contain existing
changes; the original Fluree and metrics checkouts also contain ignored runtime
data (`.fluree/`, `.fluree-memory/.local/`, `.rawr/`). Git cleanliness alone does
not make those directories disposable. The clean metrics transfer checkout
remains a useful exact source comparison point. All 13 stashes remain untouched.

This cleanup does not bypass the agreed frame-recovery-before-repairs sequence.
Capability accounting can clarify and reduce historical source without
implementing telemetry, redesigning the SDK, or beginning full transcript analysis.

## Operation And Verification Notes

The remote-only deletion completed before the owner's follow-up emphasizing
Graphite and avoiding a backup-centered process. Existing recovery bundles were
already created; no further backup scheme is part of the recommended workflow.
Eligibility was established by merged/adopted evidence, not by the existence of
a backup. The physical archive is
`/Users/mateicanavra/Documents/.nosync/DEV/branch-archives/habitat-merged-20260915`.

`gt delete` is local-only and `gt sync` provides no equivalent exact-ref remote
allowlist. The already-completed remote pruning therefore used explicit Git
remote administration, not history rewriting; subsequent local retirement and
refresh used Graphite. The repository's ordinary stack workflow remains
Graphite-first. No blanket sync force, global restack, or push of application
changes was performed.

Before deletion, `bun run check` passed all 147 tasks with zero cache hits.
The configured generated `.husky/_` directory was absent, so the check and
remote-policy guard were run explicitly rather than relying on accidental hook
inactivity. Repairing hook installation is not part of this cleanup.
The remote backup also passed an empty-repository restore and full object check.
Graphite sync left main current and skipped the occupied, locally advanced
Fluree tip as expected. Its fetch did not prune the 625 obsolete local
remote-tracking refs; a Git remote-prune dry run identified exactly that set,
then removed those tracking refs. This housekeeping did not delete additional
server branches. Local docs remain unsubmitted and unmerged.

After recording the outcome, the uncached `habitat:check` passed workspace lint
and Habitat policy. The timeline passed desktop (1440px) and mobile (390px)
browser checks without overflow, clipped text, or page errors.
