# Habitat Held Work Register

Informative re-entry register, September 15, 2026. Its deliberately open
Graphite draft is the central discovery point for retained work, not a proposal
to merge historical implementations. Keep the draft while these holdings need
a visible return point; update it when a holding is adopted or retired. Do not
stack implementation on this documentation-only branch.

## Current Focus

The recovery evidence and telemetry retirement landed in
[PR 1029](https://app.graphite.com/github/pr/rawr-ai/rawr-hq-template/1029),
at main `1ecd8b6c58fb2f2fa9d4221e83dd484444df09aa`. Full exact-main CI passed.
The next recommended work is source qualification and pilot extraction for
[frame recovery](framing-investigation-baseline.md), not another global cleanup
or an SDK repair. The investigation itself has not started.

The preceding census contained 27 local branches (main plus 26 holdings),
25 remote branches, 11 open PRs, 8 Graphite roots, 6 worktrees, and 13 stashes.
This register adds one documentation branch and one draft PR. It does not
change, rebase, publish, or delete any source holding. Older recovery documents
remain dated checkpoints; their old counts and unmerged status are not current.

## What Graphite Does And Does Not Contain

Graphite remains the branch/stack workflow authority and this draft provides
central visibility. Visibility here is not a claim that all source is uploaded.
Fifteen source branches have no remote counterpart. The Fluree tip has 36
commits beyond its published PR revision. Telemetry also has eight staged files
which no branch submission would publish. The tables below expose these gaps.

Latest CLI 1.8.6 dry runs accepted the May reference pair, September Fluree pair,
and metrics freeze, but rejected submission of the old metrics stack until it
is restacked. We did not selectively reopen old work merely because some refs
could submit. Restacking historical code to achieve visibility is the wrong
operation; the register preserves its actual state instead.

The telemetry reference intentionally remains untracked by Graphite, as recorded
in [its retirement decision](telemetry-retirement.md). It is indexed here, not
silently returned to the active stack graph. Git objects, working changes and
ignored runtime data remain local evidence; this document is not a backup.

## Return Conditions

| Holding | Disposition And Return Condition |
|---|---|
| May authoring references (2) | Preserve as owner-curated comparison evidence. Read during frame recovery; no retirement or rewrite. |
| Telemetry (1) | Historical source only. Current producer persistence, semantic events and sanitization remain deferred; revisit after recovered frame and SDK repair boundaries. Backend readiness is already verified. |
| Original Fluree/workstream (6) | Deferred knowledge infrastructure. Account for accepted destinations and coordinate with its writer before adoption or retirement. |
| September Fluree research (2) | Recent capability reassessment, not stale implementation debris. Preserve until its owning research is resumed. |
| Temporal inquiry (2) | Deferred capability, not an admitted merge queue despite old PR readiness badges. Requalify against current contracts before resuming. |
| Session Metrics (9 plus freeze) | Downstream Rawr transfer evidence. Compare current Rawr with the original lineage and freeze, then adopt missing behavior or retire proven superseded slices. No need to resume the old Habitat implementation. |
| Research experiment design (3) | Retain accepted design and later corrections for a bounded Rawr destination comparison. Local parentage and submitted parentage differ; do not blindly resubmit. |

The next substantive retirement candidate is Session Metrics, but it requires a
source-to-current-Rawr comparison, not mechanical deletion. It is not a
prerequisite for frame recovery. Remote-only exceptions and stashes remain
bounded later accounting work, not an excuse to delay the agreed investigation.

## Exact Local Holdings

All revisions below are full local commit IDs from the same census. A PR link
means an existing open PR; it does not imply current acceptance or full local
publication. The 26 rows exclude main and this register's own branch.

| Branch | Local Revision | Publication |
|---|---|---|
| `agent-af-authority-freeze-execution-frame` | `1256d088569f9f6ef6f2d177605fb59d4b45063d` | Local only; May reference |
| `codex/spec-toolbox-reference` | `1b07e2bebe72c30b11acedc34e138f15eaa84b92` | Local only; May reference |
| `archive/native-telemetry-pre-repair` | `0519fe11cfd8c75a72bd761d980077f23fed194a` | Local only; untracked historical holding; staged work below |
| `fluree-workstream-experiment` | `be005ba63d4429b1dd5528d356ba8c4f0deed65d` | [548](https://app.graphite.com/github/pr/rawr-ai/rawr-hq-template/548) |
| `fluree-ws-guarded-proposals` | `d28639ae83d4fbd297f680abdc03d91a0040751e` | [549](https://app.graphite.com/github/pr/rawr-ai/rawr-hq-template/549) |
| `fluree-ws-conformance-suites` | `b45ffd14dd5713ddead9c37f82c0cae27ad577b0` | [550](https://app.graphite.com/github/pr/rawr-ai/rawr-hq-template/550) |
| `fluree-ws-constant-cost-head` | `8d66093190bc1ae26dca5226a67c9b56fcc8de55` | [551](https://app.graphite.com/github/pr/rawr-ai/rawr-hq-template/551) |
| `fluree-ws-constant-cost-existence` | `a1062c4216456a2bf6392148a477bfff1ec35353` | [552](https://app.graphite.com/github/pr/rawr-ai/rawr-hq-template/552) |
| `fluree-ws-port-shape-law` | `85d8e0a376586726f6624215076decc4884757b6` | [553](https://app.graphite.com/github/pr/rawr-ai/rawr-hq-template/553); local is 36 commits ahead |
| `codex/fluree-september-intake` | `053fdc88b25137e2c60c687ba26be07b50235000` | Local only |
| `codex/fluree-capability-reassessment` | `55ce5a7fb23bb79632236558c14e8988111c228a` | Local only |
| `codex/integrate-habitat-frame-lineage` | `602b1207a51c35e5d50a3e309a6336fdabbd5ab5` | [727](https://app.graphite.com/github/pr/rawr-ai/rawr-hq-template/727) |
| `codex/project-habitat-temporal-inquiry` | `5fcb3257933b9c9017e7923b85b244dfa7b239d0` | [728](https://app.graphite.com/github/pr/rawr-ai/rawr-hq-template/728) |
| `agent-root-session-metrics-source-freeze` | `0495c03a85b8322f63a0ed7dcff855b3a382848c` | Local only |
| `codex/session-intelligence-metrics-openspec` | `5dcf4dbebe850ceb34d606dc8f35efc71d34a987` | Local only |
| `codex/shared-session-selection` | `d1f4b1f284e6f70dfa1253d61909b9800a5ba581` | Local only |
| `codex/session-metrics-service` | `019cf1ab6a5e3130951687c42ee7ad0515e3eace` | Local only |
| `codex/session-metrics-cli` | `7fa0f9ba58e5ee8e3fb13a1b1960b47edf35ae30` | Local only |
| `codex/session-metrics-agent-guidance` | `083159c498b650ce80055e0c8fa4557a5bb1db31` | Local only |
| `codex/session-metrics-orchestration-openspec` | `1e4deb97c372feb6737ed8dcccd3ab4d0cafb348` | Local only |
| `codex/session-metrics-orchestration-service` | `236af012ec8b20522745f629f87f62384bb2138d` | Local only |
| `codex/session-metrics-orchestration-cli` | `5eb03afe47028a902e054bba5ebb396fdc30410b` | Local only |
| `codex/session-metrics-orchestration-guidance` | `9ee1ab1c8851db5c5cd0b246ecc028a45a5352c8` | Local only |
| `codex/consolidate-research-experiment-sdk` | `223835fccedcb80523b761c571130852bdb106a2` | [531](https://app.graphite.com/github/pr/rawr-ai/rawr-hq-template/531) |
| `codex/reframe-research-experiment-platform` | `5f99837f5244e34be4eb58db5ec3e3bfefd7c88f` | [768](https://app.graphite.com/github/pr/rawr-ai/rawr-hq-template/768) |
| `codex/close-research-experiment-design-review` | `d9d5c95437c882e4eb295e3013634fc1806d801a` | [769](https://app.graphite.com/github/pr/rawr-ai/rawr-hq-template/769) |

PR 553's published source is `a3717cb8982e0ebaf473bbfee915b66a760af004`,
not the current local tip above. Research PR 769 targets
`codex/reframe-research-experiment-platform` remotely while Graphite currently
records its local parent as main. Both differences are preserved, not repaired
as an incidental part of this index.

## Local Working Material

Paths below are relative to `$HOME/Documents/.nosync/DEV/`.

| Location | Holding And Non-Branch Material |
|---|---|
| `habitat/rawr-hq-template` | September Fluree reassessment; pre-existing untracked `.codex/config.toml` |
| `worktrees/wt-template-fluree-workstream` | Original Fluree tip; ignored local runtime data |
| `worktrees/wt-agent-root-session-metrics-source-freeze` | Metrics transfer freeze |
| `worktrees/wt-template-session-intelligence-metrics-openspec` | Metrics guidance tip; ignored runtime data |
| `worktrees/wt-template-native-platform-telemetry` | Historical telemetry; eight staged files, 1,015 lines, plus ignored runtime data |
| `worktrees/wt-agent-root-habitat-design-consolidation` | Recovery checkout; location retained so existing links keep working |

Telemetry file identities and hashes are recorded in the
[retirement receipt](resources/research/telemetry-retirement-2026-09-15.json).
The 13 retained stashes and earlier worktree evidence are enumerated in the
[re-entry census](resources/research/repository-local-inventory-2026-09-15.json).
Neither ignored data nor staged files become remotely preserved by this index.
Do not delete a worktree because its branch is represented here.

## Remote-Only Exceptions

Nine closed-unmerged PR refs remain: 473, 476, 488, 793, 797, 800, 823, 936,
and 937. Branch `codex/seal-service-module-boundaries` remains at
`e8142343d9c10198729a8eacd1592d08fb65f999`, which differs from the merged
revision of PR 535. Graphite bases `graphite-base/310`, `graphite-base/488`,
and `graphite-base/936` also remain. These 13 remote-only refs are exceptions,
not live feature promises and not mechanically disposable solely by PR state.
Their exact identities appear in the
[remote inventory](resources/research/repository-remote-inventory-2026-09-15.tsv);
no remote-only ref changed in this visibility pass.

## Next Work, Not Yet Executed

1. Verify the three original thread identities, forks, coverage and access
   formats, alongside the known release-handoff thread.
2. Pilot small contextual spans from each source before fixing extraction
   schemas. Check roles, ordering, provenance, overlap and missingness.
3. Prepare immutable private raw evidence, reproducible normalized records and
   a coverage report. Keep interpretation separate from collection.
4. Analyze contextual intervention episodes and counterexamples, then develop
   and evaluate skills on held-out episodes. Review the recovered frame before
   revisiting the philosophy, assessment and SDK repair plan.

This register does not build the investigation, authorize old plans, qualify
telemetry delivery, or claim the remaining SDK findings are fixed.
