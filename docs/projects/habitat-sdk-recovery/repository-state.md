# Repository Re-entry Checkpoint

For the subsequent applied pruning and capability timeline, read
[Cleanup and capability lineage](cleanup-lineage-map.md). Counts below preserve
the earlier checkpoint rather than pretending it was already the cleaned state.

This document is informative: a September 15, 2026 repository census and
disposition checkpoint, not permission to merge old implementations or a new SDK
repair plan. The [SDK assessment](assessment.md) describes product correctness;
this document describes Git state and work preservation.

## Current Track

Local `main` and `origin/main` both point to
`29365b34cbfeca636606af0f6b5d4c4ac07c1066`. The exact-main
[Repository Ratchet run](https://github.com/rawr-ai/rawr-hq-template/actions/runs/34013824346)
succeeded. There is no trunk divergence to repair.

The current recovery work is isolated on
`main -> agent-root-habitat-design-consolidation`, in
`/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-root-habitat-design-consolidation`.
Its philosophy/evidence consolidation starts at `4c3f59e57`; this checkpoint is
an additional documentation commit on that same branch. It remains local,
unsubmitted, and unmerged. It does not depend on the older stacks below.

The primary checkout remains on `codex/fluree-capability-reassessment`, with its
pre-existing untracked `.codex/config.toml` untouched. Do not confuse that
checkout with the current recovery track.

## Census And Cleanup

| Item | Before | After This Pass |
|---|---:|---:|
| Local branches, including main | 65 | 64 |
| Local-only branches | 18 | 17 |
| Live Graphite roots below main | 12 | 11 |
| Worktrees | 7 | 6 |
| Worktrees with tracked or untracked changes | 2 | 2, pre-existing and preserved |
| Stashes | 13 | 13, preserved |
| Actual remote branches, excluding symbolic HEAD | 685 | 685 |
| Open PRs | 46 | 46, unchanged |

The initial quick count of 45 open PRs was corrected by the complete census.
Of the 46, 19 are draft and 27 are non-draft; non-draft is not merge-readiness
proof. There are eleven remaining Graphite `needs restack` markers. Most concern
held history; they are not an instruction to restack everything onto main.

Completed cleanup was deliberately narrow:

- Deleted `agent-root-implement-semantic-ledger` through `gt delete`. Its exact
  tip `25130e77a2b1ac9a82b44bde705589b26bae4de1` is an ancestor of main, with no
  unique commits, children, worktree, or open PR. Its separate historical WIP
  stash remains intact; deleting the ref did not classify that stash as adopted.
- Removed our clean, detached `wt-agent-root-habitat-runtime-cold` test worktree
  at exact main. Its ignored contents were installed dependencies, build outputs,
  and Nx caches, not new source work.
- Refreshed origin tracking refs. No remote ref, PR, stash, shared configuration,
  held source, or primary checkout was deleted, rewritten, or switched.

## Held Tracks

"Held" below means excluded from the present recovery execution, with an exact
return point and an unresolved adoption or review condition. It does not mean
merged, redundant, abandoned, or physically archived. Counts group related work;
they are not all single Graphite stacks.

| Track | Branches / Return Point | Disposition And Return Condition |
|---|---|---|
| Current recovery | 1; `agent-root-habitat-design-consolidation` | Active documentation track; frame investigation remains a later owner-reviewed phase. |
| September Fluree research | 2; `codex/fluree-capability-reassessment` at `55ce5a7fb` | Unlanded research and probes atop current main. Preserve; review as input when D-1 is reopened, not as an already approved integration change. |
| Original Fluree/workstream | 6; `fluree-ws-port-shape-law` at `85d8e0a37` | Mixed Habitat ledger and Rawr workstream source still needs D-1/D-3 adoption accounting. Preserve all six branches. |
| Native telemetry | 36; `codex/prove-native-telemetry-receipt` at `0519fe11c` | Partly adopted source plus unfinished backend proof. Preserve staged work and resolve D-5 before retiring the source lineage. |
| Temporal inquiry | 2; `codex/project-habitat-temporal-inquiry` at `5fcb32579` | Generic capability held for D-2 qualification; not part of the current SDK repair track. |
| Original Session Metrics | 9; `codex/session-metrics-orchestration-guidance` at `9ee1ab1c8` | Needs current Rawr comparison and D-3 destination acceptance. Do not infer redundancy from initial product transfer. |
| Frozen Session Metrics transfer | 1; `agent-root-session-metrics-source-freeze` at `0495c03a8` | Separate 34-file transfer patch. Preserve until behavior is accounted for in current Rawr. |
| Research experiment design | 3 across two local roots; `codex/close-research-experiment-design-review` at `d9d5c9543` | Published draft preservation, not landing-ready implementation. D-3 review precedes any re-authoring or retirement. |
| Architecture/toolbox references | 2; `codex/spec-toolbox-reference` at `1b07e2beb` | Retained governance evidence. Review unique intent separately from superseded Habitat-law copies. |
| Bootgraph proof WIP | 1; `agent-root-task63-proof-wip` at `15863c7f5` | One historical test-file patch remains outside main by ancestry. Supersession not established in this pass; preserve for focused comparison, not SDK execution. |

The existing [deferred-capability handoff](../habitat-runtime-realignment/deferred-capabilities.md)
owns D-1 through D-5 and their accepted obligations. This inventory does not
replace those conditions or reactivate them.

Important distinctions from the branch-level review:

- Telemetry resource/provider work was semantically adopted at `6fbe3b252`
  ([PR 926](https://github.com/rawr-ai/rawr-hq-template/pull/926)); native server
  and async lifecycle were later re-authored in
  [PR 1018](https://github.com/rawr-ai/rawr-hq-template/pull/1018) and
  [PR 1019](https://github.com/rawr-ai/rawr-hq-template/pull/1019). The old host
  wiring should not simply be merged. Its eight staged receipt files are
  separate unfinished work, including backend storage/readback evidence.
- The original Fluree tip is 36 commits ahead of its remote counterpart, with
  none unique to the remote. This is unpublished local history, not a conflict
  requiring reset. Only one local branch with a same-named remote differs from
  that remote at this checkpoint; local-only branches are a separate category.
- Session Metrics has an internal stale-parent relationship: earlier branches
  were restacked while descendants retain older versions. Patch equivalence is
  evidence for later accounting, not authorization to replay or delete them.
- Research PR 769 is based on `codex/reframe-research-experiment-platform` on
  GitHub, but its local Graphite parent is main. Preserve this mismatch as a
  held-publication concern; do not submit or globally restack it incidentally.

## Worktree Return Points

Paths below are under `/Users/mateicanavra/Documents/.nosync/DEV/`.

| Path Suffix | State | Treatment |
|---|---|---|
| `habitat/rawr-hq-template` | Fluree reassessment; untracked `.codex/config.toml` | Preserve user checkout and host configuration. |
| `worktrees/wt-agent-root-habitat-design-consolidation` | Current documentation branch | Continue recovery here; finish each change cleanly. |
| `worktrees/wt-agent-root-session-metrics-source-freeze` | Clean frozen transfer | Preserve source pending Rawr comparison. |
| `worktrees/wt-template-fluree-workstream` | Clean; tip has unpublished history | Preserve mixed-source adoption input. |
| `worktrees/wt-template-native-platform-telemetry` | Eight staged additions, 1,015 lines | Preserve index and source unchanged; explicit handoff needed before removal. |
| `worktrees/wt-template-session-intelligence-metrics-openspec` | Clean historical metrics tip | Preserve until current-destination accounting. |

All remaining registered paths exist; `git worktree prune --dry-run --verbose`
found no stale registrations. Thirteen stash objects were inventoried by immutable
SHA, not just shifting `stash@{n}` labels. None was dropped or interpreted as
automatically obsolete from its age or message.

## Remote Backlog

The 685 actual remote refs classify as:

- 625 exact matches to a merged PR's recorded head.
- 46 open-PR branches: telemetry 35, Fluree 6, research 3, temporal inquiry 2.
- One merged-PR name whose current ref differs from the recorded merged head:
  `codex/seal-service-module-boundaries`, PR 535. Requires separate comparison.
- Nine closed-unmerged PR refs, three Graphite base refs, and main.

The 625 exact matches are a strong candidate set for a separate remote-pruning
pass, not 625 unfinished features. This pass did not delete them: pruning still
needs dependency/base-reference checks and a recoverable allowlist. Open held
PRs should be visibly marked as held or closed-as-superseded only after their
source dispositions are accepted. Their GitHub state was not changed here.

## Adjacent Repositories

Marketplace and Rawr are independent repositories, not extra Habitat stacks.
Their main refs are also equal to origin/main after refresh.

- Marketplace: `851a5b87`, three local branches, five worktrees, zero open PRs.
  Two held research/stewardship roots are each 17 commits behind main. The
  primary has untracked `.repos/`; detached `worktrees/0995/rawr-hq` has four
  tracked Inngest investigation modifications. Preserve both.
- Rawr: `a1a4fe7`, six local branches, two worktrees, zero open PRs. Our clean
  `habitat-upgrade -> source-library -> capture-quality` stack is three commits
  ahead of main, none behind, at `5e6c4b7`. It remains unsubmitted. The separate
  primary playbook checkout has pre-existing staged changes, including five
  security-test deletions, and untracked `.nx/`; it was not touched.

Neither repository was pruned or merged in this Habitat cleanup.

## Evidence And Limits

The compact [local inventory](resources/research/repository-local-inventory-2026-09-15.json)
records every local ref, Graphite parent, worktree, stash identity, and the
before/after counts. The [remote inventory](resources/research/repository-remote-inventory-2026-09-15.tsv)
records every actual remote ref, its SHA, category, and associated PR numbers.
These are checkpoint evidence, not live status or mutation allowlists. Current
documentation commits naturally advance beyond the captured recovery-branch SHA.

Evidence came from Git, fresh GitHub PR/ref reads, installed Graphite 1.8.6,
and its read-only SQLite metadata. The skill's older `stack-census.mjs` reads
the June `.graphite_cache_persist` file and reported only six cached branches;
that topology result was rejected. Live `.graphite_metadata.db` parentage was
cross-checked with `gt branch info` and stack-scoped output. Metadata entries
without local refs are not counted as live branches.

This checkpoint does not certify every old patch, prove all adoption destinations,
or leave the whole machine clean. It establishes a clean independent active
track while preserving and locating the two pre-existing dirty Habitat worktrees.
No bulk restack, remote deletion, PR closure, stash cleanup, or historical-frame
analysis was performed.

Verification for this documentation pass: uncached `habitat:check` passed
workspace lint and policy; 21 local Markdown targets across the four edited or
new narrative documents resolve; all 64 local branches reconcile to eleven
roots plus trunk; the remote inventory contains 685 records; `git diff --check`
passed. Independent review found no must-fix issue. No runtime tests were
rerun for this Git/documentation-only change.
